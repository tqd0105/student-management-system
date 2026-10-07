import { createServer } from "node:http";
import { handleFileRoutes } from "./routes/file.routes.js";

const PORT = 3000;

const server = createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/") {
    res.writeHead(200, {
      "Content-Type": "application/json",
    });

    res.end(
      JSON.stringify({
        message: "Welcome to AWS Serverless File Management API",
      }),
    );
    return;
  }

  try {
    const handled = await handleFileRoutes(req, res);

    if (!handled) {
      res.writeHead(404, {
        "Content-Type": "application/json",
      });

      res.end(
        JSON.stringify({
          message: "Route not found",
        }),
      );
    }
  } catch (error) {
    console.error("Unexpected server error:", error);

    if (!res.headersSent) {
      res.writeHead(500, {
        "Content-Type": "application/json",
      });
    }

    if (!res.writableEnded) {
      res.end(
        JSON.stringify({
          message: "Internal server error",
        }),
      );
    }
  }
});

server.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});