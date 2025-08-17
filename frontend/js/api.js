class APIManager {
    constructor() {
        this.baseURL = window.ENV.BACKEND_URL;
        if (!this.baseURL) throw new Error("Backend URL is not defined in environment configuration");
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

    async getInterpolatedPath(targetAngles, steps = 20) {
        try {
            const response = await fetch(`${this.baseURL}/interpolate?steps=${steps}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ target_angles: targetAngles })
            });
            if (!response.ok) throw new Error('Failed to fetch interpolated path');
            const data = await response.json();
            return data.steps;
        } catch (error) {
            console.warn('⚠️ Failed to get interpolated path:', error.message);
            return null;
        }
    }
}