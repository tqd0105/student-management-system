import {
  CreateDistributionCommand,
  CreateInvalidationCommand,
  CreateOriginAccessControlCommand,
  GetDistributionCommand,
  ListDistributionsCommand,
  ListOriginAccessControlsCommand,
  type DistributionConfig,
} from "@aws-sdk/client-cloudfront";
import { cloudFrontClient, CLOUDFRONT_CONFIG } from "../config/cloudfront.js";

// AWS Managed Cache Policy ID: Managed-CachingOptimized
export const MANAGED_CACHING_OPTIMIZED_POLICY_ID =
  "658327ea-f89d-4fab-a63d-7e88639e58f6";

// AWS Managed Response Headers Policy ID: Managed-CORS-With-Preflight
export const MANAGED_CORS_S3_ORIGIN_POLICY_ID =
  "5cc3b908-e619-4b99-88e5-2cf7f45965bd";

/**
 * Tạo URL truy cập file qua CloudFront CDN
 */
export function getCloudFrontUrl(key: string, customDomain?: string): string {
  const domain =
    customDomain !== undefined ? customDomain : CLOUDFRONT_CONFIG.domain;
  if (!domain) {
    throw new Error("CloudFront domain is not configured");
  }
  const cleanKey = key.startsWith("/") ? key.substring(1) : key;
  return `https://${domain}/${cleanKey}`;
}

/**
 * Tạo hoặc lấy Origin Access Control (OAC) cho S3 bucket
 */
export async function createOrGetOriginAccessControl(
  name = "s3-file-storage-oac",
  description = "Origin Access Control for S3 file storage",
): Promise<{ id: string; name: string }> {
  // 1. Kiểm tra OAC đã tồn tại chưa
  try {
    const listRes = await cloudFrontClient.send(
      new ListOriginAccessControlsCommand({}),
    );
    const existing = listRes.OriginAccessControlList?.Items?.find(
      (item) => item.Name === name,
    );
    if (existing?.Id) {
      return { id: existing.Id, name: existing.Name || name };
    }
  } catch (err) {
    // Tiếp tục tạo mới nếu danh sách rỗng
  }

  // 2. Tạo OAC mới
  const createRes = await cloudFrontClient.send(
    new CreateOriginAccessControlCommand({
      OriginAccessControlConfig: {
        Name: name,
        Description: description,
        OriginAccessControlOriginType: "s3",
        SigningBehavior: "always",
        SigningProtocol: "sigv4",
      },
    }),
  );

  const oacId = createRes.OriginAccessControl?.Id;
  if (!oacId) {
    throw new Error("Failed to create CloudFront Origin Access Control");
  }

  return { id: oacId, name };
}

export interface DistributionParams {
  bucketName: string;
  bucketRegion: string;
  oacId: string;
  comment?: string;
}

/**
 * Tạo hoặc lấy Distribution trỏ tới S3 bucket chỉ định
 */
export async function createOrGetDistribution(
  params: DistributionParams,
): Promise<{ distributionId: string; domainName: string; status: string }> {
  const s3OriginDomain = `${params.bucketName}.s3.${params.bucketRegion}.amazonaws.com`;
  const originId = `S3-${params.bucketName}`;

  // 1. Kiểm tra xem Distribution cho bucket này đã tồn tại chưa
  try {
    const listRes = await cloudFrontClient.send(
      new ListDistributionsCommand({}),
    );
    const existing = listRes.DistributionList?.Items?.find((item) =>
      item.Origins?.Items?.some((origin) => origin.DomainName === s3OriginDomain),
    );

    if (existing?.Id && existing?.DomainName) {
      return {
        distributionId: existing.Id,
        domainName: existing.DomainName,
        status: existing.Status || "Unknown",
      };
    }
  } catch (err) {
    // Tiếp tục tạo mới
  }

  // 2. Cấu hình Distribution
  const distributionConfig: DistributionConfig = {
    CallerReference: `s3-distribution-${Date.now()}`,
    Comment:
      params.comment ||
      "CloudFront CDN for Student Management System File Storage",
    Enabled: true,
    PriceClass: "PriceClass_100", // Tối ưu chi phí: US, Europe, Asia (gồm Singapore & VN)
    Origins: {
      Quantity: 1,
      Items: [
        {
          Id: originId,
          DomainName: s3OriginDomain,
          OriginAccessControlId: params.oacId,
          S3OriginConfig: {
            OriginAccessIdentity: "", // Để trống khi dùng OAC thay cho legacy OAI
          },
        },
      ],
    },
    DefaultCacheBehavior: {
      TargetOriginId: originId,
      ViewerProtocolPolicy: "redirect-to-https",
      AllowedMethods: {
        Quantity: 3,
        Items: ["GET", "HEAD", "OPTIONS"],
        CachedMethods: {
          Quantity: 2,
          Items: ["GET", "HEAD"],
        },
      },
      Compress: true,
      CachePolicyId: MANAGED_CACHING_OPTIMIZED_POLICY_ID,
      ResponseHeadersPolicyId: MANAGED_CORS_S3_ORIGIN_POLICY_ID,
    },
  };

  const createRes = await cloudFrontClient.send(
    new CreateDistributionCommand({
      DistributionConfig: distributionConfig,
    }),
  );

  const dist = createRes.Distribution;
  if (!dist?.Id || !dist?.DomainName) {
    throw new Error("Failed to create CloudFront Distribution");
  }

  return {
    distributionId: dist.Id,
    domainName: dist.DomainName,
    status: dist.Status || "InProgress",
  };
}

/**
 * Lấy trạng thái Distribution hiện tại
 */
export async function getDistribution(
  distributionId: string,
): Promise<{ id: string; domainName: string; status: string }> {
  const res = await cloudFrontClient.send(
    new GetDistributionCommand({
      Id: distributionId,
    }),
  );

  const dist = res.Distribution;
  if (!dist?.Id || !dist?.DomainName) {
    throw new Error(`CloudFront Distribution not found: ${distributionId}`);
  }

  return {
    id: dist.Id,
    domainName: dist.DomainName,
    status: dist.Status || "Unknown",
  };
}

/**
 * Xóa cache (Invalidate) cho một hoặc nhiều đường dẫn
 */
export async function createInvalidation(
  distributionId: string,
  paths: string[] = ["/*"],
): Promise<string> {
  const res = await cloudFrontClient.send(
    new CreateInvalidationCommand({
      DistributionId: distributionId,
      InvalidationBatch: {
        CallerReference: `invalidate-${Date.now()}`,
        Paths: {
          Quantity: paths.length,
          Items: paths,
        },
      },
    }),
  );

  return res.Invalidation?.Id || "";
}
