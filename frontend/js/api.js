class APIManager {
    constructor() {
        this.baseURL = window.ENV.BACKEND_URL;
        if (!this.baseURL) throw new Error("Backend URL is not defined in environment configuration");
    }

    async init() {
        // Try to fetch backend state or health endpoint
        try {
            const response = await fetch(`${this.baseURL}${window.ENV.API_ENDPOINTS.STATE}`);
            if (!response.ok) throw new Error(`Backend not reachable: ${response.status}`);
            // Optionally, check response content here
            return true;
        } catch (error) {
            console.error('❌ Failed to connect to backend:', error.message);
            throw new Error('Backend connection failed');
        }
    }

    async move(angles) {
        try {
            const response = await fetch(`${this.baseURL}${window.ENV.API_ENDPOINTS.MOVE}`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ target_angles: angles })
            });
            const responseText = await response.text();
            if (!response.ok) throw new Error(responseText);
            return JSON.parse(responseText);
        } catch (error) {
            console.warn('⚠️ Backend communication failed:', error.message);
            return null;
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
}