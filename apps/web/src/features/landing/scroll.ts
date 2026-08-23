import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type Lenis from 'lenis';

/** True when the user asked the OS for less motion. Checked live, not cached. */
export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/* ------------------------------------------------------------------ lenis */

let lenis: Lenis | null = null;
let lenisRaf = 0;

/** Start inertia smooth-scroll for the landing route only. No-op for reduced motion. */
export async function initLenis(): Promise<void> {
  if (lenis || prefersReducedMotion()) return;
  const { default: LenisClass } = await import('lenis');
  lenis = new LenisClass({
    duration: 1.15,
    easing: (t: number) => 1 - Math.pow(1 - t, 3),
    wheelMultiplier: 0.95,
  });
  const loop = (time: number) => {
    lenis?.raf(time);
    lenisRaf = requestAnimationFrame(loop);
  };
  lenisRaf = requestAnimationFrame(loop);
}

export function destroyLenis(): void {
  if (lenisRaf) cancelAnimationFrame(lenisRaf);
  lenisRaf = 0;
  lenis?.destroy();
  lenis = null;
}

/** Anchor navigation that rides Lenis when it is running, native smooth otherwise. */
export function scrollToEl(el: HTMLElement): void {
  if (lenis) {
    lenis.scrollTo(el, { offset: -84, duration: 1.35 });
    return;
  }
  el.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
}

/* ------------------------------------------------------------------ hooks */

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false,
  );
  useEffect(() => {
    const mql = window.matchMedia(query);
    setMatches(mql.matches);
    const onChange = (event: MediaQueryListEvent) => setMatches(event.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);
  return matches;
}

/** Adds .is-in to every [data-lpg-reveal] descendant as it enters the viewport. */
export function useLandingReveal(rootRef: RefObject<HTMLElement>): void {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const targets = Array.from(root.querySelectorAll<HTMLElement>('[data-lpg-reveal]'));
    if (!('IntersectionObserver' in window)) {
      for (const el of targets) el.classList.add('is-in');
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-in');
            io.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -7% 0px' },
    );
    for (const el of targets) io.observe(el);
    return () => io.disconnect();
  }, [rootRef]);
}

/**
 * rAF-batched scroll/resize frames. The callback runs at most once per frame
 * with the current window.scrollY — cheap with or without Lenis, since Lenis
 * drives the real scroll position.
 */
export function useRafScroll(onFrame: (scrollY: number) => void): void {
  const cbRef = useRef(onFrame);
  useEffect(() => {
    cbRef.current = onFrame;
  });
  useEffect(() => {
    let raf = 0;
    let queued = false;
    const frame = () => {
      raf = 0;
      queued = false;
      cbRef.current(window.scrollY);
    };
    const kick = () => {
      if (!queued) {
        queued = true;
        raf = requestAnimationFrame(frame);
      }
    };
    kick();
    window.addEventListener('scroll', kick, { passive: true });
    window.addEventListener('resize', kick);
    return () => {
      window.removeEventListener('scroll', kick);
      window.removeEventListener('resize', kick);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);
}

/** Pointer tilt for glass frames — lerped rotateX/rotateY with spring-ish decay. */
export function useTilt(maxDeg = 3.5): RefObject<HTMLDivElement> {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion() || !window.matchMedia('(hover: hover)').matches) return;
    let targetX = 0;
    let targetY = 0;
    let curX = 0;
    let curY = 0;
    let raf = 0;
    const onMove = (event: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const nx = (event.clientX - rect.left) / rect.width - 0.5;
      const ny = (event.clientY - rect.top) / rect.height - 0.5;
      targetY = nx * maxDeg * 2;
      targetX = -ny * maxDeg * 2;
    };
    const onLeave = () => {
      targetX = 0;
      targetY = 0;
    };
    const loop = () => {
      curX += (targetX - curX) * 0.08;
      curY += (targetY - curY) * 0.08;
      el.style.transform = `perspective(1100px) rotateX(${curX.toFixed(3)}deg) rotateY(${curY.toFixed(3)}deg)`;
      raf = requestAnimationFrame(loop);
    };
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);
    raf = requestAnimationFrame(loop);
    return () => {
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
      cancelAnimationFrame(raf);
      el.style.transform = '';
    };
  }, [maxDeg]);
  return ref;
}
