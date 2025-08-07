'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Box,
  Button,
  Flex,
  Icon,
  Img,
  Input,
  Text,
  useColorModeValue,
} from '@chakra-ui/react';
import { MdAutoAwesome, MdBolt, MdEdit, MdPerson } from 'react-icons/md';
import MessageBoxChat from '@/components/MessageBox';
import Link from '@/components/link/Link';
import Bg from '../public/img/chat/bg-image.png';

export default function Chat() {
  const [messages, setMessages] = useState<Array<{ role: string; content: string; sources?: string[] }>>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Theme colors - Fixed for dark mode
  const borderColor = 'whiteAlpha.300';
  const inputColor = 'white';
  const iconColor = 'white';
  const brandColor = 'white';
  const gray = 'gray.400';
  const textColor = 'white';
  const placeholderColor = { color: 'gray.400' };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    // Add user message
    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: input }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();
      console.log('Received data:', data); // Debug log
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: data.response, 
        sources: data.sources || [] 
      }]);
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, there was an error processing your request.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Flex
      w="100vw"
      h="100vh"
      direction="column"
      position="relative"
      bg="gray.900"
      p="0"
      m="0"
    >
      <Flex
        direction="column"
        mx="auto"
        w="100%"
        h="100%"
        maxW="1200px"
        p="20px"
      >
        {/* Header */}
        <Box mb="20px" textAlign="center">
          <Text fontSize="2xl" fontWeight="bold" color="white" mb="5px">
            AWS RAG Chatbot
          </Text>
          <Text fontSize="sm" color="gray.400">
            Powered by Amazon Bedrock
          </Text>
        </Box>

        {/* Main Box */}
        <Flex
          direction="column"
          w="100%"
          mx="auto"
          display={messages.length > 0 ? 'flex' : 'none'}
          mb={'auto'}
        >
          {messages.map((message, index) => (
            <Flex key={index} w="100%" align={'center'} mb="10px">
              <Flex
                borderRadius="full"
                justify="center"
                align="center"
                bg={message.role === 'user' ? 'blue.600' : 'green.600'}
                me="20px"
                h="40px"
                minH="40px"
                minW="40px"
              >
                <Icon
                  as={message.role === 'user' ? MdPerson : MdAutoAwesome}
                  width="20px"
                  height="20px"
                  color="white"
                />
              </Flex>
              <Box w="100%">
                <Flex
                  p="22px"
                  border="1px solid"
                  borderColor={borderColor}
                  borderRadius="14px"
                  w="100%"
                  zIndex={'2'}
                >
                  <Text
                    color={textColor}
                    fontWeight="600"
                    fontSize={{ base: 'sm', md: 'md' }}
                    lineHeight={{ base: '24px', md: '26px' }}
                  >
                    {message.content}
                  </Text>
                </Flex>
                {message.sources && message.sources.length > 0 && (
                  <Box mt="10px" p="15px" bg="gray.800" borderRadius="8px" border="1px solid" borderColor="gray.600">
                    <Text fontSize="sm" color="white" mb="8px" fontWeight="600">
                      📚 Sources:
                    </Text>
                    {message.sources.map((source, idx) => (
                      <Text key={idx} fontSize="sm" color="gray.300" mb="2px">
                        📄 {source}
                      </Text>
                    ))}
                  </Box>
                )}
              </Box>
            </Flex>
          ))}
          {isLoading && (
            <Flex w="100%" align={'center'} mb="10px">
              <Flex
                borderRadius="full"
                justify="center"
                align="center"
                bg="green.600"
                me="20px"
                h="40px"
                minH="40px"
                minW="40px"
              >
                <Icon
                  as={MdAutoAwesome}
                  width="20px"
                  height="20px"
                  color="white"
                />
              </Flex>
              <Flex
                p="22px"
                border="1px solid"
                borderColor={borderColor}
                borderRadius="14px"
                w="100%"
                zIndex={'2'}
              >
                <div className="loading-dots">
                  <div className="dot"></div>
                  <div className="dot"></div>
                  <div className="dot"></div>
                </div>
              </Flex>
            </Flex>
          )}
        </Flex>

        {/* Chat Input */}
        <Box mt="auto" pt="20px">
          <Flex gap="10px">
            <Input
              minH="54px"
              flex="1"
              border="1px solid"
              borderColor="gray.600"
              borderRadius="45px"
              p="15px 20px"
              fontSize="sm"
              fontWeight="500"
              bg="gray.800"
              _focus={{ 
                borderColor: 'gray.500',
                boxShadow: 'none',
                outline: 'none'
              }}
              _hover={{
                borderColor: 'gray.500'
              }}
              color="white"
              _placeholder={placeholderColor}
              placeholder="Type your message here..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />
            <Button
              variant="primary"
              py="20px"
              px="16px"
              fontSize="sm"
              borderRadius="45px"
              w={{ base: '160px', md: '210px' }}
              h="54px"
              _hover={{
                boxShadow:
                  '0px 21px 27px -10px rgba(96, 60, 255, 0.48) !important',
                bg: 'linear-gradient(15.46deg, #4A25E1 26.3%, #7B5AFF 86.4%) !important',
                _disabled: {
                  bg: 'linear-gradient(15.46deg, #4A25E1 26.3%, #7B5AFF 86.4%)',
                },
              }}
              onClick={handleSubmit}
              isLoading={isLoading}
            >
              Send Message
            </Button>
          </Flex>
        </Box>
      </Flex>
    </Flex>
  );
}