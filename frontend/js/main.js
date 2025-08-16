// main.js - Clean entry point
console.log("🔥 YaniBot Loading...");

let app = {};

// Update loading status if available
function updateLoadingStatus(message) {
    console.log(`📝 ${message}`);
    const statusElement = document.getElementById('loading-status');
    if (statusElement) {
        statusElement.textContent = message;
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    console.log("🔥 DOM Ready - Initializing YaniBot");
    
    try {
        updateLoadingStatus("Initializing 3D scene...");
        
        // Initialize scene first and wait for it to be ready
        app.scene = new SceneManager();
        await app.scene.init();
        
        // Verify scene is properly initialized
        if (!app.scene.scene) {
            throw new Error("Scene initialization failed - scene object is null");
        }
        
        console.log("✅ Scene initialized, scene object:", app.scene.scene);
        
        updateLoadingStatus("Building robot model...");
        
        // Initialize robot with the scene
        app.robot = new RobotManager(app.scene);
        await app.robot.init();
        
        updateLoadingStatus("Setting up automation...");
        
        // Initialize automation
        app.automation = new AutomationManager(app.robot);
        await app.automation.init();
        
        updateLoadingStatus("Configuring user interface...");
        
        // Initialize UI
        app.ui = new UIManager(app.robot, app.automation);
        app.ui.init();
        
        updateLoadingStatus("Connecting to backend...");
        
        // Initialize API (optional - can fail gracefully)
        try {
            app.api = new APIManager();
            console.log("✅ API Manager initialized");
        } catch (apiError) {
            console.warn("⚠️ API Manager failed to initialize:", apiError);
            app.api = null;
        }
        
        updateLoadingStatus("YaniBot ready!");
        
        console.log("✅ YaniBot Initialized Successfully");
        console.log("📊 App components:", {
            scene: !!app.scene,
            robot: !!app.robot,
            automation: !!app.automation,
            ui: !!app.ui,
            api: !!app.api
        });
        
        // Hide loading screen
        setTimeout(() => {
            if (typeof hideLoadingScreen === 'function') {
                hideLoadingScreen();
            }
        }, 1000);
        
        // Make app globally available for debugging
        window.app = app;
        
    } catch (error) {
        console.error("❌ Failed to initialize YaniBot:", error);
        console.error("Stack trace:", error.stack);
        
        updateLoadingStatus(`Error: ${error.message}`);
        
        // Show error in UI
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(220, 53, 69, 0.9);
            color: white;
            padding: 20px;
            border-radius: 8px;
            z-index: 10000;
            max-width: 400px;
            text-align: center;
        `;
        errorDiv.innerHTML = `
            <h3>🚨 Initialization Error</h3>
            <p>${error.message}</p>
            <button onclick="location.reload()" style="
                background: white;
                color: #dc3545;
                border: none;
                padding: 8px 16px;
                border-radius: 4px;
                cursor: pointer;
                margin-top: 10px;
            ">Reload Page</button>
        `;
        document.body.appendChild(errorDiv);
    }
});

// Add global error handler
window.addEventListener('error', (event) => {
    console.error('🚨 Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('🚨 Unhandled promise rejection:', event.reason);
});