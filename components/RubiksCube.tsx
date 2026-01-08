'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function RubiksCube() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const clockRef = useRef<THREE.Clock | null>(null);
  const layersRef = useRef<{ [key: string]: THREE.Group | THREE.Mesh[] }>({});
  const mouseRef = useRef({ x: 0, y: 0 });
  const spotlightRef = useRef<THREE.SpotLight | null>(null);
  const lightsRef = useRef<{
    key: THREE.DirectionalLight;
    fill: THREE.DirectionalLight;
    ambient: THREE.AmbientLight;
  } | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.8; // Much brighter for clear visibility

    const scene = new THREE.Scene();

    // Camera - match reference angle
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    camera.position.set(0.0, 0.25, 6.0);
    camera.lookAt(0.9, 0.08, 0);

    // Enhanced environment with very bright reflection spots
    const createReflectionEnvironment = () => {
      const size = 512; // Higher resolution for better reflections
      const data = new Uint8Array(size * size * 4);
      for (let i = 0; i < size * size; i++) {
        const stride = i * 4;
        const x = (i % size) / size;
        const y = Math.floor(i / size) / size;
        
        // Create multiple bright reflection spots
        const dist1 = Math.sqrt((x - 0.2) * (x - 0.2) + (y - 0.2) * (y - 0.2));
        const dist2 = Math.sqrt((x - 0.8) * (x - 0.8) + (y - 0.3) * (y - 0.3));
        const dist3 = Math.sqrt((x - 0.4) * (x - 0.4) + (y - 0.7) * (y - 0.7));
        const brightness1 = Math.max(0, 1 - dist1 * 1.2) * 0.8;
        const brightness2 = Math.max(0, 1 - dist2 * 1.2) * 0.6;
        const brightness3 = Math.max(0, 1 - dist3 * 1.2) * 0.5;
        const brightness = brightness1 + brightness2 + brightness3;
        
        // Much brighter base with strong reflection spots
        const baseR = 40;
        const baseG = 45;
        const baseB = 50;
        data[stride] = baseR + brightness * 120;     // R
        data[stride + 1] = baseG + brightness * 130; // G
        data[stride + 2] = baseB + brightness * 140; // B (cool metallic tint)
        data[stride + 3] = 255; // A
      }
      const texture = new THREE.DataTexture(data, size, size);
      texture.needsUpdate = true;
      return texture;
    };

    const envTexture = createReflectionEnvironment();
    const envMap = new THREE.CubeTexture([
      envTexture, envTexture, envTexture, envTexture, envTexture, envTexture
    ]);
    envMap.needsUpdate = true;
    scene.environment = envMap;

    // Rig
    const rig = new THREE.Group();
    rig.position.set(0.9, 0.08, 0);
    scene.add(rig);

    // Strong lighting for maximum visibility and reflections
    const key = new THREE.DirectionalLight(0xffffff, 7.0);
    key.position.set(-3.5, 5.5, 4.0);
    scene.add(key);

    // Strong fill light for brightness
    const fill = new THREE.DirectionalLight(0xffffff, 3.5);
    fill.position.set(2, 3, 3);
    scene.add(fill);

    // Rim light for edge definition
    const rim = new THREE.DirectionalLight(0xffffff, 2.5);
    rim.position.set(4, 2, -3);
    scene.add(rim);

    // Ambient light - will be dimmed when mouse is away for flashlight effect
    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambient);
    
    lightsRef.current = { key, fill, ambient };

    // Mouse flashlight - spotlight that follows cursor
    const spotlight = new THREE.SpotLight(0xffffff, 15.0, 30, Math.PI / 4, 0.2, 1.5);
    spotlight.position.set(0, 0, 10);
    spotlight.castShadow = true;
    spotlight.shadow.mapSize.width = 2048;
    spotlight.shadow.mapSize.height = 2048;
    spotlight.shadow.camera.near = 0.1;
    spotlight.shadow.camera.far = 50;
    scene.add(spotlight);
    spotlightRef.current = spotlight;

    // Add helper to visualize spotlight direction (optional, can remove)
    // const spotHelper = new THREE.SpotLightHelper(spotlight);
    // scene.add(spotHelper);

    // Build cube structure
    const cube = new THREE.Group();
    rig.add(cube);

    const cubieSize = 0.62;
    const gap = 0.02;
    const step = cubieSize + gap;

    // Create texture patterns
    function createGridTexture(size = 64, lineWidth = 1) {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      
      ctx.fillStyle = '#3a3d45'; // Brighter base
      ctx.fillRect(0, 0, size, size);
      ctx.strokeStyle = '#2a2d35'; // Brighter grid lines
      ctx.lineWidth = lineWidth;
      
      // Draw grid
      for (let i = 0; i <= size; i += size / 8) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, size);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(size, i);
        ctx.stroke();
      }
      
      const tex = new THREE.CanvasTexture(canvas);
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(1, 1);
      return tex;
    }

    function createHoneycombTexture(size = 64) {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      
      ctx.fillStyle = '#4a4d55'; // Brighter base
      ctx.fillRect(0, 0, size, size);
      ctx.strokeStyle = '#3a3d45'; // Brighter pattern lines
      ctx.lineWidth = 0.5;
      
      const hexSize = size / 6;
      for (let y = 0; y < size; y += hexSize * 1.5) {
        for (let x = 0; x < size; x += hexSize * Math.sqrt(3)) {
          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i;
            const hx = x + hexSize * Math.cos(angle);
            const hy = y + hexSize * Math.sin(angle);
            if (i === 0) ctx.moveTo(hx, hy);
            else ctx.lineTo(hx, hy);
          }
          ctx.closePath();
          ctx.stroke();
        }
      }
      
      const tex = new THREE.CanvasTexture(canvas);
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(2, 2);
      return tex;
    }

    const gridTex = createGridTexture(64, 1);
    const honeycombTex = createHoneycombTexture(64);

    // Materials - highly visible metallic finishes with strong reflections
    function createMaterial(
      hex: string,
      roughness: number,
      metalness: number,
      texture?: THREE.Texture | null,
      isGlossy: boolean = false,
      envIntensity: number = 1.5
    ) {
      return new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(hex),
        metalness: metalness, // Very high metalness for strong metallic feel
        roughness: roughness, // Very low roughness for mirror-like reflections
        clearcoat: isGlossy ? 1.0 : 0.8, // Full clearcoat
        clearcoatRoughness: isGlossy ? 0.02 : 0.15, // Extremely smooth clearcoat
        envMapIntensity: envIntensity, // Very strong environment reflections
        map: texture || undefined,
      });
    }

    // Much brighter, high-contrast metallic color palette
    const materials = [
      createMaterial('#4a4d55', 0.25, 0.95, null, false, 2.0), // Dark metallic (brighter)
      createMaterial('#5a5d65', 0.2, 0.96, null, false, 2.2), // Medium-dark metallic
      createMaterial('#6a6d75', 0.18, 0.97, null, false, 2.4), // Medium metallic
      createMaterial('#5a5d65', 0.08, 0.98, null, true, 2.8), // Dark glossy metallic (very reflective)
      createMaterial('#6a6d75', 0.06, 0.98, null, true, 3.0), // Medium glossy metallic
      createMaterial('#7a7d85', 0.04, 0.99, null, true, 3.2), // Light glossy metallic (most reflective)
      createMaterial('#5a5d65', 0.2, 0.96, gridTex, false, 2.2), // Grid pattern metallic
      createMaterial('#6a6d75', 0.18, 0.97, honeycombTex, false, 2.4), // Honeycomb pattern metallic
    ];

    const geo = new THREE.BoxGeometry(cubieSize, cubieSize, cubieSize);
    const edgeGeo = new THREE.EdgesGeometry(geo, 35);
    const edgeMat = new THREE.LineBasicMaterial({
      color: 0x2a2d35, // Much brighter edges for clear definition
      transparent: true,
      opacity: 0.9,
    });

    // Create layer groups (Y-axis layers for primary rotation)
    const yLayers: { [key: number]: THREE.Group } = {
      1: new THREE.Group(),  // top
      0: new THREE.Group(),  // middle
      '-1': new THREE.Group(), // bottom
    };

    // Store cubies by their layer membership for rotation
    const cubiesByLayer: { [key: string]: THREE.Mesh[] } = {
      topLayer: [],
      middleYLayer: [],
      bottomLayer: [],
      rightLayer: [],
      centerXLayer: [],
      leftLayer: [],
      frontLayer: [],
      centerZLayer: [],
      backLayer: [],
    };

    // Store original positions for X/Z rotations
    const cubiePositions = new Map<THREE.Mesh, { x: number; y: number; z: number }>();

    // Create cubies with varied materials
    const cubies: THREE.Mesh[] = [];
    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          // Assign materials based on position for high contrast variation
          let matIndex = 0;
          
          // Top face - brightest, most reflective
          if (y === 1) {
            if (x === 1 && z === 1) matIndex = 5; // Corner - brightest glossy
            else if (x === 1 || z === 1) matIndex = 4; // Edge - bright glossy
            else matIndex = 3; // Center - medium glossy
          }
          // Right face - medium bright with patterns
          else if (x === 1) {
            if ((y + z) % 2 === 0) matIndex = 6; // Grid pattern for variety
            else matIndex = 2; // Medium metallic
          }
          // Front face - patterns and medium
          else if (z === 1) {
            if ((x + y) % 3 === 0) matIndex = 7; // Honeycomb pattern
            else matIndex = 1; // Medium-dark metallic
          }
          // Left/back faces - darker but still visible
          else if (x === -1 || z === -1) {
            matIndex = 0; // Dark metallic (still visible)
          }
          // Center - varied for complexity
          else {
            const pattern = (x + y + z + 12) % 4;
            if (pattern === 0) matIndex = 0;
            else if (pattern === 1) matIndex = 1;
            else if (pattern === 2) matIndex = 2;
            else matIndex = 3;
          }

          const cubie = new THREE.Mesh(geo, materials[matIndex]);
          const posX = x * step;
          const posY = y * step;
          const posZ = z * step;
          cubie.position.set(posX, posY, posZ);

          // Store original position
          cubiePositions.set(cubie, { x: posX, y: posY, z: posZ });

          // Add edges
          const edges = new THREE.LineSegments(edgeGeo, edgeMat);
          cubie.add(edges);

          // Add to Y-axis layer (primary container)
          yLayers[y as keyof typeof yLayers].add(cubie);

          // Track cubie membership for rotation
          if (y === 1) cubiesByLayer.topLayer.push(cubie);
          else if (y === 0) cubiesByLayer.middleYLayer.push(cubie);
          else cubiesByLayer.bottomLayer.push(cubie);

          if (x === 1) cubiesByLayer.rightLayer.push(cubie);
          else if (x === 0) cubiesByLayer.centerXLayer.push(cubie);
          else cubiesByLayer.leftLayer.push(cubie);

          if (z === 1) cubiesByLayer.frontLayer.push(cubie);
          else if (z === 0) cubiesByLayer.centerZLayer.push(cubie);
          else cubiesByLayer.backLayer.push(cubie);

          cubies.push(cubie);
        }
      }
    }

    // Add Y-axis layers to cube
    Object.values(yLayers).forEach(layer => cube.add(layer));

    // For X and Z rotations, we'll apply transforms directly to cubies
    // Store layer references for animation
    layersRef.current = {
      topLayer: yLayers[1],
      middleYLayer: yLayers[0],
      bottomLayer: yLayers[-1],
      rightLayer: cubiesByLayer.rightLayer,
      centerXLayer: cubiesByLayer.centerXLayer,
      leftLayer: cubiesByLayer.leftLayer,
      frontLayer: cubiesByLayer.frontLayer,
      centerZLayer: cubiesByLayer.centerZLayer,
      backLayer: cubiesByLayer.backLayer,
    };

    // Initial orientation
    cube.rotation.set(-0.75, 0.70, 0.35);

    // Resize
    function resize() {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    window.addEventListener('resize', resize);
    resize();

    // Mouse tracking for flashlight effect
    const handleMouseMove = (event: MouseEvent) => {
      if (!canvasRef.current) return;
      
      const rect = canvasRef.current.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      
      mouseRef.current = { x, y };
    };

    const handleMouseLeave = () => {
      // Dim the spotlight when mouse leaves
      mouseRef.current = { x: 0, y: 0 };
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    // Solving animation - proper 90-degree rotations
    const clock = new THREE.Clock(true);
    clockRef.current = clock;

    let currentMove = 0;
    let moveStartTime = 0;
    const moveDuration = 0.6; // seconds per move
    const moves = [
      { layer: 'topLayer', axis: 'y', angle: Math.PI / 2 },
      { layer: 'rightLayer', axis: 'x', angle: -Math.PI / 2 },
      { layer: 'frontLayer', axis: 'z', angle: Math.PI / 2 },
      { layer: 'topLayer', axis: 'y', angle: -Math.PI / 2 },
      { layer: 'leftLayer', axis: 'x', angle: Math.PI / 2 },
      { layer: 'backLayer', axis: 'z', angle: -Math.PI / 2 },
      { layer: 'bottomLayer', axis: 'y', angle: Math.PI / 2 },
      { layer: 'rightLayer', axis: 'x', angle: Math.PI / 2 },
    ];

    renderer.setAnimationLoop(() => {
      const t = clock.getElapsedTime();

      // Overall slow rotation
      cube.rotation.y = t * 0.3;
      cube.rotation.x = -0.75 + Math.sin(t * 0.4) * 0.15;
      cube.rotation.z = 0.35 + Math.sin(t * 0.3 + 1.2) * 0.1;

      // Solving moves - rotate layers 90 degrees
      const timeSinceMoveStart = t - moveStartTime;
      
      if (timeSinceMoveStart >= moveDuration) {
        // Complete current move
        const prevMove = moves[currentMove];
        const layer = layersRef.current[prevMove.layer];
        
        if (prevMove.axis === 'y' && layer instanceof THREE.Group) {
          layer.rotation.y = prevMove.angle;
        } else if (prevMove.axis === 'x' && Array.isArray(layer)) {
          // Apply X rotation to cubies directly
          layer.forEach(cubie => {
            const origPos = cubiePositions.get(cubie);
            if (origPos) {
              const angle = prevMove.angle;
              const newY = origPos.y * Math.cos(angle) - origPos.z * Math.sin(angle);
              const newZ = origPos.y * Math.sin(angle) + origPos.z * Math.cos(angle);
              cubie.position.y = newY;
              cubie.position.z = newZ;
              cubie.rotation.x = angle;
            }
          });
        } else if (prevMove.axis === 'z' && Array.isArray(layer)) {
          // Apply Z rotation to cubies directly
          layer.forEach(cubie => {
            const origPos = cubiePositions.get(cubie);
            if (origPos) {
              const angle = prevMove.angle;
              const newX = origPos.x * Math.cos(angle) - origPos.y * Math.sin(angle);
              const newY = origPos.x * Math.sin(angle) + origPos.y * Math.cos(angle);
              cubie.position.x = newX;
              cubie.position.y = newY;
              cubie.rotation.z = angle;
            }
          });
        }
        
        // Move to next move
        currentMove = (currentMove + 1) % moves.length;
        moveStartTime = t;
      } else {
        // Animate current move with easing
        const move = moves[currentMove];
        const layer = layersRef.current[move.layer];
        const progress = timeSinceMoveStart / moveDuration;
        const easedProgress = progress < 0.5 
          ? 2 * progress * progress 
          : 1 - Math.pow(-2 * progress + 2, 2) / 2;
        const currentAngle = easedProgress * move.angle;
        
        if (move.axis === 'y' && layer instanceof THREE.Group) {
          layer.rotation.y = currentAngle;
        } else if (move.axis === 'x' && Array.isArray(layer)) {
          layer.forEach(cubie => {
            const origPos = cubiePositions.get(cubie);
            if (origPos) {
              const newY = origPos.y * Math.cos(currentAngle) - origPos.z * Math.sin(currentAngle);
              const newZ = origPos.y * Math.sin(currentAngle) + origPos.z * Math.cos(currentAngle);
              cubie.position.y = newY;
              cubie.position.z = newZ;
              cubie.rotation.x = currentAngle;
            }
          });
        } else if (move.axis === 'z' && Array.isArray(layer)) {
          layer.forEach(cubie => {
            const origPos = cubiePositions.get(cubie);
            if (origPos) {
              const newX = origPos.x * Math.cos(currentAngle) - origPos.y * Math.sin(currentAngle);
              const newY = origPos.x * Math.sin(currentAngle) + origPos.y * Math.cos(currentAngle);
              cubie.position.x = newX;
              cubie.position.y = newY;
              cubie.rotation.z = currentAngle;
            }
          });
        }
      }

      // Subtle float
      rig.position.y = 0.08 + Math.sin(t * 0.55) * 0.03;

      // Update flashlight position based on mouse
      if (spotlightRef.current && lightsRef.current) {
        const mouse = mouseRef.current;
        const mouseDist = Math.sqrt(mouse.x * mouse.x + mouse.y * mouse.y);
        
        // Convert mouse coordinates to 3D world position
        const vector = new THREE.Vector3(mouse.x, mouse.y, 0.3);
        vector.unproject(camera);
        
        const dir = vector.sub(camera.position).normalize();
        const distance = 7; // Distance from camera to light
        const pos = camera.position.clone().add(dir.multiplyScalar(distance));
        
        // Position spotlight at mouse position in 3D space
        spotlightRef.current.position.copy(pos);
        
        // Point spotlight at cube center (rig position) with slight offset based on mouse
        const targetPos = new THREE.Vector3(
          0.9 + mouse.x * 0.5,
          0.08 + mouse.y * 0.3,
          0
        );
        spotlightRef.current.target.position.copy(targetPos);
        spotlightRef.current.target.updateMatrixWorld();
        
        // Increase intensity when mouse is near cube center (flashlight effect)
        const isNearCube = mouseDist < 0.4;
        const intensity = isNearCube ? 20.0 : 12.0; // Much brighter when pointing at cube
        spotlightRef.current.intensity = intensity;
        
        // Dim ambient light when mouse is away (darkness effect)
        const ambientIntensity = isNearCube ? 0.5 : 0.15; // Darker when mouse is away
        lightsRef.current.ambient.intensity = ambientIntensity;
        
        // Also dim other lights slightly when mouse is away
        if (!isNearCube) {
          lightsRef.current.key.intensity = 4.0;
          lightsRef.current.fill.intensity = 2.0;
        } else {
          lightsRef.current.key.intensity = 7.0;
          lightsRef.current.fill.intensity = 3.5;
        }
      }

      renderer.render(scene, camera);
    });

    // Cleanup
    return () => {
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
      renderer.setAnimationLoop(null);
      renderer.dispose();
      scene.clear();
      clockRef.current = null;
      spotlightRef.current = null;
      lightsRef.current = null;
    };
  }, []);

  return (
    <div 
      style={{ 
        position: 'relative', 
        width: '100%', 
        height: '100%', 
        minHeight: '420px',
        cursor: 'none' // Hide default cursor for flashlight effect
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: '50%',
          bottom: '70px',
          width: '520px',
          height: '140px',
          transform: 'translateX(-40%)',
          background: 'radial-gradient(closest-side, rgba(0,0,0,0.55), transparent 70%)',
          filter: 'blur(10px)',
          opacity: 0.9,
          pointerEvents: 'none',
        }}
      />
      <canvas 
        ref={canvasRef} 
        style={{ 
          width: '100%', 
          height: '100%', 
          display: 'block',
          cursor: 'none' // Hide cursor on canvas too
        }} 
      />
    </div>
  );
}
