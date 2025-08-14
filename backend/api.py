# backend/api.py
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from robot import RobotArm

app = FastAPI(title="YaniBot API", version="1.0.0")

robot = RobotArm()

class MoveRequest(BaseModel):
    target_angles: list[float]  # 6 floats in degrees

@app.get("/state")
def get_state():
    """
    Retrieve the current angles of the robot.
    """
    return {"current_angles": robot.current_angles}

@app.post("/move")
def move_robot(request: MoveRequest):
    """
    Moves the robot to the specified target joint angles using smooth interpolation.
    """
    try:
        path = robot.move_to(request.target_angles)
        return {"steps": path, "final_angles": robot.current_angles}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
