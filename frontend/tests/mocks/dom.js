Object.defineProperty(window, 'requestAnimationFrame', {
  value: jest.fn(cb => setTimeout(cb, 16))
});// Animation Frame Mock
Object.defineProperty(window, 'requestAnimationFrame', {
  value: jest.fn(cb => setTimeout(cb, 16)),
  writable: true
});

Object.defineProperty(window, 'cancelAnimationFrame', {
  value: jest.fn(id => clearTimeout(id)),
  writable: true
});

// Resize Observer Mock
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn()
}));

// IntersectionObserver Mock
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn()
}));

// Canvas Context Mock
HTMLCanvasElement.prototype.getContext = jest.fn((contextType) => {
  if (contextType === '2d') {
    return {
      fillRect: jest.fn(),
      clearRect: jest.fn(),
      getImageData: jest.fn(() => ({ data: new Array(4) })),
      putImageData: jest.fn(),
      createImageData: jest.fn(() => ({ data: new Array(4) })),
      setTransform: jest.fn(),
      drawImage: jest.fn(),
      save: jest.fn(),
      restore: jest.fn(),
      beginPath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      closePath: jest.fn(),
      stroke: jest.fn(),
      fill: jest.fn(),
      measureText: jest.fn(() => ({ width: 0 })),
      canvas: {
        width: 800,
        height: 600
      }
    };
  }
  
  if (contextType === 'webgl' || contextType === 'experimental-webgl') {
    return {
      canvas: {
        width: 800,
        height: 600
      },
      drawingBufferWidth: 800,
      drawingBufferHeight: 600,
      getExtension: jest.fn(),
      getParameter: jest.fn(),
      createProgram: jest.fn(),
      createShader: jest.fn(),
      shaderSource: jest.fn(),
      compileShader: jest.fn(),
      attachShader: jest.fn(),
      linkProgram: jest.fn(),
      useProgram: jest.fn(),
      createBuffer: jest.fn(),
      bindBuffer: jest.fn(),
      bufferData: jest.fn(),
      clear: jest.fn(),
      enable: jest.fn(),
      disable: jest.fn(),
      viewport: jest.fn(),
      clearColor: jest.fn(),
      clearDepth: jest.fn()
    };
  }
  
  return null;
});

// Window sizing
Object.defineProperty(window, 'innerWidth', {
  writable: true,
  configurable: true,
  value: 1024
});

Object.defineProperty(window, 'innerHeight', {
  writable: true,
  configurable: true,
  value: 768
});

// Screen properties
Object.defineProperty(window, 'screen', {
  writable: true,
  configurable: true,
  value: {
    width: 1920,
    height: 1080,
    availWidth: 1920,
    availHeight: 1040
  }
});

// Device pixel ratio
Object.defineProperty(window, 'devicePixelRatio', {
  writable: true,
  configurable: true,
  value: 1
});

// Location mock
Object.defineProperty(window, 'location', {
  writable: true,
  configurable: true,
  value: {
    hostname: 'localhost',
    port: '3000',
    protocol: 'http:',
    href: 'http://localhost:3000',
    origin: 'http://localhost:3000',
    pathname: '/',
    search: '',
    hash: ''
  }
});

// Local Storage Mock
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn()
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true
});

Object.defineProperty(window, 'sessionStorage', {
  value: localStorageMock,
  writable: true
});

// Performance API Mock
Object.defineProperty(window, 'performance', {
  writable: true,
  value: {
    now: jest.fn(() => Date.now()),
    mark: jest.fn(),
    measure: jest.fn(),
    getEntriesByType: jest.fn(() => []),
    getEntriesByName: jest.fn(() => [])
  }
});

// Worker Mock
global.Worker = jest.fn().mockImplementation(() => ({
  postMessage: jest.fn(),
  terminate: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn()
}));

// File and FileReader Mocks
global.File = jest.fn().mockImplementation((bits, name, options) => ({
  name,
  size: bits ? bits.length : 0,
  type: options?.type || '',
  lastModified: Date.now()
}));

global.FileReader = jest.fn().mockImplementation(() => ({
  readAsText: jest.fn(),
  readAsDataURL: jest.fn(),
  readAsArrayBuffer: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  result: null,
  error: null,
  readyState: 0
}));

// Blob Mock
global.Blob = jest.fn().mockImplementation((content, options) => ({
  size: content ? content.length : 0,
  type: options?.type || '',
  slice: jest.fn(),
  stream: jest.fn(),
  text: jest.fn(),
  arrayBuffer: jest.fn()
}));

// URL Mock
global.URL = {
  createObjectURL: jest.fn(() => 'blob:mock-url'),
  revokeObjectURL: jest.fn()
};

// Custom Elements Mock
global.customElements = {
  define: jest.fn(),
  get: jest.fn(),
  whenDefined: jest.fn(() => Promise.resolve())
};

// MutationObserver Mock
global.MutationObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  disconnect: jest.fn(),
  takeRecords: jest.fn(() => [])
}));

// CSS Mock
global.CSS = {
  supports: jest.fn(() => true),
  escape: jest.fn(str => str)
};

// Helper to create DOM elements with common properties
global.createMockElement = (tagName, attributes = {}) => {
  const element = document.createElement(tagName);
  
  // Add getBoundingClientRect
  element.getBoundingClientRect = jest.fn(() => ({
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    width: attributes.width || 100,
    height: attributes.height || 100,
    x: 0,
    y: 0
  }));
  
  // Add common properties
  Object.assign(element, attributes);
  
  return element;
};

// Helper to mock slider elements specifically for YaniBot
global.createMockSlider = (id, min = -180, max = 180, value = 0) => {
  const slider = global.createMockElement('input', {
    type: 'range',
    id: id,
    min: min.toString(),
    max: max.toString(),
    value: value.toString(),
    step: '1'
  });
  
  // Add event simulation helper
  slider.simulateChange = (newValue) => {
    slider.value = newValue.toString();
    slider.dispatchEvent(new Event('input', { bubbles: true }));
    slider.dispatchEvent(new Event('change', { bubbles: true }));
  };
  
  return slider;
};

// Clean up function for tests
global.cleanupDOMMocks = () => {
  // Reset all mock implementations
  jest.clearAllMocks();
  
  // Reset window properties to defaults
  window.innerWidth = 1024;
  window.innerHeight = 768;
  window.devicePixelRatio = 1;
  
  // Clear localStorage
  localStorageMock.clear();
};