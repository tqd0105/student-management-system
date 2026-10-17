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
  ShieldCheck,
  Smartphone, 
  SwitchCamera,
  Laptop,
  Wifi,
  MapPin
} from 'lucide-react';
import jsQR from 'jsqr';

interface QRScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (qrData: string) => void;
}

interface DeviceInfo {
  isLaptop: boolean;
  platform: string;
}

/**
 * Nhận diện loại thiết bị để tùy biến gợi ý UX phù hợp cho Laptop hoặc Smartphone/Tablet
 */
function detectDevice(): DeviceInfo {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return { isLaptop: false, platform: 'Unknown' };
  }

  const ua = navigator.userAgent || '';
  const standardMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const isIPadOS = /Macintosh/i.test(ua) && (navigator.maxTouchPoints || 0) > 1;

  return {
    isLaptop: !standardMobile && !isIPadOS,
    platform: navigator.platform || 'Máy tính'
  };
}

export default function QRScanner({ isOpen, onClose, onScanSuccess }: QRScannerProps) {
  const [mounted, setMounted] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>({ isLaptop: false, platform: '' });
  const [streamStatus, setStreamStatus] = useState<'idle' | 'starting' | 'scanning' | 'scanned' | 'error'>('idle');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [hasTorch, setHasTorch] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [currentDeviceIndex, setCurrentDeviceIndex] = useState(0);
  const [gpsReady, setGpsReady] = useState<boolean | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isScanningRef = useRef(false);
  const cameraSessionIdRef = useRef(0);
  const isCheckingGpsRef = useRef(false);

  // Hàm kiểm tra định vị GPS thông minh (hỗ trợ fallback và không block luồng)
  const checkGpsLocation = useCallback((silent = false) => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setGpsReady(false);
      return;
    }

    if (isCheckingGpsRef.current) return;
    isCheckingGpsRef.current = true;

    if (!silent) {
      setGpsReady(null);
    }

    const onSuccess = () => {
      isCheckingGpsRef.current = false;
      setGpsReady(true);
    };

    const onError = (_err: GeolocationPositionError, triedLowAccuracy: boolean) => {
      if (!triedLowAccuracy) {
        navigator.geolocation.getCurrentPosition(
          onSuccess,
          (secondErr) => onError(secondErr, true),
          { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }
        );
        return;
      }
      isCheckingGpsRef.current = false;
      setGpsReady(false);
    };

    navigator.geolocation.getCurrentPosition(
      onSuccess,
      (firstErr) => onError(firstErr, false),
      { enableHighAccuracy: true, timeout: 3500, maximumAge: 60000 }
    );
  }, []);

  // 1. Dò vị trí ngay khi component mount
  useEffect(() => {
    setMounted(true);
    checkGpsLocation(false);
  }, [checkGpsLocation]);

  // 2. Tự động kiểm tra lại ngay khi sinh viên quay lại tab trình duyệt (sau khi bật vị trí ở thanh trạng thái hoặc Cài đặt)
  useEffect(() => {
    const handleRecheckOnFocus = () => {
      if (document.visibilityState === 'visible' && !gpsReady) {
        checkGpsLocation(false);
      }
    };

    window.addEventListener('focus', handleRecheckOnFocus);
    document.addEventListener('visibilitychange', handleRecheckOnFocus);

    return () => {
      window.removeEventListener('focus', handleRecheckOnFocus);
      document.removeEventListener('visibilitychange', handleRecheckOnFocus);
    };
  }, [gpsReady, checkGpsLocation]);

  // 3. Lắng nghe trực tiếp sự kiện thay đổi quyền qua Permissions API (nếu trình duyệt hỗ trợ)
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'permissions' in navigator) {
      navigator.permissions
        .query({ name: 'geolocation' as PermissionName })
        .then((status) => {
          if (status.state === 'granted') {
            checkGpsLocation(true);
          }
          status.onchange = () => {
            if (status.state === 'granted') {
              checkGpsLocation(false);
            } else if (status.state === 'denied') {
              setGpsReady(false);
            }
          };
        })
        .catch(() => {});
    }
  }, [checkGpsLocation]);

  // 4. Polling tự động nhẹ (mỗi 3.5s) khi chưa có GPS để tự nhảy sang Đã sẵn sàng ngay khi người dùng bật
  useEffect(() => {
    if (gpsReady === true) return;

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        checkGpsLocation(true);
      }
    }, 3500);

    return () => clearInterval(interval);
  }, [gpsReady, checkGpsLocation]);

  // Dừng camera và giải phóng triệt để tài nguyên phần cứng (tắt đèn LED camera)
  const stopCamera = useCallback(() => {
    // Tăng session ID để vô hiệu hóa bất kỳ request getUserMedia nào đang chạy dở dang
    cameraSessionIdRef.current += 1;
    isScanningRef.current = false;

    // 1. Dừng và giải phóng toàn bộ tracks trong streamRef
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach(track => {
          try {
            track.stop();
            track.enabled = false;
          } catch (e) {
            console.warn('Error stopping track in streamRef:', e);
          }
        });
      } catch (e) {
        console.warn('Error accessing stream tracks:', e);
      }
      streamRef.current = null;
    }

    // 2. Dừng và giải phóng toàn bộ tracks đang gắn trực tiếp trên thẻ videoRef (phòng trường hợp streamRef bị lệch)
    if (videoRef.current) {
      try {
        if (videoRef.current.srcObject) {
          const stream = videoRef.current.srcObject as MediaStream;
          if (stream && typeof stream.getTracks === 'function') {
            stream.getTracks().forEach(track => {
              try {
                track.stop();
                track.enabled = false;
              } catch (e) {
                console.warn('Error stopping video srcObject track:', e);
              }
            });
          }
          videoRef.current.srcObject = null;
        }
        videoRef.current.pause();
      } catch (e) {
        console.warn('Error cleaning up video element:', e);
      }
    }

    setIsTorchOn(false);
  }, []);

  // Hàm đóng an toàn: Tắt camera ngay lập tức TRƯỚC KHI đóng modal
  const handleClose = useCallback(() => {
    stopCamera();
    onClose();
  }, [stopCamera, onClose]);

  // Khởi động luồng video camera thời gian thực (Hỗ trợ cả Mobile Camera sau và Laptop Webcam / Virtual Phone Cam)
  const startCamera = useCallback(async (preferredDeviceId?: string) => {
    stopCamera();
    const currentSessionId = cameraSessionIdRef.current;
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
      // Ưu tiên camera sau trên điện thoại, hoặc camera mặc định/webcam trên laptop
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
        // Fallback linh hoạt: Chấp nhận mọi camera khả dụng (Webcam laptop / Camera trước / Camera ảo DroidCam)
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: preferredDeviceId ? { deviceId: { exact: preferredDeviceId } } : true
        });
      }

      // NẾU TRONG LÚC ĐANG CHỜ CAMERA MÀ NGƯỜI DÙNG ĐÃ BẤM ĐÓNG HOẶC ĐỔI CAMERA:
      if (currentSessionId !== cameraSessionIdRef.current) {
        // Lập tức ngắt và tắt toàn bộ tracks vừa được trình duyệt cấp phát!
        stream.getTracks().forEach(track => {
          try {
            track.stop();
            track.enabled = false;
          } catch {}
        });
        return;
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
      }

      // Kiểm tra lại lần nữa sau await play() đề phòng đóng trong lúc render
      if (currentSessionId !== cameraSessionIdRef.current) {
        stream.getTracks().forEach(track => {
          try {
            track.stop();
            track.enabled = false;
          } catch {}
        });
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
        streamRef.current = null;
        return;
      }

      // Kiểm tra hỗ trợ đèn Flash/Torch (chủ yếu có trên Smartphone)
      const track = stream.getVideoTracks()[0];
      if (track) {
        const caps = (track.getCapabilities ? track.getCapabilities() : {}) as any;
        setHasTorch(!!caps.torch);
      }

      // Liệt kê các camera khả dụng (Webcam máy tính, DroidCam, Iriun, Camera sau...)
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
      if (currentSessionId !== cameraSessionIdRef.current) {
        return; // Đã đóng hoặc đổi camera, không hiển thị lỗi cũ
      }
      console.error('Camera start error:', err);
      let msg = 'Không thể kết nối với camera của thiết bị.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Trình duyệt bị từ chối quyền truy cập camera. Vui lòng cấp quyền trong cài đặt trình duyệt để quét QR.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = 'Không tìm thấy camera khả dụng. Nếu dùng laptop, hãy kiểm tra webcam hoặc ứng dụng kết nối camera điện thoại (DroidCam, Iriun, Camo...).';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        msg = 'Camera đang bị ứng dụng khác (Zoom, Teams...) sử dụng hoặc bị khóa bởi hệ điều hành.';
      } else if (err.name === 'OverconstrainedError') {
        msg = 'Yêu cầu camera không được hỗ trợ bởi thiết bị hiện tại.';
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

  // Chuyển đổi giữa các camera (Webcam máy tính, Camera sau, hoặc Camera điện thoại kết nối)
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

              // Tự động tắt camera và đóng sau 900ms để người dùng thấy trạng thái thành công
              setTimeout(() => {
                handleClose();
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
  }, [streamStatus, onScanSuccess, handleClose]);

  // Quản lý vòng đời khi modal mở hoặc đóng
  useEffect(() => {
    if (isOpen) {
      const dev = detectDevice();
      setDeviceInfo(dev);
      startCamera();
    } else {
      stopCamera();
      setStreamStatus('idle');
      setCameraError(null);
    }
  }, [isOpen, startCamera, stopCamera]);

  // Lắng nghe phím ESC để đóng an toàn
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  // Dọn dẹp tuyệt đối khi unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div 
      onClick={handleClose}
      className="fixed inset-0 bg-gray-900/40 backdrop-blur-xs flex items-center justify-center z-[9999] p-4 animate-in fade-in duration-200 cursor-pointer"
    >
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

      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden border border-gray-200 flex flex-col m-4 cursor-default"
      >
        {/* Header với nhận diện thiết bị & huy hiệu IP verification */}
        <div className="flex justify-between items-center p-5 sm:p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Scan className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900">QR Scanner</h3>
                {deviceInfo.isLaptop ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                    <Laptop className="w-3 h-3 text-emerald-600" />
                    Laptop / Webcam
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/80">
                    <Smartphone className="w-3 h-3 text-blue-600" />
                    Mobile
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-gray-500">Quét mã QR để điểm danh</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-gray-700 cursor-pointer"
            aria-label="Đóng"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Anti-Fraud Diagnostic Strip */}
        <div className="px-5 py-2.5 bg-slate-50 border-b border-gray-200/80 flex items-center justify-between text-[11px]">
          {gpsReady === true ? (
            <div className="inline-flex items-center gap-1.5 font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 shadow-2xs">
              <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>GPS: Đã sẵn sàng</span>
            </div>
          ) : gpsReady === false ? (
            <button
              type="button"
              onClick={() => checkGpsLocation(false)}
              className="inline-flex items-center gap-1.5 font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-300 shadow-2xs transition-colors cursor-pointer group"
              title="Bấm để thử dò lại vị trí GPS ngay"
            >
              <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0 animate-bounce" />
              <span>GPS: Chưa định vị</span>
              <span className="text-[10px] text-amber-700 underline flex items-center gap-0.5 ml-1">
                <RefreshCw className="w-3 h-3 group-hover:rotate-180 transition-transform" />
                Dò lại
              </span>
            </button>
          ) : (
            <div className="inline-flex items-center gap-1.5 font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
              <RefreshCw className="w-3.5 h-3.5 text-cyan-600 animate-spin shrink-0" />
              <span>GPS: Đang dò vị trí...</span>
            </div>
          )}

          <div className="flex items-center gap-1.5 font-semibold text-gray-700">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-600" />
            <span>Thiết bị: Đã định danh</span>
          </div>
        </div>

        {/* Content - LIVE CAMERA SCANNER (Hoạt động cho cả Mobile, Tablet và Laptop) */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto max-h-[75vh]">
          <div className="text-center py-1 space-y-4">
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
                  <p className="text-xs text-gray-300">
                    {deviceInfo.isLaptop ? 'Đang khởi động webcam / camera...' : 'Đang khởi động camera sau...'}
                  </p>
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
                    className="inline-flex items-center gap-2 py-2 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-semibold shadow-md transition-all mt-2 cursor-pointer"
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
                  <span className="text-xs text-emerald-200">Đang ghi nhận điểm danh qua IP...</span>
                </div>
              )}
            </div>

            {/* Toolbar công cụ camera */}
            {streamStatus === 'scanning' && (
              <div className="flex flex-wrap items-center justify-center gap-2.5">
                {hasTorch && (
                  <button
                    onClick={toggleTorch}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer ${
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
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium bg-gray-100 border border-gray-300 text-gray-700 hover:bg-gray-200 transition-colors cursor-pointer"
                    title="Chuyển đổi giữa Webcam và Camera điện thoại kết nối"
                  >
                    <SwitchCamera className="w-3.5 h-3.5 text-blue-600" />
                    <span>
                      Đổi camera ({currentDeviceIndex + 1}/{videoDevices.length})
                    </span>
                  </button>
                )}
              </div>
            )}

            {/* Khối hướng dẫn và thông tin xác thực IP */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 sm:p-4 text-left space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-gray-900 flex items-center text-xs sm:text-sm">
                  <Scan className="w-4 h-4 mr-1.5 text-blue-600" />
                  Hướng dẫn quét mã
                </h4>
              </div>

              <div className="space-y-1.5 text-xs text-gray-600">
                <div className="flex items-start space-x-2">
                  <span className="flex-shrink-0 w-4 h-4 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-[10px] font-bold">1</span>
                  <span>Hướng camera vào mã QR điểm danh hiển thị trên màn hình giảng viên.</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="flex-shrink-0 w-4 h-4 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-[10px] font-bold">2</span>
                  <span>Giữ camera ổn định trong khung quét vuông để hệ thống nhận diện tự động.</span>
                </div>

                {/* Gợi ý tiện lợi cho sinh viên sử dụng Laptop */}
                {deviceInfo.isLaptop && (
                  <div className="flex items-start space-x-2 pt-1.5 mt-2 border-t border-gray-200/80 text-blue-900 bg-blue-50/80 p-2.5 rounded-lg">
                    <Lightbulb className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <span className="text-[11px] leading-relaxed">
                      <strong>Mẹo Laptop:</strong> Bạn có thể dùng Webcam tích hợp của laptop hoặc kết nối camera điện thoại (qua PhoneLink, DroidCam, Iriun,...) rồi bấm nút <strong>Đổi camera</strong> để quét cực kỳ dễ dàng!
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
}
