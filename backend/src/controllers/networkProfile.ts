import { Request, Response } from 'express';
import prisma from '../prisma';
import { UserPayload } from '../types';
import { cleanIp, getClientIp, getPublicWanIp, isPrivateIp, isValidIp } from '../utils/clientIp';

interface AuthenticatedRequest extends Request {
  user?: UserPayload;
}

export const getNetworkProfiles = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
  try {
    const ownerId = req.user?.userId;
    if (!ownerId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const profiles = await prisma.networkProfile.findMany({
      where: { ownerId, isActive: true },
      orderBy: { lastVerifiedAt: 'desc' },
      select: { id: true, name: true, publicIp: true, provider: true, lastVerifiedAt: true, createdAt: true }
    });
    return res.json({ success: true, data: profiles });
  } catch (error: any) {
    console.error('Error in getNetworkProfiles:', error);
    return res.status(500).json({ success: false, message: error.message || 'Lỗi lấy danh sách mạng' });
  }
};

export const detectNetwork = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
  try {
    let ip = getClientIp(req);
    let isFromWanService = false;

    // Nếu truy cập từ localhost hoặc mạng LAN, tự động truy vấn WAN IP thực tế của router
    if (isPrivateIp(ip) || ip === '127.0.0.1') {
      const wanIp = await getPublicWanIp();
      if (wanIp) {
        ip = wanIp;
        isFromWanService = true;
      }
    }

    if (!isValidIp(ip)) return res.status(400).json({ success: false, message: 'Unable to detect a valid client IP' });
    return res.json({ 
      success: true, 
      data: { 
        clientIp: ip, 
        publicIp: ip, 
        isPrivate: isPrivateIp(ip), 
        isFromWanService,
        connectionType: req.headers['x-network-type'] || null 
      } 
    });
  } catch (error: any) {
    console.error('Error in detectNetwork:', error);
    return res.status(500).json({ success: false, message: error.message || 'Lỗi nhận diện mạng' });
  }
};

export const createNetworkProfile = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
  try {
    const ownerId = req.user?.userId;
    if (!ownerId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    if (name.length < 2 || name.length > 80) {
      return res.status(400).json({ success: false, message: 'Network name must be between 2 and 80 characters' });
    }

    // Cho phép client truyền IP đã nhận diện (hoặc fallback sang WAN/getClientIp)
    let publicIp = typeof req.body?.publicIp === 'string' ? cleanIp(req.body.publicIp) : '';
    if (!isValidIp(publicIp)) {
      publicIp = getClientIp(req);
      if (isPrivateIp(publicIp) || publicIp === '127.0.0.1') {
        const wanIp = await getPublicWanIp();
        if (wanIp) publicIp = wanIp;
      }
    }

    if (!isValidIp(publicIp)) return res.status(400).json({ success: false, message: 'Unable to detect a valid client IP' });

    const profile = await prisma.networkProfile.upsert({
      where: { ownerId_publicIp: { ownerId, publicIp } },
      create: { ownerId, name, publicIp },
      update: { name, isActive: true, lastVerifiedAt: new Date() },
      select: { id: true, name: true, publicIp: true, provider: true, lastVerifiedAt: true, createdAt: true }
    });

    return res.status(201).json({ success: true, data: profile, message: 'Network profile saved' });
  } catch (error: any) {
    console.error('Error in createNetworkProfile:', error);
    return res.status(500).json({ success: false, message: error.message || 'Lỗi tạo cấu hình mạng' });
  }
};

export const deleteNetworkProfile = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
  try {
    const ownerId = req.user?.userId;
    const { profileId } = req.params;
    if (!ownerId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const profile = await prisma.networkProfile.findFirst({ where: { id: profileId, ownerId } });
    if (!profile) return res.status(404).json({ success: false, message: 'Network profile not found' });

    // Hủy liên kết các buổi học đang dùng profile này về không giới hạn IP
    await prisma.attendanceSession.updateMany({
      where: { networkProfileId: profileId },
      data: { networkProfileId: null, networkEnforcementMode: 'OFF' }
    });

    // Xóa vĩnh viễn profile để giải phóng hoàn toàn ràng buộc unique (ownerId, publicIp)
    await prisma.networkProfile.delete({ where: { id: profileId } });
    return res.json({ success: true, message: 'Đã xóa cấu hình mạng thành công' });
  } catch (error: any) {
    console.error('Error in deleteNetworkProfile:', error);
    return res.status(500).json({ success: false, message: error.message || 'Lỗi xóa cấu hình mạng' });
  }
};

export const updateNetworkProfile = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
  try {
    const ownerId = req.user?.userId;
    const { profileId } = req.params;
    if (!ownerId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const profile = await prisma.networkProfile.findFirst({ where: { id: profileId, ownerId } });
    if (!profile) return res.status(404).json({ success: false, message: 'Network profile not found' });

    const { name, publicIp } = req.body;
    const updateData: any = {};

    if (name !== undefined) {
      const trimmedName = typeof name === 'string' ? name.trim() : '';
      if (trimmedName.length < 2 || trimmedName.length > 80) {
        return res.status(400).json({ success: false, message: 'Tên mạng phải từ 2 đến 80 ký tự' });
      }
      updateData.name = trimmedName;
    }

    if (publicIp !== undefined) {
      const cleaned = cleanIp(publicIp);
      if (!isValidIp(cleaned)) {
        return res.status(400).json({ success: false, message: 'Địa chỉ IP không hợp lệ' });
      }

      // Chỉ kiểm tra và cập nhật nếu IP thực sự thay đổi khác với IP hiện tại của profile
      if (cleaned !== profile.publicIp) {
        const existing = await prisma.networkProfile.findFirst({
          where: {
            ownerId,
            publicIp: cleaned,
            id: { not: profileId }
          }
        });

        if (existing) {
          if (existing.isActive) {
            return res.status(400).json({
              success: false,
              message: `Địa chỉ IP ${cleaned} đã được dùng cho mạng "${existing.name}"`
            });
          } else {
            // Nếu là profile cũ đã bị tắt/xóa (inactive), chuyển liên kết buổi học sang profile này và xóa bản ghi cũ để giải phóng ràng buộc unique
            await prisma.attendanceSession.updateMany({
              where: { networkProfileId: existing.id },
              data: { networkProfileId: profileId }
            });
            await prisma.networkProfile.delete({ where: { id: existing.id } });
          }
        }

        updateData.publicIp = cleaned;
      }
    }

    updateData.lastVerifiedAt = new Date();

    const updated = await prisma.networkProfile.update({
      where: { id: profileId },
      data: updateData,
      select: { id: true, name: true, publicIp: true, provider: true, lastVerifiedAt: true, createdAt: true }
    });

    return res.json({ success: true, data: updated, message: 'Cập nhật cấu hình mạng thành công' });
  } catch (error: any) {
    console.error('Error in updateNetworkProfile:', error);
    return res.status(500).json({ success: false, message: error.message || 'Lỗi cập nhật cấu hình mạng' });
  }
};
