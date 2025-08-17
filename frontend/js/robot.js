// robot.js - Complete Robot creation and movement management
class RobotManager {
    constructor(sceneManager, RobotBuilderClass) {
        if (!window.ENV) {
            console.error("❌ window.ENV not found! Make sure env.js is loaded first");
            throw new Error("ENV configuration not loaded");
        }
        if (!sceneManager) {
            throw new Error("SceneManager is required");
        }
        this.sceneManager = sceneManager;
        this.scene = null; // Will be set in init()
        this.joints = [];
        this.robotSegments = [];
        this.robotRoot = null;
        this.currentAngles = [0, -30, 40, 0, -15, 0];
        this.positions = this.getPresetPositions();
        this.axisMapping = ['z', 'y', 'y', 'x', 'y', 'x']; // ABB IRB6600 axis mapping
        this.isMoving = false;
        this.backendUrl = window.ENV.BACKEND_URL; // Use environment variable for backend URL
        this.isEmergencyMode = false;
        this.queuedMovements = [];
        this.ui = null; // Will be set by UIManager
        this.api = null; // Will be set by APIManager
        this.RobotBuilderClass = RobotBuilderClass;
    }
    
    async init() {
        
        if (!this.sceneManager) {
            throw new Error("SceneManager not available in robot init");
        }
        
        if (!this.sceneManager.scene) {
            throw new Error("Scene not available - ensure SceneManager is initialized first");
        }
        this.scene = this.sceneManager.scene;
        // Use RobotBuilder to build the robot
        const builder = new this.RobotBuilderClass(this.scene);
        const { robotRoot, joints, robotSegments } = builder.buildRobot();
        this.robotRoot = robotRoot;
        this.joints = joints;
        this.robotSegments = robotSegments;     
        
        console.log("🤖 Enhanced ABB IRB6600 robot initialized");
    }
    

    // Movement Methods
    async moveTo(angles, duration = 2000, waitWhilePaused = null) {
        while (this.isMoving) {
            console.warn('Robot is already moving, ignoring new command');
            await this.sleep(50);
        }
        
        try {
            this.isMoving = true;
            console.log(`🤖 Moving robot to: [${angles.map(a => Math.round(a)).join(', ')}]°`);
            
            // Send to backend first
            await this.api.move(angles);
            
            // Animate visual robot
            await this.animateToPosition(angles, duration, waitWhilePaused);
            
            // Update current state
            this.currentAngles = [...angles];
            
            console.log('✅ Robot movement completed');
            
        } catch (error) {
            console.error('❌ Robot movement failed:', error);
            throw error;
        } finally {
            this.isMoving = false;
        }
    }
    
    async animateToPosition(targetAngles, duration = 2000, waitWhilePaused= null) {
        return new Promise((resolve) => {
            const startAngles = [...this.currentAngles];
            const steps = Math.max(30, Math.floor(duration / 50)); // At least 30 steps
            const stepDuration = duration / steps;
            let currentStep = 0;
            
            const animateStep = async () => {
                if (currentStep >= steps) {
                    // Ensure final position is exact
                    this.setJointAngles(targetAngles);
                    resolve();
                    return;
                }
                
                if (waitWhilePaused) await waitWhilePaused();

                // Calculate interpolated angles with smooth easing
                const progress = currentStep / steps;
                const smoothProgress = this.easeInOutCubic(progress);
                
                const currentAngles = startAngles.map((start, i) => {
                    const target = targetAngles[i];
                    return start + (target - start) * smoothProgress;
                });
                
                this.setJointAngles(currentAngles);

                this.ui.updateJointDisplays(currentAngles);

                currentStep++;
                setTimeout(animateStep, stepDuration);
            };
            
            animateStep();
        });
    }
    
    setJointAngles(angles) {
        for (let i = 0; i < Math.min(angles.length, this.joints.length); i++) {
            this.updateJointRotation(i, angles[i]);
        }
    }
    
    updateJointRotation(jointIndex, angle) {
        if (this.isEmergencyMode) {
            console.warn("🚨 Movement blocked - Robot in emergency mode");
            return false;
        }
        
        if (!this.joints[jointIndex]) {
            console.warn(`Joint ${jointIndex} not found`);
            return;
        }
        
        const joint = this.joints[jointIndex];
        const radians = (angle * Math.PI) / 180;
        const axis = joint.userData.axis;
        
        // Reset rotation
        joint.rotation.set(0, 0, 0);
        
        // Apply rotation based on axis
        switch (axis) {
            case 'x': // Roll rotation
                joint.rotation.x = radians;
                break;
            case 'y': // Pitch rotation 
                joint.rotation.y = radians;
                break;
            case 'z': // Yaw rotation
                joint.rotation.z = radians;
                break;
            default:
                console.warn(`Unknown axis: ${axis} for joint ${jointIndex}`);
        }
        return true;
    }
    
    getPresetPositions() {
        return {
            // change to become default ABB IRB6600 home position
            home: [0,0,0,0,0,0], // Default home position
            
            // Realistic ABB IRB6600 positions
            leftBinApproach: [-45.0, 50.0, 55.0, 0.0, 0.0, 0.0],
            leftBinPick: [-45.0,75.0,55.0,0.0,35.0,10.0],
            leftBinDrop: [-45.0,75.0,55.0,0.0,35.0,10.0],
            leftBinLift: [-45.0,50.0,55.0,0.0,0.0,0.0],

            rightBinApproach: [45.0,50.0,55.0,0.0,0.0,0.0],
            rightBinPick: [45.0,75.0,55.0,0.0,35.0,-10.0],
            rightBinDrop: [45.0,75.0,55.0,0.0,35.0,-10.0],
            rightBinLift: [45.0,50.0,55.0,0.0,0.0,0.0],

            // Safe intermediate positions
            intermediate1: [0.0, 30.0, 55.0, 0.0, 0.0, 0.0],
            
            // Extended reach positions
            extended: [0, 60, -30, 0, -30, 0],
            folded: [0, -45, 90, 0, -45, 0],
            
            // Maintenance positions
            maintenance: [0, -85, 85, 0, 0, 0],
            park: [180, 0, 0, 0, 85, 0]
        };
    }
    
    // Helper Methods
    easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
    }
    
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    // Get current end-effector position
    getEndEffectorPosition() {
        if (this.joints[5]) {
            const worldPosition = new THREE.Vector3();
            this.joints[5].getWorldPosition(worldPosition);
            return worldPosition;
        }
        return new THREE.Vector3(0, 0, 0);
    }
    
    resumeFromEmergency() {
        this.isEmergencyMode = false;
        console.log("✅ Robot resumed from emergency mode");
        
        // Restore normal robot color
        this.setEmergencyVisual(false);
        
        // Resume any queued movements if needed
        // this.resumeQueuedMovements();
    }
    
    setEmergencyVisual(isEmergency) {
        // Change robot colors to indicate emergency state
        this.robotSegments.forEach(segment => {
            if (isEmergency) {
                // Add red glow or change color
                segment.material.emissive.setHex(0x440000); // Dark red glow
            } else {
                // Restore normal appearance
                segment.material.emissive.setHex(0x000000); // No glow
            }
        });
    }
}

// Make class globally available
window.RobotManager = RobotManager;