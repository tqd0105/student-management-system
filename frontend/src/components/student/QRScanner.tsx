'use client';

import React, { useState, useRef } from 'react';
import { Camera, X, CheckCircle, AlertCircle, Scan } from 'lucide-react';
import jsQR from 'jsqr';

interface QRScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (qrData: string) => void;
}

export default function QRScanner({ isOpen, onClose, onScanSuccess }: QRScannerProps) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Detect if device is mobile or tablet
  const isMobile = () => {
    const ua = navigator.userAgent;
    
    // Standard mobile/tablet detection
    const standardMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    
    // Explicitly exclude desktop/laptop platforms
    const isDesktop = /Windows NT|Mac OS X.*(?:Intel|PPC)|Linux.*X11/i.test(ua) && 
                     !/Mobile|Tablet/i.test(ua);
    
    // Additional tablet detection
    const isTablet = /tablet|ipad|playbook|silk/i.test(ua) || 
                     (ua.includes('Android') && !ua.includes('Mobile'));
    
    // iPad Air/Pro detection (Safari reports as Macintosh on newer iPads)
    // Must have touch AND reasonable tablet aspect ratio
    const isIPadPro = /Macintosh/i.test(ua) && 
                      'ontouchend' in document && 
                      !isDesktop &&
                      (window.screen.width / window.screen.height < 2 && 
                       window.screen.height / window.screen.width < 2); // Reasonable tablet ratio
    
    // If explicitly detected as desktop, return false
    if (isDesktop && !standardMobile && !isTablet) {
      return false;
    }
    
    return standardMobile || isIPadPro || isTablet;
  };

  const handleFileCapture = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    console.log('📁 File selected:', {
      name: file.name,
      size: file.size,
      type: file.type
    });

    setLoading(true);
    setError(null);

    try {
      console.log('� Starting QR processing...');
      const qrData = await processImageFile(file);
      
      if (qrData) {
        console.log('✅ QR Code detected successfully:', qrData);
        console.log('🔍 QR Data type:', typeof qrData);
        console.log('📏 QR Data length:', qrData.length);
        console.log('🧪 QR Data preview:', qrData.substring(0, 100) + (qrData.length > 100 ? '...' : ''));
        
        // Try to parse and validate QR data format
        try {
          const parsedQR = JSON.parse(qrData);
          console.log('✅ Parsed QR object:', parsedQR);
          console.log('🔑 QR Keys:', Object.keys(parsedQR));
          console.log('📋 QR Values:', {
            sessionId: parsedQR.sessionId,
            qrCode: parsedQR.qrCode,
            classId: parsedQR.classId,
            timestamp: parsedQR.timestamp
          });
        } catch (parseError) {
          console.error('❌ QR Data is not valid JSON:', parseError);
          console.log('📄 Raw QR Data:', qrData);
        }
        
        setSuccess('✅ QR code đã được quét thành công!');
        
        // Return QR data to parent component
        onScanSuccess(qrData);
        
        // Auto close after success
        setTimeout(() => {
          onClose();
        }, 1000);
      } else {
        console.warn('❌ No QR code found in image');
        setError('QR code not found in image. Make sure QR code is clear and complete, shoot at appropriate distance and ensure adequate lighting!');
      }
    } catch (fileError) {
      console.error('❌ File processing error:', fileError);
      setError('❌ Lỗi xử lý file hình ảnh: ' + (fileError instanceof Error ? fileError.message : 'Unknown error'));
    } finally {
      setLoading(false);
      // Reset input để có thể chụp lại
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const processImageFile = (file: File): Promise<string | null> => {
    return new Promise((resolve, reject) => {
      console.log('📄 Reading file...');
      console.log('📱 File details:', {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: new Date(file.lastModified).toISOString()
      });
      
      const reader = new FileReader();
      
      reader.onerror = () => {
        console.error('❌ FileReader error');
        reject(new Error('Failed to read file')); 
      };
      
      reader.onload = (e) => {
        try {
          const result = e.target?.result;
          if (!result) {
            reject(new Error('No file content'));
            return;
          }

          console.log('🖼️ Creating image...');
          const img = new Image();
          
          img.onerror = () => {
            console.error('❌ Image load error');
            reject(new Error('Failed to load image'));
          };
          
          img.onload = () => {
            try {
              console.log('🎨 Original image:', {
                width: img.width,
                height: img.height,
                naturalWidth: img.naturalWidth,
                naturalHeight: img.naturalHeight
              });

              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d');
              
              if (!ctx) {
                reject(new Error('Cannot get canvas context'));
                return;
              }

              // Calculate optimal canvas size for mobile captured images
              let canvasWidth = img.width;
              let canvasHeight = img.height;
              
              // For very large images (mobile photos), scale down for better processing
              const maxSize = 1200;
              if (canvasWidth > maxSize || canvasHeight > maxSize) {
                const scale = Math.min(maxSize / canvasWidth, maxSize / canvasHeight);
                canvasWidth = Math.floor(canvasWidth * scale);
                canvasHeight = Math.floor(canvasHeight * scale);
                console.log('📏 Scaling image:', { 
                  original: { width: img.width, height: img.height },
                  scaled: { width: canvasWidth, height: canvasHeight },
                  scale 
                });
              }

              // Set canvas size
              canvas.width = canvasWidth;
              canvas.height = canvasHeight;
              
              // Enable image smoothing for better quality
              ctx.imageSmoothingEnabled = true;
              ctx.imageSmoothingQuality = 'high';
              
              // Draw image to canvas with scaling
              ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);
              console.log('🎨 Image drawn to canvas:', { width: canvasWidth, height: canvasHeight });

              // Get image data
              const imageData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
              console.log('📊 Image data extracted:', {
                width: imageData.width,
                height: imageData.height,
                dataLength: imageData.data.length,
                bytesPerPixel: imageData.data.length / (imageData.width * imageData.height)
              });

              // Try multiple QR detection methods with different approaches
              const attempts: Array<{ 
                inversionAttempts: "attemptBoth" | "dontInvert" | "onlyInvert" | "invertFirst",
                description: string 
              }> = [
                { inversionAttempts: "attemptBoth", description: "Normal + Inverted" },
                { inversionAttempts: "dontInvert", description: "Normal only" },
                { inversionAttempts: "onlyInvert", description: "Inverted only" },
                { inversionAttempts: "invertFirst", description: "Inverted first" }
              ];

              // Try detection on original size first
              for (let i = 0; i < attempts.length; i++) {
                console.log(`🔍 QR detection attempt ${i + 1}: ${attempts[i].description}`);
                
                try {
                  const qrCode = jsQR(imageData.data, imageData.width, imageData.height, attempts[i]);
                  
                  if (qrCode && qrCode.data) {
                    console.log('✅ QR Code found on attempt', i + 1, ':', qrCode.data);
                    resolve(qrCode.data);
                    return;
                  }
                } catch (qrError) {
                  console.warn(`⚠️ QR detection attempt ${i + 1} failed:`, qrError);
                }
              }

              // If not found, try with different canvas sizes for mobile images
              if (img.width !== canvasWidth || img.height !== canvasHeight) {
                console.log('🔄 Trying with different scales...');
                
                const scales = [0.8, 1.2, 0.6, 1.5];
                for (const scale of scales) {
                  const newWidth = Math.floor(img.width * scale);
                  const newHeight = Math.floor(img.height * scale);
                  
                  if (newWidth < 100 || newHeight < 100 || newWidth > 2000 || newHeight > 2000) {
                    continue; // Skip invalid sizes
                  }
                  
                  console.log(`🔍 Trying scale ${scale}:`, { width: newWidth, height: newHeight });
                  
                  canvas.width = newWidth;
                  canvas.height = newHeight;
                  ctx.imageSmoothingEnabled = true;
                  ctx.imageSmoothingQuality = 'high';
                  ctx.drawImage(img, 0, 0, newWidth, newHeight);
                  
                  const scaledImageData = ctx.getImageData(0, 0, newWidth, newHeight);
                  
                  for (let j = 0; j < attempts.length; j++) {
                    try {
                      const qrCode = jsQR(scaledImageData.data, scaledImageData.width, scaledImageData.height, attempts[j]);
                      
                      if (qrCode && qrCode.data) {
                        console.log(`✅ QR Code found with scale ${scale}, attempt ${j + 1}:`, qrCode.data);
                        resolve(qrCode.data);
                        return;
                      }
                    } catch {
                      // Silent fail for scale attempts
                    }
                  }
                }
              }

              // If still not found, try enhancing contrast
              console.log('🔄 Trying contrast enhancement...');
              try {
                // Reset to original scaled size
                canvas.width = canvasWidth;
                canvas.height = canvasHeight;
                ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);
                
                // Enhance contrast
                const enhancedImageData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
                const data = enhancedImageData.data;
                
                // Simple contrast enhancement
                for (let i = 0; i < data.length; i += 4) {
                  // Convert to grayscale and enhance contrast
                  const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
                  const enhanced = gray > 128 ? 255 : 0; // High contrast B&W
                  data[i] = enhanced;     // R
                  data[i + 1] = enhanced; // G
                  data[i + 2] = enhanced; // B
                  // Alpha unchanged
                }
                
                ctx.putImageData(enhancedImageData, 0, 0);
                const finalImageData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
                
                for (let k = 0; k < attempts.length; k++) {
                  try {
                    const qrCode = jsQR(finalImageData.data, finalImageData.width, finalImageData.height, attempts[k]);
                    
                    if (qrCode && qrCode.data) {
                      console.log(`✅ QR Code found with contrast enhancement, attempt ${k + 1}:`, qrCode.data);
                      resolve(qrCode.data);
                      return;
                    }
                  } catch (qrError) {
                    console.warn(`⚠️ Enhanced detection attempt ${k + 1} failed:`, qrError);
                  }
                }
              } catch (enhanceError) {
                console.warn('⚠️ Contrast enhancement failed:', enhanceError);
              }

              // If no QR code found with any method
              console.warn('❌ No QR code detected with any method');
              console.log('🔍 Final image analysis:', {
                finalWidth: canvasWidth,
                finalHeight: canvasHeight,
                attemptsTotal: attempts.length,
                scalesAttempted: 4,
                contrastEnhanced: true
              });
              resolve(null);
              
            } catch (canvasError) {
              console.error('❌ Canvas processing error:', canvasError);
              reject(canvasError);
            }
          };
          
          img.src = result as string;
          
        } catch (imgError) {
          console.error('❌ Image processing error:', imgError);
          reject(imgError);
        }
      };
      
      reader.readAsDataURL(file);
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900/30 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-hidden m-4">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Scan className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">QR Scanner</h3>
              <p className="text-sm text-gray-500">Quét mã QR để điểm danh</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
          {/* Status Messages */}
          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-lg">
              <div className="flex items-center">
                <AlertCircle className="w-40 h-20 text-red-400 mr-3" />
                <p className="text-red-700 font-medium">{error}</p>
              </div>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded-lg">
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 text-green-400 mr-3" />
                <p className="text-green-700 font-medium">{success}</p>
              </div>
            </div>
          )}

          {/* QR Capture Section */}
          <div className="space-y-4">
            {/* Desktop Warning - No Camera Support */}
            {!isMobile() ? (
              <div className="bg-red-100 border-red-400 p-6 rounded-lg shadow-xl text-center">
                <div className="flex flex-col items-center">
                  <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
                  <h3 className="text-lg font-bold text-red-600 mb-2">
                    ❌ Không hỗ trợ trên máy tính desktop
                  </h3>
                  <p className="text-gray-600 mb-3">
                    🔒 Tính năng quét QR code chỉ hoạt động trên <strong>thiết bị di động/tablet</strong> có camera!
                  </p>
                  <p className="text-gray-600 mb-4 italic text-sm">
                    💡 <strong>Vui lòng:</strong> Truy cập trang web này bằng điện thoại hoặc tablet để sử dụng tính năng điểm danh QR.
                  </p>
                  <div className="bg-red-200 p-3 rounded-lg">
                    <p className="text-gray-800 text-sm font-medium">
                      📱 Thiết bị hỗ trợ: Smartphone/Tablet → Quét QR code → Điểm danh thành công
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              /* Mobile Capture Section */
              <div className="text-center py-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileCapture}
                  className="hidden"
                />
                
                <div className="mb-6">
                  <div className="w-24 h-24 mx-auto bg-blue-100 rounded-full flex items-center justify-center mb-4">
                    <Camera className="w-12 h-12 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">
                    Chụp mã QR để điểm danh
                  </h3>
                  <p className="text-sm text-gray-600">
                    Sử dụng camera của thiết bị để chụp mã QR trực tiếp (hỗ trợ điện thoại và tablet)
                  </p>
                </div>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white py-4 px-4 rounded-full font-medium transition-colors flex items-center justify-center space-x-3 text-lg"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                      <span>Đang quét QR code...</span>
                    </>
                  ) : (
                    <>
                      <Camera className="w-6 h-6" />
                      <span>📸 Chụp mã QR</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* How it works - Only show for mobile */}
          {isMobile() && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                <Scan className="w-4 h-4 mr-2" />
                Cách thức hoạt động
              </h4>
              <div className="space-y-2 text-sm text-gray-700">
                <div className="flex items-start space-x-2">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">1</span>
                  <span>Bấm nút &quot;📸 Chụp mã QR&quot; để mở camera</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">2</span>
                  <span>Hướng camera vào mã QR và chụp ảnh</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">3</span>
                  <span>Hệ thống tự động quét và điểm danh</span>
                </div>
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-blue-100 border border-blue-400  rounded-lg p-4 ">
            <h4 className="font-semibold text-blue-900 mb-2 flex items-center">
              <Scan className="w-4 h-4 mr-2" />
              Hướng dẫn sử dụng
            </h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>📱 <strong>Thiết bị hỗ trợ:</strong> iPhone, iPad (Mini/Air/Pro), Android phone/tablet</li>
              <li>📸 <strong>Chụp trực tiếp:</strong> Sử dụng camera để chụp mã QR (không thể tải ảnh từ thư viện)</li>
              <li>🚫 <strong>Không hỗ trợ:</strong> Máy tính desktop/laptop (webcam không phù hợp)</li>
              <li>✅ <strong>Tự động quét:</strong> Hệ thống tự động đọc QR và điểm danh</li>
            </ul>
          </div>

        </div>
      </div>
    </div>
  );
}
