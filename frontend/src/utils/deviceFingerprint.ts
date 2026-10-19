/**
 * Device Fingerprint & Geolocation Utility
 * Student Management System - DunexSoft
 * Generates and stores a persistent, unique device identifier for attendance integrity
 */

const STORAGE_KEY = 'sms_device_fingerprint_id';

/**
 * Tạo một chuỗi hash từ thông tin phần cứng/trình duyệt
 */
const generateBrowserTraitsHash = (): string => {
  if (typeof window === 'undefined') return 'server_env';

  const traits = [
    navigator.userAgent || '',
    navigator.language || '',
    (typeof screen !== 'undefined' ? `${screen.width}x${screen.height}` : ''),
    (typeof screen !== 'undefined' ? screen.colorDepth : ''),
    new Date().getTimezoneOffset(),
    navigator.hardwareConcurrency || ''
  ].join('###');

  let hash = 0;
  for (let i = 0; i < traits.length; i++) {
    const char = traits.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
};

/**
 * Lấy hoặc tạo mã định danh duy nhất cho thiết bị (Device ID)
 */
export const getOrCreateDeviceId = (): string => {
  if (typeof window === 'undefined') return 'unknown_device';

  try {
    let existingId = localStorage.getItem(STORAGE_KEY);
    if (!existingId || existingId.trim() === '') {
      const randomPart = Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
      const traitsHash = generateBrowserTraitsHash();
      existingId = `DEV_${traitsHash}_${randomPart}`;
      localStorage.setItem(STORAGE_KEY, existingId);
    }
    return existingId;
  } catch (error) {
    console.warn('Cannot access localStorage for deviceId:', error);
    return `TMP_${generateBrowserTraitsHash()}`;
  }
};

/**
 * Hàm hỗ trợ lấy tọa độ GPS nhanh (với timeout an toàn)
 */
export const getCurrentPositionPromise = (timeoutMs: number = 6000): Promise<{ latitude: number; longitude: number } | null> => {
  if (typeof window === 'undefined' || !navigator.geolocation) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    let resolved = false;

    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve(null);
      }
    }, timeoutMs);

    const tryGetPosition = (highAccuracy: boolean) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timer);
            resolve({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            });
          }
        },
        (error) => {
          // Nếu thử High Accuracy thất bại hoặc timeout (thường xảy ra trong nhà / trên Cốc Cốc / PC), thử lại với High Accuracy = false
          if (highAccuracy && !resolved) {
            tryGetPosition(false);
            return;
          }
          if (!resolved) {
            resolved = true;
            clearTimeout(timer);
            console.warn('Geolocation warning / permission not granted:', error.message);
            resolve(null);
          }
        },
        {
          enableHighAccuracy: highAccuracy,
          timeout: highAccuracy ? Math.min(timeoutMs, 3800) : timeoutMs,
          maximumAge: 45000 // Tái sử dụng tọa độ đã lấy trong vòng 45s trước đó (giúp trả về tức thì nếu vừa mở camera)
        }
      );
    };

    tryGetPosition(true);
  });
};
