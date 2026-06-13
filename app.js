import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// --- 1. SETUP ENGINE CORES ---
const canvas = document.querySelector('#aquarium-canvas');
const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
// Enable shadow mapping for clean, flat-shaded low-poly depth
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;

const scene = new THREE.Scene();
// Deep, soothing marine blue background
scene.background = new THREE.Color('#29528b');
// Soft exponential fog hides the horizon and lowers visual stimulation
scene.fog = new THREE.FogExp2('#0a1e3f', 0.035);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 4, 22);

// --- 2. LIGHTING (Soft & Ambient) ---
const ambientLight = new THREE.AmbientLight('#264070', 1.2);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight('#a6d5ff', 1.5);
sunLight.position.set(5, 20, 5);
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 1024;
sunLight.shadow.mapSize.height = 1024;
scene.add(sunLight);

// --- 3. PROCEDURAL ENVIRONMENT GENERATION ---
// Create a simple low-poly sandy ocean floor
const floorGeo = new THREE.PlaneGeometry(60, 60, 10, 10);
// Randomize floor vertices slightly to create low-poly dunes
const posAttr = floorGeo.attributes.position;
for (let i = 0; i < posAttr.count; i++) {
    const y = posAttr.getY(i);
    // Only deform internal vertices to keep edges flat
    if (Math.abs(posAttr.getX(i)) < 28 && Math.abs(posAttr.getZ(i)) < 28) {
        posAttr.setY(i, y + Math.random() * 0.4);
    }
}
floorGeo.computeVertexNormals();

const floorMat = new THREE.MeshPhongMaterial({
    color: '#29528b',
    flatShading: true, // Forces sharp, geometric facet highlights
    shininess: 10
});
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -5;
floor.receiveShadow = true;
scene.add(floor);

// --- 4. ASSET LOADING & INSTANCING ---
const loader = new GLTFLoader();
const activeFish = [];

// Helper to enforce flat shading on imported Blender models
const applyLowPolyShading = (model) => {
    model.traverse((child) => {
        if (child.isMesh) {
            child.material.flatShading = true;
            child.material.needsUpdate = true;
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });
};

function loadCoral(assetPath, count) {
    loader.load(assetPath, (gltf) => {
        const baseCoral = gltf.scene;
        applyLowPolyShading(baseCoral);

        // Seed 40 random corals across the floor
        for (let i = 0; i < count; i++) {
            const coralClone = baseCoral.clone();

            coralClone.rotation.y = Math.random() * Math.PI * 0.5;

            // Random placement on the bottom plane
            const x = (Math.random() - 0.5) * 75;
            const z = -5 - (Math.random() * 25);
            coralClone.position.set(x, -5, z);

            // Random scale and spin variation
            const coralScale = 0.2;
            const scale = Math.random() * coralScale + 0.1;
            coralClone.scale.set(scale, scale, scale);
            coralClone.rotation.y = (Math.random() * Math.PI) - (Math.PI / 2);

            const randomHue = Math.random();

            const pastelColor = new THREE.Color().setHSL(randomHue, 1, 0.5);

            coralClone.traverse((child) => {
                if (child.isMesh) {
                    // Clone the material so each fish has its own distinct color instance
                    child.material = child.material.clone();
                    child.material.color = pastelColor;

                    // Keep the essential low-poly material properties
                    child.material.flatShading = true;
                    child.material.needsUpdate = true;
                }
            });

            scene.add(coralClone);
        }
    }, undefined, (err) => console.error("Error loading coral:", err));
}

function loadFish(assetPath, count, fishScale = 0.1) {
    loader.load(assetPath, (gltf) => {
        const baseFish = gltf.scene;
        applyLowPolyShading(baseFish);

        // Spawn 15 fish with unique parametric paths
        for (let i = 0; i < count; i++) {
            const fishClone = baseFish.clone();

            const scale = Math.random() * fishScale + 0.1;
            fishClone.scale.set(scale, scale, scale);

            const randomHue = Math.random();

            const pastelColor = new THREE.Color().setHSL(randomHue, 0.8, 0.75);

            fishClone.traverse((child) => {
                if (child.isMesh) {
                    // Clone the material so each fish has its own distinct color instance
                    child.material = child.material.clone();
                    child.material.color = pastelColor;

                    // Keep the essential low-poly material properties
                    child.material.flatShading = true;
                    child.material.needsUpdate = true;
                }
            });

            // Set randomized structural behavioral variables
            const fishData = {
                mesh: fishClone,
                speed: Math.random() * 0.02 + 0.015,
                swimCycleOffset: Math.random() * Math.PI * 2,
                depthLevel: (Math.random() - 0.5) * 10, // Restricts vertical scattering
                radius: Math.random() * 8 + 6,         // Distance from focal center
                orbitSpeed: (Math.random() * 0.1 + 0.2) * (Math.random() > 0.5 ? 1 : -1)
            };

            scene.add(fishClone);
            activeFish.push(fishData);
        }
    }, undefined, (err) => console.error("Error loading fish:", err));
}

// Load Coral and scatter randomly
loadCoral('./assets/fan_coral.glb', 10);
loadCoral('./assets/seaweed.glb', 10);

// Load Fish and set up tracking arrays
loadFish('./assets/fish1.glb', 3, 0.05);
loadFish('./assets/fish2.glb', 3);
loadFish('./assets/manta.glb', 2, 0.05);

const bubbleCount = 100;
const bubbleGeometry = new THREE.BufferGeometry();
const bubblePositions = new Float32Array(bubbleCount * 3);
// Create custom data properties to track individual speeds and drift styles
const bubbleSpeeds = [];
const bubbleWiggleOffsets = [];

for (let i = 0; i < bubbleCount; i++) {
    // Randomize starting locations across the entire aquarium grid width/depth
    const x = (Math.random() - 0.5) * 40;
    const y = Math.random() * 20 - 10; // Start at various vertical depths
    const z = (Math.random() - 0.5) * 40;

    bubblePositions[i * 3] = x;
    bubblePositions[i * 3 + 1] = y;
    bubblePositions[i * 3 + 2] = z;

    // Slow upwards floating speeds (0.015 to 0.035 units per frame)
    bubbleSpeeds.push(Math.random() * 0.02 + 0.015);
    // Unique offsets so they don't sway left/right at the exact same time
    bubbleWiggleOffsets.push(Math.random() * Math.PI * 2);
}

bubbleGeometry.setAttribute('position', new THREE.BufferAttribute(bubblePositions, 3));

// Create a simple, flat-colored circle texture dynamically via canvas to keep it low-poly style
const createCircleTexture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.arc(8, 8, 6, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'; // Semitransparent white
    ctx.fill();
    return new THREE.CanvasTexture(canvas);
};

const bubbleMaterial = new THREE.PointsMaterial({
    size: 0.15, // Bubble scale
    map: createCircleTexture(),
    transparent: true,
    blending: THREE.NormalBlending,
    depthWrite: false // Prevents ugly square borders from overlapping other objects
});

const bubbleParticles = new THREE.Points(bubbleGeometry, bubbleMaterial);
scene.add(bubbleParticles);

// --- 5. RESPONSIVE FULL-SCREEN ENGINE ---
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

// --- 6. TICK ANIMATION LOOP (Low-Stim Trigonometric Curves) ---
const timer = new THREE.Timer();

const tick = () => {
    timer.update();

    const elapsedTime = timer.getElapsed();

    // Parametric Fish Swimming Patterns
    activeFish.forEach((fish) => {
        // 1. Calculate the current time factor
        const timeFactor = elapsedTime * fish.orbitSpeed + fish.swimCycleOffset;

        const oldX = fish.mesh.position.x;
        const oldZ = fish.mesh.position.z;

        // 2. Apply standard position coordinates
        fish.mesh.position.x = Math.cos(timeFactor) * fish.radius;
        fish.mesh.position.z = Math.sin(timeFactor) * fish.radius;
        fish.mesh.position.y = fish.depthLevel + Math.sin(elapsedTime * 0.5 + fish.swimCycleOffset) * 0.3;

        const DX = fish.mesh.position.x - oldX;
        const DZ = fish.mesh.position.z - oldZ;

        const headingRadians = Math.atan2(DX, DZ) + (elapsedTime > 0 ? -Math.PI / 2 : Math.PI / 2);

        // 5. Apply the perfect angle directly to the Y-axis
        fish.mesh.rotation.y = headingRadians;
        // ------------------------------

        // 6. Subtle, rhythmic tail-wagging motion
        fish.mesh.rotation.z = Math.sin(elapsedTime * 4.0 + fish.swimCycleOffset) * 0.08;
    });

    const positions = bubbleGeometry.attributes.position.array;

    for (let i = 0; i < bubbleCount; i++) {
        // Access Y coordinate
        let y = positions[i * 3 + 1];

        // Float slowly upwards
        y += bubbleSpeeds[i];

        // Gentle sinusoidal left-to-right drift (low-stim wiggle)
        positions[i * 3] += Math.sin(elapsedTime + bubbleWiggleOffsets[i]) * 0.005;

        // Reset bubble to the ocean floor if it rises past the ceiling (Y = 10)
        if (y > 10) {
            y = -6;
            // Randomize X and Z slightly upon respawn for variety
            positions[i * 3] = (Math.random() - 0.5) * 40;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 40;
        }

        // Apply updated vertical position back to array
        positions[i * 3 + 1] = y;
    }

    // Signal Three.js that the coordinates changed this frame
    bubbleGeometry.attributes.position.needsUpdate = true;
    // ----------------------------------

    // Render the scene frame
    renderer.render(scene, camera);
    window.requestAnimationFrame(tick);
};

// Unblock audio context via UI interaction
const overlay = document.getElementById('ambient-overlay');
const startBtn = document.getElementById('start-btn');

startBtn.addEventListener('click', () => {
    // Fade out and disable the UI overlay screen
    overlay.classList.add('hidden');
});
// --------------------------------------

tick();
