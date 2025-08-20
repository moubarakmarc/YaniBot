#!/bin/bash
# filepath: /home/moubarakmarc/Desktop/YaniBot/build.sh

echo "🐳 Building YaniBot Docker containers..."

# Test Docker Compose by running the actual command
if docker compose version &> /dev/null; then
    COMPOSE_CMD="docker compose"
    echo "✅ Using Docker Compose V2"
elif docker-compose version &> /dev/null; then
    COMPOSE_CMD="docker-compose"
    echo "✅ Using Docker Compose V1"
else
    echo "❌ Docker Compose not found!"
    echo "Please install Docker Compose:"
    echo "  sudo apt install docker-compose-plugin"
    exit 1
fi

# Handle Ctrl+C gracefully
trap 'echo ""; echo "🛑 Caught interrupt. Stopping containers..."; $COMPOSE_CMD down; exit 0' INT

# Function to check if containers are healthy
check_health() {
    echo "🔍 Checking container health..."
    for i in {1..30}; do
        if $COMPOSE_CMD ps | grep -q "healthy"; then
            echo "✅ Containers are healthy!"
            return 0
        fi
        echo "⏳ Waiting for containers to be healthy... ($i/30)"
        sleep 2
    done
    echo "⚠️ Containers may not be fully healthy, but continuing..."
    return 1
}

# Stop existing containers
echo "🛑 Stopping existing containers..."
$COMPOSE_CMD down

# Clean up old images
echo "🧹 Cleaning up old images..."
docker system prune -f

# Build containers
echo "🔨 Building containers..."
if ! $COMPOSE_CMD build --no-cache; then
    echo "❌ Build failed!"
    exit 1
fi

# Start containers
echo "🚀 Starting containers..."
if ! $COMPOSE_CMD up -d; then
    echo "❌ Failed to start containers!"
    exit 1
fi

# Wait for containers to be ready
echo "⏳ Waiting for containers to start..."
sleep 5

# Check container status
echo ""
echo "📋 Container Status:"
$COMPOSE_CMD ps

# Check health
check_health

echo ""
echo "✅ YaniBot is running!"
echo "🌐 Frontend: http://localhost"
echo "🔧 Backend API: http://localhost:8000"
echo "📊 Health Check: http://localhost:8000/health"
echo "📖 API Docs: http://localhost:8000/docs"

# Test frontend
echo ""
echo "🧪 Testing frontend..."
if curl -s http://localhost/health > /dev/null; then
    echo "✅ Frontend is responding"
else
    echo "⚠️ Frontend not responding yet"
fi

# Test backend
echo "🧪 Testing backend..."
if curl -s http://localhost:8000/health > /dev/null; then
    echo "✅ Backend is responding"
else
    echo "⚠️ Backend not responding yet"
fi

# Ask if user wants to see logs
echo ""
read -p "📋 Show container logs? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "📋 Starting logs... (Ctrl+C to stop logs)"
    sleep 1
    $COMPOSE_CMD logs -f
fi