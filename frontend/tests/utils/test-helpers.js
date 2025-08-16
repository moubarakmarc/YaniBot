// Helper to wait for DOM updates
export const waitForDOMUpdate = () => new Promise(resolve => setTimeout(resolve, 0));

// Helper to simulate user interactions
export const simulateSliderChange = (sliderId, value) => {
  const slider = document.getElementById(sliderId);
  if (slider) {
    slider.value = value;
    slider.dispatchEvent(new Event('input', { bubbles: true }));
    slider.dispatchEvent(new Event('change', { bubbles: true }));
  }
};

// Helper to setup complete UI
export const setupCompleteUI = () => {
  document.body.innerHTML = `
    <div id="canvas-container"></div>
    <div id="joint-sliders">
      ${Array.from({length: 6}, (_, i) => `
        <input id="slider-${i}" type="range" min="-180" max="180" value="0">
        <span id="value-${i}">0</span>
      `).join('')}
    </div>
    <button id="resetButton">Reset</button>
    <button id="emergencyStop">Emergency Stop</button>
    <span id="backend-status">Disconnected</span>
  `;
};

// Helper to create mock robot manager
export const createMockRobot = () => ({
  moveTo: jest.fn().mockResolvedValue(true),
  reset: jest.fn().mockResolvedValue(true),
  emergencyStop: jest.fn().mockResolvedValue(true),
  sendToBackend: jest.fn(),
  currentAngles: [0, 0, 0, 0, 0, 0],
  isMoving: false,
  isValidPosition: jest.fn(() => true)
});

// Helper to verify API calls
export const expectAPICall = (endpoint, method = 'POST', data = null) => {
  expect(fetch).toHaveBeenCalledWith(
    expect.stringContaining(endpoint),
    expect.objectContaining({
      method,
      ...(data && { body: JSON.stringify(data) })
    })
  );
};