#!/bin/bash

# Akavelink Launch Script
# This script builds and runs the Docker container with akavecli bundled,
# then opens the UI configured to use the Docker backend.

set -e

echo "🚀 Starting Akavelink -- local testing only with Phala CLI..."

# Check if .env exists, if not create with defaults
if [ ! -f .env ]; then
    echo "📝 Creating .env file (please add your PRIVATE_KEY)..."
    cat > .env << 'EOF'
NODE_ADDRESS=connect.akave.ai:5500
PRIVATE_KEY=
PORT=80
CORS_ORIGIN=*
DEBUG=true
EOF
    echo "⚠️  Please edit .env and add your PRIVATE_KEY, then re-run this script"
    exit 1
fi

# Check if PRIVATE_KEY is set in .env
if ! grep -q "PRIVATE_KEY=" .env || grep -q "PRIVATE_KEY=$" .env; then
    echo "⚠️  PRIVATE_KEY not found or empty in .env"
    echo "Please add your private key to .env file and re-run"
    exit 1
fi

# Load environment variables
export $(cat .env | grep -v '^#' | xargs)

# Stop any existing containers
echo "🛑 Stopping existing containers..."
docker stop akavelink 2>/dev/null || true
docker rm akavelink 2>/dev/null || true

# Build the Docker image
echo "🔨 Building Docker image..."
docker build -t akavelink:local .

# Run the container
echo "🐳 Starting Docker container..."
docker run -d \
    --name akavelink \
    -p 8000:80 \
    -e NODE_ADDRESS="${NODE_ADDRESS}" \
    -e PRIVATE_KEY="${PRIVATE_KEY}" \
    -e PORT="80" \
    -e CORS_ORIGIN="${CORS_ORIGIN:-*}" \
    -e DEBUG="${DEBUG:-true}" \
    akavelink:local

# Wait for container to be ready
echo "⏳ Waiting for API to be ready..."
max_attempts=30
attempt=0
while [ $attempt -lt $max_attempts ]; do
    if curl -s http://localhost:8000/health > /dev/null 2>&1; then
        echo "✅ API is ready!"
        break
    fi
    sleep 1
    attempt=$((attempt + 1))
done

if [ $attempt -eq $max_attempts ]; then
    echo "❌ API failed to start. Check logs with: docker logs akavelink"
    exit 1
fi

# Check wallet status
echo "🔍 Checking wallet status..."
STATUS=$(curl -s http://localhost:8000/admin/status | grep -o '"connected":[^,}]*' | cut -d: -f2)
if [ "$STATUS" = "true" ]; then
    echo "✅ Wallet connected!"
    ADDRESS=$(curl -s http://localhost:8000/admin/status | grep -o '"address":"[^"]*"' | cut -d'"' -f4)
    echo "📍 Address: $ADDRESS"
else
    echo "⚠️  Wallet not connected. Check your PRIVATE_KEY in .env"
fi

# Create a simple HTML file that auto-configures the base URL
echo "📄 Creating auto-configured UI launcher..."
cat > launch-ui.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>Launching Akavelink UI...</title>
    <script>
        // Auto-configure the UI to use Docker backend
        localStorage.setItem('akave_base', 'http://localhost:8000');
        // Redirect to the UI
        window.location.href = 'http://localhost:8000/';
    </script>
</head>
<body>
    <p>Configuring and launching Akavelink UI...</p>
</body>
</html>
EOF

# Open the UI in browser
echo "🌐 Opening UI in browser..."
if command -v open > /dev/null; then
    open launch-ui.html
    sleep 1
    open http://localhost:8000/
elif command -v xdg-open > /dev/null; then
    xdg-open launch-ui.html
    sleep 1
    xdg-open http://localhost:8000/
else
    echo "Please open http://localhost:8000/ in your browser"
fi

echo ""
echo "🎉 Akavelink is running!"
echo "   API: http://localhost:8000"
echo "   UI:  http://localhost:8000"
echo ""
echo "📚 Quick Test Commands:"
echo "   Create bucket:  curl -X POST http://localhost:8000/buckets -H 'Content-Type: application/json' -d '{\"bucketName\":\"test\"}'"
echo "   List buckets:   curl http://localhost:8000/buckets"
echo ""
echo "📋 Useful Commands:"
echo "   View logs:      docker logs -f akavelink"
echo "   Stop:           docker stop akavelink"
echo "   Restart:        ./launch.sh"
echo ""
