/**
 * AWS Serverless File Upload Service
 * Tích hợp trực tiếp với microservice AWS Serverless File Management
 * (Amazon S3 + AWS Lambda + API Gateway)
 */

const AWS_FILE_API_BASE =
  process.env.NEXT_PUBLIC_AWS_FILE_API_URL ||
  "https://83cxxukww4.execute-api.ap-southeast-1.amazonaws.com";

const AWS_CLOUDFRONT_BASE =
  process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL ||
  "https://d2qspmj0hh92qq.cloudfront.net";

export interface UploadProgressCallback {
  (percentage: number): void;
}

export interface UploadResult {
  fileId: string;
  fileName: string;
  viewUrl: string;
}

/**
 * Upload Avatar hoặc tệp tin trực tiếp lên Amazon S3 thông qua Presigned URL
 * Trình duyệt gửi trực tiếp dữ liệu nhị phân lên S3, không làm nghẽn server backend.
 */
export async function uploadFileToAwsS3(
  file: File,
  prefix = "avatar",
  onProgress?: UploadProgressCallback,
): Promise<UploadResult> {
  // 1. Chuẩn hóa tên file an toàn
  const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
  const uniqueFileName = `${prefix}-${Date.now()}-${cleanName}`;
  const contentType = file.type || "application/octet-stream";

  onProgress?.(10);

  // 2. Yêu cầu Presigned Upload URL từ AWS Microservice
  const presignedRes = await fetch(`${AWS_FILE_API_BASE}/files/presigned-upload`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fileName: uniqueFileName,
      contentType,
      expiresIn: 900, // 15 phút
    }),
  });

  if (!presignedRes.ok) {
    const errorText = await presignedRes.text();
    throw new Error(`Không thể khởi tạo phiên tải lên S3: ${errorText}`);
  }

  const { uploadUrl, fileId, fileName } = await presignedRes.json();
  onProgress?.(40);

  // 3. Trực tiếp đẩy file nhị phân lên Amazon S3 qua PUT request
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl, true);
    xhr.setRequestHeader("Content-Type", contentType);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percentComplete = 40 + Math.round((event.loaded / event.total) * 50);
        onProgress?.(percentComplete);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Tải lên S3 thất bại với mã lỗi HTTP ${xhr.status}`));
      }
    };

    xhr.onerror = () => reject(new Error("Lỗi kết nối mạng khi tải lên Amazon S3"));
    xhr.send(file);
  });

  onProgress?.(100);

  // 4. URL xem ảnh chuẩn thông qua CloudFront CDN toàn cầu hoặc API Gateway endpoint
  const viewUrl = AWS_CLOUDFRONT_BASE
    ? `${AWS_CLOUDFRONT_BASE}/${uniqueFileName}`
    : `${AWS_FILE_API_BASE}/files/${fileId}/view`;

  // 5. Tự động gửi lệnh xóa cache CloudFront Edge ngầm để đảm bảo client nhận ảnh mới nhất
  invalidateCloudFrontCache([`/${uniqueFileName}`]).catch((err) =>
    console.warn("CloudFront background invalidation skipped:", err),
  );

  return {
    fileId,
    fileName: uniqueFileName,
    viewUrl,
  };
}

export const MAX_MATERIAL_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const ALLOWED_MATERIAL_EXTENSIONS = [
  "pdf",
  "docx",
  "doc",
  "xlsx",
  "xls",
  "pptx",
  "ppt",
  "png",
  "jpg",
  "jpeg",
  "webp",
];

export interface ClassMaterialUploadResult {
  fileId: string;
  fileName: string;
  viewUrl: string;
  fileKey: string;
  fileSize: number;
  materialType: "document" | "slide";
}

/**
 * Tự động gửi yêu cầu xóa cache CloudFront Edge khi ảnh/tệp tin được thay thế
 */
export async function invalidateCloudFrontCache(
  paths: string[] = ["/*"],
): Promise<{ success: boolean; invalidationId?: string }> {
  try {
    const res = await fetch(`${AWS_FILE_API_BASE}/cdn/invalidate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ paths }),
    });

    if (!res.ok) {
      return { success: false };
    }

    const data = await res.json();
    return { success: true, invalidationId: data.invalidationId };
  } catch (err: any) {
    console.warn("Could not invalidate CloudFront cache:", err.message);
    return { success: false };
  }
}

/**
 * Upload tệp tài liệu học tập của lớp học trực tiếp lên Amazon S3 & CloudFront CDN
 * - Kiểm tra nghiêm ngặt dung lượng <= 10MB (bảo vệ Free Tier $0.00)
 * - Chỉ cho phép các định dạng: PDF, Word, Excel, Slide, Ảnh
 * - Lưu theo cấu trúc: materials/{classId}/{timestamp}-{cleanFileName}
 */
export async function uploadClassMaterialFile(
  file: File,
  classId: string,
  onProgress?: UploadProgressCallback,
): Promise<ClassMaterialUploadResult> {
  // 1. Kiểm tra kích thước tệp tin (Max 10MB)
  if (file.size > MAX_MATERIAL_FILE_SIZE) {
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(1);
    throw new Error(
      `Tệp vượt quá giới hạn 10 MB (${sizeInMB} MB). Vui lòng chọn tệp nhỏ hơn hoặc nén tài liệu trước khi tải lên.`,
    );
  }

  // 2. Kiểm tra định dạng tệp tin
  const extension = file.name.split(".").pop()?.toLowerCase() || "";
  if (!ALLOWED_MATERIAL_EXTENSIONS.includes(extension)) {
    throw new Error(
      `Định dạng .${extension} không được hỗ trợ. Hệ thống chỉ cho phép tải tệp PDF, Word, Excel, Slide (.pptx/.ppt) và Hình ảnh (PNG, JPG, WEBP). Đối với Video, vui lòng dán link YouTube/Drive.`,
    );
  }

  // Xác định loại tài liệu
  const materialType: "document" | "slide" =
    extension === "pptx" || extension === "ppt" ? "slide" : "document";

  // 3. Chuẩn hóa tên tệp và khóa S3 (materials/{classId}/{timestamp}-{cleanName})
  const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
  const uniqueKey = `materials/${classId}/${Date.now()}-${cleanName}`;
  const contentType = file.type || "application/octet-stream";

  onProgress?.(10);

  // 4. Lấy Presigned URL từ AWS Lambda Microservice
  const presignedRes = await fetch(
    `${AWS_FILE_API_BASE}/files/presigned-upload`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fileName: uniqueKey,
        contentType,
        expiresIn: 900, // 15 phút
      }),
    },
  );

  if (!presignedRes.ok) {
    const errorText = await presignedRes.text();
    throw new Error(`Không thể khởi tạo phiên tải lên S3: ${errorText}`);
  }

  const { uploadUrl, fileId, fileName } = await presignedRes.json();
  onProgress?.(40);

  // 5. Trực tiếp đẩy file nhị phân lên Amazon S3 qua PUT request
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl, true);
    xhr.setRequestHeader("Content-Type", contentType);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percentComplete = 40 + Math.round((event.loaded / event.total) * 50);
        onProgress?.(percentComplete);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Tải lên S3 thất bại với mã lỗi HTTP ${xhr.status}`));
      }
    };

    xhr.onerror = () =>
      reject(new Error("Lỗi kết nối mạng khi tải dữ liệu lên Amazon S3"));
    xhr.send(file);
  });

  onProgress?.(100);

  // 6. Địa chỉ truy cập qua CloudFront CDN toàn cầu
  const viewUrl = `${AWS_CLOUDFRONT_BASE}/${fileName}`;

  // 7. Invalidate cache CloudFront trong background
  invalidateCloudFrontCache([`/${fileName}`]).catch((err) =>
    console.warn("CloudFront background invalidation skipped:", err),
  );

  return {
    fileId,
    fileName: file.name,
    viewUrl,
    fileKey: fileName,
    fileSize: file.size,
    materialType,
  };
}
