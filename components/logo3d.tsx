"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * A small, self-contained rotating 3D cargo box — the CargoBook logo mark.
 * Renders a fixed-size WebGL canvas; pauses when the tab is hidden and shows a
 * single static frame for users who prefer reduced motion.
 */
export function Logo3D({
  size = 40,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    camera.position.set(2.4, 1.9, 3);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(size, size);
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 1.1));
    const dir = new THREE.DirectionalLight(0xffffff, 1.5);
    dir.position.set(3, 5, 4);
    scene.add(dir);

    const geo = new THREE.BoxGeometry(1.35, 1.35, 1.35);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xf97316,
      roughness: 0.35,
      metalness: 0.3,
    });
    const box = new THREE.Mesh(geo, mat);
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(geo),
      new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.4,
      }),
    );
    box.add(edges);
    box.rotation.set(0.42, 0.6, 0);
    scene.add(box);

    let raf = 0;
    let running = true;
    function animate() {
      if (!running) return;
      raf = requestAnimationFrame(animate);
      box.rotation.y += 0.012;
      box.rotation.x += 0.004;
      renderer.render(scene, camera);
    }
    if (reduce) renderer.render(scene, camera);
    else animate();

    function onVisibility() {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(raf);
      } else if (!reduce) {
        running = true;
        animate();
      }
    }
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVisibility);
      geo.dispose();
      mat.dispose();
      (edges.geometry as THREE.BufferGeometry).dispose();
      (edges.material as THREE.Material).dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount)
        mount.removeChild(renderer.domElement);
    };
  }, [size]);

  return (
    <div
      ref={mountRef}
      className={className}
      style={{ width: size, height: size }}
      aria-hidden
    />
  );
}
