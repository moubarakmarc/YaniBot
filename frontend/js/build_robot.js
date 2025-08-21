class RobotBuilder {
    constructor(scene) {
        this.scene = scene;
        this.joints = [];
        this.robotSegments = [];
        this.robotRoot = null;
        this.api = null;
    }




    async buildRobot() {
        // Create robot root
        let state = await this.api.getState();
        console.log("🤖 Building robot with initial angles:", state.homeAngles);
        const initialAnglesDeg = state.homeAngles;
        const initialAngles = initialAnglesDeg.map(angle => (angle * Math.PI) / 180);

        this.robotRoot = new THREE.Object3D();
        this.robotRoot.name = "RobotRoot";
        
        this.robotRoot.rotation.x = -Math.PI / 2; // Rotate -90° to make Z point up

        // Add robot root to scene
        this.scene.add(this.robotRoot);


        
        // Build robot segments in order
        this.createBase(initialAngles);
        this.createShoulder(initialAngles);
        this.createElbow(initialAngles);
        this.createWrist1(initialAngles);
        this.createWrist2(initialAngles);
        this.createFlange(initialAngles);
        this.addRobotLighting();
        
        console.log(`🔧 Robot built with ${this.joints.length} joints`);
        // Return built components
        return {
            robotRoot: this.robotRoot,
            joints: this.joints,
            robotSegments: this.robotSegments
        };
    }

    createBase(initialAngles) {
        // Simple cylindrical base
        const baseGeometry = new THREE.CylinderGeometry(0.3, 0.35, 2, 16);
        const baseMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x00000, // Black
            metalness: 0.3,
            roughness: 0.7
        });
        const base = new THREE.Mesh(baseGeometry, baseMaterial);
        base.rotation.x = Math.PI / 2; // Rotate -90° to make Z point up
        base.castShadow = true;
        base.receiveShadow = true;
        base.name = "Base";
        
        this.robotRoot.add(base);
        this.robotSegments.push(base);
        
        // Joint 1 (Base rotation)
        const joint1 = new THREE.Object3D();
        joint1.position.z = 1;
        joint1.userData = { axis: 'z', jointIndex: 0 };
        joint1.name = "Joint1";
        joint1.rotation.z = initialAngles[0];

        this.robotRoot.add(joint1);
        this.joints.push(joint1);
        
        return joint1;
    }
    
    // Update createShoulder() - rotate Joint 2
    createShoulder(initialAngles) {
        const parentJoint = this.joints[0];
        
        // Simple box shoulder
        const shoulderGeometry = new THREE.BoxGeometry(0.4, 0.3, 0.5);
        const shoulderMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xffffff, // White
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
        joint2.rotation.x = initialAngles[1];

        parentJoint.add(joint2);
        this.joints.push(joint2);
        
        return joint2;
    }
    
    // Update createElbow() - rotate Joint 3
    createElbow(initialAngles) {
        const parentJoint = this.joints[1];
        
        // Simple upper arm
        const upperArmGeometry = new THREE.BoxGeometry(0.2, 0.25, 0.8);
        const upperArmMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xffffff, // White
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
        joint3.rotation.x = initialAngles[2];
        
        parentJoint.add(joint3);
        this.joints.push(joint3);
        
        return joint3;
    }
    
    // Update createWrist1() - rotate Joint 4
    createWrist1(initialAngles) {
        const parentJoint = this.joints[2];
        
        // Simple forearm
        const forearmGeometry = new THREE.BoxGeometry(0.15, 0.2, 0.6);
        const forearmMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xffffff, // White
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
        joint4.rotation.z = initialAngles[3];
        
        parentJoint.add(joint4);
        this.joints.push(joint4);
        
        return joint4;
    }
    
    // Update createWrist2() - rotate Joint 5
    createWrist2(initialAngles) {
        const parentJoint = this.joints[3];
        
        // Simple wrist
        const wristGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.2, 12);
        const wristMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xffffff, // White
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
        joint5.userData = { axis: 'x', jointIndex: 4 };
        joint5.name = "Joint5";
        joint5.rotation.x = initialAngles[4];

        parentJoint.add(joint5);
        this.joints.push(joint5);
        
        return joint5;
    }
    
    // Update createFlange() - rotate Joint 6
    createFlange(initialAngles) {
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
        joint6.rotation.z = initialAngles[5];

        parentJoint.add(joint6);
        this.joints.push(joint6);
        
        // Simple TCP marker
        const tcpGeometry = new THREE.SphereGeometry(0.05, 8, 8);
        const tcpMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });
        const tcp = new THREE.Mesh(tcpGeometry, tcpMaterial);
        tcp.position.z = 0.02;
        joint6.add(tcp);

        // Add a simple two-fingered claw (gripper)
        const fingerLength = 0.08;
        const fingerWidth = 0.015;
        const fingerHeight = 0.025;
        const fingerOffset = 0.025;

        // Left finger
        const leftFingerGeometry = new THREE.BoxGeometry(fingerWidth, fingerHeight, fingerLength);
        const fingerMaterial = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.6, roughness: 0.4 });
        const leftFinger = new THREE.Mesh(leftFingerGeometry, fingerMaterial);
        leftFinger.position.x = -fingerOffset;
        leftFinger.position.z = 0.06 + fingerLength / 2;
        leftFinger.castShadow = true;
        leftFinger.receiveShadow = true;
        joint6.add(leftFinger);

        // Right finger
        const rightFinger = new THREE.Mesh(leftFingerGeometry, fingerMaterial);
        rightFinger.position.x = fingerOffset;
        rightFinger.position.z = 0.06 + fingerLength / 2;
        rightFinger.castShadow = true;
        rightFinger.receiveShadow = true;
        joint6.add(rightFinger);
        
        return joint6;
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
    
}

window.RobotBuilder = RobotBuilder;