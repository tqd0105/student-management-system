import dotenv from "dotenv";

dotenv.config();

const API_ENDPOINT =
  process.env.API_GATEWAY_URL ||
  "https://83cxxukww4.execute-api.ap-southeast-1.amazonaws.com";

async function runApiGatewayVerification() {
  console.log("=============================================================");
  console.log("   STEP 3 VERIFICATION: API GATEWAY & LAMBDA LIVE HTTP API   ");
  console.log("=============================================================");
  console.log(`Endpoint: ${API_ENDPOINT}\n`);

  const testKey = `apigw-test-${Date.now()}.txt`;
  const testContent = `Hello World from Public API Gateway! Timestamp: ${new Date().toISOString()}`;

  // Test 1: OPTIONS /files (CORS Preflight)
  console.log("[1/9] Testing CORS Preflight (OPTIONS /files)...");
  const optionsRes = await fetch(`${API_ENDPOINT}/files`, {
    method: "OPTIONS",
    headers: {
      Origin: "https://sms-fe-lovat.vercel.app",
      "Access-Control-Request-Method": "POST",
    },
  });
  console.log(` -> Status: ${optionsRes.status} (Expected 200 or 204)`);
  console.log(` -> Access-Control-Allow-Origin: ${optionsRes.headers.get("access-control-allow-origin")}`);
  if (optionsRes.status !== 200 && optionsRes.status !== 204) {
    throw new Error(`CORS options failed with status ${optionsRes.status}`);
  }

  // Test 2: GET /files (Initial listing)
  console.log("\n[2/9] Testing GET /files...");
  const listRes = await fetch(`${API_ENDPOINT}/files`);
  console.log(` -> Status: ${listRes.status} (Expected 200)`);
  const listData = (await listRes.json()) as { files: any[] };
  console.log(` -> Files in S3: ${listData.files.length}`);
  if (listRes.status !== 200) throw new Error("Failed to GET /files");

  // Test 3: POST /files (Upload file via API Gateway)
  console.log(`\n[3/9] Testing POST /files to create "${testKey}"...`);
  const uploadRes = await fetch(`${API_ENDPOINT}/files`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileName: testKey,
      content: testContent,
      contentType: "text/plain",
    }),
  });
  console.log(` -> Status: ${uploadRes.status} (Expected 201)`);
  const uploadData = await uploadRes.json();
  console.log(` -> Response:`, uploadData);
  if (uploadRes.status !== 201) throw new Error("Failed to POST /files");

  // Test 4: GET /files/{key}/metadata
  console.log(`\n[4/9] Testing GET /files/${testKey}/metadata...`);
  const metaRes = await fetch(`${API_ENDPOINT}/files/${testKey}/metadata`);
  console.log(` -> Status: ${metaRes.status} (Expected 200)`);
  const metaData = (await metaRes.json()) as any;
  console.log(` -> Metadata:`, metaData.metadata);
  if (metaRes.status !== 200 || !metaData.metadata) {
    throw new Error("Failed to GET metadata");
  }

  // Test 5: GET /files/{key} (Download content)
  console.log(`\n[5/9] Testing GET /files/${testKey} (direct download)...`);
  const downloadRes = await fetch(`${API_ENDPOINT}/files/${testKey}`);
  console.log(` -> Status: ${downloadRes.status} (Expected 200)`);
  const downloadedText = await downloadRes.text();
  console.log(` -> Content: "${downloadedText}"`);
  if (downloadRes.status !== 200 || downloadedText !== testContent) {
    throw new Error("Downloaded content does not match uploaded content");
  }

  // Test 6: POST /files/presigned-upload
  console.log(`\n[6/9] Testing POST /files/presigned-upload...`);
  const presignUploadRes = await fetch(`${API_ENDPOINT}/files/presigned-upload`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileName: "client-direct-upload.pdf",
      contentType: "application/pdf",
      expiresIn: 1800,
    }),
  });
  console.log(` -> Status: ${presignUploadRes.status} (Expected 200)`);
  const presignUploadData = (await presignUploadRes.json()) as any;
  console.log(` -> Presigned URL: ${presignUploadData.uploadUrl?.substring(0, 60)}...`);
  if (presignUploadRes.status !== 200 || !presignUploadData.uploadUrl) {
    throw new Error("Failed to generate presigned upload URL");
  }

  // Test 7: GET /files/{key}/presigned-download
  console.log(`\n[7/9] Testing GET /files/${testKey}/presigned-download...`);
  const presignDownloadRes = await fetch(
    `${API_ENDPOINT}/files/${testKey}/presigned-download`,
  );
  console.log(` -> Status: ${presignDownloadRes.status} (Expected 200)`);
  const presignDownloadData = (await presignDownloadRes.json()) as any;
  console.log(` -> Download URL: ${presignDownloadData.downloadUrl?.substring(0, 60)}...`);
  if (presignDownloadRes.status !== 200 || !presignDownloadData.downloadUrl) {
    throw new Error("Failed to generate presigned download URL");
  }

  // Test 8: DELETE /files/{key} (Cleanup)
  console.log(`\n[8/9] Testing DELETE /files/${testKey}...`);
  const deleteRes = await fetch(`${API_ENDPOINT}/files/${testKey}`, {
    method: "DELETE",
  });
  console.log(` -> Status: ${deleteRes.status} (Expected 204)`);
  if (deleteRes.status !== 204) throw new Error("Failed to DELETE /files/{key}");

  // Test 9: Verify 404 after deletion
  console.log(`\n[9/9] Verifying 404 after delete (GET /files/${testKey}/metadata)...`);
  const verifyDeleteRes = await fetch(
    `${API_ENDPOINT}/files/${testKey}/metadata`,
  );
  console.log(` -> Status: ${verifyDeleteRes.status} (Expected 404)`);
  if (verifyDeleteRes.status !== 404) {
    throw new Error("File should return 404 after deletion");
  }

  console.log("\n=============================================================");
  console.log("   STEP 3 LIVE VERIFICATION COMPLETED SUCCESSFULLY! (9/9)   ");
  console.log("=============================================================");
}

runApiGatewayVerification().catch((err) => {
  console.error("API Gateway verification failed:", err);
  process.exit(1);
});
