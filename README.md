# YaniBot 🤖

> **ABB IRB6600 6-Axis Robot Arm Simulator**  
> A web-based 3D robot simulator with a FastAPI backend and Three.js frontend

---

![Status](https://img.shields.io/badge/Status-Active-brightgreen)
![Docker](https://img.shields.io/badge/Docker-Ready-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-Latest-009688)
![Three.js](https://img.shields.io/badge/Three.js-3D-orange)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
- [API Documentation](#api-documentation)
- [Project Structure](#project-structure)
- [Development](#development)
- [Configuration](#configuration)
- [Troubleshooting](#troubleshooting)
- [License](#license)
- [Authors](#authors)

---

## 🎯 Overview

YaniBot is a comprehensive 3D simulation environment for the ABB IRB6600 industrial robot arm.  
It provides real-time visualization, manual and automated joint control, and motion planning through a modern web interface.

---

## ✨ Features

- **Manual Joint Control:** Enter joint angles in number fields and press Enter to send commands.
- **Live 3D Visualization:** Real-time robot rendering with Three.js.
- **Automation Controls:** Start, stop, pause, and resume automated robot tasks.
- **Emergency Stop:** Instantly halt all robot actions and display emergency UI.
- **Workspace & Bin Status:** Visualize workspace boundaries and track bin object counts.
- **Status & Logging:** See current robot state, actions, and toggle log options.
- **RESTful API:** FastAPI backend with automatic documentation.
- **Containerized:** Full Docker deployment ready.
- **CORS Enabled:** Cross-origin resource sharing configured.
- **Real-time Updates:** Live joint state synchronization.

---

## 🛠️ Tech Stack

**Frontend:**
- [Three.js](https://threejs.org/) — 3D graphics and rendering
- Vanilla JavaScript (ES6+)
- HTML5/CSS3
- Nginx (for production)

**Backend:**
- [FastAPI](https://fastapi.tiangolo.com/) — Python web framework
- Pydantic — Data validation
- NumPy — Numerical computations
- Uvicorn — ASGI server

**Infrastructure:**
- Docker & Docker Compose

---

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

2. **Build and run with Docker (first time)**
    ```bash
    chmod +x build.sh
    ./build.sh
    ```

3. **Restart the app after reboot or to restart cleanly**
    ```bash
    chmod +x run.sh
    ./run.sh
    ```
    
4. **Access the application**
    - 🌐 **Frontend**: http://localhost
    - 🔧 **Backend API**: http://localhost:8000
    - 📖 **API Docs**: http://localhost:8000/docs

---

## 📚 API Documentation

### Endpoints

| Method | Endpoint     | Description                    |
|--------|-------------|--------------------------------|
| GET    | `/`         | Root endpoint with API info    |
| GET    | `/health`   | Health check                   |
| GET    | `/state`    | Current robot state            |
| POST   | `/angles`   | Set all or single joint angles |
| POST   | `/reset`    | Reset to home position         |
| POST   | `/interpolate` | Interpolated joint path      |
| POST   | `/limits`   | Check joint angle limits       |
| POST   | `/pause`    | Pause or unpause robot         |
| POST   | `/stop`     | Stop robot movement            |
| POST   | `/emergency`| Set or clear emergency mode    |

### Example Usage

**Get Robot State:**
```bash
curl http://localhost:8000/state
```

**Reset Robot:**
```bash
curl -X POST http://localhost:8000/reset
```

---

## 📁 Project Structure

```
YaniBot/
├── frontend/                   # Frontend application
│   ├── index.html              # Main HTML file
│   ├── style.css               # Main stylesheet
│   └── js/
│       ├── main.js             # Application entry point
│       ├── scene.js            # 3D scene and workspace logic
│       ├── robot.js            # Robot 3D model and kinematics
│       ├── automation.js       # Automation and task logic
│       ├── ui.js               # User interface and event handling
│       ├── api.js              # Backend API communication
│       └── env.js              # Environment/backend URL config
├── backend/                    # Backend API
│   ├── api.py                  # FastAPI application (all endpoints)
│   ├── robot.py                # RobotArm class and logic
│   ├── requirements.txt        # Python dependencies
│   └── tests/                  # Unit tests for backend logic and API
├── docker-compose.yml          # Multi-container orchestration
├── backend.Dockerfile          # Backend container build config
├── frontend.Dockerfile         # Frontend container build config
├── nginx.conf                  # Nginx reverse proxy configuration
├── build.sh                    # Build and run helper script
└── README.md                   # Project documentation (this file)
```

---

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

---

## ⚙️ Configuration

### Robot Specifications (ABB IRB6600)

| Joint | Range           | Description                |
|-------|-----------------|----------------------------|
| **A1** | -180° to +180° | Base rotation              |
| **A2** | -65° to +80°   | Shoulder pitch             |
| **A3** | -180° to +60°  | Elbow pitch                |
| **A4** | -300° to +300° | Wrist roll                 |
| **A5** | -120° to +120° | Wrist pitch                |
| **A6** | -300° to +300° | Flange roll                |

### Environment Variables

Create a `.env` file if needed for custom configuration.

---

## 🔍 Troubleshooting

**Docker Compose not found:**
```bash
sudo apt install docker-compose-plugin
```

**Port conflicts:**
```bash
sudo netstat -tulpn | grep :80
sudo netstat -tulpn | grep :8000
```

**Container fails to start:**
```bash
docker compose logs backend
docker compose logs frontend
```

---

## 📄 License

This project is part of an assignment for **Sereact**. Please respect intellectual property rights.

---

## 👤 Authors

- Marc Moubarak

---

**Built with ❤️ for robotics