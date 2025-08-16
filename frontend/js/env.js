// env.js - Environment configuration
window.ENV = {
    // Auto-detect backend URL based on current location
    BACKEND_URL: (() => {
        const { protocol, hostname, port } = window.location;
        
        // Development detection
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return 'http://localhost:8000';
        }
        
        // Production - use same host but different port (or same port if using proxy)
        return `${protocol}//${hostname}:8000`;
    })(),
    
    // API endpoints
    API_ENDPOINTS: {
        MOVE: '/move',
        STATE: '/state',
        RESET: '/reset',
        HEALTH: '/health',
        EMERGENCY_STOP: '/emergency_stop'
    },
    
    // Feature flags
    FEATURES: {
        BACKEND_ENABLED: true,
        DEBUG_MODE: window.location.hostname === 'localhost'
    }
};