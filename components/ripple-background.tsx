"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * Full-bleed login photo (public/login-bg.webp) rendered on a WebGL quad with a
 * water-like ripple that follows the pointer. Moving the mouse drops expanding
 * rings that distort the image, giving a gentle "liquid ocean" feel. Purely
 * decorative — it replaces the plain background <div> and falls back to a single
 * static frame for users who prefer reduced motion.
 */
export function RippleBackground({ src = "/login-bg.webp" }: { src?: string }) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    // How many recent pointer positions ripple at once. A small ring buffer of
    // "drops" is cheaper and steadier than a full fluid simulation, but still
    // reads as trailing water.
    const MAX_RIPPLES = 12;
    const positions = new Float32Array(MAX_RIPPLES * 2); // uv (0..1) per ripple
    const startTimes = new Float32Array(MAX_RIPPLES).fill(-100); // seconds
    let nextRipple = 0;

    const scene = new THREE.Scene();
    // A fullscreen quad only needs a trivial orthographic camera.
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    const texture = new THREE.TextureLoader().load(src, (t) => {
      uniforms.uImageAspect.value = t.image.width / t.image.height;
    });
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;

    const uniforms = {
      uTexture: { value: texture },
      uTime: { value: 0 },
      uScreenAspect: { value: mount.clientWidth / mount.clientHeight },
      uImageAspect: { value: 1 },
      uRipples: { value: positions },
      uRippleTimes: { value: startTimes },
      // Tunables — nudge these to taste.
      uAmplitude: { value: 0.018 }, // how far the image is pushed around
      uFrequency: { value: 34.0 }, // number of concentric wave crests
      uSpeed: { value: 0.55 }, // how fast each ring expands
    };

    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        precision highp float;
        varying vec2 vUv;

        #define MAX_RIPPLES ${MAX_RIPPLES}

        uniform sampler2D uTexture;
        uniform float uTime;
        uniform float uScreenAspect;
        uniform float uImageAspect;
        uniform vec2 uRipples[MAX_RIPPLES];
        uniform float uRippleTimes[MAX_RIPPLES];
        uniform float uAmplitude;
        uniform float uFrequency;
        uniform float uSpeed;

        // Map uv so the photo behaves like CSS background-size: cover.
        vec2 coverUv(vec2 uv) {
          vec2 c = uv - 0.5;
          if (uScreenAspect < uImageAspect) {
            c.x *= uScreenAspect / uImageAspect;
          } else {
            c.y *= uImageAspect / uScreenAspect;
          }
          return c + 0.5;
        }

        void main() {
          vec2 offset = vec2(0.0);

          for (int i = 0; i < MAX_RIPPLES; i++) {
            float age = uTime - uRippleTimes[i];
            if (age < 0.0 || age > 2.6) continue;

            // Aspect-correct so the rings stay circular on a wide screen.
            vec2 diff = (vUv - uRipples[i]) * vec2(uScreenAspect, 1.0);
            float dist = length(diff);
            float ring = age * uSpeed; // radius of the expanding crest

            float wave = sin((dist - ring) * uFrequency);
            // Fade with age, with distance from the crest, and near the centre.
            float envelope =
              exp(-age * 1.7) *
              exp(-abs(dist - ring) * 11.0) *
              smoothstep(0.0, 0.04, dist);

            offset += normalize(diff + 1e-5) * wave * envelope * uAmplitude;
          }

          vec4 color = texture2D(uTexture, coverUv(vUv + offset));
          // A faint highlight along the wave slope sells the "wet" look.
          color.rgb += length(offset) * 6.0 * 0.12;
          gl_FragColor = color;
        }
      `,
    });

    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    scene.add(quad);

    function addRipple(clientX: number, clientY: number) {
      const rect = renderer.domElement.getBoundingClientRect();
      // uv origin is bottom-left, so flip Y from screen space.
      const u = (clientX - rect.left) / rect.width;
      const v = 1 - (clientY - rect.top) / rect.height;
      if (u < 0 || u > 1 || v < 0 || v > 1) return;
      positions[nextRipple * 2] = u;
      positions[nextRipple * 2 + 1] = v;
      startTimes[nextRipple] = clock.getElapsedTime();
      nextRipple = (nextRipple + 1) % MAX_RIPPLES;
    }

    // Throttle so a fast mouse doesn't burn the whole ring buffer instantly.
    let lastDrop = 0;
    function onPointerMove(e: PointerEvent) {
      const now = clock.getElapsedTime();
      if (now - lastDrop < 0.045) return;
      lastDrop = now;
      addRipple(e.clientX, e.clientY);
    }
    if (!reduceMotion) window.addEventListener("pointermove", onPointerMove);

    function onResize() {
      if (!mount) return;
      renderer.setSize(mount.clientWidth, mount.clientHeight);
      uniforms.uScreenAspect.value = mount.clientWidth / mount.clientHeight;
    }
    window.addEventListener("resize", onResize);

    const clock = new THREE.Clock();
    let raf = 0;
    let running = true;

    function animate() {
      if (!running) return;
      raf = requestAnimationFrame(animate);
      uniforms.uTime.value = clock.getElapsedTime();
      renderer.render(scene, camera);
    }

    if (reduceMotion) {
      renderer.render(scene, camera); // one static frame, no ripples
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
      texture.dispose();
      material.dispose();
      quad.geometry.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount)
        mount.removeChild(renderer.domElement);
    };
  }, [src]);

  return <div ref={mountRef} className="absolute inset-0 h-full w-full" aria-hidden />;
}
