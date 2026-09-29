import { Request } from 'express';
import net from 'net';

/**
 * Trích xuất địa chỉ IP thực tế của client (hỗ trợ Cloudflare Tunnel, Reverse Proxy, Nginx, LAN, Localhost)
 */
export function getClientIp(req: Request): string {
  // 1. Cloudflare Tunnel / Cloudflare Proxy header
  const cfIp = req.headers['cf-connecting-ip'];
  if (typeof cfIp === 'string' && cfIp.trim()) {
    return cleanIp(cfIp);
  }

  // 2. Nginx / reverse proxy header
  const xRealIp = req.headers['x-real-ip'];
  if (typeof xRealIp === 'string' && xRealIp.trim()) {
    return cleanIp(xRealIp);
  }

  // 3. X-Forwarded-For header (lấy IP đầu tiên trong danh sách proxy)
  const xForwardedFor = req.headers['x-forwarded-for'];
  if (typeof xForwardedFor === 'string' && xForwardedFor.trim()) {
    const firstIp = xForwardedFor.split(',')[0].trim();
    if (firstIp) return cleanIp(firstIp);
  }

  // 4. Express req.ip hoặc Socket remoteAddress
  const raw = req.ip || req.socket.remoteAddress || '';
  return cleanIp(raw);
}

/**
 * Chuẩn hóa chuỗi IP (loại bỏ ::ffff:, port, khoảng trắng)
 */
export function cleanIp(raw: string): string {
  let ip = raw.trim().replace(/^::ffff:/i, '');
  // Nếu có kèm cổng (ví dụ: 192.168.1.1:54321), chỉ lấy phần IP
  if (/^\d+\.\d+\.\d+\.\d+:\d+$/.test(ip)) {
    ip = ip.split(':')[0];
  }
  if (ip === '::1') return '127.0.0.1';
  return ip;
}

export function isValidIp(value: string): boolean {
  if (!value) return false;
  return net.isIP(cleanIp(value)) !== 0;
}

let cachedWanIp: { ip: string; expiresAt: number } | null = null;

/**
 * Lấy IP WAN công khai của máy chủ/thiết bị hiện tại (khi đang chạy ở localhost / LAN nội bộ)
 */
export async function getPublicWanIp(): Promise<string | null> {
  const now = Date.now();
  if (cachedWanIp && cachedWanIp.expiresAt > now) {
    return cachedWanIp.ip;
  }

  const services = [
    'https://api.ipify.org?format=json',
    'https://api64.ipify.org?format=json',
    'https://ifconfig.me/all.json'
  ];

  for (const url of services) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      if (res.ok) {
        const data = await res.json() as any;
        const ip = data.ip || data.ip_addr;
        if (ip && isValidIp(ip)) {
          const cleaned = cleanIp(ip);
          cachedWanIp = { ip: cleaned, expiresAt: now + 5 * 60 * 1000 };
          return cleaned;
        }
      }
    } catch {
      // try next
    }
  }
  return null;
}

/**
 * Kiểm tra xem IP có thuộc dải mạng nội bộ riêng (Private LAN) hay không
 */
export function isPrivateIp(ip: string): boolean {
  const cleaned = cleanIp(ip);
  if (cleaned === '127.0.0.1' || cleaned === 'localhost') return true;
  // 10.0.0.0 - 10.255.255.255
  if (/^10\./.test(cleaned)) return true;
  // 172.16.0.0 - 172.31.255.255
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(cleaned)) return true;
  // 192.168.0.0 - 192.168.255.255
  if (/^192\.168\./.test(cleaned)) return true;
  return false;
}

/**
 * So sánh thông minh giữa IP yêu cầu của buổi học và IP của sinh viên:
 * 1. Khớp chính xác hoàn toàn (cho IP công khai / WAN khi ra Internet).
 * 2. Cùng là Localhost.
 * 3. Fallback khi tạo buổi học trên localhost (127.0.0.1) nhưng sinh viên quét qua Tunnel:
 *    So sánh với public WAN IP hiện tại của giảng viên/server.
 * 4. Nếu là IP mạng nội bộ (LAN Wi-Fi), kiểm tra cùng subnet /24 (cùng 3 octet đầu).
 */
export function isNetworkMatch(requiredIp: string, clientIp: string, serverWanIp?: string | null): boolean {
  const reqClean = cleanIp(requiredIp);
  const cliClean = cleanIp(clientIp);

  if (!reqClean || !cliClean) return false;

  // 1. Khớp chính xác hoàn toàn
  if (reqClean === cliClean) return true;

  // 2. Cùng là Localhost
  const isReqLocal = reqClean === '127.0.0.1' || reqClean === 'localhost';
  const isCliLocal = cliClean === '127.0.0.1' || cliClean === 'localhost';
  if (isReqLocal && isCliLocal) return true;

  // 3. Fallback: Nếu mạng lưu là localhost hoặc LAN, nhưng sinh viên kết nối từ bên ngoài qua Tunnel/Domain
  // và clientIp trùng khớp với WAN IP của máy chủ/giảng viên (tức là cùng Wi-Fi router):
  if ((isReqLocal || isPrivateIp(reqClean)) && serverWanIp && cleanIp(serverWanIp) === cliClean) {
    return true;
  }

  // 4. Cùng mạng LAN nội bộ (/24 subnet - ví dụ 192.168.0.x và 192.168.0.y)
  if (isPrivateIp(reqClean) && isPrivateIp(cliClean)) {
    const reqParts = reqClean.split('.');
    const cliParts = cliClean.split('.');
    if (reqParts.length === 4 && cliParts.length === 4) {
      if (reqParts[0] === cliParts[0] && reqParts[1] === cliParts[1] && reqParts[2] === cliParts[2]) {
        return true;
      }
    }
  }

  return false;
}
