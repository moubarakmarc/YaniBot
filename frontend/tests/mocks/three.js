// Mock Three.js library for testing
global.THREE = {
  // Scene management
  Scene: jest.fn(() => ({
    add: jest.fn(),
    remove: jest.fn(),
    background: null,
    children: [], // Add children array
    traverse: jest.fn(), // Add traverse method
    getObjectByName: jest.fn() // Add object lookup
  })),

  // Camera
  PerspectiveCamera: jest.fn((fov, aspect, near, far) => ({
    fov: fov || 75,
    aspect: aspect || 1,
    near: near || 0.1,
    far: far || 1000,
    position: { 
      set: jest.fn(), 
      x: 0, y: 0, z: 0,
      copy: jest.fn(),
      add: jest.fn(),
      sub: jest.fn()
    },
    rotation: {
      set: jest.fn(),
      x: 0, y: 0, z: 0
    },
    lookAt: jest.fn(),
    updateProjectionMatrix: jest.fn(),
    setViewOffset: jest.fn()
  })),

  // Renderer
  WebGLRenderer: jest.fn((options = {}) => ({
    domElement: document.createElement('canvas'),
    setSize: jest.fn(),
    setClearColor: jest.fn(),
    setPixelRatio: jest.fn(),
    render: jest.fn(),
    dispose: jest.fn(),
    shadowMap: {
      enabled: false,
      type: null
    },
    outputEncoding: null
  })),

  // Geometries
  BoxGeometry: jest.fn((width, height, depth) => ({
    type: 'BoxGeometry',
    parameters: { width, height, depth },
    dispose: jest.fn()
  })),
  
  CylinderGeometry: jest.fn((radiusTop, radiusBottom, height, radialSegments) => ({
    type: 'CylinderGeometry',
    parameters: { radiusTop, radiusBottom, height, radialSegments },
    dispose: jest.fn()
  })),

  SphereGeometry: jest.fn((radius, widthSegments, heightSegments) => ({
    type: 'SphereGeometry',
    parameters: { radius, widthSegments, heightSegments },
    dispose: jest.fn()
  })),

  // Materials
  MeshBasicMaterial: jest.fn((options = {}) => ({
    type: 'MeshBasicMaterial',
    color: options.color || 0xffffff,
    transparent: options.transparent || false,
    opacity: options.opacity || 1,
    wireframe: options.wireframe || false,
    dispose: jest.fn()
  })),

  MeshLambertMaterial: jest.fn((options = {}) => ({
    type: 'MeshLambertMaterial',
    color: options.color || 0xffffff,
    transparent: options.transparent || false,
    opacity: options.opacity || 1,
    dispose: jest.fn()
  })),

  MeshPhongMaterial: jest.fn((options = {}) => ({
    type: 'MeshPhongMaterial',
    color: options.color || 0xffffff,
    dispose: jest.fn()
  })),

  // Mesh and Object3D
  Mesh: jest.fn((geometry, material) => ({
    type: 'Mesh',
    geometry: geometry,
    material: material,
    position: { 
      set: jest.fn(), 
      x: 0, y: 0, z: 0,
      copy: jest.fn()
    },
    rotation: { 
      set: jest.fn(), 
      x: 0, y: 0, z: 0,
      copy: jest.fn()
    },
    scale: {
      set: jest.fn(),
      x: 1, y: 1, z: 1
    },
    add: jest.fn(),
    remove: jest.fn(),
    traverse: jest.fn(),
    clone: jest.fn(),
    copy: jest.fn(),
    visible: true,
    castShadow: false,
    receiveShadow: false
  })),

  Group: jest.fn(() => ({
    type: 'Group',
    children: [],
    add: jest.fn(),
    remove: jest.fn(),
    position: { 
      set: jest.fn(), 
      x: 0, y: 0, z: 0 
    },
    rotation: { 
      set: jest.fn(), 
      x: 0, y: 0, z: 0 
    },
    scale: {
      set: jest.fn(),
      x: 1, y: 1, z: 1
    },
    traverse: jest.fn(),
    clone: jest.fn(),
    visible: true
  })),

  // Math and Utilities
  Vector3: jest.fn((x = 0, y = 0, z = 0) => ({
    x, y, z,
    set: jest.fn(),
    copy: jest.fn(),
    add: jest.fn(),
    sub: jest.fn(),
    multiply: jest.fn(),
    normalize: jest.fn(),
    length: jest.fn(() => Math.sqrt(x*x + y*y + z*z)),
    distanceTo: jest.fn(),
    clone: jest.fn()
  })),

  Color: jest.fn((color) => ({
    r: 1, g: 1, b: 1,
    set: jest.fn(),
    setHex: jest.fn(),
    setRGB: jest.fn(),
    getHex: jest.fn(() => 0xffffff),
    clone: jest.fn()
  })),

  // Lights
  DirectionalLight: jest.fn((color, intensity) => ({
    type: 'DirectionalLight',
    color: color || 0xffffff,
    intensity: intensity || 1,
    position: { 
      set: jest.fn(), 
      x: 0, y: 0, z: 0 
    },
    target: {
      position: { set: jest.fn() }
    },
    castShadow: false,
    shadow: {
      mapSize: { width: 1024, height: 1024 }
    }
  })),

  AmbientLight: jest.fn((color, intensity) => ({
    type: 'AmbientLight',
    color: color || 0xffffff,
    intensity: intensity || 1
  })),

  PointLight: jest.fn((color, intensity, distance) => ({
    type: 'PointLight',
    color: color || 0xffffff,
    intensity: intensity || 1,
    distance: distance || 0,
    position: { set: jest.fn(), x: 0, y: 0, z: 0 }
  })),

  // Helpers
  AxesHelper: jest.fn((size = 1) => ({
    type: 'AxesHelper',
    size: size,
    position: { set: jest.fn() },
    visible: true
  })),

  GridHelper: jest.fn((size, divisions) => ({
    type: 'GridHelper',
    size: size,
    divisions: divisions
  })),

  // Controls (if using OrbitControls)
  OrbitControls: jest.fn((camera, domElement) => ({
    enabled: true,
    enableDamping: false,
    dampingFactor: 0.25,
    enableZoom: true,
    enablePan: true,
    enableRotate: true,
    update: jest.fn(),
    dispose: jest.fn()
  })),

  // Constants
  MathUtils: {
    degToRad: jest.fn((degrees) => degrees * Math.PI / 180),
    radToDeg: jest.fn((radians) => radians * 180 / Math.PI)
  },

  // Clock for animations
  Clock: jest.fn(() => ({
    start: jest.fn(),
    stop: jest.fn(),
    getElapsedTime: jest.fn(() => 0),
    getDelta: jest.fn(() => 0.016)
  }))
};

// Export for ES6 modules if needed
if (typeof module !== 'undefined' && module.exports) {
  module.exports = global.THREE;
}