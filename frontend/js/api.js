class APIManager {
    constructor() {
        this.baseURL = window.ENV.BACKEND_URL;
        if (!this.baseURL) throw new Error("Backend URL is not defined in environment configuration");
    }

    async init() {
        // Try to fetch backend state or health endpoint
        try {
            const response = await fetch(`${this.baseURL}${window.ENV.API_ENDPOINTS.ROOT}`);
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
            if (!response.ok) throw new Error(`Backend error: ${response.status}`);
            return await response.json();
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
            if (response.ok) return await response.json();
        } catch (error) {
            console.warn('⚠️ Backend reset failed:', error.message);
        }
    }

    async getInterpolatedPath( startAngles = null, targetAngles, steps = 20) {
        const payload = startAngles
            ? { start_angles: startAngles, target_angles: targetAngles }
            : { target_angles: targetAngles };
        const response = await fetch(`${this.baseURL}${window.ENV.API_ENDPOINTS.INTERPOLATE}?steps=${steps}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!response.ok) throw new Error('Failed to fetch interpolated path');
        const data = await response.json();
        console.log("Interpolated path:", data);
        return data.steps;
    }

    async setMovingState(isMoving) {
        try {
            const response = await fetch(`${this.baseURL}${window.ENV.API_ENDPOINTS.MOVE}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_moving: isMoving })
            });
            if (!response.ok) throw new Error('Failed to set moving state');
            return await response.json();
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
            if (!response.ok) throw new Error('Failed to set emergency state');
            return await response.json();
        } catch (error) {
            console.warn('⚠️ Failed to set emergency state:', error.message);
            return null;
        }
    }
}