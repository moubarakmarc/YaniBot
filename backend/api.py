# backend/api.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, validator
from robot import RobotArm
import os

app = FastAPI(
    title="YaniBot API", 
    version="1.0.0",
    description="ABB IRB6600 Robot Control API"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this properly for production
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

class InterpolateRequest(BaseModel):
    start_angles: list[float] = Field(..., min_items=6, max_items=6)
    target_angles: list[float] = Field(..., min_items=6, max_items=6)
    
@app.get("/")
def root():
    return {
        "message": "YaniBot API is running!",
        "version": "1.0.0",
        "docs": "/docs"
    }

@app.get("/health")
def health_check():
    """Health check endpoint for Docker"""
    return {
        "status": "healthy",
        "service": "YaniBot Backend",
        "version": "1.0.0"
    }

@app.get("/state")
def get_state():
    """Retrieve the current angles of the robot."""
    return {
        #"current_angles": robot.current_angles,
        #"joint_limits": robot.joint_limits
    }

@app.post("/reset")
def reset_robot():
    """Reset robot to home position (all joints at 0°)"""
    try:
        home_position = [0.0, 30.0, 55.0, 0.0, 0.0, 0.0]
        path = robot.move_to(home_position)
        return {
            "success": True,
            "message": "Robot reset to home position",
            "current_angles": robot.current_angles
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/limits")
def get_joint_limits():
    """Get joint angle limits for all 6 joints"""
    return {"joint_limits": robot.joint_limits}


@app.post("/interpolate")
def interpolate_path(request: InterpolateRequest, steps: int = 20):
    """
    Returns a list of interpolated joint positions from current to target angles.
    """
    try:
        path = list(robot.interpolate(request.start_angles, request.target_angles, steps=steps))
        return {
            "success": True,
            "steps": path,
            "message": f"Interpolated path from {request.start_angles} to {request.target_angles} in {steps} steps"
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    

# For development server
if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get('PORT', 8000))
    debug = os.environ.get('DEBUG', 'false').lower() == 'true'
    
    uvicorn.run(
        "api:app", 
        host="0.0.0.0", 
        port=port, 
        reload=debug
    )


