console.log("🔥 SCRIPT LOADED");

let scene, camera, renderer;
let joints = [];
let robotRoot;

// Joint control variables
let currentJointAngles = [0, 0, 0, 0, 0, 0];

// Axes helpers variables
let axesHelpers = [];
let axesVisible = false;

console.log("🔥 VARIABLES DECLARED");

document.addEventListener('DOMContentLoaded', () => {
    console.log("🔥 DOM CONTENT LOADED");
    
    // Test if THREE exists
    if (typeof THREE === 'undefined') {
        console.error("❌ THREE is not defined!");
        return;
    }
    console.log("✅ THREE is available");
    
    // Skip OrbitControls completely
    console.log("⚠️ Skipping OrbitControls for now");
    
    init();
    animate();
    initJointControls(); // Add this line

    const button = document.getElementById('moveRandom');
    if (button) {
        console.log("✅ Button found, adding event listener");
        button.addEventListener('click', moveRandom);
    } else {
        console.log("❌ Button not found!");
    }
    
    // Add toggle axes button
    const axesButton = document.getElementById('toggleAxes');
    if (axesButton) {
        console.log("✅ Axes toggle button found");
        axesButton.addEventListener('click', toggleAxesVisibility);
    }
});

function init() {
    console.log("🎬 Starting init function...");
    
    const container = document.getElementById('scene-container');
    console.log("📦 Container element:", container);

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x222222);
    console.log("🌌 Scene created");

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 5, 10); // Better camera position
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);
    console.log("🖥️ Renderer added to container");

    // Enhanced lighting for better robot visibility
    const light1 = new THREE.DirectionalLight(0xffffff, 1.2);
    light1.position.set(5, 10, 5);
    light1.castShadow = true;
    scene.add(light1);

    const light2 = new THREE.DirectionalLight(0xffffff, 0.8);
    light2.position.set(-5, 5, -5);
    scene.add(light2);

    scene.add(new THREE.AmbientLight(0x404040, 0.6)); // Softer ambient

    // Add a spotlight on the robot
    const spotlight = new THREE.SpotLight(0xffffff, 1);
    spotlight.position.set(0, 8, 0);
    spotlight.target.position.set(0, 2, 0);
    spotlight.angle = Math.PI / 6;
    scene.add(spotlight);
    scene.add(spotlight.target);

    // Ground
    const planeGeometry = new THREE.PlaneGeometry(20, 20);
    const planeMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x333333,
        side: THREE.DoubleSide 
    });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.rotation.x = -Math.PI / 2;
    scene.add(plane);
    console.log("Ground added");

    // Build robot
    robotRoot = new THREE.Object3D();
    scene.add(robotRoot);
    let prev = robotRoot;

    // Original ABB IRB6600 configuration
    // TODO: Make this more realistic
    const axisMapping = ['y', 'z', 'z', 'y', 'y', 'z'];

    // Create more realistic ABB IRB6600 segments
    function createBase() {
        const baseGroup = new THREE.Group();
        
        // Main base cylinder
        const baseGeometry = new THREE.CylinderGeometry(0.4, 0.5, 0.8, 8);
        const baseMaterial = new THREE.MeshStandardMaterial({ color: 0x4a90e2 });
        const base = new THREE.Mesh(baseGeometry, baseMaterial);
        base.position.y = 0.4;
        baseGroup.add(base);
        
        // Base mounting plate
        const plateGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.1, 8);
        const plateMaterial = new THREE.MeshStandardMaterial({ color: 0x357abd });
        const plate = new THREE.Mesh(plateGeometry, plateMaterial);
        plate.position.y = 0.85;
        baseGroup.add(plate);
        
        return baseGroup;
    }

    function createShoulder() {
        const shoulderGroup = new THREE.Group();
        
        // Shoulder housing
        const shoulderGeometry = new THREE.BoxGeometry(0.6, 0.4, 0.5);
        const shoulderMaterial = new THREE.MeshStandardMaterial({ color: 0x357abd });
        const shoulder = new THREE.Mesh(shoulderGeometry, shoulderMaterial);
        shoulder.position.y = 0.2;
        shoulderGroup.add(shoulder);
        
        // Lower arm connection
        const armGeometry = new THREE.BoxGeometry(0.3, 1.0, 0.3);
        const armMaterial = new THREE.MeshStandardMaterial({ color: 0x4a90e2 });
        const arm = new THREE.Mesh(armGeometry, armMaterial);
        arm.position.y = 0.9;
        shoulderGroup.add(arm);
        
        return shoulderGroup;
    }

    function createElbow() {
        const elbowGroup = new THREE.Group();
        
        // Elbow joint housing
        const elbowGeometry = new THREE.BoxGeometry(0.4, 0.3, 0.4);
        const elbowMaterial = new THREE.MeshStandardMaterial({ color: 0x357abd });
        const elbow = new THREE.Mesh(elbowGeometry, elbowMaterial);
        elbow.position.y = 0.15;
        elbowGroup.add(elbow);
        
        // Upper arm
        const upperArmGeometry = new THREE.BoxGeometry(0.25, 0.8, 0.25);
        const upperArmMaterial = new THREE.MeshStandardMaterial({ color: 0x4a90e2 });
        const upperArm = new THREE.Mesh(upperArmGeometry, upperArmMaterial);
        upperArm.position.y = 0.7;
        elbowGroup.add(upperArm);
        
        return elbowGroup;
    }

    function createWrist1() {
        const wrist1Group = new THREE.Group();
        
        // Wrist housing (cylindrical for roll axis)
        const wristGeometry = new THREE.CylinderGeometry(0.15, 0.15, 0.5, 8);
        const wristMaterial = new THREE.MeshStandardMaterial({ color: 0x357abd });
        const wrist = new THREE.Mesh(wristGeometry, wristMaterial);
        wrist.position.y = 0.25;
        wrist.rotation.z = Math.PI / 2; // Orient for X-axis roll
        wrist1Group.add(wrist);
        
        // Roll indicator
        const indicatorGeometry = new THREE.BoxGeometry(0.05, 0.05, 0.3);
        const indicatorMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
        const indicator = new THREE.Mesh(indicatorGeometry, indicatorMaterial);
        indicator.position.set(0, 0.25, 0.15);
        wrist1Group.add(indicator);
        
        return wrist1Group;
    }

    function createWrist2() {
        const wrist2Group = new THREE.Group();
        
        // This will be the shared physical segment for both A5 and A6
        const wristGeometry = new THREE.BoxGeometry(0.2, 0.4, 0.2);
        const wristMaterial = new THREE.MeshStandardMaterial({ color: 0x4a90e2 });
        const wrist = new THREE.Mesh(wristGeometry, wristMaterial);
        wrist.position.y = 0.2;
        wrist2Group.add(wrist);
        
        // Tool flange (part of the same segment)
        const flangeGeometry = new THREE.CylinderGeometry(0.12, 0.12, 0.15, 8);
        const flangeMaterial = new THREE.MeshStandardMaterial({ color: 0x357abd });
        const flange = new THREE.Mesh(flangeGeometry, flangeMaterial);
        flange.position.y = 0.4;
        flange.rotation.z = Math.PI / 2;
        wrist2Group.add(flange);
        
        // Tool mounting points
        for (let i = 0; i < 4; i++) {
            const angle = (i / 4) * Math.PI * 2;
            const x = Math.cos(angle) * 0.08;
            const z = Math.sin(angle) * 0.08;
            
            const mountGeometry = new THREE.CylinderGeometry(0.015, 0.015, 0.03, 6);
            const mountMaterial = new THREE.MeshStandardMaterial({ color: 0x666666 });
            const mount = new THREE.Mesh(mountGeometry, mountMaterial);
            mount.position.set(x, 0.45, z);
            wrist2Group.add(mount);
        }
        
        // Visual indicators for both axes
        const pitchIndicator = new THREE.Mesh(
            new THREE.BoxGeometry(0.3, 0.05, 0.05),
            new THREE.MeshStandardMaterial({ color: 0x00ff00 })
        );
        pitchIndicator.position.set(0, 0.2, 0.15);
        wrist2Group.add(pitchIndicator);
        
        const rollIndicator = new THREE.Mesh(
            new THREE.BoxGeometry(0.05, 0.05, 0.3),
            new THREE.MeshStandardMaterial({ color: 0xff0000 })
        );
        rollIndicator.position.set(0.15, 0.2, 0);
        wrist2Group.add(rollIndicator);
        
        return wrist2Group;
    }

    function createFlange() {
        // A6 doesn't create a new segment - it just adds a joint point
        // The physical segment was already created in createWrist2()
        const flangeGroup = new THREE.Group();
        // Empty group - no visual geometry, just a joint point
        return flangeGroup;
    }

    // Create robot segments using realistic shapes
    const segmentCreators = [
        createBase,
        createShoulder, 
        createElbow,
        createWrist1,
        createWrist2,
        createFlange
    ];

    const segmentHeights = [0.8, 1.4, 1.1, 0.5, 0.5, 0.0]; // A6 height = 0 (no displacement)

    for (let i = 0; i < 6; i++) {
        let segment = segmentCreators[i]();
        prev.add(segment);

        let joint = new THREE.Object3D();
        segment.add(joint);
        joint.position.y = segmentHeights[i];
        joint.userData.axis = axisMapping[i];

        joints.push(joint);
        prev = joint;
    }

    console.log("🤖 Realistic ABB IRB6600 robot created:", joints.length);
    addAxesToJoints(); // Add this line
    console.log("🎯 Axes helpers added to joints");

    robotRoot.position.set(0, 0, 0);
    window.addEventListener('resize', onWindowResize);

    // Remove test cube or keep it
    // const testGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    // const testMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
    // const testCube = new THREE.Mesh(testGeometry, testMaterial);
    // testCube.position.set(3, 0.5, 0);
    // scene.add(testCube);
    // console.log("Test cube added");

    // Add axes to each joint
    function createAxesHelper(joint, size = 0.4) {
        const axesGroup = new THREE.Group();
        
        // X-axis (Red) - Arrow pointing right
        const xGeometry = new THREE.CylinderGeometry(0.02, 0.02, size, 8);
        const xMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const xAxis = new THREE.Mesh(xGeometry, xMaterial);
        xAxis.rotation.z = -Math.PI / 2;
        xAxis.position.x = size / 2;
        axesGroup.add(xAxis);
        
        // X-axis arrowhead
        const xArrowGeometry = new THREE.ConeGeometry(0.04, 0.1, 8);
        const xArrow = new THREE.Mesh(xArrowGeometry, xMaterial);
        xArrow.rotation.z = -Math.PI / 2;
        xArrow.position.x = size;
        axesGroup.add(xArrow);
        
        // Z-axis (Green) - Arrow pointing up (renamed from Y-axis)
        const yGeometry = new THREE.CylinderGeometry(0.02, 0.02, size, 8);
        const yMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        const yAxis = new THREE.Mesh(yGeometry, yMaterial);
        yAxis.position.y = size / 2;
        axesGroup.add(yAxis);
        
        // Z-axis arrowhead
        const yArrowGeometry = new THREE.ConeGeometry(0.04, 0.1, 8);
        const yArrow = new THREE.Mesh(yArrowGeometry, yMaterial);
        yArrow.position.y = size;
        axesGroup.add(yArrow);
        
        // Y-axis (Blue) - Arrow pointing forward (renamed from Z-axis)
        const zGeometry = new THREE.CylinderGeometry(0.02, 0.02, size, 8);
        const zMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff });
        const zAxis = new THREE.Mesh(zGeometry, zMaterial);
        zAxis.rotation.x = Math.PI / 2;
        zAxis.position.z = size / 2;
        axesGroup.add(zAxis);
        
        // Y-axis arrowhead
        const zArrowGeometry = new THREE.ConeGeometry(0.04, 0.1, 8);
        const zArrow = new THREE.Mesh(zArrowGeometry, zMaterial);
        zArrow.rotation.x = Math.PI / 2;
        zArrow.position.z = size;
        axesGroup.add(zArrow);
        
        // Initially hidden
        axesGroup.visible = false;
        
        return axesGroup;
    }

    function addAxesToJoints() {
        joints.forEach((joint, index) => {
            const axesHelper = createAxesHelper(joint, 0.3);
            joint.add(axesHelper);
            axesHelpers.push(axesHelper);
        });
    }

    // Add this line after the robot building loop:
    addAxesToJoints();
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    // Remove controls.update() since we don't have controls
    renderer.render(scene, camera);
}

// Your moveRandom function stays the same...
function moveRandom() {
    console.log('🎲 Move Random clicked!');
    
    fetch('http://127.0.0.1:8000/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            target_angles: Array.from({ length: 6 }, () => Math.random() * 180 - 90)
        })
    })
    .then(res => {
        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
    })
    .then(data => {
        console.log('Received data:', data);
        let steps = data.steps;
        let stepIndex = 0;

        function stepAnimate() {
            if (stepIndex >= steps.length) return;
            for (let i = 0; i < joints.length; i++) {
                const axis = joints[i].userData.axis;
                const rad = THREE.MathUtils.degToRad(steps[stepIndex][i]);

                if (axis === 'x') joints[i].rotation.x = rad;
                else if (axis === 'y') joints[i].rotation.y = rad;
                else if (axis === 'z') joints[i].rotation.z = rad;
            }
            stepIndex++;
            setTimeout(stepAnimate, 50);
        }

        stepAnimate();
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Error: ' + error.message);
    });
}

// Initialize joint controls
function initJointControls() {
    const sliders = ['a1', 'a2', 'a3', 'a4', 'a5', 'a6'];
    
    sliders.forEach((joint, index) => {
        const slider = document.getElementById(`${joint}-slider`);
        const valueDisplay = document.getElementById(`${joint}-value`);
        
        if (slider && valueDisplay) {
            slider.addEventListener('input', (e) => {
                const angle = parseFloat(e.target.value);
                currentJointAngles[index] = angle;
                valueDisplay.textContent = `${angle}°`;
                updateJointRotation(index, angle);
            });
        }
    });
    
    // Reset button
    const resetButton = document.getElementById('resetJoints');
    if (resetButton) {
        resetButton.addEventListener('click', resetAllJoints);
    }
}

// Update individual joint rotation
function updateJointRotation(jointIndex, angleDegrees) {
    if (joints[jointIndex]) {
        const axis = joints[jointIndex].userData.axis;
        const rad = THREE.MathUtils.degToRad(angleDegrees);
        
        // Reset all rotations first
        joints[jointIndex].rotation.set(0, 0, 0);
        
        // Apply rotation on the correct axis
        if (axis === 'x') joints[jointIndex].rotation.x = rad;
        else if (axis === 'y') joints[jointIndex].rotation.y = rad;
        else if (axis === 'z') joints[jointIndex].rotation.z = rad;
    }
}

// Reset all joints to zero position
function resetAllJoints() {
    const sliders = ['a1', 'a2', 'a3', 'a4', 'a5', 'a6'];
    
    sliders.forEach((joint, index) => {
        const slider = document.getElementById(`${joint}-slider`);
        const valueDisplay = document.getElementById(`${joint}-value`);
        
        if (slider && valueDisplay) {
            slider.value = 0;
            valueDisplay.textContent = '0°';
            currentJointAngles[index] = 0;
            updateJointRotation(index, 0);
        }
    });
}

// Toggle axes visibility
function toggleAxesVisibility() {
    axesVisible = !axesVisible;
    axesHelpers.forEach(axes => {
        axes.visible = axesVisible;
    });
    
    const button = document.getElementById('toggleAxes');
    const legend = document.getElementById('axes-legend');
    
    if (button) {
        button.textContent = axesVisible ? 'Hide Axes' : 'Show Axes';
    }
    
    if (legend) {
        legend.style.display = axesVisible ? 'block' : 'none';
    }
    
    console.log(`🎯 Axes ${axesVisible ? 'shown' : 'hidden'}`);
    console.log(`📋 Legend ${axesVisible ? 'shown' : 'hidden'}`);
}
