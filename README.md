# Akavelink - Decentralized Storage API Template for Phala Cloud

[![Deploy to Phala Cloud](https://cloud.phala.network/deploy-button.svg)](https://cloud.phala.network/templates/akavelink)

A production-ready REST API wrapper for [Akave](https://akave.ai) decentralized storage, designed to run confidentially in Phala Cloud's Trusted Execution Environment (TEE). This template provides a complete solution for integrating decentralized storage into your applications with built-in security and an interactive UI.

## 🎯 Template Features

- ✅ **One-click deployment** to Phala Cloud
- ✅ **Interactive Web UI** for testing and managing storage
- ✅ **Secure key management** - Private keys protected in TEE
- ✅ **Pre-built Docker image** with akavecli bundled
- ✅ **Complete REST API** for bucket and file operations
- ✅ **CORS-enabled** for web app integration
- ✅ **Health monitoring** endpoints
- ✅ **Production-ready** with error handling and logging

## 🚀 Deploy to Phala Cloud

### Prerequisites
1. **Akave Account**: Get your private key from [Akave](https://akave.ai)
2. **Fund Your Wallet**: Use the [Akave Faucet](https://faucet.akave.ai) to get test tokens
3. **Phala Account**: Sign up at [cloud.phala.network](https://cloud.phala.network)

### Quick Deploy (Recommended)

1. **Click the Deploy button** above or visit [cloud.phala.network/templates/akavelink](https://cloud.phala.network/templates/akavelink)

2. **Configure your deployment:**
   - Enter your Akave private key when prompted
   - Select your compute resources (2 vCPU, 2GB RAM recommended)
   - Choose your deployment region

3. **Deploy and access your API:**
   - Your API will be available at: `https://<your-app-id>.phala.app`
   - Access the interactive UI at the root URL

### Manual Deploy via CLI

```bash
# Install Phala CLI
npm install -g @phala/cli

# Login to Phala Cloud
phala auth login

# Deploy the template with your private key
phala cvms create \
  --template akavelink \
  --name my-akave-storage \
  --env NODE_ADDRESS=connect.akave.ai:5500 \
  --env PRIVATE_KEY=your_private_key_here
```

## 🔧 Local Testing

### Quick Start with Launch Script

```bash
# Clone the repository
git clone https://github.com/DylanCkawalec/akavelink
cd akavelink

# Create .env file with your private key
cat > .env << EOF
NODE_ADDRESS=connect.akave.ai:5500
PRIVATE_KEY=your_private_key_here
PORT=80
CORS_ORIGIN=*
DEBUG=true
EOF

# Run the launch script (builds Docker image and starts container)
./launch.sh
```

The launch script will:
- Build the Docker image with akavecli bundled
- Start the container on port 8000
- Open the interactive UI in your browser
- Auto-configure the UI to use the Docker backend

### Manual Docker Build

```bash
# Build the image
docker build -t akavelink:local .

# Run with your private key
docker run -d \
  --name akavelink \
  -p 8000:80 \
  -e NODE_ADDRESS=connect.akave.ai:5500 \
  -e PRIVATE_KEY=your_private_key_here \
  akavelink:local
```

## 🔐 Security & Configuration

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|  
| `NODE_ADDRESS` | Akave node endpoint | Yes | `connect.akave.ai:5500` |
| `PRIVATE_KEY` | Your Ethereum private key for Akave | Yes | - |
| `PORT` | API server port | No | `80` |
| `CORS_ORIGIN` | Allowed CORS origins | No | `*` |
| `DEBUG` | Enable debug logging | No | `true` |

### Security in Phala Cloud

When deployed on Phala Cloud:
- **TEE Protection**: Runs inside Intel TDX trusted execution environment
- **Encrypted Secrets**: Private keys are encrypted before deployment
- **Remote Attestation**: Verify code integrity cryptographically
- **No Key Exposure**: Private keys never leave the secure enclave

## 📚 Using the API

### Interactive Web UI

Once deployed, access your API's root URL to use the interactive interface:
- **Drag & Drop** file uploads
- **API Explorer** for testing all endpoints
- **Real-time logs** for debugging
- **Wallet status** monitoring

### API Endpoints

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

## 🏗️ Architecture

This template uses a multi-stage Docker build to create a lightweight, production-ready image:

1. **Build Stage**: Compiles akavecli from source
2. **Runtime Stage**: Minimal Alpine Linux with Node.js
3. **Bundled Binary**: akavecli included in the image
4. **Web UI**: Interactive interface served from the same container

```
┌─────────────────────────────────────────┐
│       Phala Cloud TEE Environment       │
│  ┌────────────────────────────────────┐ │
│  │   Docker Container (akavelink)     │ │
│  │  ┌──────────────────────────────┐  │ │
│  │  │  Express.js + Web UI         │  │ │
│  │  │  ├─ REST API (port 80)       │  │ │
│  │  │  ├─ Interactive Dashboard    │  │ │
│  │  │  └─ akavecli (bundled)       │  │ │
│  │  └──────────────────────────────┘  │ │
│  └────────────────────────────────────┘ │
│         ↑ Private Key (encrypted)       │
└─────────────────────────────────────────┘
              ↓ HTTPS
     https://your-app.phala.app
```

## 🧪 Testing Your Deployment

### Via Web UI
1. Navigate to your deployment URL
2. Click "Create Bucket" to test bucket creation
3. Drag and drop a file to test uploads
4. Use the API Explorer to test other endpoints

### Via Command Line
```bash
# Replace with your deployment URL
API_URL="https://your-app.phala.app"

# Create a bucket
curl -X POST $API_URL/buckets \
  -H "Content-Type: application/json" \
  -d '{"bucketName":"test-bucket"}'

# List buckets
curl $API_URL/buckets

# Check health
curl $API_URL/health
```

## 💡 Common Issues & Solutions

### "Insufficient funds" Error
- **Solution**: Fund your wallet using the [Akave Faucet](https://faucet.akave.ai)

### "akavecli not found" Error
- **Solution**: Use the Docker image which includes akavecli bundled

### Cannot Connect to Akave
- **Solution**: Ensure your private key is correctly formatted (with or without 0x prefix)

### CORS Issues
- **Solution**: Set `CORS_ORIGIN` environment variable to your frontend domain

## 📦 Customizing the Template

### Fork and Modify
1. Fork this repository
2. Modify the code to add your features
3. Update the Docker image in `docker-compose.yml`
4. Build and push your custom image:
```bash
docker build -t your-username/akavelink:custom .
docker push your-username/akavelink:custom
```
5. Deploy your custom version to Phala Cloud

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](contribute.md) for guidelines on:
- Submitting bug fixes
- Adding new features
- Improving documentation
- Submitting this as a Phala Cloud template

## 📄 License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## 🔗 Resources

- [Akave Documentation](https://docs.akave.ai)
- [Phala Cloud Documentation](https://docs.phala.network)
- [dstack TEE Framework](https://github.com/Dstack-TEE/dstack)
- [Support & Community](https://discord.gg/phala)

## 📊 Resource Requirements

### Minimum (Development/Testing)
- **vCPU**: 1
- **Memory**: 1GB
- **Disk**: 10GB

### Recommended (Production)
- **vCPU**: 2
- **Memory**: 2GB
- **Disk**: 20GB

## 🏷️ Template Metadata

- **Template ID**: `akavelink`
- **Category**: Storage
- **Docker Image**: `dylanckawalec/akavelink:latest`
- **Port**: 80 (mapped by Phala gateway)
- **Health Check**: `/health` endpoint

---

**Built for [Phala Network](https://phala.network)** | **Powered by [Akave](https://akave.ai)**