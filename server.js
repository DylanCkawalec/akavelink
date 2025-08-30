const express = require("express");
const AkaveIPCClient = require("./index");
const multer = require("multer");
const fs = require("fs").promises;
const fsSync = require("fs");
const path = require("path");
const os = require("os");
const dotenv = require("dotenv");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const logger = require("./logger");

dotenv.config();

// Initialize express app
const app = express();

// Configure CORS
const corsOptions = {
  origin: process.env.CORS_ORIGIN || "*",
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true,
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Middleware to parse JSON bodies
app.use(express.json());

// Configure multer for file upload handling
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
}).fields([
  { name: "file", maxCount: 1 },
  { name: "file1", maxCount: 1 },
]);

// Initialize Akave IPC client (mutable to allow wallet reconnect)
let client = null;
if (process.env.NODE_ADDRESS && process.env.PRIVATE_KEY) {
  client = new AkaveIPCClient(process.env.NODE_ADDRESS, process.env.PRIVATE_KEY);
}

const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || "";

// Health check endpoint (open)
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});


// Admin endpoints
app.get("/admin/status", (req, res) => {
  const connected = !!client;
  const address = connected ? client.address : null;
  const masked = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : null;
  res.json({ success: true, data: { connected, address: masked, nodeAddress: connected ? process.env.NODE_ADDRESS || null : null } });
});

app.post("/admin/wallet", async (req, res) => {
  try {
    const { privateKey, nodeAddress } = req.body || {};
    if (!privateKey || !nodeAddress) throw new Error("privateKey and nodeAddress are required");
    client = new AkaveIPCClient(nodeAddress, privateKey);
    // Do not persist secrets; runtime only
    res.json({ success: true, data: { address: `${client.address.slice(0, 6)}...${client.address.slice(-4)}`, nodeAddress } });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

app.post("/admin/disconnect", (req, res) => {
  client = null;
  res.json({ success: true, data: { disconnected: true } });
});

// Bucket endpoints
app.post("/buckets", async (req, res) => {
  try {
    if (!client) throw new Error("Client not configured. Connect a wallet first.");
    const { bucketName } = req.body;
    const result = await client.createBucket(bucketName);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/buckets", async (req, res) => {
  try {
    if (!client) throw new Error("Client not configured. Connect a wallet first.");
    const result = await client.listBuckets();
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/buckets/:bucketName", async (req, res) => {
  try {
    if (!client) throw new Error("Client not configured. Connect a wallet first.");
    const result = await client.viewBucket(req.params.bucketName);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete("/buckets/:bucketName", async (req, res) => {
  try {
    if (!client) throw new Error("Client not configured. Connect a wallet first.");
    const result = await client.deleteBucket(req.params.bucketName);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// File endpoints
app.get("/buckets/:bucketName/files", async (req, res) => {
  try {
    if (!client) throw new Error("Client not configured. Connect a wallet first.");
    const result = await client.listFiles(req.params.bucketName);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/buckets/:bucketName/files/:fileName", async (req, res) => {
  try {
    if (!client) throw new Error("Client not configured. Connect a wallet first.");
    const result = await client.getFileInfo(
      req.params.bucketName,
      req.params.fileName
    );
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Modified file upload endpoint
app.post("/buckets/:bucketName/files", upload, async (req, res) => {
  const requestId = Math.random().toString(36).substring(7);
  try {
    if (!client) throw new Error("Client not configured. Connect a wallet first.");
    logger.info("Processing file upload request", {
      requestId,
      bucket: req.params.bucketName,
    });

    let result;
    const uploadedFile = req.files?.file?.[0] || req.files?.file1?.[0];

    if (uploadedFile) {
      logger.info("Handling buffer upload", {
        requestId,
        filename: uploadedFile.originalname,
      });
      // Handle buffer upload
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "akave-"));
      // Sanitize filename by replacing spaces and special chars with underscore
      const sanitizedFileName = normalizeFileName(uploadedFile.originalname);
      const tempFilePath = path.join(tempDir, sanitizedFileName);
      try {
        // Write buffer to temporary file
        await fs.writeFile(tempFilePath, uploadedFile.buffer);

        // Upload the temporary file
        result = await client.uploadFile(req.params.bucketName, tempFilePath, {
          fileName: uploadedFile.originalname,
          cleanup: true, // Tell client to cleanup temp file
        });
      } finally {
        // Cleanup temp directory
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    } else if (req.body.filePath) {
      logger.info("Handling file path upload", {
        requestId,
        path: req.body.filePath,
      });
      // Handle file path upload
      result = await client.uploadFile(
        req.params.bucketName,
        req.body.filePath
      );
    } else {
      throw new Error("No file or filePath provided");
    }

    logger.info("File upload completed", { requestId, result });
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error("File upload failed", { requestId, error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/buckets/:bucketName/files/:fileName/download", async (req, res) => {
  const requestId = Math.random().toString(36).substring(7);
  try {
    if (!client) throw new Error("Client not configured. Connect a wallet first.");
    logger.info("Processing download request", {
      requestId,
      bucket: req.params.bucketName,
      file: req.params.fileName,
    });

    // Create downloads directory if it doesn't exist
    const downloadDir = path.join(process.cwd(), "downloads");
    await fs.mkdir(downloadDir, { recursive: true });

    const normalizedFileName = normalizeFileName(req.params.fileName);
    const destinationPath = path.join(downloadDir, normalizedFileName);

    // Download the file
    await client.downloadFile(
      req.params.bucketName,
      req.params.fileName,
      downloadDir
    );

    // Check if file exists and is readable
    try {
      await fs.access(destinationPath, fsSync.constants.R_OK);
    } catch (err) {
      throw new Error("File download failed or file is not readable");
    }

    // Get file stats
    const stats = await fs.stat(destinationPath);

    // Add Accept-Ranges header
    res.setHeader("Accept-Ranges", "bytes");

    // Set common headers
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${req.params.fileName}"`
    );
    res.setHeader("Content-Type", "application/octet-stream");

    let fileStream;
    const range = req.headers.range;

    if (range) {
      // Validate range format first
      if (!range.startsWith("bytes=") || !range.includes("-")) {
        // Invalid range format - fall back to full file
        res.setHeader("Content-Length", stats.size);
        fileStream = fsSync.createReadStream(destinationPath);
      } else {
        try {
          const parts = range.replace(/bytes=/, "").split("-");
          const start = parseInt(parts[0], 10);
          const end = parts[1] ? parseInt(parts[1], 10) : stats.size - 1;

          if (
            isNaN(start) ||
            isNaN(end) ||
            start >= stats.size ||
            end >= stats.size ||
            start > end
          ) {
            return res.status(416).json({
              success: false,
              error: "Requested range not satisfiable",
            });
          }

          res.status(206);
          res.setHeader("Content-Range", `bytes ${start}-${end}/${stats.size}`);
          res.setHeader("Content-Length", end - start + 1);
          fileStream = fsSync.createReadStream(destinationPath, { start, end });
        } catch (rangeError) {
          // Any parsing error - fall back to full file
          res.setHeader("Content-Length", stats.size);
          fileStream = fsSync.createReadStream(destinationPath);
        }
      }
    } else {
      // Normal download
      res.setHeader("Content-Length", stats.size);
      fileStream = fsSync.createReadStream(destinationPath);
    }

    // Handle stream errors
    fileStream.on("error", (err) => {
      logger.error("Stream error occurred", { requestId, error: err.message });
      if (!res.headersSent) {
        res.status(500).json({ success: false, error: err.message });
      }
    });

    logger.info("Starting file stream", { requestId });
    fileStream.pipe(res);
  } catch (error) {
    logger.error("Download failed", { requestId, error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

// Add at the top of server.js with other utilities
function normalizeFileName(fileName) {
  return fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
}

// After client initialization
logger.info("Initializing client", {
  nodeAddress: process.env.NODE_ADDRESS,
  privateKeyLength: process.env.PRIVATE_KEY
    ? process.env.PRIVATE_KEY.length
    : 0,
});
