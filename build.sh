#!/bin/bash
# filepath: /home/moubarakmarc/Desktop/YaniBot/build.sh
echo "🐳 Building YaniBot Docker containers..."

# Build and start containers
docker-compose down
docker-compose build --no-cache
docker-compose up -d

echo "✅ YaniBot is running!"
echo "🌐 Frontend: http://localhost"
echo "🔧 Backend API: http://localhost:5000"
echo "📊 Health Check: http://localhost:5000/health"