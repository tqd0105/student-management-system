/**
 * AWS Systems Manager (SSM) Parameter Store Service
 * Quản lý cấu hình tập trung và mã hóa bí mật (SecureString với AWS KMS)
 */

import {
  GetParameterCommand,
  GetParametersByPathCommand,
  PutParameterCommand,
  DeleteParameterCommand,
  ParameterType,
  type GetParametersByPathCommandOutput,
} from "@aws-sdk/client-ssm";
import { ssmClient } from "../config/ssm.js";

/**
 * Lấy giá trị của một Parameter (tự động giải mã KMS nếu là SecureString)
 */
export async function getParameter(
  name: string,
  withDecryption = true,
): Promise<string | null> {
  try {
    const command = new GetParameterCommand({
      Name: name,
      WithDecryption: withDecryption,
    });
    const response = await ssmClient.send(command);
    return response.Parameter?.Value ?? null;
  } catch (error: any) {
    if (error.name === "ParameterNotFound") {
      return null;
    }
    throw error;
  }
}

/**
 * Lấy tất cả Parameters theo đường dẫn phân cấp (Ví dụ: /sms/dev/ hoặc /sms/prod/)
 */
export async function getParametersByPath(
  pathPrefix: string,
  withDecryption = true,
): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  let nextToken: string | undefined = undefined;

  do {
    const command = new GetParametersByPathCommand({
      Path: pathPrefix,
      Recursive: true,
      WithDecryption: withDecryption,
      NextToken: nextToken,
    });

    const response: GetParametersByPathCommandOutput = await ssmClient.send(command);
    if (response.Parameters) {
      for (const param of response.Parameters) {
        if (param.Name && param.Value !== undefined) {
          // Lấy key tương đối từ path (VD: /sms/dev/jwt-secret -> jwt-secret)
          const key = param.Name.replace(pathPrefix, "").replace(/^\//, "");
          result[key] = param.Value;
        }
      }
    }
    nextToken = response.NextToken;
  } while (nextToken);

  return result;
}

/**
 * Lưu hoặc cập nhật Parameter vào AWS SSM
 * isSecure = true sẽ mã hóa bằng AWS KMS (loại SecureString)
 */
export async function putParameter(
  name: string,
  value: string,
  isSecure = false,
  description?: string,
): Promise<number> {
  const command = new PutParameterCommand({
    Name: name,
    Value: value,
    Type: isSecure ? ParameterType.SECURE_STRING : ParameterType.STRING,
    Overwrite: true,
    Description: description,
    Tier: "Standard", // Miễn phí 100% trong Standard tier
  });

  const response = await ssmClient.send(command);
  return response.Version ?? 1;
}

/**
 * Xóa một Parameter khỏi SSM
 */
export async function deleteParameter(name: string): Promise<void> {
  try {
    const command = new DeleteParameterCommand({
      Name: name,
    });
    await ssmClient.send(command);
  } catch (error: any) {
    if (error.name === "ParameterNotFound") {
      return;
    }
    throw error;
  }
}
