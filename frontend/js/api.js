/**
 * APIManager handles communication with the backend API for robot control.
 * Provides methods to move the robot, get its state, and reset it.
 */
class APIManager {
    /**
     * Initializes the APIManager with the base URL of the backend API.
     */
    constructor() {}

    /**
     * Sends a request to move the robot to the specified angles.
     * @param {number[]} angles - Array of target joint angles.
     * @returns {Promise<Object>} The response from the API.
     */
    async move(angles) {}

    /**
     * Retrieves the current state of the robot.
     * @returns {Promise<Object>} The current state from the API.
     */
    async getState() {}

    /**
     * Sends a request to reset the robot.
     * @returns {Promise<Object>} The response from the API.
     */
    async reset() {}

    /**
     * Sends a POST request to the specified API endpoint.
     * @param {string} endpoint - The API endpoint to send the request to.
     * @param {Object} [data] - The data to send in the request body.
     * @returns {Promise<Object>} The response from the API.
     * @throws {Error} If the response status is not OK.
     */
    async post(endpoint, data) {}

    /**
     * Sends a GET request to the specified API endpoint.
     * @param {string} endpoint - The API endpoint to send the request to.
     * @returns {Promise<Object>} The response from the API.
     */
    async get(endpoint) {}
}