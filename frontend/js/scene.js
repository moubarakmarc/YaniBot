// scene.js - Complete Scene and workspace management
class SceneManager {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.workstation = null;
        this.controls = null;
        this.axesHelpers = [];
        this.axesVisible = true;

        // Don't initialize here - wait for init() method
        console.log("🏗️ SceneManager constructor called");
    }
    
    async init() {
        this.createScene();
        this.createCamera();
        this.createRenderer();
        this.createLighting();
        this.createGround();
        this.createWorkspace();
        this.createAxesHelpers();
        this.setupControls();
        this.startRenderLoop();
        
        console.log("✅ Scene initialized");
    }
    
    createScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x222222);
        console.log("🌍 Scene created");
    }
    
    createCamera() {
        this.camera = new THREE.PerspectiveCamera(
            75, 
            window.innerWidth / window.innerHeight, 
            0.1, 
            1000
        );
        this.camera.position.set(5, 5, 5);
        this.camera.lookAt(0, 0, 0);
        console.log("📷 Camera created");
    }
    
    createRenderer() {
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(0x222222);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        // Add to DOM
        const container = document.getElementById('canvas-container') || document.body;
        container.appendChild(this.renderer.domElement);
        
        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());
        
        console.log("🖼️ Renderer created");
    }
    
    createLighting() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
        this.scene.add(ambientLight);
        
        // Directional light (sun)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 10, 5);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 50;
        directionalLight.shadow.camera.left = -10;
        directionalLight.shadow.camera.right = 10;
        directionalLight.shadow.camera.top = 10;
        directionalLight.shadow.camera.bottom = -10;
        this.scene.add(directionalLight);
        
        // Point lights for better illumination
        const pointLight1 = new THREE.PointLight(0xffffff, 0.5, 20);
        pointLight1.position.set(-5, 5, 5);
        this.scene.add(pointLight1);
        
        const pointLight2 = new THREE.PointLight(0xffffff, 0.5, 20);
        pointLight2.position.set(5, 5, -5);
        this.scene.add(pointLight2);
        
        console.log("💡 Lighting created");
    }
    
    createGround() {
        // Main ground plane
        const planeGeometry = new THREE.PlaneGeometry(20, 20);
        const planeMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x444444,
            side: THREE.DoubleSide 
        });
        const plane = new THREE.Mesh(planeGeometry, planeMaterial);
        plane.rotation.x = -Math.PI / 2;
        plane.receiveShadow = true;
        this.scene.add(plane);
        
        // Work area boundaries
        this.createWorkAreaBoundaries();
        
        console.log("🏢 Ground created");
    }
    
    createWorkAreaBoundaries() {
        const boundaryMaterial = new THREE.MeshStandardMaterial({ color: 0xFFFF00 });
        const boundaryGeometry = new THREE.BoxGeometry(0.1, 0.02, 8);
        
        // Left boundary
        const leftBoundary = new THREE.Mesh(boundaryGeometry, boundaryMaterial);
        leftBoundary.position.set(-5, 0.01, 0);
        this.scene.add(leftBoundary);
        
        // Right boundary
        const rightBoundary = new THREE.Mesh(boundaryGeometry, boundaryMaterial);
        rightBoundary.position.set(5, 0.01, 0);
        this.scene.add(rightBoundary);
        
        // Front and back boundaries
        const frontBackGeometry = new THREE.BoxGeometry(10, 0.02, 0.1);
        
        const frontBoundary = new THREE.Mesh(frontBackGeometry, boundaryMaterial);
        frontBoundary.position.set(0, 0.01, 4);
        this.scene.add(frontBoundary);
        
        const backBoundary = new THREE.Mesh(frontBackGeometry, boundaryMaterial);
        backBoundary.position.set(0, 0.01, -4);
        this.scene.add(backBoundary);
    }
    
    createWorkspace() {
        this.workstation = new WorkstationManager();
        this.scene.add(this.workstation.create());
        console.log("🏭 Workspace created");
    }
    
    createAxesHelpers() {
        // Global axes at origin
        const globalAxes = new THREE.AxesHelper(2);
        this.scene.add(globalAxes);
        this.axesHelpers.push(globalAxes);
        
        console.log("🎯 Axes helpers created");
    }
    
    setupControls() {
        // Temporarily disable OrbitControls - set to false to use manual controls
        const useOrbitControls = false;
        
        if (useOrbitControls && typeof THREE.OrbitControls !== 'undefined') {
            this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
            this.controls.enableDamping = true;
            this.controls.dampingFactor = 0.1;
            this.controls.target.set(0, 1, 0);
            this.controls.update();
            console.log("🎮 OrbitControls enabled");
        } else {
            // Use manual camera controls
            this.setupManualControls();
            console.log("🎮 Manual controls enabled");
        }
    }
    
    setupManualControls() {
        let mouseDown = false;
        let mouseX = 0;
        let mouseY = 0;
        
        this.renderer.domElement.addEventListener('mousedown', (event) => {
            mouseDown = true;
            mouseX = event.clientX;
            mouseY = event.clientY;
        });
        
        this.renderer.domElement.addEventListener('mouseup', () => {
            mouseDown = false;
        });
        
        this.renderer.domElement.addEventListener('mousemove', (event) => {
            if (!mouseDown) return;
            
            const deltaX = event.clientX - mouseX;
            const deltaY = event.clientY - mouseY;
            
            // Rotate camera around origin
            const spherical = new THREE.Spherical();
            spherical.setFromVector3(this.camera.position);
            spherical.theta -= deltaX * 0.01;
            spherical.phi += deltaY * 0.01;
            spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi));
            
            this.camera.position.setFromSpherical(spherical);
            this.camera.lookAt(0, 1, 0);
            
            mouseX = event.clientX;
            mouseY = event.clientY;
        });
        
        // Zoom with mouse wheel
        this.renderer.domElement.addEventListener('wheel', (event) => {
            const distance = this.camera.position.length();
            const newDistance = distance + event.deltaY * 0.01;
            this.camera.position.normalize().multiplyScalar(Math.max(2, Math.min(20, newDistance)));
        });
    }
    
    startRenderLoop() {
        const animate = () => {
            requestAnimationFrame(animate);
            
            if (this.controls && this.controls.update) {
                this.controls.update();
            }
            
            this.renderer.render(this.scene, this.camera);
        };
        
        animate();
        console.log("🎬 Render loop started");
    }
    
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    toggleAxes() {
        this.axesVisible = !this.axesVisible;
        this.axesHelpers.forEach(helper => {
            helper.visible = this.axesVisible;
        });
    }
    
    addAxesHelper(object, size = 1) {
        const axes = new THREE.AxesHelper(size);
        object.add(axes);
        this.axesHelpers.push(axes);
        return axes;
    }
}

class WorkstationManager {
    create() {
        const workstationGroup = new THREE.Group();
        
        // Left table (input station)
        const leftTable = this.createTable(-1, 1, 0x8B4513);
        workstationGroup.add(leftTable);
        
        // Right table (output station)
        const rightTable = this.createTable(1, 1, 0x8B4513);
        workstationGroup.add(rightTable);
        
        // Left bin (input bin - blue)
        const leftBin = this.createBin(-1, 1, 0x4169E1);
        workstationGroup.add(leftBin);
        
        // Right bin (output bin - green)
        const rightBin = this.createBin(1, 1, 0x228B22);
        workstationGroup.add(rightBin);
        
        return workstationGroup;
    }
    
    createTable(x, z, color = 0x8B4513) {
        const tableGroup = new THREE.Group();
        
        // Table top
        const tableTopGeometry = new THREE.BoxGeometry(1.5, 0.1, 1.0);
        const tableTopMaterial = new THREE.MeshStandardMaterial({ color: color });
        const tableTop = new THREE.Mesh(tableTopGeometry, tableTopMaterial);
        tableTop.position.y = 0.8;
        tableTop.castShadow = true;
        tableTop.receiveShadow = true;
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
            leg.castShadow = true;
            leg.receiveShadow = true;
            tableGroup.add(leg);
        });
        
        // Position the entire table
        tableGroup.position.set(x, 0, z);
        
        return tableGroup;
    }
    
    createBin(x, z, color = 0x333333) {
        const binGroup = new THREE.Group();
        
        // Bin dimensions
        const wallThickness = 0.05;
        const binWidth = 0.6;
        const binDepth = 0.4;
        const binHeight = 0.3;
        
        const wallMaterial = new THREE.MeshStandardMaterial({ color: color });
        
        // Bottom
        const bottomGeometry = new THREE.BoxGeometry(binWidth, wallThickness, binDepth);
        const bottom = new THREE.Mesh(bottomGeometry, wallMaterial);
        bottom.position.y = wallThickness / 2;
        bottom.castShadow = true;
        bottom.receiveShadow = true;
        binGroup.add(bottom);
        
        // Front wall
        const frontGeometry = new THREE.BoxGeometry(binWidth, binHeight, wallThickness);
        const front = new THREE.Mesh(frontGeometry, wallMaterial);
        front.position.set(0, binHeight / 2 + wallThickness, -binDepth / 2);
        front.castShadow = true;
        front.receiveShadow = true;
        binGroup.add(front);
        
        // Back wall
        const back = front.clone();
        back.position.z = binDepth / 2;
        binGroup.add(back);
        
        // Left wall
        const leftGeometry = new THREE.BoxGeometry(wallThickness, binHeight, binDepth);
        const left = new THREE.Mesh(leftGeometry, wallMaterial);
        left.position.set(-binWidth / 2, binHeight / 2 + wallThickness, 0);
        left.castShadow = true;
        left.receiveShadow = true;
        binGroup.add(left);
        
        // Right wall
        const right = left.clone();
        right.position.x = binWidth / 2;
        binGroup.add(right);
        
        // Position the bin on table (0.85 = table height + table top thickness)
        binGroup.position.set(x, 0.85, z);
        
        return binGroup;
    }
}

// Make classes globally available
window.SceneManager = SceneManager;
window.WorkstationManager = WorkstationManager;