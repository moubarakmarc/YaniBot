class APIManager {
    constructor() {
        this.baseURL = window.ENV.BACKEND_URL;
        if (!this.baseURL) throw new Error("Backend URL is not defined in environment configuration");
    }

    async init() {
        // Try to fetch backend state or health endpoint
        try {
            const response = await fetch(`${this.baseURL}${window.ENV.API_ENDPOINTS.ROOT}`);
            const data = await response.json();
            console.log('init response:', data);
            if (!response.ok) throw new Error(`Backend not reachable: ${response.status}`);
            return true;
        } catch (error) {
            console.error('❌ Failed to connect to backend:', error.message);
            throw new Error('Backend connection failed');
        }
    }

    async getState() {
        try {
            const response = await fetch(`${this.baseURL}${window.ENV.API_ENDPOINTS.STATE}`);
            const data = await response.json();
            if (window.LOG_OPTIONS.state) console.log('getState response:', data);
            if (!response.ok) throw new Error(`Backend error: ${response.status}`);
            return data;
        } catch (error) {
            console.warn('⚠️ Failed to get backend state:', error.message);
            return null;
        }
    }

    async reset() {
        try {
            const response = await fetch(`${this.baseURL}${window.ENV.API_ENDPOINTS.RESET}`, {
                method: 'POST'
            });
            const data = await response.json();
            if (window.LOG_OPTIONS.reset) console.log('reset response:', data);
            if (response.ok) return data;
        } catch (error) {
            console.warn('⚠️ Backend reset failed:', error.message);
        }
    }

    async getInterpolatedPath(startAngles = null, targetAngles, steps = 20) {
        const payload = startAngles
            ? { startAngles: startAngles, targetAngles: targetAngles }
            : { targetAngles: targetAngles };
        const response = await fetch(`${this.baseURL}${window.ENV.API_ENDPOINTS.INTERPOLATE}?steps=${steps}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await response.json();
        if (window.LOG_OPTIONS.interpolatedPath) console.log('getInterpolatedPath response:', data);
        if (!response.ok) throw new Error('Failed to fetch interpolated path');
        return data.steps;
    }

    async check_joint_limits(angles) {
        try {
            const response = await fetch(`${this.baseURL}${window.ENV.API_ENDPOINTS.LIMITS}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ joint_angles: angles })
            });
            const data = await response.json();
            if (window.LOG_OPTIONS.jointLimits) console.log('check_joint_limits response:', data);
            if (!response.ok) throw new Error('Failed to check joint limits');
            return data;
        } catch (error) {
            console.warn('⚠️ Failed to check joint limits:', error.message);
            return null;
        }
    }

    async setCurrentAngles(angles) {
        try {
            let payload = {};
            if (Array.isArray(angles) && angles.length === 6) {
                payload.joint_angles = angles;
            } else {
                throw new Error('Provide either an array of 6 angles');
            }
            const response = await fetch(`${this.baseURL}${window.ENV.API_ENDPOINTS.ANGLES}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await response.json();
            if (window.LOG_OPTIONS.currentAngles) console.log('currentAngles response:', data);
            if (!response.ok) throw new Error('Failed to set joint angles');
            return data;
        } catch (error) {
            console.warn('⚠️ Failed to set joint angles:', error.message);
            return null;
        }
    }

    async setMovingState(isMoving) {
        try {
            const response = await fetch(`${this.baseURL}${window.ENV.API_ENDPOINTS.MOVING}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_moving: isMoving })
            });
            const data = await response.json();
            if (window.LOG_OPTIONS.movingState) console.log('setMovingState response:', data);
            if (!response.ok) throw new Error('Failed to set moving state');
            return data;
        } catch (error) {
            console.warn('⚠️ Failed to set moving state:', error.message);
            return null;
        }
    }

    async setStopState(isStopped) {
        try {
            const response = await fetch(`${this.baseURL}${window.ENV.API_ENDPOINTS.STOP}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_stopped: isStopped })
            });
            const data = await response.json();
            if (window.LOG_OPTIONS.stopState) console.log('setStopState response:', data);
            if (!response.ok) throw new Error('Failed to set stop state');
            return data;
        } catch (error) {
            console.warn('⚠️ Failed to set stop state:', error.message);
            return null;
        }
    }

    async setPauseState(isPaused) {
        try {
            const response = await fetch(`${this.baseURL}${window.ENV.API_ENDPOINTS.PAUSE}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_paused: isPaused })
            });
            const data = await response.json();
            if (window.LOG_OPTIONS.pauseState) console.log('setPauseState response:', data);
            if (!response.ok) throw new Error('Failed to set pause state');
            return data;
        } catch (error) {
            console.warn('⚠️ Failed to set pause state:', error.message);
            return null;
        }
    }

    async setEmergencyState(isEmergency) {
        try {
            const response = await fetch(`${this.baseURL}${window.ENV.API_ENDPOINTS.EMERGENCY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_emergency: isEmergency })
            });
            const data = await response.json();
            if (window.LOG_OPTIONS.emergencyState) console.log('setEmergencyState response:', data);
            if (!response.ok) throw new Error('Failed to set emergency state');
            return data;
        } catch (error) {
            console.warn('⚠️ Failed to set emergency state:', error.message);
            return null;
        }
    }
}