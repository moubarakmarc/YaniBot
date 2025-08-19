# YaniBot Frontend

This is the frontend for **YaniBot**, an interactive simulator and control panel for the ABB IRB 6600 robot.  
It provides a modern web interface for manual and automated robot control, visualization, and monitoring.

---

## Features

- **3D Robot Visualization:** View and interact with a simulated ABB IRB 6600 robot in real time.
- **Manual Joint Control:** Adjust each joint using number inputs, with live feedback and value display.
- **Automation Controls:** Start, stop, pause, and resume automated robot tasks.
- **Emergency Stop:** Instantly halt all robot actions and display emergency UI.
- **Workspace & Bin Status:** Visualize workspace boundaries and track bin object counts.
- **Responsive UI:** Clean, modern, and mobile-friendly design.
- **Status & Logging:** See current robot state, actions, and toggle log options.

---

## Folder Structure

```
frontend/
├── index.html         # Main UI HTML
├── style.css          # Main stylesheet
├── js/
│   ├── api.js         # API communication
│   ├── automation.js  # Automation manager
│   ├── bin.js         # Bin management
│   ├── build_robot.js # Robot 3D builder
│   ├── emergency.js   # Emergency stop logic/UI
│   ├── env.js         # Environment config (backend URL, etc)
│   ├── main.js        # App initialization
│   ├── robot.js       # Robot manager (3D and logic)
│   ├── scene.js       # 3D scene and workspace
│   └── ui.js          # UI manager and event handling
```

---

## Requirements

- Modern web browser (Chrome, Firefox, Edge, Safari)
- Backend API running (see [../backend/README.md](../backend/README.md))

---

## Usage

1. **Start the backend server** (see backend README).
2. **Open `index.html` in your browser**  
   - If running locally, you can use a simple HTTP server:
     ```bash
     cd frontend
     python3 -m http.server 8080
     ```
     Then visit [http://localhost:8080](http://localhost:8080).

3. **Interact with the UI:**  
   - Use the control panel to move joints, start automation, or trigger emergency stop.
   - All changes are reflected in the 3D scene.

---

## Key UI Components

- **Manual Joint Control:**  
  Enter joint angles and press Enter to send commands. The value display updates live.

- **Automation Controls:**  
  - Start, Stop, Pause, Resume automation.
  - Select automation strategy.

- **Emergency Stop:**  
  - Instantly halts all robot actions and shows a warning overlay.

- **Workspace Visualization:**  
  - See workspace boundaries, bins, and robot status.

---

## Customization

- **Style:**  
  Edit `style.css` for UI tweaks.
- **3D Scene:**  
  Modify `scene.js` and `build_robot.js` for workspace or robot changes.
- **API Endpoints:**  
  Update `env.js` if your backend runs on a different host/port.

---

## Development Notes

- All JS is modular and ES6+.
- UI logic is managed in `js/ui.js`.
- 3D rendering uses [three.js](https://threejs.org/).
- Error handling and status toasts are built-in.
- For debugging, the global `app` object is available in the browser console.

---

## Authors

- Marc Moubarak