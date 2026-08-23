import { useEffect, useRef } from 'react';
import type { Sprite } from 'three';
import { prefersReducedMotion } from './scroll';

/**
 * The Chapter Constellation — the landing's single signature visual.
 *
 * ~500 stars on a fibonacci sphere with a dim halo shell, constellation
 * lines between near neighbours, and FOUR orbit rings: one per pass over a
 * chapter (first study + revisions 1–3), each carrying a glowing satellite.
 * Drag to rotate, pointer to parallax, scroll to dolly in. Reduced-motion
 * users get a still frame; the scene pauses when hidden or off-screen.
 */
export function Constellation({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const container = canvas.parentElement;
    if (!container) return;

    let disposed = false;
    let cleanup: (() => void) | null = null;

    (async () => {
      const THREE = await import('three');
      if (disposed) return;

      const reduced = prefersReducedMotion();
      const small = container.clientWidth < 640;

      let renderer: InstanceType<typeof THREE.WebGLRenderer>;
      try {
        renderer = new THREE.WebGLRenderer({
          canvas,
          alpha: true,
          antialias: true,
          powerPreference: 'high-performance',
        });
      } catch {
        canvas.style.display = 'none'; // no WebGL — the CSS scene carries the hero
        return;
      }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 60);
      camera.position.set(0, 0.35, 7);

      const world = new THREE.Group();
      scene.add(world);

      /* ---- palette (landing tokens) ---- */
      const cIris = new THREE.Color('#6b9bd1');
      const cIrisHi = new THREE.Color('#9cc3ef');
      const cAmber = new THREE.Color('#e0a458');
      const cAmberHi = new THREE.Color('#f2c287');
      const cGreen = new THREE.Color('#7fb48e');
      const cWhite = new THREE.Color('#e9eef6');

      const tmp = new THREE.Color();

      /* ---- stars: fibonacci sphere ---- */
      const CORE_COUNT = small ? 300 : 480;
      const corePos = new Float32Array(CORE_COUNT * 3);
      const coreCol = new Float32Array(CORE_COUNT * 3);
      const coreSize = new Float32Array(CORE_COUNT);
      const corePhase = new Float32Array(CORE_COUNT);
      const R = 2.05;
      const golden = Math.PI * (3 - Math.sqrt(5));
      for (let i = 0; i < CORE_COUNT; i += 1) {
        const y = 1 - (i / (CORE_COUNT - 1)) * 2;
        const rad = Math.sqrt(Math.max(0, 1 - y * y));
        const theta = golden * i;
        const jitter = 0.97 + Math.random() * 0.06;
        corePos[i * 3] = Math.cos(theta) * rad * R * jitter;
        corePos[i * 3 + 1] = y * R * jitter;
        corePos[i * 3 + 2] = Math.sin(theta) * rad * R * jitter;

        const roll = Math.random();
        if (roll < 0.74) tmp.copy(cIris).lerp(cIrisHi, Math.random());
        else if (roll < 0.88) tmp.copy(cAmber).lerp(cAmberHi, Math.random() * 0.8);
        else if (roll < 0.94) tmp.copy(cGreen);
        else tmp.copy(cWhite);
        coreCol[i * 3] = tmp.r;
        coreCol[i * 3 + 1] = tmp.g;
        coreCol[i * 3 + 2] = tmp.b;

        coreSize[i] = 0.5 + Math.random() * Math.random() * 2.6; // a few bright ones
        corePhase[i] = Math.random();
      }

      const starMaterial = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uTime: { value: 0 },
          uPixelRatio: { value: renderer.getPixelRatio() },
        },
        vertexShader: /* glsl */ `
          attribute float aSize;
          attribute float aPhase;
          attribute vec3 aColor;
          uniform float uTime;
          uniform float uPixelRatio;
          varying float vTwinkle;
          varying vec3 vColor;
          void main() {
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            float tw = 0.72 + 0.28 * sin(uTime * (0.5 + aPhase) + aPhase * 6.2831);
            vTwinkle = tw;
            vColor = aColor;
            gl_PointSize = aSize * uPixelRatio * (150.0 / -mv.z) * (0.75 + 0.25 * tw);
            gl_Position = projectionMatrix * mv;
          }
        `,
        fragmentShader: /* glsl */ `
          varying float vTwinkle;
          varying vec3 vColor;
          void main() {
            float d = length(gl_PointCoord - 0.5);
            float a = smoothstep(0.5, 0.06, d);
            gl_FragColor = vec4(vColor, a * vTwinkle);
          }
        `,
      });
      const coreGeo = new THREE.BufferGeometry();
      coreGeo.setAttribute('position', new THREE.BufferAttribute(corePos, 3));
      coreGeo.setAttribute('aColor', new THREE.BufferAttribute(coreCol, 3));
      coreGeo.setAttribute('aSize', new THREE.BufferAttribute(coreSize, 1));
      coreGeo.setAttribute('aPhase', new THREE.BufferAttribute(corePhase, 1));
      world.add(new THREE.Points(coreGeo, starMaterial));

      /* ---- halo shell ---- */
      const HALO_COUNT = small ? 130 : 240;
      const haloPos = new Float32Array(HALO_COUNT * 3);
      for (let i = 0; i < HALO_COUNT; i += 1) {
        const r = R + 0.5 + Math.random() * 1.5;
        const t = Math.random() * Math.PI * 2;
        const u = Math.random() * 2 - 1;
        const s = Math.sqrt(Math.max(0, 1 - u * u));
        haloPos[i * 3] = Math.cos(t) * s * r;
        haloPos[i * 3 + 1] = u * r;
        haloPos[i * 3 + 2] = Math.sin(t) * s * r;
      }
      const haloGeo = new THREE.BufferGeometry();
      haloGeo.setAttribute('position', new THREE.BufferAttribute(haloPos, 3));
      const haloMat = new THREE.PointsMaterial({
        color: cIris,
        size: 0.028,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.4,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      world.add(new THREE.Points(haloGeo, haloMat));

      /* ---- constellation lines (near neighbours) ---- */
      const disposables: Array<{ dispose: () => void }> = [coreGeo, haloGeo, starMaterial, haloMat];
      if (!small) {
        const segments: number[] = [];
        const maxDist = 0.52;
        const maxSegs = 380;
        // Float32Array reads are undefined-able under noUncheckedIndexedAccess.
        const at = (i: number): number => corePos[i] ?? 0;
        for (let i = 0; i < CORE_COUNT && segments.length < maxSegs * 6; i += 1) {
          for (let j = i + 1; j < Math.min(CORE_COUNT, i + 26); j += 1) {
            const dx = at(i * 3) - at(j * 3);
            const dy = at(i * 3 + 1) - at(j * 3 + 1);
            const dz = at(i * 3 + 2) - at(j * 3 + 2);
            if (dx * dx + dy * dy + dz * dz < maxDist * maxDist) {
              segments.push(at(i * 3), at(i * 3 + 1), at(i * 3 + 2),
                at(j * 3), at(j * 3 + 1), at(j * 3 + 2));
            }
          }
        }
        const lineGeo = new THREE.BufferGeometry();
        lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(segments, 3));
        const lineMat = new THREE.LineBasicMaterial({
          color: cIris,
          transparent: true,
          opacity: 0.11,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        world.add(new THREE.LineSegments(lineGeo, lineMat));
        disposables.push(lineGeo, lineMat);
      }

      /* ---- soft glow sprites ---- */
      const makeGlowTexture = () => {
        const cnv = document.createElement('canvas');
        cnv.width = 128;
        cnv.height = 128;
        const ctx = cnv.getContext('2d');
        if (ctx) {
          const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
          grad.addColorStop(0, 'rgba(255,255,255,1)');
          grad.addColorStop(0.35, 'rgba(255,255,255,0.35)');
          grad.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, 128, 128);
        }
        const tex = new THREE.CanvasTexture(cnv);
        disposables.push(tex);
        return tex;
      };
      const glowTex = makeGlowTexture();

      const centerGlow = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: glowTex,
          color: cIris,
          transparent: true,
          opacity: 0.34,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      );
      centerGlow.scale.setScalar(3.1);
      world.add(centerGlow);
      disposables.push(centerGlow.material);

      const emberGlow = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: glowTex,
          color: cAmber,
          transparent: true,
          opacity: 0.2,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      );
      emberGlow.scale.setScalar(1.5);
      emberGlow.position.set(1.35, -0.9, -0.8);
      world.add(emberGlow);
      disposables.push(emberGlow.material);

      /* ---- four orbit rings: study + revision 1·2·3 ---- */
      const RING_RADII = [1.28, 1.62, 1.96, 2.3];
      const satellites: Array<{ mesh: Sprite; radius: number; speed: number; angle: number }> = [];
      RING_RADII.forEach((radius, index) => {
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(radius, 0.0055, 8, 180),
          new THREE.MeshBasicMaterial({
            color: index === 3 ? cAmber : cIris,
            transparent: true,
            opacity: index === 3 ? 0.3 : 0.2,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          }),
        );
        ring.rotation.x = Math.PI / 2 + 0.34 + index * 0.09;
        ring.rotation.y = (index - 1.5) * 0.14;
        world.add(ring);
        disposables.push(ring.geometry, ring.material);

        const satellite = new THREE.Sprite(
          new THREE.SpriteMaterial({
            map: glowTex,
            color: index === 3 ? cAmberHi : cIrisHi,
            transparent: true,
            opacity: 0.95,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          }),
        );
        satellite.scale.setScalar(0.2 + (index === 0 ? 0.06 : 0));
        ring.add(satellite); // torus lies in its own XY plane → satellite orbits with the tilt
        disposables.push(satellite.material);
        satellites.push({ mesh: satellite, radius, speed: 0.55 - index * 0.09, angle: index * 1.7 });
      });

      /* ---- sizing (canvas is CSS-sized at 116% of its stage) ---- */
      const setSize = () => {
        const w = canvas.clientWidth || 1;
        const h = canvas.clientHeight || 1;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      };
      setSize();
      const ro = new ResizeObserver(setSize);
      ro.observe(canvas);

      /* ---- input: pointer parallax + drag ---- */
      let targetRotX = 0;
      let targetRotY = 0;
      let dragging = false;
      let lastX = 0;
      let lastY = 0;
      const onPointerMove = (event: PointerEvent) => {
        if (dragging) {
          targetRotY += (event.clientX - lastX) * 0.0045;
          targetRotX = Math.max(-0.9, Math.min(0.9, targetRotX + (event.clientY - lastY) * 0.0028));
          lastX = event.clientX;
          lastY = event.clientY;
          return;
        }
        const rect = container.getBoundingClientRect();
        const nx = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
        const ny = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
        targetRotY = nx * 0.22;
        targetRotX = ny * 0.14;
      };
      const onPointerDown = (event: PointerEvent) => {
        dragging = true;
        lastX = event.clientX;
        lastY = event.clientY;
      };
      const onPointerUp = () => {
        dragging = false;
      };
      if (!reduced) {
        window.addEventListener('pointermove', onPointerMove, { passive: true });
        canvas.addEventListener('pointerdown', onPointerDown);
        window.addEventListener('pointerup', onPointerUp);
      }

      /* ---- visibility gating ---- */
      let inView = true;
      const io = new IntersectionObserver((entries) => {
        inView = entries[0]?.isIntersecting ?? true;
      });
      io.observe(container);
      const onVisibility = () => {
        hidden = document.hidden;
      };
      let hidden = document.hidden;
      document.addEventListener('visibilitychange', onVisibility);

      /* ---- loop ---- */
      const clock = new THREE.Clock();
      let raf = 0;
      const baseZ = camera.position.z;

      const renderFrame = () => {
        const dt = Math.min(clock.getDelta(), 0.05);
        const t = clock.elapsedTime;

        world.rotation.y += dt * 0.055;
        world.rotation.x += (targetRotX - world.rotation.x) * 0.045;
        world.rotation.z += (targetRotY * 0.2 - world.rotation.z) * 0.03;
        world.position.y = Math.sin(t * 0.4) * 0.04;

        // scroll dolly: as the hero leaves, the camera leans in
        const rect = container.getBoundingClientRect();
        const p = Math.max(0, Math.min(1, -rect.top / Math.max(1, window.innerHeight)));
        camera.position.z = baseZ - p * 1.15;
        camera.position.y = 0.35 + p * 0.22;

        for (const sat of satellites) {
          sat.angle += dt * sat.speed;
          sat.mesh.position.set(Math.cos(sat.angle) * sat.radius, Math.sin(sat.angle) * sat.radius, 0);
        }

        starMaterial.uniforms.uTime!.value = t;
        renderer.render(scene, camera);
      };

      if (reduced) {
        renderFrame(); // one still frame — the metaphor without the motion
      } else {
        const loop = () => {
          raf = requestAnimationFrame(loop);
          if (!hidden && inView && !document.hidden) renderFrame();
        };
        raf = requestAnimationFrame(loop);
      }

      cleanup = () => {
        cancelAnimationFrame(raf);
        ro.disconnect();
        io.disconnect();
        document.removeEventListener('visibilitychange', onVisibility);
        if (!reduced) {
          window.removeEventListener('pointermove', onPointerMove);
          canvas.removeEventListener('pointerdown', onPointerDown);
          window.removeEventListener('pointerup', onPointerUp);
        }
        for (const item of disposables) item.dispose();
        renderer.dispose();
      };
    })();

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      aria-hidden="true"
      role="presentation"
    />
  );
}
