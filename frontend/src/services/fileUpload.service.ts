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

  return {
    fileId,
    fileName: uniqueFileName,
    viewUrl,
  };
}
