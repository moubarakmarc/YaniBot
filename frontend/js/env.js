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
        STATE: '/state',
        RESET: '/reset',
        HEALTH: '/health',
        INTERPOLATE: '/interpolate',
        EMERGENCY: '/emergency',
        EMERGENCY_RESET: '/emergency_reset',
        EMERGENCY_STATUS: '/emergency_status',
        EMERGENCY_START: '/emergency_start',
        EMERGENCY_STOP: '/emergency_stop',
        EMERGENCY_PAUSE: '/emergency_pause',
        EMERGENCY_RESUME: '/emergency_resume',
        EMERGENCY_TOGGLE: '/emergency_toggle',
        EMERGENCY_GET_STATUS: '/emergency_get_status',
        EMERGENCY_STOP: '/emergency_stop'
    },
    
    // Feature flags
    FEATURES: {
        BACKEND_ENABLED: true,
        DEBUG_MODE: window.location.hostname === 'localhost'
    }
};