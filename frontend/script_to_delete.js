console.log("🔥 SCRIPT LOADED");

// Global variables (add these at the top of your script.js if missing)
let scene, camera, renderer;
let robotSegments = [];
let joints = [];
let robotRoot;
let axisMapping = ['y', 'z', 'z', 'x', 'y', 'x']; // ABB IRB6600 axis mapping

// Enhanced automation system with smooth movements
let automationRunning = false;
let automationPaused = false;
let leftBinCount = 5;
let rightBinCount = 0;
let cycleCount = 0;
let currentPickBin = 'left';
let automationInterval;
let leftBinObjects = [];
let rightBinObjects = [];
let currentlyHeldObject = null;

// More realistic robot positions with intermediate steps
const robotPositions = {
    home: [0, 0, 0, 0, 0, 0],
    
    // Left bin sequence
    leftBinApproach: [-90, 10, -20, 0, 10, 0],     // Approach left bin
    leftBinPick: [-90, 45, -60, 0, 30, 0],         // Pick from left bin (lower)
    leftBinLift: [-90, 25, -40, 0, 15, 0],         // Lift from left bin
    
    // Right bin sequence  
    rightBinApproach: [90, 10, -20, 0, 10, 0],     // Approach right bin
    rightBinDrop: [90, 45, -60, 0, 30, 0],         // Drop in right bin (lower)
    rightBinLift: [90, 25, -40, 0, 15, 0],         // Lift from right bin
    
    // Safe intermediate positions
    intermediate1: [0, -10, 10, 0, 0, 0],          // Safe position 1
    intermediate2: [45, 0, -10, 0, 5, 0],          // Safe position 2
    intermediate3: [-45, 0, -10, 0, 5, 0],         // Safe position 3
};

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

// Simple robot movement function that works
async function moveRobotToPosition(targetAngles, duration = 2000) {
    try {
        console.log('🤖 Moving robot to:', targetAngles);
        
        // Send to backend first
        const response = await fetch('http://localhost:8000/move', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ target_angles: targetAngles })
        });
        
        if (!response.ok) {
            throw new Error(`Backend error: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Backend response:', data);
        
        // Update visual robot immediately (smooth animation)
        await animateRobotToPosition(targetAngles, duration);
        
        // Update current angles
        currentJointAngles = [...targetAngles];
        updateSliders(targetAngles);
        
        return data;
        
    } catch (error) {
        console.error('Error moving robot:', error);
        // Still move visual robot even if backend fails
        await animateRobotToPosition(targetAngles, duration);
        currentJointAngles = [...targetAngles];
        updateSliders(targetAngles);
        throw error;
    }
}

// Smooth visual animation for the robot
async function animateRobotToPosition(targetAngles, duration = 2000) {
    return new Promise((resolve) => {
        const startAngles = [...currentJointAngles];
        const steps = 30;
        const stepDuration = duration / steps;
        let currentStep = 0;
        
        console.log('🎬 Animating from:', startAngles, 'to:', targetAngles);
        
        const animateStep = () => {
            if (currentStep >= steps) {
                // Ensure final position is exact
                for (let i = 0; i < targetAngles.length; i++) {
                    updateJointRotation(i, targetAngles[i]);
                }
                resolve();
                return;
            }
            
            // Calculate interpolated angles
            const progress = currentStep / steps;
            const smoothProgress = easeInOutCubic(progress);
            
            for (let i = 0; i < targetAngles.length; i++) {
                const startAngle = startAngles[i];
                const targetAngle = targetAngles[i];
                const currentAngle = startAngle + (targetAngle - startAngle) * smoothProgress;
                
                updateJointRotation(i, currentAngle);
            }
            
            currentStep++;
            setTimeout(animateStep, stepDuration);
        };
        
        animateStep();
    });
}

// Fixed updateJointRotation function
function updateJointRotation(jointIndex, angle) {
    if (!joints || !joints[jointIndex]) {
        console.warn(`Joint ${jointIndex} not found`);
        return;
    }
    
    const radians = (angle * Math.PI) / 180;
    const axis = joints[jointIndex].userData.axis;
    
    // Reset rotation
    joints[jointIndex].rotation.set(0, 0, 0);
    
    // Apply rotation based on axis
    if (axis === 'x') {
        joints[jointIndex].rotation.x = radians;
    } else if (axis === 'y') {
        joints[jointIndex].rotation.y = radians;
    } else if (axis === 'z') {
        joints[jointIndex].rotation.z = radians;
    }
    
    console.log(`Joint ${jointIndex} (${axis}): ${angle}°`);
}

// Add easing function if missing
function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
}

// Add these functions after your existing functions but before the init() function

function createTable(x, z, color = 0x8B4513) {
    const tableGroup = new THREE.Group();
    
    // Table top
    const tableTopGeometry = new THREE.BoxGeometry(1.5, 0.1, 1.0);
    const tableTopMaterial = new THREE.MeshStandardMaterial({ color: color });
    const tableTop = new THREE.Mesh(tableTopGeometry, tableTopMaterial);
    tableTop.position.y = 0.8;
    tableGroup.add(tableTop);
    
    // Table legs (4 legs)
    const legGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.8, 8);
    const legMaterial = new THREE.MeshStandardMaterial({ color: 0x654321 });
    
    const legPositions = [
        [-0.6, 0.4, -0.4],  // Front left
        [0.6, 0.4, -0.4],   // Front right
        [-0.6, 0.4, 0.4],   // Back left
        [0.6, 0.4, 0.4]     // Back right
    ];
    
    legPositions.forEach(pos => {
        const leg = new THREE.Mesh(legGeometry, legMaterial);
        leg.position.set(pos[0], pos[1], pos[2]);
        tableGroup.add(leg);
    });
    
    // Position the entire table
    tableGroup.position.set(x, 0, z);
    
    return tableGroup;
}

function createBin(x, z, color = 0x333333) {
    const binGroup = new THREE.Group();
    
    // Bin walls (using BoxGeometry for simplicity)
    const wallThickness = 0.05;
    const binWidth = 0.6;
    const binDepth = 0.4;
    const binHeight = 0.3;
    
    const wallMaterial = new THREE.MeshStandardMaterial({ color: color });
    
    // Bottom
    const bottomGeometry = new THREE.BoxGeometry(binWidth, wallThickness, binDepth);
    const bottom = new THREE.Mesh(bottomGeometry, wallMaterial);
    bottom.position.y = wallThickness / 2;
    binGroup.add(bottom);
    
    // Front wall
    const frontGeometry = new THREE.BoxGeometry(binWidth, binHeight, wallThickness);
    const front = new THREE.Mesh(frontGeometry, wallMaterial);
    front.position.set(0, binHeight / 2 + wallThickness, -binDepth / 2);
    binGroup.add(front);
    
    // Back wall
    const back = front.clone();
    back.position.z = binDepth / 2;
    binGroup.add(back);
    
    // Left wall
    const leftGeometry = new THREE.BoxGeometry(wallThickness, binHeight, binDepth);
    const left = new THREE.Mesh(leftGeometry, wallMaterial);
    left.position.set(-binWidth / 2, binHeight / 2 + wallThickness, 0);
    binGroup.add(left);
    
    // Right wall
    const right = left.clone();
    right.position.x = binWidth / 2;
    binGroup.add(right);
    
    // Position the bin on table (0.85 = table height + table top thickness)
    binGroup.position.set(x, 0.85, z);
    
    return binGroup;
}

function createWorkstation() {
    const workstationGroup = new THREE.Group();
    
    // Left table (input station)
    const leftTable = createTable(-3, 2, 0x8B4513); // Brown table
    workstationGroup.add(leftTable);
    
    // Right table (output station)
    const rightTable = createTable(3, 2, 0x8B4513); // Brown table
    workstationGroup.add(rightTable);
    
    // Left bin (input bin - blue)
    const leftBin = createBin(-3, 2, 0x4169E1); // Royal blue
    workstationGroup.add(leftBin);
    
    // Right bin (output bin - green)
    const rightBin = createBin(3, 2, 0x228B22); // Forest green
    workstationGroup.add(rightBin);
    
    return workstationGroup;
}

function createInitialObjects() {
    console.log('Creating initial objects...');
    
    // Clear existing objects
    leftBinObjects.forEach(obj => {
        if (obj.parent) {
            obj.parent.remove(obj);
        }
    });
    rightBinObjects.forEach(obj => {
        if (obj.parent) {
            obj.parent.remove(obj);
        }
    });
    
    leftBinObjects = [];
    rightBinObjects = [];
    
    // Create 5 objects in left bin
    for (let i = 0; i < 5; i++) {
        const objectGeometry = new THREE.BoxGeometry(0.08, 0.08, 0.08);
        const objectMaterial = new THREE.MeshStandardMaterial({ 
            color: new THREE.Color().setHSL(Math.random(), 0.7, 0.5)
        });
        const object = new THREE.Mesh(objectGeometry, objectMaterial);
        
        // Position in left bin
        object.position.set(
            -3 + (Math.random() - 0.5) * 0.4,
            1.0 + i * 0.1,
            2 + (Math.random() - 0.5) * 0.3
        );
        
        scene.add(object);
        leftBinObjects.push(object);
    }
    
    console.log(`Created ${leftBinObjects.length} objects in left bin`);
}

// Add missing automation functions
async function startAutomation() {
    if (leftBinCount === 0 && rightBinCount === 0) {
        alert('No objects to move! Reset the scene first.');
        return;
    }
    
    automationRunning = true;
    automationPaused = false;
    
    // Disable manual controls
    toggleManualControls(false);
    
    // Update UI
    updateAutomationButtons();
    updateStatus('Running', 'Starting automation...');
    
    // Start the automation loop
    automationLoop();
}

function stopAutomation() {
    automationRunning = false;
    automationPaused = false;
    
    if (automationInterval) {
        clearTimeout(automationInterval);
    }
    
    // Enable manual controls
    toggleManualControls(true);
    
    // Update UI
    updateAutomationButtons();
    updateStatus('Stopped', 'Automation stopped');
    
    // Return to home position
    moveRobotToPosition(robotPositions.home);
}

function pauseAutomation() {
    if (automationRunning) {
        automationPaused = !automationPaused;
        
        if (automationPaused) {
            updateStatus('Paused', 'Automation paused');
            document.getElementById('pauseAutomation').textContent = '▶️ Resume';
        } else {
            updateStatus('Running', 'Automation resumed');
            document.getElementById('pauseAutomation').textContent = '⏸️ Pause';
            automationLoop();
        }
    }
}

// Enhanced pick and place with detailed movements
async function performPickAndPlace() {
    cycleCount++;
    document.getElementById('cycle-count').textContent = cycleCount;
    
    if (currentPickBin === 'left') {
        await performLeftToRightTransfer();
    } else {
        await performRightToLeftTransfer();
    }
}

async function performLeftToRightTransfer() {
    // Phase 1: Move to approach position
    updateStatus('Running', 'Approaching left bin...');
    await moveRobotToPosition(robotPositions.leftBinApproach, 1500);
    await sleep(500);
    
    // Phase 2: Lower to pick position
    updateStatus('Running', 'Positioning for pick...');
    await moveRobotToPosition(robotPositions.leftBinPick, 1000);
    await sleep(500);
    
    // Phase 3: "Pick" object (attach to robot)
    updateStatus('Running', 'Picking object...');
    pickUpObject('left');
    await sleep(1000);
    
    // Phase 4: Lift from bin
    updateStatus('Running', 'Lifting object...');
    await moveRobotToPosition(robotPositions.leftBinLift, 1000);
    await sleep(300);
    
    // Phase 5: Move to intermediate position
    updateStatus('Running', 'Moving to intermediate position...');
    await moveRobotToPosition(robotPositions.intermediate1, 1500);
    await sleep(300);
    
    // Phase 6: Approach right bin
    updateStatus('Running', 'Approaching right bin...');
    await moveRobotToPosition(robotPositions.rightBinApproach, 1500);
    await sleep(300);
    
    // Phase 7: Lower to drop position
    updateStatus('Running', 'Positioning for drop...');
    await moveRobotToPosition(robotPositions.rightBinDrop, 1000);
    await sleep(500);
    
    // Phase 8: "Drop" object
    updateStatus('Running', 'Dropping object...');
    dropObject('right');
    await sleep(1000);
    
    // Phase 9: Lift and return home
    updateStatus('Running', 'Returning to home...');
    await moveRobotToPosition(robotPositions.rightBinLift, 1000);
    await moveRobotToPosition(robotPositions.home, 2000);
    
    updateStatus('Running', 'Transfer completed');
    await sleep(500);
}

async function performRightToLeftTransfer() {
    // Similar sequence but reversed
    updateStatus('Running', 'Approaching right bin...');
    await moveRobotToPosition(robotPositions.rightBinApproach, 1500);
    await sleep(500);
    
    updateStatus('Running', 'Positioning for pick...');
    await moveRobotToPosition(robotPositions.rightBinDrop, 1000); // Use drop position for pick
    await sleep(500);
    
    updateStatus('Running', 'Picking object...');
    pickUpObject('right');
    await sleep(1000);
    
    updateStatus('Running', 'Lifting object...');
    await moveRobotToPosition(robotPositions.rightBinLift, 1000);
    await sleep(300);
    
    updateStatus('Running', 'Moving to intermediate position...');
    await moveRobotToPosition(robotPositions.intermediate1, 1500);
    await sleep(300);
    
    updateStatus('Running', 'Approaching left bin...');
    await moveRobotToPosition(robotPositions.leftBinApproach, 1500);
    await sleep(300);
    
    updateStatus('Running', 'Positioning for drop...');
    await moveRobotToPosition(robotPositions.leftBinPick, 1000); // Use pick position for drop
    await sleep(500);
    
    updateStatus('Running', 'Dropping object...');
    dropObject('left');
    await sleep(1000);
    
    updateStatus('Running', 'Returning to home...');
    await moveRobotToPosition(robotPositions.leftBinLift, 1000);
    await moveRobotToPosition(robotPositions.home, 2000);
    
    updateStatus('Running', 'Transfer completed');
    await sleep(500);
}

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

    // Enhanced ground with work area markings
    const planeGeometry = new THREE.PlaneGeometry(20, 20);
    const planeMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x444444,
        side: THREE.DoubleSide 
    });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.rotation.x = -Math.PI / 2;
    scene.add(plane);

    // Work area boundaries
    const boundaryMaterial = new THREE.MeshStandardMaterial({ color: 0xFFFF00 });
    const boundaryGeometry = new THREE.BoxGeometry(0.1, 0.02, 8);

    // Left boundary
    const leftBoundary = new THREE.Mesh(boundaryGeometry, boundaryMaterial);
    leftBoundary.position.set(-5, 0.01, 0);
    scene.add(leftBoundary);

    // Right boundary
    const rightBoundary = new THREE.Mesh(boundaryGeometry, boundaryMaterial);
    rightBoundary.position.set(5, 0.01, 0);
    scene.add(rightBoundary);

    console.log("Enhanced ground and boundaries added");

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

    // Add workstation with tables and bins
    const workstation = createWorkstation();
    scene.add(workstation);
    console.log("Workstation added");

    // Initialize automation system
    initAutomation();
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
            slider.addEventListener('input', async (e) => {
                if (automationRunning) return; // Don't allow manual control during automation
                
                const angle = parseFloat(e.target.value);
                currentJointAngles[index] = angle;
                valueDisplay.textContent = `${angle}°`;
                
                // Update visual robot immediately for responsiveness
                updateJointRotation(index, angle);
                
                // Send to backend (debounced)
                clearTimeout(slider.debounceTimer);
                slider.debounceTimer = setTimeout(async () => {
                    try {
                        await fetch('http://localhost:8000/move', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ target_angles: currentJointAngles })
                        });
                    } catch (error) {
                        console.error('Error updating backend:', error);
                    }
                }, 300); // 300ms debounce
            });
        }
    });
    
    // Reset button using backend
    const resetButton = document.getElementById('resetJoints');
    if (resetButton) {
        resetButton.addEventListener('click', async () => {
            if (!automationRunning) {
                await resetRobot();
            }
        });
    }
}

// Update these functions to use the backend API

// Enhanced robot movement using backend API
async function moveRobotToPosition(targetAngles, duration = 2000) {
    try {
        console.log('🤖 Moving robot to:', targetAngles);
        
        // Send to backend first
        const response = await fetch('http://localhost:8000/move', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ target_angles: targetAngles })
        });
        
        if (!response.ok) {
            throw new Error(`Backend error: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Backend response:', data);
        
        // Update visual robot immediately (smooth animation)
        await animateRobotToPosition(targetAngles, duration);
        
        // Update current angles
        currentJointAngles = [...targetAngles];
        updateSliders(targetAngles);
        
        return data;
        
    } catch (error) {
        console.error('Error moving robot:', error);
        // Still move visual robot even if backend fails
        await animateRobotToPosition(targetAngles, duration);
        currentJointAngles = [...targetAngles];
        updateSliders(targetAngles);
        throw error;
    }
}

// Smooth visual animation for the robot
async function animateRobotToPosition(targetAngles, duration = 2000) {
    return new Promise((resolve) => {
        const startAngles = [...currentJointAngles];
        const steps = 30;
        const stepDuration = duration / steps;
        let currentStep = 0;
        
        console.log('🎬 Animating from:', startAngles, 'to:', targetAngles);
        
        const animateStep = () => {
            if (currentStep >= steps) {
                // Ensure final position is exact
                for (let i = 0; i < targetAngles.length; i++) {
                    updateJointRotation(i, targetAngles[i]);
                }
                resolve();
                return;
            }
            
            // Calculate interpolated angles
            const progress = currentStep / steps;
            const smoothProgress = easeInOutCubic(progress);
            
            for (let i = 0; i < targetAngles.length; i++) {
                const startAngle = startAngles[i];
                const targetAngle = targetAngles[i];
                const currentAngle = startAngle + (targetAngle - startAngle) * smoothProgress;
                
                updateJointRotation(i, currentAngle);
            }
            
            currentStep++;
            setTimeout(animateStep, stepDuration);
        };
        
        animateStep();
    });
}

// Fixed updateJointRotation function
function updateJointRotation(jointIndex, angle) {
    if (!joints || !joints[jointIndex]) {
        console.warn(`Joint ${jointIndex} not found`);
        return;
    }
    
    const radians = (angle * Math.PI) / 180;
    const axis = joints[jointIndex].userData.axis;
    
    // Reset rotation
    joints[jointIndex].rotation.set(0, 0, 0);
    
    // Apply rotation based on axis
    if (axis === 'x') {
        joints[jointIndex].rotation.x = radians;
    } else if (axis === 'y') {
        joints[jointIndex].rotation.y = radians;
    } else if (axis === 'z') {
        joints[jointIndex].rotation.z = radians;
    }
    
    console.log(`Joint ${jointIndex} (${axis}): ${angle}°`);
}

// Add easing function if missing
function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
}

// Add these functions after your existing functions but before the init() function

function createTable(x, z, color = 0x8B4513) {
    const tableGroup = new THREE.Group();
    
    // Table top
    const tableTopGeometry = new THREE.BoxGeometry(1.5, 0.1, 1.0);
    const tableTopMaterial = new THREE.MeshStandardMaterial({ color: color });
    const tableTop = new THREE.Mesh(tableTopGeometry, tableTopMaterial);
    tableTop.position.y = 0.8;
    tableGroup.add(tableTop);
    
    // Table legs (4 legs)
    const legGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.8, 8);
    const legMaterial = new THREE.MeshStandardMaterial({ color: 0x654321 });
    
    const legPositions = [
        [-0.6, 0.4, -0.4],  // Front left
        [0.6, 0.4, -0.4],   // Front right
        [-0.6, 0.4, 0.4],   // Back left
        [0.6, 0.4, 0.4]     // Back right
    ];
    
    legPositions.forEach(pos => {
        const leg = new THREE.Mesh(legGeometry, legMaterial);
        leg.position.set(pos[0], pos[1], pos[2]);
        tableGroup.add(leg);
    });
    
    // Position the entire table
    tableGroup.position.set(x, 0, z);
    
    return tableGroup;
}

function createBin(x, z, color = 0x333333) {
    const binGroup = new THREE.Group();
    
    // Bin walls (using BoxGeometry for simplicity)
    const wallThickness = 0.05;
    const binWidth = 0.6;
    const binDepth = 0.4;
    const binHeight = 0.3;
    
    const wallMaterial = new THREE.MeshStandardMaterial({ color: color });
    
    // Bottom
    const bottomGeometry = new THREE.BoxGeometry(binWidth, wallThickness, binDepth);
    const bottom = new THREE.Mesh(bottomGeometry, wallMaterial);
    bottom.position.y = wallThickness / 2;
    binGroup.add(bottom);
    
    // Front wall
    const frontGeometry = new THREE.BoxGeometry(binWidth, binHeight, wallThickness);
    const front = new THREE.Mesh(frontGeometry, wallMaterial);
    front.position.set(0, binHeight / 2 + wallThickness, -binDepth / 2);
    binGroup.add(front);
    
    // Back wall
    const back = front.clone();
    back.position.z = binDepth / 2;
    binGroup.add(back);
    
    // Left wall
    const leftGeometry = new THREE.BoxGeometry(wallThickness, binHeight, binDepth);
    const left = new THREE.Mesh(leftGeometry, wallMaterial);
    left.position.set(-binWidth / 2, binHeight / 2 + wallThickness, 0);
    binGroup.add(left);
    
    // Right wall
    const right = left.clone();
    right.position.x = binWidth / 2;
    binGroup.add(right);
    
    // Position the bin on table (0.85 = table height + table top thickness)
    binGroup.position.set(x, 0.85, z);
    
    return binGroup;
}

function createWorkstation() {
    const workstationGroup = new THREE.Group();
    
    // Left table (input station)
    const leftTable = createTable(-3, 2, 0x8B4513); // Brown table
    workstationGroup.add(leftTable);
    
    // Right table (output station)
    const rightTable = createTable(3, 2, 0x8B4513); // Brown table
    workstationGroup.add(rightTable);
    
    // Left bin (input bin - blue)
    const leftBin = createBin(-3, 2, 0x4169E1); // Royal blue
    workstationGroup.add(leftBin);
    
    // Right bin (output bin - green)
    const rightBin = createBin(3, 2, 0x228B22); // Forest green
    workstationGroup.add(rightBin);
    
    return workstationGroup;
}

function createInitialObjects() {
    console.log('Creating initial objects...');
    
    // Clear existing objects
    leftBinObjects.forEach(obj => {
        if (obj.parent) {
            obj.parent.remove(obj);
        }
    });
    rightBinObjects.forEach(obj => {
        if (obj.parent) {
            obj.parent.remove(obj);
        }
    });
    
    leftBinObjects = [];
    rightBinObjects = [];
    
    // Create 5 objects in left bin
    for (let i = 0; i < 5; i++) {
        const objectGeometry = new THREE.BoxGeometry(0.08, 0.08, 0.08);
        const objectMaterial = new THREE.MeshStandardMaterial({ 
            color: new THREE.Color().setHSL(Math.random(), 0.7, 0.5)
        });
        const object = new THREE.Mesh(objectGeometry, objectMaterial);
        
        // Position in left bin
        object.position.set(
            -3 + (Math.random() - 0.5) * 0.4,
            1.0 + i * 0.1,
            2 + (Math.random() - 0.5) * 0.3
        );
        
        scene.add(object);
        leftBinObjects.push(object);
    }
    
    console.log(`Created ${leftBinObjects.length} objects in left bin`);
}

// Add missing automation functions
async function startAutomation() {
    if (leftBinCount === 0 && rightBinCount === 0) {
        alert('No objects to move! Reset the scene first.');
        return;
    }
    
    automationRunning = true;
    automationPaused = false;
    
    // Disable manual controls
    toggleManualControls(false);
    
    // Update UI
    updateAutomationButtons();
    updateStatus('Running', 'Starting automation...');
    
    // Start the automation loop
    automationLoop();
}

function stopAutomation() {
    automationRunning = false;
    automationPaused = false;
    
    if (automationInterval) {
        clearTimeout(automationInterval);
    }
    
    // Enable manual controls
    toggleManualControls(true);
    
    // Update UI
    updateAutomationButtons();
    updateStatus('Stopped', 'Automation stopped');
    
    // Return to home position
    moveRobotToPosition(robotPositions.home);
}

function pauseAutomation() {
    if (automationRunning) {
        automationPaused = !automationPaused;
        
        if (automationPaused) {
            updateStatus('Paused', 'Automation paused');
            document.getElementById('pauseAutomation').textContent = '▶️ Resume';
        } else {
            updateStatus('Running', 'Automation resumed');
            document.getElementById('pauseAutomation').textContent = '⏸️ Pause';
            automationLoop();
        }
    }
}

// Enhanced pick and place with detailed movements
async function performPickAndPlace() {
    cycleCount++;
    document.getElementById('cycle-count').textContent = cycleCount;
    
    if (currentPickBin === 'left') {
        await performLeftToRightTransfer();
    } else {
        await performRightToLeftTransfer();
    }
}

async function performLeftToRightTransfer() {
    // Phase 1: Move to approach position
    updateStatus('Running', 'Approaching left bin...');
    await moveRobotToPosition(robotPositions.leftBinApproach, 1500);
    await sleep(500);
    
    // Phase 2: Lower to pick position
    updateStatus('Running', 'Positioning for pick...');
    await moveRobotToPosition(robotPositions.leftBinPick, 1000);
    await sleep(500);
    
    // Phase 3: "Pick" object (attach to robot)
    updateStatus('Running', 'Picking object...');
    pickUpObject('left');
    await sleep(1000);
    
    // Phase 4: Lift from bin
    updateStatus('Running', 'Lifting object...');
    await moveRobotToPosition(robotPositions.leftBinLift, 1000);
    await sleep(300);
    
    // Phase 5: Move to intermediate position
    updateStatus('Running', 'Moving to intermediate position...');
    await moveRobotToPosition(robotPositions.intermediate1, 1500);
    await sleep(300);
    
    // Phase 6: Approach right bin
    updateStatus('Running', 'Approaching right bin...');
    await moveRobotToPosition(robotPositions.rightBinApproach, 1500);
    await sleep(300);
    
    // Phase 7: Lower to drop position
    updateStatus('Running', 'Positioning for drop...');
    await moveRobotToPosition(robotPositions.rightBinDrop, 1000);
    await sleep(500);
    
    // Phase 8: "Drop" object
    updateStatus('Running', 'Dropping object...');
    dropObject('right');
    await sleep(1000);
    
    // Phase 9: Lift and return home
    updateStatus('Running', 'Returning to home...');
    await moveRobotToPosition(robotPositions.rightBinLift, 1000);
    await moveRobotToPosition(robotPositions.home, 2000);
    
    updateStatus('Running', 'Transfer completed');
    await sleep(500);
}

async function performRightToLeftTransfer() {
    // Similar sequence but reversed
    updateStatus('Running', 'Approaching right bin...');
    await moveRobotToPosition(robotPositions.rightBinApproach, 1500);
    await sleep(500);
    
    updateStatus('Running', 'Positioning for pick...');
    await moveRobotToPosition(robotPositions.rightBinDrop, 1000); // Use drop position for pick
    await sleep(500);
    
    updateStatus('Running', 'Picking object...');
    pickUpObject('right');
    await sleep(1000);
    
    updateStatus('Running', 'Lifting object...');
    await moveRobotToPosition(robotPositions.rightBinLift, 1000);
    await sleep(300);
    
    updateStatus('Running', 'Moving to intermediate position...');
    await moveRobotToPosition(robotPositions.intermediate1, 1500);
    await sleep(300);
    
    updateStatus('Running', 'Approaching left bin...');
    await moveRobotToPosition(robotPositions.leftBinApproach, 1500);
    await sleep(300);
    
    updateStatus('Running', 'Positioning for drop...');
    await moveRobotToPosition(robotPositions.leftBinPick, 1000); // Use pick position for drop
    await sleep(500);
    
    updateStatus('Running', 'Dropping object...');
    dropObject('left');
    await sleep(1000);
    
    updateStatus('Running', 'Returning to home...');
    await moveRobotToPosition(robotPositions.leftBinLift, 1000);
    await moveRobotToPosition(robotPositions.home, 2000);
    
    updateStatus('Running', 'Transfer completed');
    await sleep(500);
}

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

    // Enhanced ground with work area markings
    const planeGeometry = new THREE.PlaneGeometry(20, 20);
    const planeMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x444444,
        side: THREE.DoubleSide 
    });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.rotation.x = -Math.PI / 2;
    scene.add(plane);

    // Work area boundaries
    const boundaryMaterial = new THREE.MeshStandardMaterial({ color: 0xFFFF00 });
    const boundaryGeometry = new THREE.BoxGeometry(0.1, 0.02, 8);

    // Left boundary
    const leftBoundary = new THREE.Mesh(boundaryGeometry, boundaryMaterial);
    leftBoundary.position.set(-5, 0.01, 0);
    scene.add(leftBoundary);

    // Right boundary
    const rightBoundary = new THREE.Mesh(boundaryGeometry, boundaryMaterial);
    rightBoundary.position.set(5, 0.01, 0);
    scene.add(rightBoundary);

    console.log("Enhanced ground and boundaries added");

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

    // Add workstation with tables and bins
    const workstation = createWorkstation();
    scene.add(workstation);
    console.log("Workstation added");

    // Initialize automation system
    initAutomation();
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
            slider.addEventListener('input', async (e) => {
                if (automationRunning) return; // Don't allow manual control during automation
                
                const angle = parseFloat(e.target.value);
                currentJointAngles[index] = angle;
                valueDisplay.textContent = `${angle}°`;
                
                // Update visual robot immediately for responsiveness
                updateJointRotation(index, angle);
                
                // Send to backend (debounced)
                clearTimeout(slider.debounceTimer);
                slider.debounceTimer = setTimeout(async () => {
                    try {
                        await fetch('http://localhost:8000/move', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ target_angles: currentJointAngles })
                        });
                    } catch (error) {
                        console.error('Error updating backend:', error);
                    }
                }, 300); // 300ms debounce
            });
        }
    });
    
    // Reset button using backend
    const resetButton = document.getElementById('resetJoints');
    if (resetButton) {
        resetButton.addEventListener('click', async () => {
            if (!automationRunning) {
                await resetRobot();
            }
        });
    }
}

// Update these functions to use the backend API

// Enhanced robot movement using backend API
async function moveRobotToPosition(targetAngles, duration = 2000) {
    try {
        console.log('🤖 Moving robot to:', targetAngles);
        
        // Send to backend first
        const response = await fetch('http://localhost:8000/move', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ target_angles: targetAngles })
        });
        
        if (!response.ok) {
            throw new Error(`Backend error: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Backend response:', data);
        
        // Update visual robot immediately (smooth animation)
        await animateRobotToPosition(targetAngles, duration);
        
        // Update current angles
        currentJointAngles = [...targetAngles];
        updateSliders(targetAngles);
        
        return data;
        
    } catch (error) {
        console.error('Error moving robot:', error);
        // Still move visual robot even if backend fails
        await animateRobotToPosition(targetAngles, duration);
        currentJointAngles = [...targetAngles];
        updateSliders(targetAngles);
        throw error;
    }
}

// Smooth visual animation for the robot
async function animateRobotToPosition(targetAngles, duration = 2000) {
    return new Promise((resolve) => {
        const startAngles = [...currentJointAngles];
        const steps = 30;
        const stepDuration = duration / steps;
        let currentStep = 0;
        
        console.log('🎬 Animating from:', startAngles, 'to:', targetAngles);
        
        const animateStep = () => {
            if (currentStep >= steps) {
                // Ensure final position is exact
                for (let i = 0; i < targetAngles.length; i++) {
                    updateJointRotation(i, targetAngles[i]);
                }
                resolve();
                return;
            }
            
            // Calculate interpolated angles
            const progress = currentStep / steps;
            const smoothProgress = easeInOutCubic(progress);
            
            for (let i = 0; i < targetAngles.length; i++) {
                const startAngle = startAngles[i];
                const targetAngle = targetAngles[i];
                const currentAngle = startAngle + (targetAngle - startAngle) * smoothProgress;
                
                updateJointRotation(i, currentAngle);
            }
            
            currentStep++;
            setTimeout(animateStep, stepDuration);
        };
        
        animateStep();
    });
}

// Fixed updateJointRotation function
function updateJointRotation(jointIndex, angle) {
    if (!joints || !joints[jointIndex]) {
        console.warn(`Joint ${jointIndex} not found`);
        return;
    }
    
    const radians = (angle * Math.PI) / 180;
    const axis = joints[jointIndex].userData.axis;
    
    // Reset rotation
    joints[jointIndex].rotation.set(0, 0, 0);
    
    // Apply rotation based on axis
    if (axis === 'x') {
        joints[jointIndex].rotation.x = radians;
    } else if (axis === 'y') {
        joints[jointIndex].rotation.y = radians;
    } else if (axis === 'z') {
        joints[jointIndex].rotation.z = radians;
    }
    
    console.log(`Joint ${jointIndex} (${axis}): ${angle}°`);
}

// Add easing function if missing
function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
}

// Add these functions after your existing functions but before the init() function

function createTable(x, z, color = 0x8B4513) {
    const tableGroup = new THREE.Group();
    
    // Table top
    const tableTopGeometry = new THREE.BoxGeometry(1.5, 0.1, 1.0);
    const tableTopMaterial = new THREE.MeshStandardMaterial({ color: color });
    const tableTop = new THREE.Mesh(tableTopGeometry, tableTopMaterial);
    tableTop.position.y = 0.8;
    tableGroup.add(tableTop);
    
    // Table legs (4 legs)
    const legGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.8, 8);
    const legMaterial = new THREE.MeshStandardMaterial({ color: 0x654321 });
    
    const legPositions = [
        [-0.6, 0.4, -0.4],  // Front left
        [0.6, 0.4, -0.4],   // Front right
        [-0.6, 0.4, 0.4],   // Back left
        [0.6, 0.4, 0.4]     // Back right
    ];
    
    legPositions.forEach(pos => {
        const leg = new THREE.Mesh(legGeometry, legMaterial);
        leg.position.set(pos[0], pos[1], pos[2]);
        tableGroup.add(leg);
    });
    
    // Position the entire table
    tableGroup.position.set(x, 0, z);
    
    return tableGroup;
}

function createBin(x, z, color = 0x333333) {
    const binGroup = new THREE.Group();
    
    // Bin walls (using BoxGeometry for simplicity)
    const wallThickness = 0.05;
    const binWidth = 0.6;
    const binDepth = 0.4;
    const binHeight = 0.3;
    
    const wallMaterial = new THREE.MeshStandardMaterial({ color: color });
    
    // Bottom
    const bottomGeometry = new THREE.BoxGeometry(binWidth, wallThickness, binDepth);
    const bottom = new THREE.Mesh(bottomGeometry, wallMaterial);
    bottom.position.y = wallThickness / 2;
    binGroup.add(bottom);
    
    // Front wall
    const frontGeometry = new THREE.BoxGeometry(binWidth, binHeight, wallThickness);
    const front = new THREE.Mesh(frontGeometry, wallMaterial);
    front.position.set(0, binHeight / 2 + wallThickness, -binDepth / 2);
    binGroup.add(front);
    
    // Back wall
    const back = front.clone();
    back.position.z = binDepth / 2;
    binGroup.add(back);
    
    // Left wall
    const leftGeometry = new THREE.BoxGeometry(wallThickness, binHeight, binDepth);
    const left = new THREE.Mesh(leftGeometry, wallMaterial);
    left.position.set(-binWidth / 2, binHeight / 2 + wallThickness, 0);
    binGroup.add(left);
    
    // Right wall
    const right = left.clone();
    right.position.x = binWidth / 2;
    binGroup.add(right);
    
    // Position the bin on table (0.85 = table height + table top thickness)
    binGroup.position.set(x, 0.85, z);
    
    return binGroup;
}

function createWorkstation() {
    const workstationGroup = new THREE.Group();
    
    // Left table (input station)
    const leftTable = createTable(-3, 2, 0x8B4513); // Brown table
    workstationGroup.add(leftTable);
    
    // Right table (output station)
    const rightTable = createTable(3, 2, 0x8B4513); // Brown table
    workstationGroup.add(rightTable);
    
    // Left bin (input bin - blue)
    const leftBin = createBin(-3, 2, 0x4169E1); // Royal blue
    workstationGroup.add(leftBin);
    
    // Right bin (output bin - green)
    const rightBin = createBin(3, 2, 0x228B22); // Forest green
    workstationGroup.add(rightBin);
    
    return workstationGroup;
}

function createInitialObjects() {
    console.log('Creating initial objects...');
    
    // Clear existing objects
    leftBinObjects.forEach(obj => {
        if (obj.parent) {
            obj.parent.remove(obj);
        }
    });
    rightBinObjects.forEach(obj => {
        if (obj.parent) {
            obj.parent.remove(obj);
        }
    });
    
    leftBinObjects = [];
    rightBinObjects = [];
    
    // Create 5 objects in left bin
    for (let i = 0; i < 5; i++) {
        const objectGeometry = new THREE.BoxGeometry(0.08, 0.08, 0.08);
        const objectMaterial = new THREE.MeshStandardMaterial({ 
            color: new THREE.Color().setHSL(Math.random(), 0.7, 0.5)
        });
        const object = new THREE.Mesh(objectGeometry, objectMaterial);
        
        // Position in left bin
        object.position.set(
            -3 + (Math.random() - 0.5) * 0.4,
            1.0 + i * 0.1,
            2 + (Math.random() - 0.5) * 0.3
        );
        
        scene.add(object);
        leftBinObjects.push(object);
    }
    
    console.log(`Created ${leftBinObjects.length} objects in left bin`);
}

// Add missing automation functions
async function startAutomation() {
    if (leftBinCount === 0 && rightBinCount === 0) {
        alert('No objects to move! Reset the scene first.');
        return;
    }
    
    automationRunning = true;
    automationPaused = false;
    
    // Disable manual controls
    toggleManualControls(false);
    
    // Update UI
    updateAutomationButtons();
    updateStatus('Running', 'Starting automation...');
    
    // Start the automation loop
    automationLoop();
}

function stopAutomation() {
    automationRunning = false;
    automationPaused = false;
    
    if (automationInterval) {
        clearTimeout(automationInterval);
    }
    
    // Enable manual controls
    toggleManualControls(true);
    
    // Update UI
    updateAutomationButtons();
    updateStatus('Stopped', 'Automation stopped');
    
    // Return to home position
    moveRobotToPosition(robotPositions.home);
}

function pauseAutomation() {
    if (automationRunning) {
        automationPaused = !automationPaused;
        
        if (automationPaused) {
            updateStatus('Paused', 'Automation paused');
            document.getElementById('pauseAutomation').textContent = '▶️ Resume';
        } else {
            updateStatus('Running', 'Automation resumed');
            document.getElementById('pauseAutomation').textContent = '⏸️ Pause';
            automationLoop();
        }
    }
}

// Enhanced pick and place with detailed movements
async function performPickAndPlace() {
    cycleCount++;
    document.getElementById('cycle-count').textContent = cycleCount;
    
    if (currentPickBin === 'left') {
        await performLeftToRightTransfer();
    } else {
        await performRightToLeftTransfer();
    }
}

async function performLeftToRightTransfer() {
    // Phase 1: Move to approach position
    updateStatus('Running', 'Approaching left bin...');
    await moveRobotToPosition(robotPositions.leftBinApproach, 1500);
    await sleep(500);
    
    // Phase 2: Lower to pick position
    updateStatus('Running', 'Positioning for pick...');
    await moveRobotToPosition(robotPositions.leftBinPick, 1000);
    await sleep(500);
    
    // Phase 3: "Pick" object (attach to robot)
    updateStatus('Running', 'Picking object...');
    pickUpObject('left');
    await sleep(1000);
    
    // Phase 4: Lift from bin
    updateStatus('Running', 'Lifting object...');
    await moveRobotToPosition(robotPositions.leftBinLift, 1000);
    await sleep(300);
    
    // Phase 5: Move to intermediate position
    updateStatus('Running', 'Moving to intermediate position...');
    await moveRobotToPosition(robotPositions.intermediate1, 1500);
    await sleep(300);
    
    // Phase 6: Approach right bin
    updateStatus('Running', 'Approaching right bin...');
    await moveRobotToPosition(robotPositions.rightBinApproach, 1500);
    await sleep(300);
    
    // Phase 7: Lower to drop position
    updateStatus('Running', 'Positioning for drop...');
    await moveRobotToPosition(robotPositions.rightBinDrop, 1000);
    await sleep(500);
    
    // Phase 8: "Drop" object
    updateStatus('Running', 'Dropping object...');
    dropObject('right');
    await sleep(1000);
    
    // Phase 9: Lift and return home
    updateStatus('Running', 'Returning to home...');
    await moveRobotToPosition(robotPositions.rightBinLift, 1000);
    await moveRobotToPosition(robotPositions.home, 2000);
    
    updateStatus('Running', 'Transfer completed');
    await sleep(500);
}

async function performRightToLeftTransfer() {
    // Similar sequence but reversed
    updateStatus('Running', 'Approaching right bin...');
    await moveRobotToPosition(robotPositions.rightBinApproach, 1500);
    await sleep(500);
    
    updateStatus('Running', 'Positioning for pick...');
    await moveRobotToPosition(robotPositions.rightBinDrop, 1000); // Use drop position for pick
    await sleep(500);
    
    updateStatus('Running', 'Picking object...');
    pickUpObject('right');
    await sleep(1000);
    
    updateStatus('Running', 'Lifting object...');
    await moveRobotToPosition(robotPositions.rightBinLift, 1000);
    await sleep(300);
    
    updateStatus('Running', 'Moving to intermediate position...');
    await moveRobotToPosition(robotPositions.intermediate1, 1500);
    await sleep(300);
    
    updateStatus('Running', 'Approaching left bin...');
    await moveRobotToPosition(robotPositions.leftBinApproach, 1500);
    await sleep(300);
    
    updateStatus('Running', 'Positioning for drop...');
    await moveRobotToPosition(robotPositions.leftBinPick, 1000); // Use pick position for drop
    await sleep(500);
    
    updateStatus('Running', 'Dropping object...');
    dropObject('left');
    await sleep(1000);
    
    updateStatus('Running', 'Returning to home...');
    await moveRobotToPosition(robotPositions.leftBinLift, 1000);
    await moveRobotToPosition(robotPositions.home, 2000);
    
    updateStatus('Running', 'Transfer completed');
    await sleep(500);
}

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

    // Enhanced ground with work area markings
    const planeGeometry = new THREE.PlaneGeometry(20, 20);
    const planeMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x444444,
        side: THREE.DoubleSide 
    });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.rotation.x = -Math.PI / 2;
    scene.add(plane);

    // Work area boundaries
    const boundaryMaterial = new THREE.MeshStandardMaterial({ color: 0xFFFF00 });
    const boundaryGeometry = new THREE.BoxGeometry(0.1, 0.02, 8);

    // Left boundary
    const leftBoundary = new THREE.Mesh(boundaryGeometry, boundaryMaterial);
    leftBoundary.position.set(-5, 0.01, 0);
    scene.add(leftBoundary);

    // Right boundary
    const rightBoundary = new THREE.Mesh(boundaryGeometry, boundaryMaterial);
    rightBoundary.position.set(5, 0.01, 0);
    scene.add(rightBoundary);

    console.log("Enhanced ground and boundaries added");

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

    // Add workstation with tables and bins
    const workstation = createWorkstation();
    scene.add(workstation);
    console.log("Workstation added");

    // Initialize automation system
    initAutomation();
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
            slider.addEventListener('input', async (e) => {
                if (automationRunning) return; // Don't allow manual control during automation
                
                const angle = parseFloat(e.target.value);
                currentJointAngles[index] = angle;
                valueDisplay.textContent = `${angle}°`;
                
                // Update visual robot immediately for responsiveness
                updateJointRotation(index, angle);
                
                // Send to backend (debounced)
                clearTimeout(slider.debounceTimer);
                slider.debounceTimer = setTimeout(async () => {
                    try {
                        await fetch('http://localhost:8000/move', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ target_angles: currentJointAngles })
                        });
                    } catch (error) {
                        console.error('Error updating backend:', error);
                    }
                }, 300); // 300ms debounce
            });
        }
    });
    
    // Reset button using backend
    const resetButton = document.getElementById('resetJoints');
    if (resetButton) {
        resetButton.addEventListener('click', async () => {
            if (!automationRunning) {
                await resetRobot();
            }
        });
    }
}