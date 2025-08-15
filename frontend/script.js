console.log("🔥 SCRIPT LOADED");

let scene, camera, renderer;
let joints = [];
let robotRoot;

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

    const button = document.getElementById('moveRandom');
    if (button) {
        console.log("✅ Button found, adding event listener");
        button.addEventListener('click', moveRandom);
    } else {
        console.log("❌ Button not found!");
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

    // Remove OrbitControls completely
    // controls = new THREE.OrbitControls(camera, renderer.domElement);
    // controls.target.set(0, 1.5, 0);
    // controls.update();

    // Lighting
    const light = new THREE.DirectionalLight(0xffffff, 2);
    light.position.set(5, 10, 5);
    scene.add(light);
    scene.add(new THREE.AmbientLight(0x888888));

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

    const axisMapping = ['y', 'x', 'z', 'x', 'x', 'z'];

    for (let i = 0; i < 6; i++) {
        let geometry = new THREE.BoxGeometry(1, 2, 1);
        let material = new THREE.MeshStandardMaterial({ color: 0xff6600 });
        let segment = new THREE.Mesh(geometry, material);

        segment.position.y = 1;
        prev.add(segment);

        let joint = new THREE.Object3D();
        segment.add(joint);
        joint.position.y = 1;
        joint.userData.axis = axisMapping[i];

        joints.push(joint);
        prev = joint;
    }

    console.log("🤖 Robot segments created:", joints.length);
    console.log("🎭 Total scene objects:", scene.children.length);

    robotRoot.position.set(0, 0, 0);
    window.addEventListener('resize', onWindowResize);

    // Test cube
    const testGeometry = new THREE.BoxGeometry(1, 1, 1);
    const testMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
    const testCube = new THREE.Mesh(testGeometry, testMaterial);
    testCube.position.set(0, 1, 0);
    scene.add(testCube);
    console.log("Test cube added");
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
