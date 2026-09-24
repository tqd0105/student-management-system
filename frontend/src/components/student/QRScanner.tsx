'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { 
  Camera, 
  X, 
  CheckCircle, 
  AlertCircle, 
  Scan, 
  Lightbulb,
  Zap, 
  ZapOff, 
  RefreshCw, 
  ShieldAlert, 
  Smartphone, 
  SwitchCamera,
  Laptop
} from 'lucide-react';
import jsQR from 'jsqr';

interface QRScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (qrData: string) => void;
}

interface DeviceCheckResult {
  isAllowed: boolean;
  reason?: string;
  detectedInfo?: {
    platform?: string;
    gpu?: string;
    isEmulated?: boolean;
    reasonDetail?: string;
  };
}

/**
 * Kiểm tra phần cứng vật lý đa tầng để chặn triệt để Laptop/PC bật chế độ DevTools giả lập di động
 */
function verifyPhysicalMobileDevice(): DeviceCheckResult {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return { isAllowed: false, reason: 'Môi trường trình duyệt không xác định.' };
  }

  const ua = navigator.userAgent || '';
  const standardMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const isDesktopUA = /Windows NT|Macintosh|Linux.*X11/i.test(ua) && !/Mobile|Tablet|Android/i.test(ua);
  const isIPadOS = /Macintosh/i.test(ua) && (navigator.maxTouchPoints || 0) > 1;

  // 1. Kiểm tra User-Agent cơ bản
  if ((isDesktopUA || !standardMobile) && !isIPadOS) {
    return {
      isAllowed: false,
      reason: 'Tính năng quét mã QR điểm danh chỉ hỗ trợ trên thiết bị di động (smartphone/tablet). Không hỗ trợ máy tính desktop hoặc laptop.',
      detectedInfo: {
        platform: navigator.platform || 'Desktop PC',
        reasonDetail: 'Phát hiện thiết bị là desktop/laptop'
      }
    };
  }

  // 2. Kiểm tra navigator.platform & navigator.userAgentData (Bắt bài DevTools chỉ đổi User-Agent)
  const platform = (navigator.platform || '').toLowerCase();
  const uaData = (navigator as any).userAgentData;
  const uaDataPlatform = (uaData?.platform || '').toLowerCase();

  const isWindowsPlatform = platform.includes('win') || uaDataPlatform.includes('win');
  const isLinuxDesktop = (platform.includes('linux x86') || platform.includes('linux i686') || uaDataPlatform.includes('linux')) && !/android/i.test(ua);
  const isMacDesktop = platform.includes('mac') && (navigator.maxTouchPoints || 0) <= 1;

  if (isWindowsPlatform || isLinuxDesktop || isMacDesktop) {
    return {
      isAllowed: false,
      reason: 'Phát hiện truy cập từ hệ điều hành máy tính (Windows/macOS/Linux) qua công cụ giả lập DevTools. Vui lòng mở trang web trực tiếp trên điện thoại thật.',
      detectedInfo: {
        platform: navigator.platform || uaDataPlatform || 'Windows/Desktop OS',
        isEmulated: true,
        reasonDetail: 'Phát hiện sử dụng devtools'
      }
    };
  }

  // 3. Hardware Fingerprinting: WebGL GPU Unmasked Renderer
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (gl) {
      const debugInfo = (gl as WebGLRenderingContext).getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        const renderer = (((gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)) || '').toLowerCase();
        
        // BƯỚC 1: Danh sách GPU thiết bị di động (Mobile GPUs)
        // Nếu chứa các từ khóa này -> Chắc chắn 100% là điện thoại/tablet thật!
        const mobileGpuKeywords = [
          'adreno',      // Qualcomm Snapdragon (Samsung, Xiaomi, Oppo, Pixel, Vivo...)
          'mali',        // ARM Mali (Samsung Exynos, MediaTek Dimensity, Google Tensor...)
          'apple',       // Apple GPU (iPhone, iPad)
          'powervr',     // PowerVR
          'immortalis',  // MediaTek Immortalis
          'xclipse',     // Samsung Exynos RDNA
          'sgx',         // PowerVR SGX
          'ge8',         // PowerVR GE8320/GE8300
          'gm9'          // PowerVR GM9446
        ];

        const isMobileGPU = mobileGpuKeywords.some(keyword => renderer.includes(keyword));
        if (isMobileGPU) {
          // Là GPU di động thực tế -> Cho phép ngay, không kiểm tra desktop
          return { isAllowed: true };
        }

        // BƯỚC 2: Chỉ chặn các GPU PC/Laptop đặc trưng (loại trừ angle và opengl vì mobile cũng dùng)
        const desktopGpuKeywords = [
          'geforce', 'quadro', 'rtx ', 'gtx ', 'nvidia',
          'intel(r) iris', 'intel(r) hd', 'intel(r) uhd', 'intel(r) arc', 'intel corporation',
          'radeon rx', 'radeon pro', 'radeon hd',
          'direct3d11', 'direct3d12', 'direct3d9',
          'llvmpipe', 'softpipe', 'vmware', 'virtualbox', 'swiftshader'
        ];

        const isDesktopGPU = desktopGpuKeywords.some(keyword => renderer.includes(keyword));
        if (isDesktopGPU) {
          return {
            isAllowed: false,
            reason: 'Phát hiện phần cứng máy tính/laptop (Card đồ họa PC) đang sử dụng chế độ Responsive của DevTools. Tính năng điểm danh bị khóa.',
            detectedInfo: {
              gpu: renderer,
              isEmulated: true,
              reasonDetail: 'Phát hiện GPU máy tính'
            }
          };
        }
      }
    }
  } catch {
    // Fail-safe nếu trình duyệt chặn WebGL
  }

  // 4. Pointer & Hover Media Queries (Chuột máy tính vs Cảm ứng thực tế)
  if (typeof window.matchMedia === 'function') {
    const hasFinePointer = window.matchMedia('(pointer: fine) and (hover: hover)').matches;
    const touchPoints = navigator.maxTouchPoints || 0;
    // Nếu có chuột chuẩn xác nhưng không có điểm chạm cảm ứng nào
    if (hasFinePointer && touchPoints === 0) {
      return {
        isAllowed: false,
        reason: 'Phát hiện sử dụng chuột máy tính và không có màn hình cảm ứng di động.',
        detectedInfo: {
          isEmulated: true,
          reasonDetail: 'Chuột máy tính (pointer: fine)'
        }
      };
    }
  }

  return { isAllowed: true };
}

export default function QRScanner({ isOpen, onClose, onScanSuccess }: QRScannerProps) {
  const [mounted, setMounted] = useState(false);
  const [deviceCheck, setDeviceCheck] = useState<DeviceCheckResult>({ isAllowed: true });
  const [streamStatus, setStreamStatus] = useState<'idle' | 'starting' | 'scanning' | 'scanned' | 'error'>('idle');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [hasTorch, setHasTorch] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [currentDeviceIndex, setCurrentDeviceIndex] = useState(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isScanningRef = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Dừng camera và giải phóng tài nguyên
  const stopCamera = useCallback(() => {
    isScanningRef.current = false;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        try {
          track.stop();
        } catch {}
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsTorchOn(false);
  }, []);

  // Khởi động luồng video camera thời gian thực
  const startCamera = useCallback(async (preferredDeviceId?: string) => {
    stopCamera();
    setStreamStatus('starting');
    setCameraError(null);

    // Kiểm tra API mediaDevices & Secure Context
    const hasMediaDevices = typeof navigator !== 'undefined' && !!navigator.mediaDevices && !!navigator.mediaDevices.getUserMedia;
    const isSecCtx = typeof window !== 'undefined' ? window.isSecureContext : true;

    if (!hasMediaDevices) {
      if (!isSecCtx) {
        setCameraError('Camera trực tiếp yêu cầu kết nối bảo mật HTTPS. Vui lòng mở trang web bằng HTTPS và cấp quyền camera.');
      } else {
        setCameraError('Trình duyệt hoặc thiết bị này không hỗ trợ truy cập camera trực tiếp.');
      }
      setStreamStatus('error');
      return;
    }

    try {
      // Ưu tiên camera sau (environment) với fallback linh hoạt
      let stream: MediaStream;
      try {
        const constraints: MediaStreamConstraints = {
          audio: false,
          video: preferredDeviceId 
            ? { deviceId: { exact: preferredDeviceId } }
            : {
                facingMode: { ideal: 'environment' },
                width: { ideal: 1280 },
                height: { ideal: 720 }
              }
        };
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (firstErr: any) {
        if (firstErr.name === 'NotAllowedError' || firstErr.name === 'PermissionDeniedError') {
          throw firstErr;
        }
        // Fallback nhẹ hơn: không ép resolution
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: 'environment' }
        });
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
      }

      // Kiểm tra hỗ trợ đèn Flash/Torch
      const track = stream.getVideoTracks()[0];
      if (track) {
        const caps = (track.getCapabilities ? track.getCapabilities() : {}) as any;
        setHasTorch(!!caps.torch);
      }

      // Liệt kê các camera khả dụng
      try {
        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = allDevices.filter(d => d.kind === 'videoinput');
        setVideoDevices(videoInputs);
      } catch {
        // Bỏ qua lỗi enumerate
      }

      isScanningRef.current = true;
      setStreamStatus('scanning');
    } catch (err: any) {
      console.error('Camera start error:', err);
      let msg = 'Không thể kết nối với camera của thiết bị.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Trình duyệt bị từ chối quyền truy cập camera. Vui lòng cấp quyền trong cài đặt trình duyệt để quét QR.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = 'Không tìm thấy camera sau khả dụng trên thiết bị này.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        msg = 'Camera đang bị ứng dụng khác sử dụng hoặc bị khóa bởi hệ điều hành.';
      } else if (err.name === 'OverconstrainedError') {
        msg = 'Không tìm thấy camera môi trường (camera sau) phù hợp với yêu cầu.';
      }
      setCameraError(msg);
      setStreamStatus('error');
    }
  }, [stopCamera]);

  // Bật/tắt đèn Flash nếu thiết bị hỗ trợ
  const toggleTorch = async () => {
    if (!streamRef.current || !hasTorch) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track && (track.applyConstraints as any)) {
      try {
        const nextState = !isTorchOn;
        await track.applyConstraints({
          advanced: [{ torch: nextState }] as any
        });
        setIsTorchOn(nextState);
      } catch (err) {
        console.warn('Failed to toggle torch', err);
      }
    }
  };

  // Chuyển đổi giữa các camera sau (nếu có nhiều camera)
  const switchCamera = () => {
    if (videoDevices.length <= 1) return;
    const nextIndex = (currentDeviceIndex + 1) % videoDevices.length;
    setCurrentDeviceIndex(nextIndex);
    startCamera(videoDevices[nextIndex].deviceId);
  };

  // Vòng lặp quét từng khung hình từ camera stream qua jsQR
  useEffect(() => {
    if (streamStatus !== 'scanning') return;

    let animId: number;
    let lastScanTime = 0;
    const SCAN_INTERVAL_MS = 100; // Quét mỗi 100ms để mượt và tối ưu pin

    const scanFrame = () => {
      if (!isScanningRef.current) return;

      const now = performance.now();
      if (now - lastScanTime >= SCAN_INTERVAL_MS) {
        lastScanTime = now;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (video && canvas && video.readyState >= 2 && video.videoWidth > 0) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            
            const qr = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: 'dontInvert'
            });

            if (qr && qr.data && qr.data.trim()) {
              // Tìm thấy mã QR hợp lệ!
              isScanningRef.current = false;
              setStreamStatus('scanned');

              // Rung nhẹ phản hồi (nếu thiết bị hỗ trợ)
              if (typeof navigator !== 'undefined' && navigator.vibrate) {
                try { navigator.vibrate(120); } catch {}
              }

              onScanSuccess(qr.data.trim());

              // Tự động đóng sau 900ms để người dùng thấy trạng thái thành công
              setTimeout(() => {
                onClose();
              }, 900);
              return;
            }
          }
        }
      }

      animId = requestAnimationFrame(scanFrame);
    };

    animId = requestAnimationFrame(scanFrame);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [streamStatus, onScanSuccess, onClose]);

  // Quản lý vòng đời khi modal mở hoặc đóng
  useEffect(() => {
    if (isOpen) {
      const check = verifyPhysicalMobileDevice();
      setDeviceCheck(check);

      if (check.isAllowed) {
        startCamera();
      }
    } else {
      stopCamera();
      setStreamStatus('idle');
      setCameraError(null);
    }
  }, [isOpen, startCamera, stopCamera]);

  // Dọn dẹp khi unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-xs flex items-center justify-center z-[9999] p-4 animate-in fade-in duration-200">
      <style>{`
        @keyframes laserSweep {
          0% { top: 8%; opacity: 0.8; }
          50% { top: 88%; opacity: 1; }
          100% { top: 8%; opacity: 0.8; }
        }
        .laser-line {
          position: absolute;
          left: 6%;
          right: 6%;
          height: 2px;
          background: linear-gradient(90deg, transparent, #38bdf8, #60a5fa, #38bdf8, transparent);
          box-shadow: 0 0 14px 3px rgba(56, 189, 248, 0.7);
          animation: laserSweep 2.2s ease-in-out infinite;
        }
      `}</style>

      {/* Hidden canvas for real-time frame processing */}
      <canvas ref={canvasRef} className="hidden" />

      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden border border-gray-200 flex flex-col m-4">
        {/* Header - Tương tự giao diện cũ */}
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
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-gray-700"
            aria-label="Đóng"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* TRƯỜNG HỢP 1: BỊ CHẶN BỞI PHÁT HIỆN LAPTOP / DEVTOOLS */}
          {!deviceCheck.isAllowed ? (
            <div className="space-y-4">
              {/* Desktop Warning - Tương tự cái cũ */}
              <div className="bg-red-100 border-2 border-red-600 p-6 rounded-lg shadow-sm text-center">
                <div className="flex flex-col items-center">
                  <AlertCircle className="w-12 h-12 text-red-500 mb-3" />
                  <h3 className="text-lg font-bold text-red-600 mb-2">
                    Không hỗ trợ trên máy tính 
                  </h3>
                  <p className="text-gray-600 mb-4  text-sm">
                    <strong>Vui lòng:</strong> Truy cập trang web này bằng điện thoại hoặc tablet để sử dụng tính năng điểm danh QR.
                  </p>
                  <div className="bg-red-200 p-3 rounded-lg w-full mb-3">
                    <p className="text-gray-800 text-sm font-medium ">
                      Chỉ hỗ trợ: Smartphone/Tablet
                    </p>
                  </div>

                  {/* Thông tin chẩn đoán phần cứng phát hiện */}
                  {deviceCheck.detectedInfo && (
                    <div className="flex items-center flex-col bg-white/90 border border-red-200 rounded-lg p-3 text-left w-full text-xs text-gray-600 space-y-1 mt-1">
                      <div className="font-semibold text-red-700 flex items-center gap-1.5 ">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                        Lý do chặn: {deviceCheck.detectedInfo.reasonDetail || 'Phát hiện DevTools / Máy tính'}
                      </div>
                      {deviceCheck.detectedInfo.platform && (
                        <div className="flex justify-start gap-1">
                          <span>Hệ điều hành:</span>
                          <span className="font-mono text-gray-800 font-medium">{deviceCheck.detectedInfo.platform}</span>
                        </div>
                      )}
                      {deviceCheck.detectedInfo.gpu && (
                        <div className="break-words ">
                          <span>GPU: </span>
                          <span className="font-mono   text-gray-800 font-medium">{deviceCheck.detectedInfo.gpu.slice(0, 42)}...</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Instructions - Tương tự cái cũ */}
              <div className="bg-blue-100 border border-blue-600 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2 flex items-center">
                  <Lightbulb className="w-4 h-4 mr-2" />
                  Hướng dẫn sử dụng
                </h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li><strong>Thiết bị hỗ trợ:</strong> iPhone, iPad, Android phone/tablet</li>
                  <li><strong>Quét trực tiếp:</strong> Sử dụng camera sau để quét</li>
                </ul>
              </div>
            </div>
          ) : (
            /* TRƯỜNG HỢP 2: THIẾT BỊ DI ĐỘNG HỢP LỆ — LIVE CAMERA SCANNER */
            <div className="text-center py-2 space-y-4">
              {/* Vùng camera live */}
              <div className="relative w-full aspect-square max-w-[320px] mx-auto rounded-2xl overflow-hidden bg-black border-2 border-slate-700 shadow-md flex items-center justify-center">
                <video
                  ref={videoRef}
                  playsInline
                  autoPlay
                  muted
                  className={`w-full h-full object-cover transition-opacity duration-300 ${
                    streamStatus === 'scanning' || streamStatus === 'scanned' ? 'opacity-100' : 'opacity-0'
                  }`}
                />

                {streamStatus === 'starting' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/90 text-white space-y-3 p-4 text-center">
                    <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-xs text-gray-300">Đang khởi động camera sau...</p>
                  </div>
                )}

                {streamStatus === 'error' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/95 text-white space-y-3 p-5 text-center">
                    <div className="w-12 h-12 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400">
                      <AlertCircle className="w-6 h-6" />
                    </div>
                    <p className="text-xs text-red-200 leading-relaxed font-medium px-2">
                      {cameraError || 'Không thể mở camera trên thiết bị.'}
                    </p>

                    <button
                      onClick={() => startCamera()}
                      className="inline-flex items-center gap-2 py-2 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-semibold shadow-md transition-all mt-2"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Thử lại kết nối camera
                    </button>
                  </div>
                )}

                {streamStatus === 'scanning' && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="relative w-[75%] h-[75%] rounded-2xl border border-white/20">
                      <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-blue-400 rounded-tl-lg" />
                      <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-blue-400 rounded-tr-lg" />
                      <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-blue-400 rounded-bl-lg" />
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-blue-400 rounded-br-lg" />
                      <div className="laser-line" />
                    </div>
                  </div>
                )}

                {streamStatus === 'scanned' && (
                  <div className="absolute inset-0 bg-emerald-950/80 backdrop-blur-xs flex flex-col items-center justify-center text-emerald-300 space-y-2 animate-in zoom-in-95 duration-200">
                    <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center">
                      <CheckCircle className="w-9 h-9 text-emerald-400" />
                    </div>
                    <span className="text-sm font-bold text-white">Đã nhận diện QR!</span>
                    <span className="text-xs text-emerald-200">Đang ghi nhận điểm danh...</span>
                  </div>
                )}
              </div>

              {/* Toolbar */}
              {streamStatus === 'scanning' && (
                <div className="flex items-center justify-center gap-3">
                  {hasTorch && (
                    <button
                      onClick={toggleTorch}
                      className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all ${
                        isTorchOn 
                          ? 'bg-amber-100 border-amber-300 text-amber-800' 
                          : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {isTorchOn ? <ZapOff className="w-3.5 h-3.5 text-amber-600" /> : <Zap className="w-3.5 h-3.5" />}
                      {isTorchOn ? 'Tắt đèn' : 'Bật đèn'}
                    </button>
                  )}

                  {videoDevices.length > 1 && (
                    <button
                      onClick={switchCamera}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium bg-gray-100 border border-gray-300 text-gray-700 hover:bg-gray-200 transition-colors"
                    >
                      <SwitchCamera className="w-3.5 h-3.5 text-blue-600" />
                      Đổi camera
                    </button>
                  )}
                </div>
              )}

              {/* How it works box - Tương tự cũ */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-left">
                <h4 className="font-semibold text-gray-900 mb-2 flex items-center text-sm">
                  <Scan className="w-4 h-4 mr-2 text-blue-600" />
                  Cách thức hoạt động
                </h4>
                <div className="space-y-1.5 text-xs text-gray-600">
                  <div className="flex items-start space-x-2">
                    <span className="flex-shrink-0 w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-[10px] font-bold">1</span>
                    <span>Hướng camera vào mã QR hiển thị trên màn hình giáo viên</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="flex-shrink-0 w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-[10px] font-bold">2</span>
                    <span>Giữ thiết bị ổn định trong khung quét để hệ thống tự động nhận diện</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
}
