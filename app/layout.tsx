'use client';
import React, { ReactNode } from 'react';
import { Box } from '@chakra-ui/react';
import '@/styles/App.css';
import '@/styles/Contact.css';
import '@/styles/Plugins.css';
import '@/styles/MiniCalendar.css';
import AppWrappers from './AppWrappers';

export default function RootLayout({ children }: { children: ReactNode }) {

  return (
    <html lang="en">
      <body id={'root'}>
        <AppWrappers>
          {/* <ChakraProvider theme={theme}> */}
          <Box
            minHeight="100vh"
            height="100%"
            width="100%"
            p="0"
            m="0"
          >
            {children}
          </Box>
          {/* </ChakraProvider> */}
        </AppWrappers>
      </body>
    </html>
  );
}
