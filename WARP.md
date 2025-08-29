# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

Akavelink is a Node.js REST API wrapper for the Akave CLI that provides a containerized interface for Akave's decentralized storage network. The project consists of:

- **REST API Server** (`server.js`): Express.js server providing HTTP endpoints for bucket and file operations
- **Akave IPC Client** (`index.js`): Core wrapper class that spawns `akavecli` processes and parses their output
- **Logger** (`logger.js`): Custom logging utility with structured output
- **Dockerfile**: Multi-stage build that includes the Akave CLI binary and Node.js runtime

## Core Architecture

The application follows a wrapper pattern where HTTP requests are translated to CLI commands:

1. **HTTP Request** → Express middleware processes multipart uploads, JSON bodies
2. **Command Generation** → `AkaveIPCClient` constructs `akavecli` command arguments
3. **Process Execution** → Commands spawned via Node.js `child_process.spawn()`
4. **Output Parsing** → Custom parsers extract structured data from CLI text output
5. **HTTP Response** → Results returned as JSON or file streams

### Key Components

- **AkaveIPCClient Class**: Main abstraction over the Akave CLI
  - Manages authentication via `privateKey` and `nodeAddress`  
  - Handles command execution and output parsing
  - Supports bucket operations (create, list, view, delete) and file operations (upload, download, list, info)

- **Express Server**: RESTful endpoints following `/buckets` and `/buckets/:bucketName/files` patterns
  - File uploads via multipart/form-data using multer
  - File downloads with range request support for streaming
  - CORS configuration for cross-origin requests

## Development Commands

### Local Development
```bash
# Install dependencies
npm install

# Start development server with auto-reload
npm run dev

# Start production server
npm start
```

### Testing
```bash
# Run unit tests
npm test

# Run integration tests (requires running server)
npm run test:integration
```

### Docker Development
```bash
# Build Docker image
docker build -t akave/akavelink:latest .

# Run container locally
docker run -d \
  -p 8000:3000 \
  -e NODE_ADDRESS="connect.akave.ai:5500" \
  -e PRIVATE_KEY="your_private_key" \
  akave/akavelink:latest

# View logs
docker logs <container_id>
```

## Environment Variables

Required for operation:
- `NODE_ADDRESS`: Akave node endpoint (e.g., "connect.akave.ai:5500")
- `PRIVATE_KEY`: Ethereum private key for authentication (with or without 0x prefix)

Optional configuration:
- `PORT`: Server port (default: 3000)
- `CORS_ORIGIN`: CORS allowed origins (default: "*")
- `DEBUG`: Enable debug logging (default: enabled, set to "false" to disable)

## Testing Strategy

The project uses Jest for testing with two configurations:

- **Unit Tests**: Standard Jest configuration
- **Integration Tests**: Custom config (`jest.config.integration.js`) with 30s timeout
  - Tests real API endpoints against running server
  - Creates temporary buckets and files for validation
  - Includes file upload/download round-trip verification

## CLI Dependencies

The application requires the `akavecli` binary to be available in PATH. In Docker, this is built from source in the first stage and copied to the runtime image.

Commands executed follow the pattern:
```bash
akavecli ipc [operation] [args...] --node-address=X --private-key=Y
```

## File Handling Patterns

**Uploads**: Support both buffer uploads (via multipart) and file path uploads
- Temporary files created in OS temp directory with sanitized names
- Cleanup handled automatically after upload completion

**Downloads**: Range request support for partial content
- Files downloaded to `./downloads/` directory
- Stream directly to client with proper Content-Disposition headers

## Error Handling

- CLI errors captured from both stdout and stderr
- Structured error responses with `{success: false, error: "message"}` format
- Request-specific logging with generated request IDs for traceability
