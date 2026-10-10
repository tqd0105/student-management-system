import {
  getParameter,
  getParametersByPath,
  putParameter,
  deleteParameter,
} from "../src/services/ssm.service.js";
import { ssmClient } from "../src/config/ssm.js";
import { GetParameterCommand } from "@aws-sdk/client-ssm";

async function runSsmVerification() {
  console.log("=============================================================");
  console.log("   AWS SSM PARAMETER STORE & SECRETS VERIFICATION            ");
  console.log("=============================================================\n");

  const testSecretPath = `/sms/demo/jwt-secret`;
  const testConfigPath = `/sms/demo/api-endpoint`;
  const rawSecretValue = "super-secret-jwt-key-demo-2026";
  const configValue = "https://83cxxukww4.execute-api.ap-southeast-1.amazonaws.com";

  // 1. Lưu tham số bí mật loại SecureString (Mã hóa tự động bằng AWS KMS)
  console.log("[1/5] Storing encrypted secret into AWS SSM Parameter Store...");
  const v1 = await putParameter(
    testSecretPath,
    rawSecretValue,
    true, // isSecure = true (SecureString with KMS)
    "Demo JWT secret encrypted with AWS KMS",
  );
  console.log(`    ✓ Saved SecureString parameter: ${testSecretPath} (Version: ${v1})`);

  // 2. Lưu tham số cấu hình loại String
  console.log("\n[2/5] Storing plain configuration parameter...");
  const v2 = await putParameter(
    testConfigPath,
    configValue,
    false,
    "API Gateway public endpoint",
  );
  console.log(`    ✓ Saved String parameter: ${testConfigPath} (Version: ${v2})`);

  // 3. Đọc dữ liệu thô KHÔNG giải mã (để chứng minh tính năng bảo mật của KMS)
  console.log("\n[3/5] Testing AWS KMS Security (Fetching WITHOUT decryption)...");
  const rawCommand = new GetParameterCommand({
    Name: testSecretPath,
    WithDecryption: false,
  });
  const rawResponse = await ssmClient.send(rawCommand);
  console.log(`    ✓ Parameter Type: ${rawResponse.Parameter?.Type}`);
  console.log(`    ✓ Encrypted Ciphertext preview: ${rawResponse.Parameter?.Value?.substring(0, 30)}...`);

  // 4. Đọc dữ liệu CÓ giải mã tự động bằng AWS KMS
  console.log("\n[4/5] Testing AWS KMS Decryption (Fetching WITH decryption)...");
  const decryptedValue = await getParameter(testSecretPath, true);
  console.log(`    ✓ Decrypted Secret Value: "${decryptedValue}"`);
  if (decryptedValue !== rawSecretValue) {
    throw new Error("Decrypted value does not match original secret!");
  }
  console.log("    ✓ Decryption verified 100% matched!");

  // 5. Truy vấn danh sách tham số theo Path Prefix (/sms/demo/)
  console.log("\n[5/5] Fetching hierarchical configuration (/sms/demo/)...");
  const allParams = await getParametersByPath("/sms/demo/", true);
  console.log("    ✓ Retrieved all parameters under /sms/demo/:");
  for (const [key, val] of Object.entries(allParams)) {
    console.log(`      • ${key} = ${val}`);
  }

  // Cleanup
  console.log("\nCleaning up demo parameters...");
  await deleteParameter(testSecretPath);
  await deleteParameter(testConfigPath);
  console.log("    ✓ Cleanup completed.");

  console.log("\n=============================================================");
  console.log("   AWS SSM PARAMETER STORE VERIFICATION 100% SUCCESS!        ");
  console.log("=============================================================");
}

runSsmVerification().catch((err) => {
  console.error("SSM Verification failed:", err);
  process.exit(1);
});
