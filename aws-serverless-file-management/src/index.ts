import {
  uploadFile,
  downloadFile,
  deleteFile,
} from "./services/s3.service.js";

async function main(): Promise<void> {
  try {
    // 1. Upload file lên S3
    await uploadFile("./uploads/hello.txt", "hello.txt");
    console.log("Upload successful!");

    // 2. Download file từ S3
    await downloadFile("hello.txt", "./uploads/hello-downloaded.txt");
    console.log("Download successful!");

    // 3. Delete file trên S3
    await deleteFile("hello.txt");
    console.log("Delete successful!");
  } catch (error) {
    console.error("S3 operation failed:", error);
  }
}

main();