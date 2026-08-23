/** Hand-drawn line icons for the landing — no icon font, no emoji. */
type IconProps = { size?: number; className?: string };

function base(size = 20, className?: string) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.7,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
    'aria-hidden': true,
    focusable: false,
  };
}

/** Four-point star — the brand mark: every finished chapter lights one. */
export function StarMark({ size = 18, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
      <path
        d="M12 1.8 14 10l8.2 2-8.2 2-2 8.2-2-8.2L1.8 12 10 10l2-8.2Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function ShieldCheck(props: IconProps) {
  return (
    <svg {...base(props.size ?? 22, props.className)}>
      <path d="M12 2.7 4.5 5.6v5.6c0 4.6 3.2 8.2 7.5 9.9 4.3-1.7 7.5-5.3 7.5-9.9V5.6L12 2.7Z" />
      <path d="m8.8 11.8 2.3 2.3 4.2-4.4" />
    </svg>
  );
}

export function WifiOff(props: IconProps) {
  return (
    <svg {...base(props.size ?? 22, props.className)}>
      <path d="M2 4.5C5 2.2 8.4 1 12 1s7 1.2 10 3.5" />
      <path d="M5.2 8.4C7.2 6.8 9.5 6 12 6s4.8.8 6.8 2.4" />
      <path d="M8.5 12.3c1-.7 2.2-1.1 3.5-1.1s2.5.4 3.5 1.1" />
      <path d="M12 17.5h.01" />
      <path d="m3 3 18 18" />
    </svg>
  );
}

export function Target(props: IconProps) {
  return (
    <svg {...base(props.size ?? 22, props.className)}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="4.5" />
      <path d="M12 1.5V5M12 19v3.5M1.5 12H5M19 12h3.5" />
    </svg>
  );
}

export function FlameIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
      <path
        d="M12 2.5c.6 3.2-1.4 4.6-2.9 6.2C7.5 10.4 6.4 12 6.4 14.2A5.7 5.7 0 0 0 12 19.9a5.7 5.7 0 0 0 5.6-5.7c0-2-1-3.4-2.1-4.8-.5 1-1.2 1.7-2.2 2.1.5-2.9-.7-6.5-1.3-9Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function ArrowDown({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M12 4v16m0 0 6-6m-6 6-6-6" />
    </svg>
  );
}

/** The official multicolour Google "G". */
export function GoogleG({ size = 18, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className={className} aria-hidden="true" focusable="false">
      <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36a12 12 0 1 1 0-24c3 0 5.9 1.2 8 3l5.7-5.7A20 20 0 1 0 44 24c0-1.3-.1-2.6-.4-3.9Z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8A12 12 0 0 1 24 12c3 0 5.9 1.2 8 3l5.7-5.7A20 20 0 0 0 6.3 14.7Z" />
      <path fill="#4CAF50" d="M24 44a20 20 0 0 0 13.4-5.2l-6.2-5.2A12 12 0 0 1 12.7 29l-6.6 5A20 20 0 0 0 24 44Z" />
      <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3a12 12 0 0 1-4.1 5.6l6.2 5.2C41.4 34.6 44 29.7 44 24c0-1.3-.1-2.6-.4-3.9Z" />
    </svg>
  );
}

/** Pause glyph for the timer mock. */
export function PauseGlyph({ size = 15, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true" focusable="false">
      <rect x="6" y="4" width="4.2" height="16" rx="1.4" />
      <rect x="13.8" y="4" width="4.2" height="16" rx="1.4" />
    </svg>
  );
}
