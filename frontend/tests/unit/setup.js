import '@testing-library/jest-dom';

// Mock Three.js
global.THREE = {
  Scene: jest.fn(() => ({
    add: jest.fn(),
    remove: jest.fn(),
    background: null
  })),
  PerspectiveCamera: jest.fn(() => ({
    position: { set: jest.fn(), x: 0, y: 0, z: 0 },
    lookAt: jest.fn()
  })),
  WebGLRenderer: jest.fn(() => ({
    setSize: jest.fn(),
    setClearColor: jest.fn(),
    render: jest.fn(),
    domElement: document.createElement('canvas')
  })),
  BoxGeometry: jest.fn(),
  CylinderGeometry: jest.fn(),
  MeshBasicMaterial: jest.fn(),
  MeshLambertMaterial: jest.fn(),
  Mesh: jest.fn(() => ({
    position: { set: jest.fn(), x: 0, y: 0, z: 0 },
    rotation: { set: jest.fn(), x: 0, y: 0, z: 0 },
    add: jest.fn()
  })),
  Group: jest.fn(() => ({
    add: jest.fn(),
    position: { set: jest.fn() },
    rotation: { set: jest.fn() }
  })),
  Color: jest.fn(),
  DirectionalLight: jest.fn(),
  AmbientLight: jest.fn(),
  AxesHelper: jest.fn(),
  Vector3: jest.fn(() => ({ set: jest.fn() }))
};

// Mock fetch
global.fetch = jest.fn();

// Mock ENV
global.ENV = {
  BACKEND_URL: 'http://localhost:8000',
  API_ENDPOINTS: {
    MOVE: '/move',
    STATE: '/state',
    RESET: '/reset',
    HEALTH: '/health',
    EMERGENCY_STOP: '/emergency_stop'
  },
  FEATURES: {
    BACKEND_ENABLED: true,
    DEBUG_MODE: true
  }
};

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn(cb => setTimeout(cb, 16));

// Mock console methods
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Clear mocks after each test
afterEach(() => {
  jest.clearAllMocks();
});