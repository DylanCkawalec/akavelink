# Akavelink - Confidential Storage API on Phala Cloud

[![Deploy to Phala Cloud](https://cloud.phala.network/deploy-button.svg)](https://cloud.phala.network/templates/akavelink)

A REST API wrapper for [Akave](https://akave.ai) decentralized storage, running confidentially in Phala Cloud's Trusted Execution Environment (TEE) powered by dstack.

## 🔒 Confidential by Design

When deployed on Phala Cloud, this service runs inside an Intel TDX TEE with dstack, ensuring:
- **Private keys never leave the enclave** - Your Akave private key is protected by hardware-level encryption
- **Remote attestation** - Cryptographically verify the code running in production
- **Secure key derivation** - Integrate with dstack's KMS for deterministic key generation

## 🚀 Quick Deploy to Phala Cloud

### One-Click Deploy
Click the deploy button above or use the Phala CLI:

```bash
# Install Phala CLI
npm install -g phala

# Login with your API key
phala auth login

# Deploy this template
phala cvms create --template akavelink
```

### Manual Deploy with Custom Configuration

1. **Clone this repository**
```bash
git clone https://github.com/your-username/akavelink
cd akavelink
```

2. **Create environment file**
```bash
cat > .env << EOF
NODE_ADDRESS=connect.akave.ai:5500
PRIVATE_KEY=your_ethereum_private_key_here
EOF
```

3. **Deploy to Phala Cloud**
```bash
# Deploy with custom settings
phala cvms create \
  --name my-akave-api \
  --compose ./docker-compose.yml \
  --env-file ./.env \
  --vcpu 2 \
  --memory 2048 \
  --disk-size 20
```

## 🔧 Local Development

### Prerequisites
- Docker & Docker Compose
- Node.js 18+
- An Akave account with private key

### Run Locally
```bash
# Install dependencies
npm install

# Set environment variables
export NODE_ADDRESS="connect.akave.ai:5500"
export PRIVATE_KEY="your_private_key"

# Run development server
npm run dev

# Or use Docker Compose
docker-compose up --build
```

Visit http://localhost:3000 to access the interactive UI.

### Admin Password

Protect your API in production by setting an admin password hash:

```bash
npm i -g bcryptjs
node -e "console.log(require('bcryptjs').hashSync('your-password', 10))"
```

Copy the output into `ADMIN_PASSWORD_HASH` in `.env`. The UI stores the plaintext password in localStorage and sends it via `x-api-pass` header. The server verifies it with bcrypt inside the TEE.

### Wallet Connect / Switch

- Click “Connect Wallet” in the header and enter node address + private key to initialize the Akave client (no persistence; runtime only, inside TEE)
- “Disconnect” clears the in-memory client

## 📚 API Documentation

### Interactive UI
Access the built-in web interface at the root URL (`/`) for an interactive way to test all API endpoints.

## Bucket Operations

### Create Bucket
`POST /buckets`

Create a new bucket for file storage.

**Request Body:**
```json
{
    "bucketName": "string"
}
```

**Response:**
```json
{
    "success": true,
    "data": {
        "Name": "string",
        "Created": "timestamp"
    }
}
```

### List Buckets
`GET /buckets`

Retrieve a list of all buckets.

**Response:**
```json
{
    "success": true,
    "data": [
        {
            "Name": "string",
            "Created": "timestamp"
        }
    ]
}
```

### View Bucket
`GET /buckets/:bucketName`

Get details of a specific bucket.

**Response:**
```json
{
    "success": true,
    "data": {
        "Name": "string",
        "Created": "timestamp"
    }
}
```

## File Operations

### List Files
`GET /buckets/:bucketName/files`

List all files in a specific bucket.

**Response:**
```json
{
    "success": true,
    "data": [
        {
            "Name": "string",
            "Size": "number",
            "Created": "timestamp"
        }
    ]
}
```

### Get File Info
`GET /buckets/:bucketName/files/:fileName`

Get metadata about a specific file.

**Response:**
```json
{
    "success": true,
    "data": {
        "Name": "string",
        "Size": "number",
        "Created": "timestamp"
    }
}
```

### Upload File
`POST /buckets/:bucketName/files`

Upload a file to a specific bucket.

**Request:**
- Content-Type: `multipart/form-data`
- Body:
  - `file` or `file1`: File to upload
  OR
  - `filePath`: Path to file on server

**Response:**
```json
{
    "success": true,
    "data": {
        "Name": "string",
        "Size": "number"
    }
}
```

### Download File
`GET /buckets/:bucketName/files/:fileName/download`

Download a file from a specific bucket.

**Usage:**
Access this URL directly in your browser to download the file. The file will be automatically downloaded with its original filename.

**Response:**
- Success: File download will begin automatically
- Error:
```json
{
    "success": false,
    "error": "error message"
}
```

## Error Responses
All endpoints will return the following format for errors:
```json
{
    "success": false,
    "error": "error message"
}
```

## 🔐 Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|  
| `NODE_ADDRESS` | Akave node endpoint | Yes (if not connecting from UI) | - |
| `PRIVATE_KEY` | Ethereum private key for Akave auth | Yes (if not connecting from UI) | - |
| `ADMIN_PASSWORD_HASH` | bcrypt hash of API password (protects all API routes) | Recommended | — |
| `PORT` | API server port | No | 80 |
| `CORS_ORIGIN` | Allowed CORS origins | No | * |
| `DEBUG` | Enable debug logging | No | true |

## 🏗️ Architecture

```
┌─────────────────────────────────────────┐
│          Phala Cloud TEE (TDX)          │
│  ┌──────────────────────────────────────┐ │
│  │     Express.js REST API            │ │
│  │  ┌──────────────────────────────────┐  │ │
│  │  │   AkaveIPCClient Wrapper     │  │ │
│  │  │  ┌──────────────────────────┐  │  │ │
│  │  │  │   akavecli Binary      │  │  │ │
│  │  │  └──────────────────────────┘  │  │ │
│  │  └─────────────────────────────────│  │ │
│  └──────────────────────────────────────┘ │
│         ↑ Encrypted in TEE              │
└─────────────────────────────────────────┘
              ↓ HTTPS/REST
         External Clients
```

## 🧪 Testing

```bash
# Run unit tests
npm test

# Run integration tests (requires running server)
npm run test:integration
```

## 🛡️ Security Features

- **TEE Protection**: All operations run inside Intel TDX trusted execution environment
- **Encrypted Environment**: Secrets are encrypted before deployment using TEE public key
- **Remote Attestation**: Verify the integrity of the running code
- **No Key Exposure**: Private keys never leave the secure enclave
- **CORS Protection**: Configurable cross-origin resource sharing

## 📦 Building from Source

```bash
# Build Docker image
docker build -t akavelink:latest .

# Push to Docker Hub
docker tag akavelink:latest your-username/akavelink:latest
docker push your-username/akavelink:latest
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## 🔗 Resources

- [Akave Documentation](https://docs.akave.ai)
- [Phala Cloud Documentation](https://docs.phala.network)
- [dstack TEE Framework](https://github.com/Dstack-TEE/dstack)
- [Support & Community](https://discord.gg/phala)

## ⚡ Template Features

This template includes:
- ✅ Pre-configured Docker Compose for Phala Cloud
- ✅ Interactive web UI for API testing
- ✅ Comprehensive error handling and logging
- ✅ Health checks and monitoring endpoints
- ✅ CORS configuration for web apps
- ✅ File upload/download with streaming support
- ✅ Integration tests with Jest
- ✅ Multi-stage Docker build for minimal image size

---

Built with ❤️ for confidential compute on [Phala Network](https://phala.network)

