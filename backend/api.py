# backend/api.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, validator
from robot import RobotArm

app = FastAPI(title="YaniBot API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# Initialize the robot arm
robot = RobotArm()

class MoveRequest(BaseModel):
    target_angles: list[float] = Field(..., min_items=6, max_items=6)
    
    @validator('target_angles')
    def validate_angles(cls, v):
        if len(v) != 6:
            raise ValueError('Must provide exactly 6 angles')
        return v

@app.get("/")
def root():
    return {"message": "YaniBot API is running!"}

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
