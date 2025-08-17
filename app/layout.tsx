import './globals.css';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Toaster } from 'react-hot-toast';
import CognitoAuthProvider from './providers/AuthProvider';
import PrivateLayout from '@/components/PrivateLayout';
import MUIProvider from './MUIProvider'; // 👈 IMPORTANTE

export const metadata: Metadata = {
  title: 'Early Navigator Center App',
  description: 'Admin portal for entering clinical centers',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50">
        <MUIProvider> {/* 👈 Envuelve todo con MUIProvider */}
          <CognitoAuthProvider>
            <PrivateLayout>{children}</PrivateLayout>
          </CognitoAuthProvider>
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 6000,
              style: {
                background: '#003087',
                color: 'white',
                fontWeight: 500,
                borderRadius: '8px',
                padding: '14px 20px',
                fontFamily: 'Arial, sans-serif',
              },
              iconTheme: {
                primary: 'white',
                secondary: '#003087',
              },
            }}
          />
        </MUIProvider>
      </body>
    </html>
  );
}