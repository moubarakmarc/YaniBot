class BinManager {
    constructor(scene = null) {
        this.scene = scene; // Optional: for 3D object management
        this.leftBin = [];
        this.rightBin = [];
    }

    async init() {
        // Example: create 5 spheres as objects
        this.leftBin = [];
        for (let i = 0; i < 5; i++) {
            const geometry = new THREE.SphereGeometry(0.05, 16, 16);
            const material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.set(Math.random(), 0, 0); // or wherever you want
            this.leftBin.push(mesh);
            if (this.scene) this.scene.add(mesh);
        }
        this.rightBin = [];
    }

    isEmpty(bin = 'left') {
        if (bin === 'left') return this.leftBin.length === 0;
        if (bin === 'right') return this.rightBin.length === 0;
        return this.leftBin.length === 0 && this.rightBin.length === 0;
    }

    getTransferPair(strategy = 'left-to-right') {
        // Extend for more strategies if needed
        if (strategy === 'left-to-right') {
            return { sourceBin: 'left', targetBin: 'right' };
        } else if (strategy === 'right-to-left') {
            return { sourceBin: 'right', targetBin: 'left' };
        }
        // Add more strategies as needed
        return { sourceBin: 'left', targetBin: 'right' };
    }

    pickupObject(binName) {
        if (binName === 'left' && this.leftBin.length > 0) {
            return this.leftBin.shift();
        } else if (binName === 'right' && this.rightBin.length > 0) {
            return this.rightBin.shift();
        }
        return null;
    }

    dropObject(object, binName) {
        if (!object) return;
        if (binName === 'left') {
            this.leftBin.push(object);
        } else if (binName === 'right') {
            this.rightBin.push(object);
        }
    }

    getBinCounts() {
        return {
            left: this.leftBin.length,
            right: this.rightBin.length
        };
    }

    // Optionally, add methods to update UI or 3D scene here
}

// Make class globally available if needed
window.BinManager = BinManager;