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
            console.log('getState response:', data);
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
            console.log('reset response:', data);
            if (response.ok) return data;
        } catch (error) {
            console.warn('⚠️ Backend reset failed:', error.message);
        }
    }

    async getInterpolatedPath(startAngles = null, targetAngles, steps = 20) {
        const payload = startAngles
            ? { start_angles: startAngles, target_angles: targetAngles }
            : { target_angles: targetAngles };
        const response = await fetch(`${this.baseURL}${window.ENV.API_ENDPOINTS.INTERPOLATE}?steps=${steps}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await response.json();
        console.log('getInterpolatedPath response:', data);
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
            console.log('check_joint_limits response:', data);
            if (!response.ok) throw new Error('Failed to check joint limits');
            return data;
        } catch (error) {
            console.warn('⚠️ Failed to check joint limits:', error.message);
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
            console.log('setMovingState response:', data);
            if (!response.ok) throw new Error('Failed to set moving state');
            return data;
        } catch (error) {
            console.warn('⚠️ Failed to set moving state:', error.message);
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
            console.log('setEmergencyState response:', data);
            if (!response.ok) throw new Error('Failed to set emergency state');
            return data;
        } catch (error) {
            console.warn('⚠️ Failed to set emergency state:', error.message);
            return null;
        }
    }
}