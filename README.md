# YaniBot 🤖

> **ABB IRB6600 6-Axis Robot Arm Simulator**  
> A web-based 3D robot simulator with FastAPI backend and Three.js frontend

This repo is for the assignment handed over to me by Sereact

![YaniBot Demo](https://img.shields.io/badge/Status-Active-brightgreen) ![Docker](https://img.shields.io/badge/Docker-Ready-blue) ![FastAPI](https://img.shields.io/badge/FastAPI-Latest-009688) ![Three.js](https://img.shields.io/badge/Three.js-3D-orange)

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
- [API Documentation](#api-documentation)
- [Project Structure](#project-structure)
- [Development](#development)
- [Configuration](#configuration)
- [Contributing](#contributing)

## 🎯 Overview

YaniBot is a comprehensive 3D simulation environment for the ABB IRB6600 industrial robot arm. Built for educational and development purposes, it provides real-time visualization, joint control, and motion planning capabilities through a modern web interface.

**Assignment created for:** Sereact

## ✨ Features

### 🎮 Interactive Controls
- **Manual Joint Control**: Real-time slider controls for all 6 axes
- **Visual Feedback**: Live 3D visualization with Three.js
- **Coordinate System**: Color-coded axes indicators (X-Red, Y-Blue, Z-Green)
- **Reset Functionality**: One-click return to home position

### 🤖 Robot Simulation
- **Accurate ABB IRB6600 Model**: Realistic joint limits and kinematics
- **6-DOF Movement**: Full 6-axis articulation
- **Safety Limits**: Built-in joint angle validation
- **Smooth Interpolation**: Natural movement transitions

### 🔧 Technical Features
- **RESTful API**: FastAPI backend with automatic documentation
- **Containerized**: Full Docker deployment ready
- **CORS Enabled**: Cross-origin resource sharing configured
- **Real-time Updates**: Live joint state synchronization

## 🛠️ Tech Stack

### Frontend
- **Three.js** - 3D graphics and rendering
- **Vanilla JavaScript** - Core application logic
- **HTML5/CSS3** - Modern web interface
- **Nginx** - Production web server

### Backend
- **FastAPI** - Modern Python web framework
- **Pydantic** - Data validation and settings
- **NumPy** - Numerical computations
- **Uvicorn** - ASGI server

### Infrastructure
- **Docker** - Containerization
- **Docker Compose** - Multi-container orchestration

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd YaniBot
   ```

2. **Build and run with Docker**
   ```bash
   chmod +x build.sh
   ./build.sh
   ```

3. **Access the application**
   - 🌐 **Frontend**: http://localhost
   - 🔧 **Backend API**: http://localhost:8000
   - 📖 **API Docs**: http://localhost:8000/docs

## 📚 API Documentation

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | Root endpoint with API info |
| `GET` | `/health` | Health check |
| `GET` | `/state` | Current robot state |
| `POST` | `/move` | Move robot to target angles |
| `POST` | `/reset` | Reset to home position |
| `GET` | `/limits` | Joint angle limits |

### Example Usage

**Move Robot:**
```bash
curl -X POST "http://localhost:8000/move" \
     -H "Content-Type: application/json" \
     -d '{"target_angles": [0, 30, -45, 0, 15, 0]}'
```

**Get Robot State:**
```bash
curl http://localhost:8000/state
```

**Reset Robot:**
```bash
curl -X POST http://localhost:8000/reset
```

## 📁 Project Structure

```
YaniBot/
├── 📁 frontend/                 # Frontend application
│   ├── index.html              # Main HTML file
│   ├── script.js               # Three.js logic
│   └── style.css               # Styling
├── 📁 backend/                 # Backend API
│   ├── api.py                  # FastAPI application
│   ├── robot.py                # Robot arm logic
│   └── requirements.txt        # Python dependencies
├── 🐳 docker-compose.yml       # Multi-container setup
├── 🐳 backend.Dockerfile       # Backend container config
├── 🐳 frontend.Dockerfile      # Frontend container config
├── ⚙️ nginx.conf               # Nginx configuration
├── 🚀 build.sh                 # Build script
└── 📋 README.md                # This file
```

## 🛠️ Development

### Local Development

**Backend only:**
```bash
cd backend
pip install -r requirements.txt
uvicorn api:app --reload --host 0.0.0.0 --port 8000
```

**Frontend only:**
```bash
cd frontend
python -m http.server 5000
```

### Development with Docker

**With live reload:**
```bash
# Create dev.sh for development mode
docker compose up --build
```

**View logs:**
```bash
docker compose logs -f
```

**Rebuild specific service:**
```bash
docker compose build backend --no-cache
docker compose up -d backend
```

## ⚙️ Configuration

### Robot Specifications (ABB IRB6600)

| Joint | Range | Description |
|-------|-------|-------------|
| **A1** | -180° to +180° | Base rotation (Z-axis) |
| **A2** | -65° to +80° | Shoulder pitch (Y-axis) |
| **A3** | -180° to +60° | Elbow pitch (Y-axis) |
| **A4** | -300° to +300° | Wrist roll (X-axis) |
| **A5** | -120° to +120° | Wrist pitch (Z-axis) |
| **A6** | -300° to +300° | Flange roll (X-axis) |

### Environment Variables

Create a `.env` file:
```properties
DEBUG=true
FLASK_ENV=development
```

## 🔍 Troubleshooting

### Common Issues

**Docker Compose not found:**
```bash
# Install Docker Compose V2
sudo apt install docker-compose-plugin
```

**Port conflicts:**
```bash
# Check what's using ports 80 and 8000
sudo netstat -tulpn | grep :80
sudo netstat -tulpn | grep :8000
```

**Container fails to start:**
```bash
# Check logs
docker compose logs backend
docker compose logs frontend
```

## 🎯 Features Roadmap

- [ ] **Inverse Kinematics**: Target position-based movement
- [ ] **Path Planning**: Obstacle avoidance algorithms
- [ ] **WebSocket Support**: Real-time bidirectional communication
- [ ] **3D Environment**: Add workspace and obstacles
- [ ] **Recording/Playback**: Save and replay robot movements

## 📄 License

This project is part of an assignment for **Sereact**. Please respect intellectual property rights.

## 📞 Contact

For questions regarding this assignment implementation, please contact the development team.

---

**Built with ❤️ for robotics education and development**
