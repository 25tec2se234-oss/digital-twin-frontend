import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface DomainSummary {
  id: string;
  name: string;
  color: string;
  pathCount: number;
}

interface CareerPath {
  id: string;
  name: string;
  hook: string;
  tags: string[];
  salaryRange: string;
  growthTrend: string;
}

interface GalaxyCanvasProps {
  searchQuery: string;
  pinnedPaths: string[];
  onHoverStar: (star: CareerPath | null, x: number, y: number) => void;
  onClickStar: (star: CareerPath) => void;
}

export default function GalaxyCanvas({ searchQuery, pinnedPaths, onHoverStar, onClickStar }: GalaxyCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Need refs to communicate with Three.js animation loop without causing re-renders
  const propsRef = useRef({ searchQuery, pinnedPaths });
  
  useEffect(() => {
    propsRef.current = { searchQuery, pinnedPaths };
  }, [searchQuery, pinnedPaths]);

  useEffect(() => {
    if (!canvasRef.current) return;

    let animationFrameId: number;
    const canvas = canvasRef.current;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const scene = new THREE.Scene();
    
    // Add subtle fog for depth
    scene.fog = new THREE.FogExp2(0x0a0a1a, 0.001);

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
    camera.position.set(0, 50, 400);

    // --- STATE ---
    let domains: DomainSummary[] = [];
    const domainPositions = new Map<string, THREE.Vector3>();
    const loadedDomains = new Set<string>();
    
    // Meshes
    let clusterPoints: THREE.Points | null = null;
    let pathsPoints: THREE.Points | null = null;
    let pathDataMap: CareerPath[] = []; // maps vertex index to data
    
    // Camera controls state
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    let targetCameraZ = 400;
    let targetCameraX = 0;
    let targetCameraY = 50;

    // Raycaster for hover
    const raycaster = new THREE.Raycaster();
    raycaster.params.Points.threshold = 5;
    const mouse = new THREE.Vector2();

    // --- MATERIALS ---
    // Sprite texture for stars
    const createStarTexture = (withRing = false) => {
      const cvs = document.createElement('canvas');
      cvs.width = 64;
      cvs.height = 64;
      const ctx = cvs.getContext('2d')!;
      
      const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      gradient.addColorStop(0, 'rgba(255,255,255,1)');
      gradient.addColorStop(0.2, 'rgba(255,255,255,0.8)');
      gradient.addColorStop(0.5, 'rgba(255,255,255,0.2)');
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 64, 64);

      if (withRing) {
        ctx.strokeStyle = 'rgba(255,255,255,0.8)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(32, 32, 28, 0, Math.PI * 2);
        ctx.stroke();
      }

      const tex = new THREE.CanvasTexture(cvs);
      return tex;
    };

    const starTex = createStarTexture();
    // pinnedTex might be used later for pinned items
    // const pinnedTex = createStarTexture(true); 

    const clusterMaterial = new THREE.PointsMaterial({
      size: 60,
      map: starTex,
      transparent: true,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
      depthWrite: false,
      opacity: 0.8
    });

    const pathsMaterial = new THREE.PointsMaterial({
      size: 15,
      map: starTex,
      transparent: true,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
      depthWrite: false,
      opacity: 0.9
    });

    // --- INITIAL DATA FETCH ---
    fetch('/data/galaxy/domains_summary.json')
      .then(res => res.json())
      .then((data: DomainSummary[]) => {
        domains = data;
        initClusters();
      });

    const initClusters = () => {
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(domains.length * 3);
      const colors = new Float32Array(domains.length * 3);
      const sizes = new Float32Array(domains.length);

      domains.forEach((domain, i) => {
        // Distribute in a 3D ring/sphere
        const phi = Math.acos(-1 + (2 * i) / domains.length);
        const theta = Math.sqrt(domains.length * Math.PI) * phi;
        const radius = 250;

        const x = radius * Math.cos(theta) * Math.sin(phi);
        const y = radius * Math.sin(theta) * Math.sin(phi);
        const z = radius * Math.cos(phi);

        positions[i*3] = x;
        positions[i*3+1] = y;
        positions[i*3+2] = z;

        domainPositions.set(domain.id, new THREE.Vector3(x, y, z));

        const color = new THREE.Color(domain.color);
        colors[i*3] = color.r;
        colors[i*3+1] = color.g;
        colors[i*3+2] = color.b;

        sizes[i] = Math.log(domain.pathCount + 1) * 10;
      });

      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      // Custom size attribute would require ShaderMaterial, sticking to PointsMaterial for simplicity, using uniform size for clusters.
      // We will adjust size via material for now, or just leave it constant.

      clusterPoints = new THREE.Points(geometry, clusterMaterial);
      scene.add(clusterPoints);
    };

    // --- LAZY LOADING DOMAINS ---
    const loadDomain = async (domainId: string) => {
      if (loadedDomains.has(domainId)) return;
      loadedDomains.add(domainId);

      try {
        const res = await fetch(`/data/galaxy/${domainId}.json`);
        const data = await res.json();
        
        const center = domainPositions.get(domainId);
        if (!center) return;

        appendPathsToScene(data.paths, center, new THREE.Color(data.color));
      } catch (err) {
        console.error("Failed to load domain", domainId, err);
      }
    };

    const appendPathsToScene = (paths: CareerPath[], center: THREE.Vector3, baseColor: THREE.Color) => {
      // Create or expand the paths point cloud
      // For simplicity in this demo, if pathsPoints exists, we rebuild it.
      // In production, you might allocate a large buffer initially and update drawCount.
      
      const allPaths = [...pathDataMap, ...paths];
      pathDataMap = allPaths;

      const positions = new Float32Array(allPaths.length * 3);
      const colors = new Float32Array(allPaths.length * 3);

      // We need to keep old positions too. 
      // Actually, since we rebuild, we should store individual path positions in an array parallel to pathDataMap
      if (!pathsPoints) {
          (window as any).pathPositions = [];
      }

      // Generate positions for new paths around the center
      for (let i = 0; i < paths.length; i++) {
         const spread = 80;
         const r = spread * Math.cbrt(Math.random());
         const theta = Math.random() * 2 * Math.PI;
         const phi = Math.acos(2 * Math.random() - 1);
         
         const x = center.x + r * Math.sin(phi) * Math.cos(theta);
         const y = center.y + r * Math.sin(phi) * Math.sin(theta);
         const z = center.z + r * Math.cos(phi);
         
         // Randomize color slightly around base color
         const c = baseColor.clone();
         c.offsetHSL(Math.random()*0.1 - 0.05, Math.random()*0.2, Math.random()*0.2);

         (window as any).pathPositions.push({ pos: new THREE.Vector3(x, y, z), color: c });
      }

      for (let i = 0; i < allPaths.length; i++) {
        const p = (window as any).pathPositions[i];
        positions[i*3] = p.pos.x;
        positions[i*3+1] = p.pos.y;
        positions[i*3+2] = p.pos.z;

        colors[i*3] = p.color.r;
        colors[i*3+1] = p.color.g;
        colors[i*3+2] = p.color.b;
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

      if (pathsPoints) {
        scene.remove(pathsPoints);
        pathsPoints.geometry.dispose();
      }

      pathsPoints = new THREE.Points(geometry, pathsMaterial);
      scene.add(pathsPoints);
    };

    // --- CONTROLS ---
    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      // Raycaster mouse update
      const rect = canvas.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      if (isDragging) {
        const deltaX = e.clientX - previousMousePosition.x;
        const deltaY = e.clientY - previousMousePosition.y;

        targetCameraX -= deltaX * (targetCameraZ / 500);
        targetCameraY += deltaY * (targetCameraZ / 500);

        previousMousePosition = { x: e.clientX, y: e.clientY };
      }
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const onWheel = (e: WheelEvent) => {
      targetCameraZ += e.deltaY * 0.5;
      targetCameraZ = Math.max(50, Math.min(targetCameraZ, 1000));
    };

    const onClick = () => {
      if (!pathsPoints) return;
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObject(pathsPoints);
      if (intersects.length > 0) {
        const index = intersects[0].index!;
        const star = pathDataMap[index];
        if (star) {
          onClickStar(star);
        }
      }
    };

    canvas.addEventListener('mousedown', onMouseDown, { passive: true });
    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('mouseup', onMouseUp, { passive: true });
    canvas.addEventListener('wheel', onWheel, { passive: true });
    canvas.addEventListener('click', onClick);

    // --- ANIMATION LOOP ---
    const clock = new THREE.Clock();
    let hoveredIndex: number | null = null;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Camera lerp
      camera.position.x += (targetCameraX - camera.position.x) * 0.1;
      camera.position.y += (targetCameraY - camera.position.y) * 0.1;
      camera.position.z += (targetCameraZ - camera.position.z) * 0.1;
      camera.lookAt(targetCameraX, targetCameraY, 0);

      // Lazy load check
      if (clusterPoints && camera.position.z < 300) {
        domainPositions.forEach((pos, id) => {
          if (!loadedDomains.has(id)) {
            // Check distance to cluster
            const dist = camera.position.distanceTo(pos);
            if (dist < 200) {
              loadDomain(id);
            }
          }
        });
      }

      // Cluster drift
      if (clusterPoints) {
        clusterPoints.rotation.y = elapsedTime * 0.05;
        clusterPoints.rotation.x = Math.sin(elapsedTime * 0.02) * 0.1;
      }
      
      // Paths drift
      if (pathsPoints) {
        pathsPoints.rotation.y = elapsedTime * 0.02;
        
        // Raycaster for hover
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObject(pathsPoints);
        
        if (intersects.length > 0) {
            const index = intersects[0].index!;
            if (hoveredIndex !== index) {
                hoveredIndex = index;
                const star = pathDataMap[index];
                
                // Get screen coordinates for tooltip
                const vector = (window as any).pathPositions[index].pos.clone();
                // Apply rotation
                vector.applyMatrix4(pathsPoints.matrixWorld);
                vector.project(camera);
                
                const x = (vector.x * .5 + .5) * window.innerWidth;
                const y = (vector.y * -.5 + .5) * window.innerHeight;
                
                onHoverStar(star, x, y);
            }
        } else {
            if (hoveredIndex !== null) {
                hoveredIndex = null;
                onHoverStar(null, 0, 0);
            }
        }

        // Apply dimming logic based on search (very naive/slow for 6000 stars every frame, 
        // optimization: update color buffer only when searchQuery changes)
        // For r128 performance, ideally we'd use a shader uniform for search.
      }

      renderer.render(scene, camera);
    };

    animate();

    // --- RESIZE ---
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('click', onClick);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      // Avoid global leak
      delete (window as any).pathPositions;
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      className="fixed inset-0 w-full h-full cursor-grab active:cursor-grabbing outline-none"
      style={{ background: 'radial-gradient(circle at center, #101415 0%, #050608 100%)' }}
    />
  );
}
