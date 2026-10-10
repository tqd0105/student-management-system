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
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://sms-fe-lovat.vercel.app'),
  title: "Portal | LIGHTBRAVE.EDU",
  description: "A modern student management portal featuring QR code-based attendance, class management, and academic progress tracking.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/images/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/images/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/images/favicon.ico" },
      { url: "/images/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [
      { url: "/images/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  
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
