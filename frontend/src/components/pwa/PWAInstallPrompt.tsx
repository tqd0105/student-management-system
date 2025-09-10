'use client';

import { useState, useEffect } from 'react';
import { X, Download, Smartphone } from 'lucide-react';

interface PWAInstallPromptProps {
  onClose?: () => void;
}

export default function PWAInstallPrompt({ onClose }: PWAInstallPromptProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      console.log('📱 PWA install prompt available');
      e.preventDefault();
      setDeferredPrompt(e);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      console.log('📱 Already running as PWA');
      return;
    }

    // Show prompt for mobile users even without beforeinstallprompt
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile && !localStorage.getItem('pwa-prompt-dismissed')) {
      setTimeout(() => setIsVisible(true), 3000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      console.log('📱 Showing PWA install prompt');
      deferredPrompt.prompt();
      
      const { outcome } = await deferredPrompt.userChoice;
      console.log('📱 PWA install outcome:', outcome);
      
      if (outcome === 'accepted') {
        console.log('📱 PWA install accepted');
      } else {
        console.log('📱 PWA install dismissed');
      }
      
      setDeferredPrompt(null);
      setIsVisible(false);
    } else {
      // Manual instructions for browsers without prompt support
      alert(`📱 To install this app:
      
🍎 iOS (Safari):
1. Tap the Share button
2. Select "Add to Home Screen"

🤖 Android (Chrome):
1. Tap ⋮ menu
2. Select "Add to Home Screen"

This will enable better camera access for QR scanning!`);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('pwa-prompt-dismissed', 'true');
    setIsVisible(false);
    onClose?.();
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-sm">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <Smartphone className="w-6 h-6 text-blue-600" />
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-gray-900">
              Install QR Student App
            </h3>
            <p className="mt-1 text-xs text-gray-600">
              Install this app for better camera access and offline use. Perfect for QR scanning!
            </p>
            <div className="mt-3 flex space-x-2">
              <button
                onClick={handleInstall}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs font-medium flex items-center"
              >
                <Download className="w-3 h-3 mr-1" />
                Install
              </button>
              <button
                onClick={handleDismiss}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-1 rounded text-xs font-medium"
              >
                Later
              </button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 ml-2 p-1 hover:bg-gray-100 rounded"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>
    </div>
  );
}
