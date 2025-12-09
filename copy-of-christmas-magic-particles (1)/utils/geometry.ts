import * as THREE from 'three';

export const createTreeGeometry = (count: number) => {
  // Increase count slightly for a lush tree if needed, but 8000 is good
  const actualCount = count + 1; // +1 for the star
  const positions = new Float32Array(actualCount * 3);
  const randoms = new Float32Array(actualCount * 3);
  const sizes = new Float32Array(actualCount);
  const types = new Float32Array(actualCount); // 0: Leaf, 1: Ornament, 2: Star

  // Create the Star first (index 0)
  positions[0] = 0;
  positions[1] = 5.5; // Top of the tree
  positions[2] = 0;
  types[0] = 2.0; // Star type
  sizes[0] = 1.0;
  randoms[0] = Math.random();
  randoms[1] = Math.random();
  randoms[2] = Math.random();

  for (let i = 1; i < actualCount; i++) {
    const i3 = i * 3;
    
    // Determine Type: 85% Leaves, 15% Ornaments
    const isOrnament = Math.random() > 0.85;
    const type = isOrnament ? 1.0 : 0.0;
    
    // Tree Shape Logic
    // Height from -5 to 5
    // Use power function to put more particles at the bottom for volume
    const h = Math.pow(Math.random(), 0.8); // 0 to 1
    const y = h * 10 - 5; 
    const normY = (y + 5) / 10; // 0 (bottom) to 1 (top)

    // Tiered Radius Logic (Pine Tree Shape)
    // Base cone shape
    let radius = (1.0 - normY) * 4.5;
    
    // Add "Tiers" / Branches using sine wave
    // 5 distinct layers of branches
    const tierWobble = Math.sin(normY * 25.0); 
    // Modulate radius: widen at the "belly" of a tier, narrow between tiers
    // factor ranges roughly 0.7 to 1.3
    const tierFactor = 0.8 + 0.4 * Math.max(0, tierWobble); 
    
    radius *= tierFactor;

    // Spiral angle placement
    const angle = y * 8.0 + Math.random() * Math.PI * 2;
    
    // Volume distribution
    // Leaves fill the inside, Ornaments sit on the edge
    let rOffset;
    if (isOrnament) {
      // Ornaments on the tips (surface)
      rOffset = 0.9 + Math.random() * 0.2; 
    } else {
      // Leaves distributed inside the cone volume (square root for even circular distribution)
      rOffset = Math.sqrt(Math.random()) * 0.95; 
    }

    const finalRadius = radius * rOffset;
    const x = Math.cos(angle) * finalRadius;
    const z = Math.sin(angle) * finalRadius;

    positions[i3] = x;
    positions[i3 + 1] = y;
    positions[i3 + 2] = z;

    types[i] = type;
    sizes[i] = Math.random();
    
    randoms[i3] = Math.random();
    randoms[i3 + 1] = Math.random();
    randoms[i3 + 2] = Math.random();
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aRandom', new THREE.BufferAttribute(randoms, 3));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('aType', new THREE.BufferAttribute(types, 1));

  return geometry;
};