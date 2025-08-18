class EmergencyManager {
    constructor(sceneManager, robotManager) {
        this.scene = sceneManager.scene;
        this.robotManager = robotManager;
        this.camera = sceneManager.camera;
        this.renderer = sceneManager.renderer;
        this.movableObject = null;
        this.isDragging = false;
        this.dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.EMERGENCY_RADIUS = 3.0; // 3 meters - same as red circle
        this.api = null;
        this.init();
    }
    
    init() {
        this.createMovableSquare();
        this.setupEventListeners();
    }
    
    createMovableSquare() {
        // Create movable square object
        const squareGeometry = new THREE.BoxGeometry(0.3, 0.1, 0.3);
        const squareMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xFFD700, // Gold color
            metalness: 0.3,
            roughness: 0.7,
            transparent: true,
            opacity: 0.8
        });
        
        this.movableObject = new THREE.Mesh(squareGeometry, squareMaterial);
        this.movableObject.position.set(4, 0.05, 0); // Start outside emergency zone
        this.movableObject.castShadow = true;
        this.movableObject.receiveShadow = true;
        this.movableObject.name = "MovableSquare";
        
        // Add hover effect material
        this.normalMaterial = squareMaterial;
        this.hoverMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xFF6B6B, // Red on hover
            metalness: 0.3,
            roughness: 0.7,
            transparent: true,
            opacity: 0.9
        });
        
        this.scene.add(this.movableObject);
        console.log("📦 Movable square created");
    }
    
    setupEventListeners() {
        // Mouse events for dragging
        this.renderer.domElement.addEventListener('mousedown', (event) => this.onMouseDown(event));
        this.renderer.domElement.addEventListener('mousemove', (event) => this.onMouseMove(event));
        this.renderer.domElement.addEventListener('mouseup', (event) => this.onMouseUp(event));
    }
    
    updateMousePosition(event) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    }
    
    onMouseDown(event) {
        event.preventDefault();
        this.updateMousePosition(event);
        
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObject(this.movableObject);
        
        if (intersects.length > 0) {
            this.isDragging = true;
            this.movableObject.material = this.hoverMaterial;
            console.log("📦 Started dragging square");
        }
    }
    
    onMouseMove(event) {
        event.preventDefault();
        this.updateMousePosition(event);
        
        if (this.isDragging) {
            // Cast ray to ground plane for dragging
            this.raycaster.setFromCamera(this.mouse, this.camera);
            const intersection = new THREE.Vector3();
            this.raycaster.ray.intersectPlane(this.dragPlane, intersection);
            
            if (intersection) {
                this.movableObject.position.x = intersection.x;
                this.movableObject.position.z = intersection.z;
                this.movableObject.position.y = 0.05; // Keep above ground
                
                this.checkEmergencyZone();
            }
        } else {
            // Check for hover effect
            this.raycaster.setFromCamera(this.mouse, this.camera);
            const intersects = this.raycaster.intersectObject(this.movableObject);
            
            if (intersects.length > 0) {
                this.movableObject.material = this.hoverMaterial;
                this.renderer.domElement.style.cursor = 'pointer';
            } else {
                this.movableObject.material = this.normalMaterial;
                this.renderer.domElement.style.cursor = 'default';
            }
        }
    }
    
    onMouseUp(event) {
        event.preventDefault();
        
        if (this.isDragging) {
            this.isDragging = false;
            this.movableObject.material = this.normalMaterial;
            this.renderer.domElement.style.cursor = 'default';
            console.log("📦 Stopped dragging square");
        }
    }
    
    checkEmergencyZone() {
        // Calculate distance from robot base (0,0,0)
        const distance = Math.sqrt(
            this.movableObject.position.x ** 2 + 
            this.movableObject.position.z ** 2
        );
        
        const wasInEmergency = this.isEmergencyMode;
        this.isEmergencyMode = distance <= this.EMERGENCY_RADIUS;
        
        // Emergency state changed
        if (this.isEmergencyMode !== wasInEmergency) {
            if (this.isEmergencyMode) {
                this.activateEmergencyMode();
            } else {
                this.deactivateEmergencyMode();
            }
        }
    }
    
    activateEmergencyMode() {
        console.log("🚨 EMERGENCY MODE TRIGGERED!");
        
        // Change square color to red
        this.movableObject.material.color.setHex(0xFF0000);
        
        this.api.setEmergencyState(true)
        
        // Show emergency UI
        this.showEmergencyUI();

        this.toggleEmergencyResumeButtons();
    }
    
    async deactivateEmergencyMode() {
        console.log("✅ EMERGENCY MODE DEACTIVATED");
        
        // Change square color back to gold
        this.movableObject.material.color.setHex(0xFFD700);
        
        // Hide emergency UI
        this.hideEmergencyUI();
        
        // Auto-resume robot movement
        let state = await this.api.getState();
        if (state.isEmergencyMode) {
            this.api.setEmergencyState(false);
        }

        this.toggleEmergencyResumeButtons(); 
    }
    
    showEmergencyUI() {
        // Create or show emergency warning UI
        let emergencyDiv = document.getElementById('emergency-warning');
        if (!emergencyDiv) {
            emergencyDiv = document.createElement('div');
            emergencyDiv.id = 'emergency-warning';
            emergencyDiv.innerHTML = `
                <div style="
                    position: fixed;
                    top: 20px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: #ff4444;
                    color: white;
                    padding: 15px 30px;
                    border-radius: 8px;
                    font-weight: bold;
                    font-size: 18px;
                    z-index: 1000;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                    animation: pulse 1s infinite;
                ">
                    🚨 EMERGENCY STOP 🚨
                </div>
                <style>
                    @keyframes pulse {
                        0% { opacity: 1; }
                        50% { opacity: 0.7; }
                        100% { opacity: 1; }
                    }
                </style>
            `;
            document.body.appendChild(emergencyDiv);
        }
        emergencyDiv.style.display = 'block';
    }
    
    hideEmergencyUI() {
        const emergencyDiv = document.getElementById('emergency-warning');
        if (emergencyDiv) {
            emergencyDiv.style.display = 'none';
        }
    }

    async toggleEmergencyResumeButtons() {
        const emergencyBtn = document.getElementById('emergencyStop');
        const resumeEbtn = document.getElementById('resumeEmergency');
        if (!emergencyBtn || !resumeEbtn) return;

        let state = await this.api.getState();
        if (state.isEmergencyMode) {
            emergencyBtn.style.display = 'none';
            resumeEbtn.style.display = '';
        } else {
            emergencyBtn.style.display = '';
            resumeEbtn.style.display = 'none';
        }
    }
}

// Make globally available
window.EmergencyManager = EmergencyManager;