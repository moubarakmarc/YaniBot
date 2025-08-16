class EmergencyManager {
    constructor(sceneManager, robotManager) {
        this.scene = sceneManager.scene;
        this.robotManager = robotManager;
        this.camera = sceneManager.camera;
        this.renderer = sceneManager.renderer;
        
        this.isEmergencyMode = false;
        this.movableObject = null;
        this.isDragging = false;
        this.dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        
        this.EMERGENCY_RADIUS = 3.0; // 3 meters - same as red circle
        
        this.init();
    }
    
    init() {
        this.createMovableSquare();
        this.setupEventListeners();
        console.log("🚨 Emergency Manager initialized");
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
        
        // Touch events for mobile
        this.renderer.domElement.addEventListener('touchstart', (event) => this.onTouchStart(event));
        this.renderer.domElement.addEventListener('touchmove', (event) => this.onTouchMove(event));
        this.renderer.domElement.addEventListener('touchend', (event) => this.onTouchEnd(event));
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
    
    // Touch events (for mobile support)
    onTouchStart(event) {
        if (event.touches.length === 1) {
            event.preventDefault();
            const touch = event.touches[0];
            this.onMouseDown({ clientX: touch.clientX, clientY: touch.clientY, preventDefault: () => {} });
        }
    }
    
    onTouchMove(event) {
        if (event.touches.length === 1) {
            event.preventDefault();
            const touch = event.touches[0];
            this.onMouseMove({ clientX: touch.clientX, clientY: touch.clientY, preventDefault: () => {} });
        }
    }
    
    onTouchEnd(event) {
        event.preventDefault();
        this.onMouseUp({ preventDefault: () => {} });
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
        console.log("🚨 EMERGENCY MODE ACTIVATED! Object in safety zone.");
        
        // Trigger existing emergency stop button
        this.triggerExistingEmergencyStop();
        
        // Change square color to red
        this.movableObject.material.color.setHex(0xFF0000);
        
        // Show emergency UI
        this.showEmergencyUI();

        if (this.uiManager && this.uiManager.toggleEmergencyResumeButtons) {
            this.uiManager.toggleEmergencyResumeButtons(true);
        }
    }
    
    deactivateEmergencyMode() {
        console.log("✅ Object left safety zone (emergency stop automatically turned off).");
        
        // Change square color back to gold
        this.movableObject.material.color.setHex(0xFFD700);
        
        // Hide emergency UI
        this.hideEmergencyUI();
        
        // Auto-resume robot movement
        if (this.isEmergencyMode) {
            this.isEmergencyMode = false;
        }

        if (this.robotManager && typeof this.robotManager.resumeFromEmergency === 'function') {
            this.robotManager.resumeFromEmergency();
            console.log("✅ RobotManager: Emergency state cleared, robot can move again.");
        }

        if (this.uiManager && this.uiManager.toggleEmergencyResumeButtons) {
            this.uiManager.toggleEmergencyResumeButtons(false);
        }
    }
    
    triggerExistingEmergencyStop() {
        console.log("🚨 Triggering existing emergency stop system...");
        
        // Try multiple common emergency stop button selectors (FIXED - removed invalid selector)
        const emergencySelectors = [
            '#emergencyStop', // Matches the button in index.html
            '#emergency-stop-btn',
            '#emergency-btn', 
            '.emergency-stop',
            '.emergency-btn',
            '[data-action="emergency-stop"]',
            'button[onclick*="emergency"]',
            '.btn-emergency',
            '.btn-danger' // Common Bootstrap emergency button class
        ];
        
        let emergencyBtn = null;
        
        // Find the emergency stop button
        for (const selector of emergencySelectors) {
            try {
                emergencyBtn = document.querySelector(selector);
                if (emergencyBtn) {
                    break;
                }
            } catch (selectorError) {
                console.warn(`⚠️ Invalid selector: ${selector}`, selectorError);
                continue;
            }
        }
        
        // If no button found by selector, try finding by text content
        if (!emergencyBtn) {
            console.log("🔍 Searching for emergency button by text content...");
            emergencyBtn = this.findButtonByText(['Emergency', 'EMERGENCY', 'Stop', 'STOP', 'E-Stop']);
        }
        
        // If button found, click it
        if (emergencyBtn) {
            emergencyBtn.click();
            console.log("✅ Emergency stop button triggered successfully");
        } else {
            console.warn("⚠️ Emergency stop button not found! Showing warning only.");
            // Fallback: just show the warning UI without triggering button
        }
    }
    
    findButtonByText(textOptions) {
        console.log("🔍 Searching buttons by text content:", textOptions);
        
        // Get all buttons on the page
        const allButtons = document.querySelectorAll('button, input[type="button"], .btn');
        
        for (const button of allButtons) {
            const buttonText = button.textContent || button.value || button.innerText || '';
            const lowerText = buttonText.toLowerCase().trim();
            
            // Check if button text contains any of our emergency keywords
            for (const option of textOptions) {
                if (lowerText.includes(option.toLowerCase())) {
                    return button;
                }
            }
        }
        
        console.log("❌ No emergency button found by text content");
        return null;
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
                    🚨 EMERGENCY STOP - Object in Safety Zone! 🚨
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
    
    // Public methods
    getEmergencyStatus() {
        return this.isEmergencyMode;
    }
    
    forceEmergencyStop() {
        this.isEmergencyMode = true;
        this.activateEmergencyMode();
    }

    forceEmergencyResume() {
        this.isEmergencyMode = false;
        this.deactivateEmergencyMode();
    }
}

// Make globally available
window.EmergencyManager = EmergencyManager;