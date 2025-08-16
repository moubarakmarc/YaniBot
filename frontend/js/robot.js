// robot.js - Complete Robot creation and movement management
class RobotManager {
    constructor(sceneManager) {
        if (!window.ENV) {
            console.error("❌ window.ENV not found! Make sure env.js is loaded first");
            throw new Error("ENV configuration not loaded");
        }
        console.log("✅ ENV loaded:", window.ENV);

        console.log("🤖 RobotManager constructor - sceneManager:", sceneManager);
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
        this.axesHelper = null;
    }
    
    async init() {
        console.log("🤖 Robot init - sceneManager:", this.sceneManager);
        
        if (!this.sceneManager) {
            throw new Error("SceneManager not available in robot init");
        }
        
        if (!this.sceneManager.scene) {
            throw new Error("Scene not available - ensure SceneManager is initialized first");
        }
        this.scene = this.sceneManager.scene;
        this.buildRobot();
        this.addAxesHelpers();
        this.addRobotLighting();      
        
        console.log("🤖 Enhanced ABB IRB6600 robot initialized");
    }
    
    buildRobot() {
        // Create robot root
        this.robotRoot = new THREE.Object3D();
        this.robotRoot.name = "RobotRoot";
        this.scene.add(this.robotRoot);
        
        // Build robot segments in order
        this.createBase();
        this.createShoulder();
        this.createElbow();
        this.createWrist1();
        this.createWrist2();
        this.createFlange();
        
        console.log(`🔧 Robot built with ${this.joints.length} joints`);
    }
    
    createBase() {
        // Simple cylindrical base
        const baseGeometry = new THREE.CylinderGeometry(0.3, 0.35, 0.4, 16);
        const baseMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x2E7D32, // Green
            metalness: 0.3,
            roughness: 0.7
        });
        const base = new THREE.Mesh(baseGeometry, baseMaterial);
        base.castShadow = true;
        base.receiveShadow = true;
        base.name = "Base";
        
        this.robotRoot.add(base);
        this.robotSegments.push(base);
        
        // Joint 1 (Base rotation) - NO ROTATION
        const joint1 = new THREE.Object3D();
        joint1.position.y = 0.2;
        joint1.rotation.x = -Math.PI / 2; // Add this line
        joint1.userData = { axis: 'y', jointIndex: 0 };
        joint1.name = "Joint1";
        
        this.robotRoot.add(joint1);
        this.joints.push(joint1);
        
        return joint1;
    }
    
    // Update createShoulder() - rotate Joint 2
    createShoulder() {
        const parentJoint = this.joints[0];
        
        // Simple box shoulder
        const shoulderGeometry = new THREE.BoxGeometry(0.4, 0.3, 0.5);
        const shoulderMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x1976D2, // Blue
            metalness: 0.3,
            roughness: 0.7
        });
        const shoulder = new THREE.Mesh(shoulderGeometry, shoulderMaterial);
        shoulder.position.set(0, 0, 0.25);
        shoulder.castShadow = true;
        shoulder.receiveShadow = true;
        
        parentJoint.add(shoulder);
        this.robotSegments.push(shoulder);
        
        // Joint 2 (Shoulder pitch) - ROTATE -90° around X
        const joint2 = new THREE.Object3D();
        joint2.position.set(0, 0, 0.5);
        joint2.userData = { axis: 'x', jointIndex: 1 };
        joint2.name = "Joint2";
        
        parentJoint.add(joint2);
        this.joints.push(joint2);
        
        return joint2;
    }
    
    // Update createElbow() - rotate Joint 3
    createElbow() {
        const parentJoint = this.joints[1];
        
        // Simple upper arm
        const upperArmGeometry = new THREE.BoxGeometry(0.2, 0.25, 0.8);
        const upperArmMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xFFC107, // Yellow
            metalness: 0.3,
            roughness: 0.7
        });
        const upperArm = new THREE.Mesh(upperArmGeometry, upperArmMaterial);
        upperArm.position.z = 0.4;
        upperArm.castShadow = true;
        upperArm.receiveShadow = true;
        
        parentJoint.add(upperArm);
        this.robotSegments.push(upperArm);
        
        // Joint 3 (Elbow pitch) - ROTATE -90° around X
        const joint3 = new THREE.Object3D();
        joint3.position.set(0, 0, 0.8);
        joint3.userData = { axis: 'x', jointIndex: 2 };
        joint3.name = "Joint3";
        
        parentJoint.add(joint3);
        this.joints.push(joint3);
        
        return joint3;
    }
    
    // Update createWrist1() - rotate Joint 4
    createWrist1() {
        const parentJoint = this.joints[2];
        
        // Simple forearm
        const forearmGeometry = new THREE.BoxGeometry(0.15, 0.2, 0.6);
        const forearmMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xFF5722, // Orange
            metalness: 0.3,
            roughness: 0.7
        });
        const forearm = new THREE.Mesh(forearmGeometry, forearmMaterial);
        forearm.position.z = 0.3;
        forearm.castShadow = true;
        forearm.receiveShadow = true;
        
        parentJoint.add(forearm);
        this.robotSegments.push(forearm);
        
        // Joint 4 (Wrist roll) - ROTATE -90° around X
        const joint4 = new THREE.Object3D();
        joint4.position.set(0, 0, 0.6);
        joint4.userData = { axis: 'z', jointIndex: 3 };
        joint4.name = "Joint4";
        
        parentJoint.add(joint4);
        this.joints.push(joint4);
        
        return joint4;
    }
    
    // Update createWrist2() - rotate Joint 5
    createWrist2() {
        const parentJoint = this.joints[3];
        
        // Simple wrist
        const wristGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.2, 12);
        const wristMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x9C27B0, // Purple
            metalness: 0.3,
            roughness: 0.7
        });
        const wrist = new THREE.Mesh(wristGeometry, wristMaterial);
        wrist.position.z = 0.1;
        wrist.rotation.x = Math.PI / 2;
        wrist.castShadow = true;
        wrist.receiveShadow = true;
        
        parentJoint.add(wrist);
        this.robotSegments.push(wrist);
        
        // Joint 5 (Wrist pitch) - ROTATE -90° around X
        const joint5 = new THREE.Object3D();
        joint5.position.set(0, 0, 0.2);
        joint5.userData = { axis: 'y', jointIndex: 4 };
        joint5.name = "Joint5";
        
        parentJoint.add(joint5);
        this.joints.push(joint5);
        
        return joint5;
    }
    
    // Update createFlange() - rotate Joint 6
    createFlange() {
        const parentJoint = this.joints[4];
        
        // Simple flange
        const flangeGeometry = new THREE.CylinderGeometry(0.06, 0.06, 0.05, 16);
        const flangeMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x607D8B, // Grey
            metalness: 0.5,
            roughness: 0.5
        });
        const flange = new THREE.Mesh(flangeGeometry, flangeMaterial);
        flange.position.z = 0.025;
        flange.rotation.x = Math.PI / 2;
        flange.castShadow = true;
        flange.receiveShadow = true;
        
        parentJoint.add(flange);
        this.robotSegments.push(flange);
        
        // Joint 6 (Tool rotation) - ROTATE -90° around X
        const joint6 = new THREE.Object3D();
        joint6.position.set(0, 0, 0.05);
        joint6.userData = { axis: 'z', jointIndex: 5 };
        joint6.name = "Joint6";
        
        parentJoint.add(joint6);
        this.joints.push(joint6);
        
        // Simple TCP marker
        const tcpGeometry = new THREE.SphereGeometry(0.01, 8, 8);
        const tcpMaterial = new THREE.MeshStandardMaterial({ color: 0xFF0000 });
        const tcp = new THREE.Mesh(tcpGeometry, tcpMaterial);
        tcp.position.z = 0.02;
        joint6.add(tcp);
        
        return joint6;
    }
    
    addAxesHelpers() {
        // Create and STORE the main axes reference
        this.axesHelper = new THREE.AxesHelper(1.5);
        this.axesHelper.rotation.x = -Math.PI / 2; // Rotate -90° to make Z point up
        this.axesHelper.name = "MainAxes";
        this.scene.add(this.axesHelper);
        
        // Add smaller axes to each joint with same rotation
        this.joints.forEach((joint, index) => {
            const jointAxes = new THREE.AxesHelper(0.3);
            jointAxes.rotation.x = -Math.PI / 2; // Same rotation for consistency
            jointAxes.name = `Joint${index+1}_Axes`;
            joint.add(jointAxes);
        });
        
        console.log('📐 Coordinate system created and stored: Z=Blue(UP), X=Red(right), Y=Green(forward)');
    }
    
    // Enhanced lighting for better robot visualization
    addRobotLighting() {
        // Dedicated robot lighting
        const robotLight = new THREE.DirectionalLight(0xffffff, 0.8);
        robotLight.position.set(2, 3, 2);
        robotLight.target = this.robotRoot;
        robotLight.castShadow = true;
        
        // Shadow settings for better quality
        robotLight.shadow.mapSize.width = 2048;
        robotLight.shadow.mapSize.height = 2048;
        robotLight.shadow.camera.near = 0.5;
        robotLight.shadow.camera.far = 50;
        robotLight.shadow.camera.left = -5;
        robotLight.shadow.camera.right = 5;
        robotLight.shadow.camera.top = 5;
        robotLight.shadow.camera.bottom = -5;
        
        this.scene.add(robotLight);
    }
    
    // Movement Methods
    async moveTo(angles, duration = 2000) {
        if (this.isMoving) {
            console.warn('Robot is already moving, ignoring new command');
            return;
        }
        
        try {
            this.isMoving = true;
            console.log(`🤖 Moving robot to: [${angles.map(a => Math.round(a)).join(', ')}]°`);
            
            // Send to backend first
            await this.sendToBackend(angles);
            
            // Animate visual robot
            await this.animateToPosition(angles, duration);
            
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
    
    async animateToPosition(targetAngles, duration = 2000) {
        return new Promise((resolve) => {
            const startAngles = [...this.currentAngles];
            const steps = Math.max(30, Math.floor(duration / 50)); // At least 30 steps
            const stepDuration = duration / steps;
            let currentStep = 0;
            
            const animateStep = () => {
                if (currentStep >= steps) {
                    // Ensure final position is exact
                    this.setJointAngles(targetAngles);
                    resolve();
                    return;
                }
                
                // Calculate interpolated angles with smooth easing
                const progress = currentStep / steps;
                const smoothProgress = this.easeInOutCubic(progress);
                
                const currentAngles = startAngles.map((start, i) => {
                    const target = targetAngles[i];
                    return start + (target - start) * smoothProgress;
                });
                
                this.setJointAngles(currentAngles);
                
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
    }
    
    async sendToBackend(angles) {
        // Validate angles first
        if (!this.isValidPosition(angles)) {
            console.warn('❌ Invalid joint angles:', angles);
            throw new Error('Joint angles out of range');
        }

        try {
            console.log('📡 Sending to backend:', { target_angles: angles });
            
            const response = await fetch(`${this.backendUrl}${window.ENV.API_ENDPOINTS.MOVE}`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ target_angles: angles })
            });
            
            // Log the response for debugging
            const responseText = await response.text();
            console.log('📡 Backend response status:', response.status);
            console.log('📡 Backend response:', responseText);
            
            if (!response.ok) {
                let errorMessage = `Backend error: ${response.status}`;
                try {
                    const errorData = JSON.parse(responseText);
                    errorMessage = errorData.error || errorMessage;
                } catch (e) {
                    errorMessage = responseText || errorMessage;
                }
                throw new Error(errorMessage);
            }
            
            const data = JSON.parse(responseText);
            console.log('✅ Backend accepted movement:', data);
            return data;
            
        } catch (error) {
            console.warn('⚠️ Backend communication failed:', error.message);
            // Don't throw error - allow frontend to continue working
            return null;
        }
    }

    // Add validation method if missing (around line 580):
    isValidPosition(angles) {
        const limits = this.getJointLimits();
        return angles.every((angle, i) => {
            if (i >= limits.length) return true;
            const [min, max] = limits[i];
            const valid = angle >= min && angle <= max;
            if (!valid) {
                console.warn(`Joint ${i+1} angle ${angle}° out of range [${min}, ${max}]`);
            }
            return valid;
        });
    }
    
    async getBackendState() {
        try {
            const response = await fetch(`${this.backendUrl}${window.ENV.API_ENDPOINTS.STATE}`);
            if (!response.ok) {
                throw new Error(`Backend error: ${response.status}`);
            }
            
            const data = await response.json();
            this.currentAngles = [...data.current_angles];
            return data;
            
        } catch (error) {
            console.warn('⚠️ Failed to get backend state:', error.message);
            return null;
        }
    }
    
    async reset() {
        console.log('🔄 Resetting robot to home position');
        await this.moveTo(this.positions.home, 2000);
        
        try {
            const response = await fetch(`${this.backendUrl}${window.ENV.API_ENDPOINTS.RESET}`, {
                method: 'POST'
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log('📡 Reset response:', data);
            }
        } catch (error) {
            console.warn('⚠️ Backend reset failed:', error.message);
        }
    }
    
    // Utility Methods
    async testMovement() {
        console.log('🧪 Starting robot movement test');
        
        const testSequence = [
            { position: [30, 0, 0, 0, 0, 0], duration: 1000 },
            { position: [0, 30, 0, 0, 0, 0], duration: 1000 },
            { position: [0, 0, 30, 0, 0, 0], duration: 1000 },
            { position: [0, 0, 0, 45, 0, 0], duration: 1000 },
            { position: [0, 0, 0, 0, 45, 0], duration: 1000 },
            { position: [0, 0, 0, 0, 0, 90], duration: 1000 },
            { position: this.positions.home, duration: 2000 }
        ];
        
        for (const step of testSequence) {
            await this.moveTo(step.position, step.duration);
            await this.sleep(200); // Small pause between movements
        }
        
        console.log('✅ Robot movement test completed');
    }
    
    getPresetPositions() {
        return {
            home: [0, -30, 45, 0, -15, 0],
            
            // Realistic ABB IRB6600 positions
            leftBinApproach: [-90, 15, -25, 0, 10, 0],
            leftBinPick: [-90, 40, -55, 0, 25, 0],
            leftBinLift: [-90, 25, -35, 0, 15, 0],
            
            rightBinApproach: [90, 15, -25, 0, 10, 0],
            rightBinDrop: [90, 40, -55, 0, 25, 0],
            rightBinLift: [90, 25, -35, 0, 15, 0],
            
            // Safe intermediate positions
            intermediate1: [0, -15, 15, 0, 0, 0],
            intermediate2: [45, -10, 10, 0, 5, 0],
            intermediate3: [-45, -10, 10, 0, 5, 0],
            
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
    
    // Check if position is reachable (basic validation)
    isPositionValid(angles) {
        const limits = [
            [-180, 180], // Joint 1
            [-90, 90],   // Joint 2
            [-180, 180], // Joint 3
            [-180, 180], // Joint 4
            [-90, 90],   // Joint 5
            [-180, 180]  // Joint 6
        ];
        
        return angles.every((angle, i) => {
            if (i >= limits.length) return true;
            const [min, max] = limits[i];
            return angle >= min && angle <= max;
        });
    }
    
    // Enhanced joint limits to match real ABB IRB6600
    getJointLimits() {
        return [
            [-180, 180], // A1: Base rotation
            [-90, 85],   // A2: Shoulder pitch (actual IRB6600 limits)
            [-180, 70],  // A3: Elbow pitch (actual IRB6600 limits)
            [-300, 300], // A4: Wrist roll
            [-130, 130], // A5: Wrist pitch (actual IRB6600 limits)
            [-360, 360]  // A6: Tool rotation (continuous)
        ];
    }
    
    // Emergency stop
    async emergencyStop() {
        console.log('🚨 EMERGENCY STOP - Halting robot');
        this.isMoving = false;
        
        try {
            await fetch(`${this.backendUrl}${window.ENV.API_ENDPOINTS.EMERGENCY_STOP}`, {
                method: 'POST'
            });
        } catch (error) {
            console.warn('⚠️ Backend emergency stop failed:', error.message);
        }
    }
}

// Make class globally available
window.RobotManager = RobotManager;