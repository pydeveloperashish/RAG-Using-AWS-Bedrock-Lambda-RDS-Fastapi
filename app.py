import os
import json
import boto3
import psycopg2
import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
from dotenv import load_dotenv
from sklearn.metrics.pairwise import cosine_similarity

# ---- Load environment variables ----
load_dotenv()
AWS_ACCESS_KEY = os.getenv("AWS_ACCESS_KEY")
AWS_SECRET_KEY = os.getenv("AWS_SECRET_KEY")
AWS_BUCKET = os.getenv("AWS_BUCKET")
AWS_REGION = os.getenv("AWS_REGION")
DB_HOST = os.getenv("DB_HOST")
DB_NAME = os.getenv("DB_NAME")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")

# ---- Initialize AWS clients ----
s3 = boto3.client(
    "s3",
    aws_access_key_id=AWS_ACCESS_KEY,
    aws_secret_access_key=AWS_SECRET_KEY,
    region_name=AWS_REGION
)
bedrock = boto3.client("bedrock-runtime", region_name=AWS_REGION)

# ---- Initialize FastAPI app ----
app = FastAPI(title="AWS RAG Chatbot API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Next.js dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---- Pydantic models ----
class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    response: str
    sources: List[str] = []

# ---- Function to get Bedrock Embedding ----
def get_titan_embedding(text):
    print(f"Generating embedding for the query: {text}")
    payload = json.dumps({"inputText": text})
    response = bedrock.invoke_model(
        modelId="amazon.titan-embed-text-v2:0",
        body=payload,
        contentType="application/json",
        accept="application/json"
    )
    print("Generated text embedding successfully...")
    result = json.loads(response["body"].read().decode("utf-8"))
    return np.array(result["embedding"], dtype=np.float32)

# ---- Function to Query RDS and Fetch Relevant Chunks ----
def query_rds(user_query, top_k=5, similarity_threshold=0.05):
    try:
        print("🔄 Connecting to RDS...")
        conn = psycopg2.connect(
            host=DB_HOST,
            dbname=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD,
            port=5432
        )
        cur = conn.cursor()
        print("✅ Connected to RDS successfully")

        # Get user query embedding
        print(f"🔍 Generating embedding for query: {user_query}")
        query_embedding = get_titan_embedding(user_query)
        print(f"✅ Query embedding generated, dimension: {query_embedding.shape}")

        # Fetch all embeddings & chunks
        print("📥 Fetching documents & embeddings from RDS...")
        cur.execute("SELECT chunk, embedding, source, page FROM documents")
        rows = cur.fetchall()
        print(f"✅ Retrieved {len(rows)} rows from RDS")

        cur.close()
        conn.close()

        if not rows:
            print("⚠️ No documents found in database.")
            return []

        chunks = []
        for idx, (chunk, embedding_str, source, page) in enumerate(rows):
            try:
                emb = np.array(json.loads(embedding_str), dtype=np.float32)
                sim = cosine_similarity([query_embedding], [emb])[0][0]
                chunks.append((chunk, source, page, sim))
                if idx < 5:  # Log only first few
                    print(f"[DEBUG] Row {idx} → Sim={sim:.4f}, Source={source}, Page={page}")
            except Exception as e:
                print(f"❌ Failed to process embedding for row {idx}: {e}")

        # Sort by similarity
        ranked = sorted(chunks, key=lambda x: x[3], reverse=True)
        if ranked:
            print(f"✅ Similarities computed. Top similarity score: {ranked[0][3]:.4f}")
        else:
            print("⚠️ No similarities calculated")

        # Filter by threshold
        filtered = [r for r in ranked if r[3] >= similarity_threshold]
        print(f"📌 {len(filtered)} chunks passed the threshold of {similarity_threshold} out of {len(ranked)}")

        if not filtered:
            print("⚠️ No chunks passed similarity threshold.")
        return filtered[:top_k]

    except Exception as e:
        print(f"❌ RDS Query Failed: {e}")
        return []

# ---- Function to Generate Response using Bedrock ----
def generate_response(context, question):
    # Enhanced prompt for better responses
    enhanced_prompt = f"""
    You are a helpful AI assistant. Based on the provided context, answer the user's question comprehensively and accurately.

    Context:
        {context}

        Question: {question}

        Please provide a detailed and informative answer based on the context above. If the context doesn't contain enough information to fully answer the question, please mention what information is available and what might be missing.

    Answer:"""

    payload = json.dumps({
        "inputText": enhanced_prompt,
        "textGenerationConfig": {
            "maxTokenCount": 4000, 
            "temperature": 0.7,
            "topP": 0.9,
            "stopSequences": []
        }
    })

    response = bedrock.invoke_model(
        modelId="amazon.titan-text-express-v1",
        body=payload,
        contentType="application/json",
        accept="application/json"
    )

    response_text = response["body"].read().decode("utf-8")
    print("📦 Bedrock response:", response_text)

    result = json.loads(response_text)
    return result["results"][0]["outputText"]

# ---- API Endpoints ----
@app.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    try:
        # Query RDS for relevant chunks
        relevant_chunks = query_rds(request.message)
        
        if not relevant_chunks:
            return ChatResponse(
                response="I couldn't find any relevant information to answer your question. Could you please rephrase or ask something else?",
                sources=[]
            )
        
        # Combine chunks into context
        context = "\n".join([chunk[0] for chunk in relevant_chunks])
        
        # Extract unique sources from relevant chunks
        sources = list(set([chunk[1] for chunk in relevant_chunks if chunk[1]]))
        
        # Generate response using Bedrock
        answer = generate_response(context, request.message)
        
        return ChatResponse(response=answer, sources=sources)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    return {"status": "healthy"}