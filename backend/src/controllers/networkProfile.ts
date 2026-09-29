import { Request, Response } from 'express';
import prisma from '../prisma';
import { UserPayload } from '../types';
import { cleanIp, getClientIp, getPublicWanIp, isPrivateIp, isValidIp } from '../utils/clientIp';

interface AuthenticatedRequest extends Request {
  user?: UserPayload;
}

export const getNetworkProfiles = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
  const ownerId = req.user?.userId;
  if (!ownerId) return res.status(401).json({ success: false, message: 'Unauthorized' });

  const profiles = await prisma.networkProfile.findMany({
    where: { ownerId, isActive: true },
    orderBy: { lastVerifiedAt: 'desc' },
    select: { id: true, name: true, publicIp: true, provider: true, lastVerifiedAt: true, createdAt: true }
  });
  return res.json({ success: true, data: profiles });
};

export const detectNetwork = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
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
};

export const createNetworkProfile = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
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
};

export const deleteNetworkProfile = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
  const ownerId = req.user?.userId;
  const { profileId } = req.params;
  if (!ownerId) return res.status(401).json({ success: false, message: 'Unauthorized' });

  const profile = await prisma.networkProfile.findFirst({ where: { id: profileId, ownerId } });
  if (!profile) return res.status(404).json({ success: false, message: 'Network profile not found' });

  await prisma.networkProfile.update({ where: { id: profileId }, data: { isActive: false } });
  return res.json({ success: true, message: 'Network profile disabled' });
};
