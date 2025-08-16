// robot.js - Complete Robot creation and movement management
class RobotManager {
    constructor(sceneManager) {
        this.scene = sceneManager.scene;
        this.scene = null; // Will be set in init()
        this.joints = [];
        this.robotSegments = [];
        this.robotRoot = null;
        this.currentAngles = [0, 0, 0, 0, 0, 0];
        this.positions = this.getPresetPositions();
        this.axisMapping = ['y', 'z', 'z', 'x', 'y', 'x']; // ABB IRB6600 axis mapping
        this.isMoving = false;
        this.backendUrl = window.ENV.BACKEND_URL; // Use environment variable for backend URL
    }
    
    async init() {
        this.scene = this.sceneManager.scene;
        this.buildRobot();
        this.addAxesHelpers();
        console.log("🤖 Robot initialized");
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
        // Base segment (fixed to ground)
        const baseGeometry = new THREE.CylinderGeometry(0.3, 0.4, 0.6, 16);
        const baseMaterial = new THREE.MeshStandardMaterial({ color: 0x2E7D32 });
        const base = new THREE.Mesh(baseGeometry, baseMaterial);
        base.position.y = 0.3;
        base.castShadow = true;
        base.receiveShadow = true;
        base.name = "Base";
        
        this.robotRoot.add(base);
        this.robotSegments.push(base);
        
        // Joint 1 (Base rotation) - rotates around Y axis
        const joint1 = new THREE.Object3D();
        joint1.position.y = 0.6;
        joint1.userData = { axis: 'y', jointIndex: 0 };
        joint1.name = "Joint1";
        
        this.robotRoot.add(joint1);
        this.joints.push(joint1);
        
        return joint1;
    }
    
    createShoulder() {
        const parentJoint = this.joints[0];
        
        // Shoulder segment
        const shoulderGeometry = new THREE.BoxGeometry(0.5, 0.3, 0.8);
        const shoulderMaterial = new THREE.MeshStandardMaterial({ color: 0x1976D2 });
        const shoulder = new THREE.Mesh(shoulderGeometry, shoulderMaterial);
        shoulder.position.z = 0.4;
        shoulder.castShadow = true;
        shoulder.receiveShadow = true;
        shoulder.name = "Shoulder";
        
        parentJoint.add(shoulder);
        this.robotSegments.push(shoulder);
        
        // Joint 2 (Shoulder pitch) - rotates around Z axis
        const joint2 = new THREE.Object3D();
        joint2.position.set(0, 0, 0.8);
        joint2.userData = { axis: 'z', jointIndex: 1 };
        joint2.name = "Joint2";
        
        parentJoint.add(joint2);
        this.joints.push(joint2);
        
        return joint2;
    }
    
    createElbow() {
        const parentJoint = this.joints[1];
        
        // Upper arm segment
        const upperArmGeometry = new THREE.BoxGeometry(0.3, 0.25, 1.2);
        const upperArmMaterial = new THREE.MeshStandardMaterial({ color: 0xFFC107 });
        const upperArm = new THREE.Mesh(upperArmGeometry, upperArmMaterial);
        upperArm.position.z = 0.6;
        upperArm.castShadow = true;
        upperArm.receiveShadow = true;
        upperArm.name = "UpperArm";
        
        parentJoint.add(upperArm);
        this.robotSegments.push(upperArm);
        
        // Joint 3 (Elbow pitch) - rotates around Z axis
        const joint3 = new THREE.Object3D();
        joint3.position.set(0, 0, 1.2);
        joint3.userData = { axis: 'z', jointIndex: 2 };
        joint3.name = "Joint3";
        
        parentJoint.add(joint3);
        this.joints.push(joint3);
        
        return joint3;
    }
    
    createWrist1() {
        const parentJoint = this.joints[2];
        
        // Forearm segment
        const forearmGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.8);
        const forearmMaterial = new THREE.MeshStandardMaterial({ color: 0xFF5722 });
        const forearm = new THREE.Mesh(forearmGeometry, forearmMaterial);
        forearm.position.z = 0.4;
        forearm.castShadow = true;
        forearm.receiveShadow = true;
        forearm.name = "Forearm";
        
        parentJoint.add(forearm);
        this.robotSegments.push(forearm);
        
        // Joint 4 (Wrist roll) - rotates around X axis
        const joint4 = new THREE.Object3D();
        joint4.position.set(0, 0, 0.8);
        joint4.userData = { axis: 'x', jointIndex: 3 };
        joint4.name = "Joint4";
        
        parentJoint.add(joint4);
        this.joints.push(joint4);
        
        return joint4;
    }
    
    createWrist2() {
        const parentJoint = this.joints[3];
        
        // Wrist segment
        const wristGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.3, 12);
        const wristMaterial = new THREE.MeshStandardMaterial({ color: 0x9C27B0 });
        const wrist = new THREE.Mesh(wristGeometry, wristMaterial);
        wrist.position.z = 0.15;
        wrist.rotation.x = Math.PI / 2;
        wrist.castShadow = true;
        wrist.receiveShadow = true;
        wrist.name = "Wrist";
        
        parentJoint.add(wrist);
        this.robotSegments.push(wrist);
        
        // Joint 5 (Wrist pitch) - rotates around Y axis
        const joint5 = new THREE.Object3D();
        joint5.position.set(0, 0, 0.3);
        joint5.userData = { axis: 'y', jointIndex: 4 };
        joint5.name = "Joint5";
        
        parentJoint.add(joint5);
        this.joints.push(joint5);
        
        return joint5;
    }
    
    createFlange() {
        const parentJoint = this.joints[4];
        
        // Flange segment (end-effector mount)
        const flangeGeometry = new THREE.CylinderGeometry(0.06, 0.06, 0.1, 12);
        const flangeMaterial = new THREE.MeshStandardMaterial({ color: 0x607D8B });
        const flange = new THREE.Mesh(flangeGeometry, flangeMaterial);
        flange.position.z = 0.05;
        flange.rotation.x = Math.PI / 2;
        flange.castShadow = true;
        flange.receiveShadow = true;
        flange.name = "Flange";
        
        parentJoint.add(flange);
        this.robotSegments.push(flange);
        
        // Joint 6 (Flange rotation) - rotates around X axis
        const joint6 = new THREE.Object3D();
        joint6.position.set(0, 0, 0.1);
        joint6.userData = { axis: 'x', jointIndex: 5 };
        joint6.name = "Joint6";
        
        parentJoint.add(joint6);
        this.joints.push(joint6);
        
        // Add tool center point marker
        this.createTCPMarker(joint6);
        
        return joint6;
    }
    
    createTCPMarker(parentJoint) {
        // Tool Center Point visual marker
        const tcpGeometry = new THREE.SphereGeometry(0.02, 8, 8);
        const tcpMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xFF0000,
            emissive: 0x330000 
        });
        const tcp = new THREE.Mesh(tcpGeometry, tcpMaterial);
        tcp.position.z = 0.05;
        tcp.name = "TCP";
        
        parentJoint.add(tcp);
    }
    
    addAxesHelpers() {
        // Add coordinate axes to each joint for debugging
        this.joints.forEach((joint, index) => {
            if (this.scene.addAxesHelper) {
                this.scene.addAxesHelper(joint, 0.5);
            }
        });
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
            case 'x':
                joint.rotation.x = radians;
                break;
            case 'y':
                joint.rotation.y = radians;
                break;
            case 'z':
                joint.rotation.z = radians;
                break;
            default:
                console.warn(`Unknown axis: ${axis} for joint ${jointIndex}`);
        }
    }
    
    // Backend Communication
    async sendToBackend(angles) {
        try {
            const response = await fetch(`${this.backendUrl}${window.ENV.API_ENDPOINTS.MOVE}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ target_angles: angles })
            });
            
            if (!response.ok) {
                throw new Error(`Backend error: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('📡 Backend response:', data);
            return data;
            
        } catch (error) {
            console.warn('⚠️ Backend communication failed:', error.message);
            // Continue with visual movement even if backend fails
            return null;
        }
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
            home: [0, 0, 0, 0, 0, 0],
            
            // Left bin positions
            leftBinApproach: [-90, 10, -20, 0, 10, 0],
            leftBinPick: [-90, 45, -60, 0, 30, 0],
            leftBinLift: [-90, 25, -40, 0, 15, 0],
            
            // Right bin positions
            rightBinApproach: [90, 10, -20, 0, 10, 0],
            rightBinDrop: [90, 45, -60, 0, 30, 0],
            rightBinLift: [90, 25, -40, 0, 15, 0],
            
            // Safe intermediate positions
            intermediate1: [0, -10, 10, 0, 0, 0],
            intermediate2: [45, 0, -10, 0, 5, 0],
            intermediate3: [-45, 0, -10, 0, 5, 0],
            
            // Maintenance positions
            maintenance: [0, -90, 90, 0, 0, 0],
            park: [180, 0, 0, 0, 90, 0]
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
    
    // Get joint limits
    getJointLimits() {
        return [
            [-180, 180], // Joint 1: Base rotation
            [-90, 90],   // Joint 2: Shoulder pitch
            [-180, 180], // Joint 3: Elbow pitch
            [-180, 180], // Joint 4: Wrist roll
            [-90, 90],   // Joint 5: Wrist pitch
            [-180, 180]  // Joint 6: Flange rotation
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