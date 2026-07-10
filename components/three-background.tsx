"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * Ambient WebGL backdrop for the login screen: a field of shipping containers
 * drifting slowly through space with soft lighting and gentle mouse parallax.
 * Purely decorative — it sits behind the page content and is skipped entirely
 * for users who prefer reduced motion.
 */
export function ThreeBackground() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      55,
      mount.clientWidth / mount.clientHeight,
      0.1,
      100,
    );
    camera.position.z = 16;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    mount.appendChild(renderer.domElement);

    // Lighting — a bright neutral key plus a violet fill for depth.
    scene.add(new THREE.AmbientLight(0x9aa8d8, 0.9));
    const key = new THREE.DirectionalLight(0xffffff, 1.1);
    key.position.set(6, 8, 10);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0x8b5cf6, 0.7);
    fill.position.set(-8, -4, 6);
    scene.add(fill);

    // Container colours echo the pastel 3D shapes of the reference art
    // (periwinkles, violets, sky blues, with a coral and a pink accent).
    const palette = [0x818cf8, 0xa78bfa, 0x60a5fa, 0xfb7185, 0xc4b5fd, 0x38bdf8, 0xf9a8d4];
    const geometry = new THREE.BoxGeometry(2.2, 1, 1);

    const group = new THREE.Group();
    const count = reduceMotion ? 14 : 34;
    type Box = {
      mesh: THREE.Mesh;
      speed: number;
      rot: THREE.Vector3;
      floatPhase: number;
    };
    const boxes: Box[] = [];

    for (let i = 0; i < count; i++) {
      const material = new THREE.MeshStandardMaterial({
        color: palette[i % palette.length],
        roughness: 0.55,
        metalness: 0.25,
        transparent: true,
        opacity: 0.9,
      });
      const mesh = new THREE.Mesh(geometry, material);
      const scale = 0.5 + Math.random() * 1.1;
      mesh.scale.setScalar(scale);
      mesh.position.set(
        (Math.random() - 0.5) * 34,
        (Math.random() - 0.5) * 26,
        (Math.random() - 0.5) * 20 - 4,
      );
      mesh.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI,
      );
      group.add(mesh);
      boxes.push({
        mesh,
        speed: 0.006 + Math.random() * 0.012,
        rot: new THREE.Vector3(
          (Math.random() - 0.5) * 0.004,
          (Math.random() - 0.5) * 0.004,
          (Math.random() - 0.5) * 0.004,
        ),
        floatPhase: Math.random() * Math.PI * 2,
      });
    }
    scene.add(group);

    // Mouse parallax — the whole field leans toward the pointer.
    const target = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };
    function onPointerMove(e: PointerEvent) {
      target.x = (e.clientX / window.innerWidth - 0.5) * 0.5;
      target.y = (e.clientY / window.innerHeight - 0.5) * 0.5;
    }
    if (!reduceMotion) window.addEventListener("pointermove", onPointerMove);

    function onResize() {
      if (!mount) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    }
    window.addEventListener("resize", onResize);

    let raf = 0;
    let running = true;
    const clock = new THREE.Clock();

    function animate() {
      if (!running) return;
      raf = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      for (const b of boxes) {
        // Drift upward and wrap back to the bottom for an endless flow.
        b.mesh.position.y += b.speed;
        if (b.mesh.position.y > 14) b.mesh.position.y = -14;
        b.mesh.position.x += Math.sin(t * 0.3 + b.floatPhase) * 0.0015;
        b.mesh.rotation.x += b.rot.x;
        b.mesh.rotation.y += b.rot.y;
        b.mesh.rotation.z += b.rot.z;
      }

      current.x += (target.x - current.x) * 0.04;
      current.y += (target.y - current.y) * 0.04;
      group.rotation.y = current.x;
      group.rotation.x = current.y;

      renderer.render(scene, camera);
    }

    if (reduceMotion) {
      renderer.render(scene, camera); // single static frame
    } else {
      animate();
    }

    // Pause when the tab is hidden to save the battery.
    function onVisibility() {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(raf);
      } else if (!reduceMotion) {
        running = true;
        animate();
      }
    }
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
      geometry.dispose();
      boxes.forEach((b) => (b.mesh.material as THREE.Material).dispose());
      renderer.dispose();
      if (renderer.domElement.parentNode === mount)
        mount.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="absolute inset-0 h-full w-full"
      aria-hidden
    />
  );
}
