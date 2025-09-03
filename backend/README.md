# YaniBot Backend

This is the backend API for **YaniBot**, an ABB IRB 6600 robot control system.  
It provides RESTful endpoints for controlling and monitoring the robot, including joint angle commands, state management, and safety features.

---

## Features

- **Robot State Management:** Get and set joint angles, moving/paused/emergency states.
- **Interpolation:** Generate interpolated joint paths for smooth motion.
- **Joint Limits Checking:** Ensure all commands are within safe joint limits.
- **Reset & Emergency:** Reset robot to home, emergency stop, and pause/resume support.
- **CORS Enabled:** Ready for frontend integration.

---

## Requirements

- Python 3.10+
- See [`requirements.txt`](requirements.txt) for dependencies:
    - fastapi
    - uvicorn[standard]
    - pydantic
    - numpy
    - python-multipart

Install dependencies with:
```bash
pip install -r requirements.txt
```

---

## Usage

Start the backend server (from this folder):

```bash
uvicorn api:app --reload
```
or, for production:
```bash
uvicorn api:app --host 0.0.0.0 --port 8000
```

The API will be available at [http://localhost:8000](http://localhost:8000).

---

## API Endpoints

- `GET /`  
  API info and docs link.

- `GET /health`  
  Health check for Docker or monitoring.

- `GET /state`  
  Get current robot state (angles, moving, emergency, etc).

- `POST /angles`  
  Set all joint angles or a single joint angle.

- `POST /limits`  
  Check if a set of angles is within joint limits.

- `POST /interpolate`  
  Get interpolated path between two sets of joint angles.

- `POST /reset`  
  Reset robot to home position.

- `POST /moving`  
  Set moving state.

- `POST /pause`  
  Pause or unpause robot.

- `POST /stop`  
  Stop robot movement.

- `POST /emergency`  
  Set or clear emergency mode.

- `POST /safety`  
  Set or clear safety mode.

---

## Project Structure

```
backend/
├── api.py           # FastAPI app and endpoints
├── robot.py         # RobotArm class and logic
├── requirements.txt # Python dependencies
└── tests/           # Unit tests
```

---

## Development

- Code is formatted for clarity and includes docstrings for all endpoints.
- To run tests (if any are present in `tests/`):
    ```bash
    python -m unittest discover tests
    ```

---

## Authors

- Marc Moubarak

---

## Notes

- The backend is designed to be used with the YaniBot frontend, but can be integrated with any client that speaks HTTP.