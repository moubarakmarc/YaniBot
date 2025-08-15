#!/bin/bash
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

# Build and start containers
echo "🛑 Stopping existing containers..."
$COMPOSE_CMD down

echo "🔨 Building containers..."
$COMPOSE_CMD build --no-cache

echo "🚀 Starting containers..."
$COMPOSE_CMD up -d

echo ""
echo "✅ YaniBot is running!"
echo "🌐 Frontend: http://localhost"
echo "🔧 Backend API: http://localhost:8000"
echo "📊 Health Check: http://localhost:8000/health"
echo "📖 API Docs: http://localhost:8000/docs"

# Show container status
echo ""
echo "📋 Container Status:"
$COMPOSE_CMD ps

# Show logs
echo ""
echo "📋 Starting logs... (Ctrl+C to stop logs)"
sleep 2
$COMPOSE_CMD logs -f