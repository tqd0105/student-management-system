import type { Metadata } from "next";
import { Lexend_Deca } from "next/font/google";
import "./globals.css";
import { AuthProvider } from '@/contexts/AuthContext';
import PWAInstallPrompt from '@/components/pwa/PWAInstallPrompt';
import ErrorBoundary from '@/components/ErrorBoundary';

const lexendDeca = Lexend_Deca({
  variable: "--font-lexend-deca",
  subsets: ["latin"],
  display: 'swap',
});

export const metadata: Metadata = {
  title: "Portal | LIGHTBRAVE.EDU",
  description: "A modern student management portal featuring QR code-based attendance, class management, and academic progress tracking.",
  
  // Simple Open Graph for link preview
  openGraph: {
    title: "Portal | LIGHTBRAVE.EDU",
    description: "Student management portal with QR-based attendance, class organization, and progress monitoring.",
    url: "https://sms-fe-lovat.vercel.app",
    images: ["/images/Banner-lightbrave.png"],
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <head>
        {/* Simple favicon */}
        <link rel="icon" href="/images/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/images/apple-touch-icon.png" />
      </head>
      <body
        className={`${lexendDeca.variable} font-sans antialiased h-full bg-gray-50`}
      >
          <AuthProvider>
            {children}
            <PWAInstallPrompt />
          </AuthProvider>
      </body>
    </html>
  );
}
