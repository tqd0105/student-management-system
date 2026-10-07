import type { IncomingMessage, ServerResponse } from "node:http";
import {
  listFiles,
  uploadContent,
  getFileContent,
  deleteFile,
} from "../services/s3.service.js";

function sendJson(
  res: ServerResponse,
  statusCode: number,
  data: unknown,
): void {
  res.writeHead(statusCode, {
    "Content-Type": "application/json",
  });
  res.end(JSON.stringify(data));
}

export async function handleFileRoutes(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<boolean> {
  const url = new URL(req.url ?? "/", "http://localhost");
  const pathname = url.pathname;

  // GET /files
  if (req.method === "GET" && pathname === "/files") {
    try {
      const files = await listFiles();
      sendJson(res, 200, { files });
    } catch (error) {
      console.error("List files failed:", error);
      sendJson(res, 500, { message: "Failed to retrieve files" });
    }
    return true;
  }

  // POST /files
  if (req.method === "POST" && pathname === "/files") {
    try {
      let body = "";

      for await (const chunk of req) {
        body += chunk.toString();
      }

      const data: unknown = JSON.parse(body);

      if (
        typeof data !== "object" ||
        data === null ||
        !("fileName" in data) ||
        !("content" in data) ||
        typeof data.fileName !== "string" ||
        !data.fileName.trim() ||
        typeof data.content !== "string"
      ) {
        sendJson(res, 400, {
          message: "fileName and content are required",
        });
        return true;
      }

      await uploadContent(data.fileName, data.content);

      sendJson(res, 201, {
        message: "File uploaded successfully",
        key: data.fileName,
      });
    } catch (error) {
      if (error instanceof SyntaxError) {
        sendJson(res, 400, { message: "Invalid JSON body" });
      } else {
        console.error("Upload failed:", error);
        sendJson(res, 500, { message: "Failed to upload file" });
      }
    }
    return true;
  }

  // GET /files/:key or DELETE /files/:key
  const fileMatch = pathname.match(/^\/files\/([^/]+)$/);
  const key = fileMatch && fileMatch[1] ? decodeURIComponent(fileMatch[1]) : null;

  if (req.method === "GET" && key) {
    try {
      const file = await getFileContent(key);

      res.writeHead(200, {
        "Content-Type": file.contentType,
        "Content-Disposition": `attachment; filename="${key}"`,
      });
      res.end(file.content);
    } catch (error) {
      console.error("Download failed:", error);
      sendJson(res, 404, { message: "File not found" });
    }
    return true;
  }

  // DELETE /files/:key
  if (req.method === "DELETE" && key) {
    try {
      await deleteFile(key);
      res.writeHead(204);
      res.end();
    } catch (error) {
      console.error("Delete failed:", error);
      sendJson(res, 500, { message: "Failed to delete file" });
    }
    return true;
  }

  return false;
}