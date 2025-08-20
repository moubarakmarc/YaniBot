let app = {};

// Initialize global app object
window.LOG_OPTIONS = {
    state: true,
    reset: true,
    interpolatedPath: true,
    jointLimits: true,
    movingState: true,
    currentAngles: true,
    stopState: true,
    pauseState: true,
    emergencyState: true
};

// Update loading status if available
function updateLoadingStatus(message) {
    console.log(`📝 ${message}`);
    const statusElement = document.getElementById('loading-status');
    if (statusElement) {
        statusElement.textContent = message;
    }
}

// Define hideLoadingScreen function
function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        loadingScreen.style.opacity = '0';
        setTimeout(() => {
            loadingScreen.style.display = 'none';
        }, 500);
        console.log("🎬 Loading screen hidden");
    }
}

// Toggle collapsible sections
function toggleSection(contentId) {
    const content = document.getElementById(contentId);
    if (content) {
        content.style.display = content.style.display === 'none' ? 'block' : 'none';
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    console.log("🔥 DOM Ready - Initializing YaniBot");
    
    // Update initialization order:
    async function initYaniBot() {
        try {
            console.log("🚀 Initializing YaniBot...");
            
            updateLoadingStatus("Initializing 3D scene...");
            
            // Initialize scene first and wait for it to be ready
            app.scene = new SceneManager();
            await app.scene.init();
            
            app.api = new APIManager();
            await app.api.init();

            app.robot = new RobotManager(app.scene, RobotBuilder);
            app.robot.api = app.api; // Pass API to robot manager

            app.automation = new AutomationManager(app.robot);
            app.automation.api = app.api; // Pass API to automation manager
            
            // Initialize UI first
            app.ui = new UIManager(app.robot, app.automation);
            app.ui.api = app.api; // Pass API to UI manager
            app.ui.scene = app.scene; // Pass scene to UI manager
            await app.ui.init();

            app.robot.ui = app.ui; // Pass UI to robot
            app.automation.ui = app.ui; // Pass UI to automation manager

            await app.robot.init();

            await app.automation.init();

            app.emergency = new EmergencyManager(app.scene, app.robot);
            app.emergency.ui = app.ui; // Pass UI manager to emergency manager
            app.ui.emergencyManager = app.emergency; // Update UI manager with emergency reference
            app.automation.emergencyManager = app.emergency; // Update automation manager with emergency reference
            app.emergency.api = app.api; // Pass API to emergency manager
            
            updateLoadingStatus("YaniBot ready!");
            
            console.log("✅ YaniBot Initialized Successfully");
            console.log("📊 App components:", { /// add more
                scene: !!app.scene,
                robot: !!app.robot,
                automation: !!app.automation,
                ui: !!app.ui,
                emergency: !!app.emergency,
                api: !!app.api
            });
            
            // Hide loading screen - now using the defined function
            setTimeout(() => {
                hideLoadingScreen();
            }, 3000);
            
            // Make app globally available for debugging
            window.app = app;
            
        } catch (error) {
            console.error("❌ Failed to initialize YaniBot:", error);
            console.error("Stack trace:", error.stack);
            
            updateLoadingStatus(`Error: ${error.message}`);
            
            // Hide loading screen even on error
            setTimeout(() => {
                hideLoadingScreen();
            }, 3000);
            
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
    }

    // Start initialization
    initYaniBot();
    
    // === Log Options Checkbox Sync ===
    [
        'state', 'reset', 'interpolatedPath', 'jointLimits',
        'movingState', 'currentAngles', 'stopState', 'pauseState', 'emergencyState'
    ].forEach(key => {
        const checkbox = document.getElementById('log' + key.charAt(0).toUpperCase() + key.slice(1));
        if (checkbox) {
            checkbox.onchange = function(e) {
                window.LOG_OPTIONS[key] = e.target.checked;
            };
        }
    });

});

// Add global error handler
window.addEventListener('error', (event) => {
    console.error('🚨 Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('🚨 Unhandled promise rejection:', event.reason);
});

// Make utility functions globally available
window.hideLoadingScreen = hideLoadingScreen;
window.updateLoadingStatus = updateLoadingStatus;
window.toggleSection = toggleSection;