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
  description: "Modern QR-Based Attendance Tracking System for Educational Institutions",
  keywords: ["student management", "attendance", "QR code", "education", "dashboard", "admin", "PWA"],
  authors: [{ name: "LIGHTBRAVE TEAM" }],
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
  themeColor: "#2563eb",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "QR Student",
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',  
    'apple-mobile-web-app-status-bar-style': 'default',
    'apple-mobile-web-app-title': 'QR Student',
    'application-name': 'QR Student Management',
    'msapplication-TileColor': '#2563eb',
    'msapplication-config': '/browserconfig.xml',
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
        <link rel="icon" href="/images/logo.png" sizes="any" />
        {/* <link rel="icon" href="/images/logo.png?v=2" type="image/png" sizes="32x32" />
        <link rel="icon" href="/images/logo.png?v=3" type="image/png" sizes="16x16" />
        <link rel="apple-touch-icon" href="/images/logo.png" /> */}
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="QR Student" />
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
