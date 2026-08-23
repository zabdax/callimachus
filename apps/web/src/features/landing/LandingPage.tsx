import { useEffect, useRef } from 'react';
import { Nav } from './Nav';
import { Hero } from './Hero';
import { Marquee } from './Marquee';
import { Walkthrough } from './Walkthrough';
import { Method } from './Method';
import { Pricing } from './Pricing';
import { Closing } from './Closing';
import { destroyLenis, initLenis, useLandingReveal } from './scroll';
import './landing.css';

/**
 * /welcome — the marketing landing. Owns its design system (.lpg scope),
 * its smooth-scroll instance, and its reveal lifecycle; nothing leaks into
 * the authed app.
 */
export function LandingPage() {
  const rootRef = useRef<HTMLElement>(null);
  useLandingReveal(rootRef);

  useEffect(() => {
    void initLenis();
    return () => destroyLenis();
  }, []);

  return (
    <main className="lpg" ref={rootRef}>
      <Nav />
      <Hero />
      <Marquee />
      <Walkthrough />
      <Method />
      <Pricing />
      <Closing />
    </main>
  );
}
