import { useEffect, useState } from 'react';
import { FlameIcon, PauseGlyph, ShieldCheck } from './icons';

/**
 * DOM mockups of the real app UI (dark Cool-Slate tokens) used inside the
 * walkthrough frames — the product is the photography. Chapter names come
 * from the actual Bangla-medium syllabus seed.
 */

/* ----------------------------------------------------------------- timer */

const RING_R = 88;
const RING_C = 2 * Math.PI * RING_R;

function useTickingSeconds(from: number): number {
  const [s, setS] = useState(from);
  useEffect(() => {
    const id = window.setInterval(() => setS((v) => v + 1), 1000);
    return () => window.clearInterval(id);
  }, []);
  return s;
}

export function TimerMock() {
  const total = useTickingSeconds(47 * 60 + 23);
  const mm = String(Math.floor(total / 60)).padStart(2, '0');
  const ss = String(total % 60).padStart(2, '0');
  const progress = Math.min(1, (total % 3600) / 3600);
  return (
    <div className="lpg-mock lpg-tm">
      <span className="lpg-chip" lang="bn">পদার্থবিজ্ঞান · নিউটনের গতিসূত্র</span>
      <div className="lpg-tm__ring">
        <svg viewBox="0 0 200 200" aria-hidden="true">
          <circle cx="100" cy="100" r={RING_R} stroke="rgba(125,164,215,0.14)" strokeWidth="7" fill="none" />
          <circle
            cx="100" cy="100" r={RING_R}
            stroke="url(#lpg-tm-grad)" strokeWidth="7" fill="none" strokeLinecap="round"
            strokeDasharray={`${RING_C * progress} ${RING_C}`}
            style={{ transition: 'stroke-dasharray 1s linear' }}
          />
          <defs>
            <linearGradient id="lpg-tm-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#9cc3ef" />
              <stop offset="100%" stopColor="#6b9bd1" />
            </linearGradient>
          </defs>
        </svg>
        <div className="lpg-tm__digits">
          <span className="lpg-tm__time">{mm}:{ss}</span>
          <span className="lpg-tm__paused">focusing</span>
        </div>
      </div>
      <div className="lpg-tm__actions">
        <span className="lpg-mock__btn"><PauseGlyph /> Pause</span>
        <span className="lpg-mock__btn lpg-mock__btn--danger">Finish &amp; save</span>
      </div>
      <p className="lpg-tm__verify">
        <ShieldCheck size={14} /> server-verified · counts toward leaderboard
      </p>
    </div>
  );
}

/* --------------------------------------------------------------- syllabus */

/** [name, study, rev1, rev2, rev3] — lit stages per chapter. */
const CHAPTERS: Array<[string, number, boolean]> = [
  ['ভৌত জগত ও পরিমাপ', 4, false],
  ['স্কেলার ও ভেক্টর', 3, false],
  ['গতি', 2, true],
  ['নিউটনের গতিসূত্র', 1, false],
  ['কাজ, ক্ষমতা ও শক্তি', 1, false],
  ['মহাকর্ষ ও অভিকর্ষ', 0, false],
];

export function SyllabusMock() {
  return (
    <div className="lpg-mock lpg-syl">
      <div className="lpg-mock__row">
        <h4 style={{ fontFamily: 'var(--lpg-font-bn)', fontWeight: 600, fontSize: 15 }}>
          পদার্থবিজ্ঞান ১ম পত্র
        </h4>
        <span className="lpg-syl__pct">১০/১৬ · ৬৪%</span>
      </div>
      <div className="lpg-syl__bar" aria-hidden="true"><i /></div>
      <div className="lpg-syl__list" role="img" aria-label="Syllabus map with chapter completion stages">
        {CHAPTERS.map(([name, lit, isNext]) => (
          <div className={`lpg-syl__ch${isNext ? ' is-next' : ''}`} key={name}>
            <span className="lpg-syl__name">{name}</span>
            <span className="lpg-syl__stages" aria-hidden="true">
              {[0, 1, 2, 3].map((i) => (
                <i
                  key={i}
                  className={[
                    i < lit ? (i === 0 ? 'on' : 'rev') : '',
                    isNext && i === lit ? 'pulse' : '',
                  ].filter(Boolean).join(' ')}
                />
              ))}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ pace */

export function PaceMock() {
  const pct = 68;
  const r = 54;
  const c = 2 * Math.PI * r;
  return (
    <div className="lpg-mock lpg-pace" role="img" aria-label="Pace forecast, exam countdown, streak and rank">
      <div className="lpg-pace__ring">
        <svg viewBox="0 0 128 128" aria-hidden="true">
          <circle cx="64" cy="64" r={r} stroke="rgba(125,164,215,0.13)" strokeWidth="9" fill="none" />
          <circle
            cx="64" cy="64" r={r}
            stroke="url(#lpg-pace-grad)" strokeWidth="9" fill="none" strokeLinecap="round"
            strokeDasharray={`${(c * pct) / 100} ${c}`}
          />
          <defs>
            <linearGradient id="lpg-pace-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#6b9bd1" />
              <stop offset="100%" stopColor="#e0a458" />
            </linearGradient>
          </defs>
        </svg>
        <div className="lpg-pace__pct">
          <b>{pct}%</b>
          <span>on pace</span>
        </div>
      </div>
      <div className="lpg-pace__side">
        <p className="lpg-pace__countdown" lang="bn">এইচএসসি ২০২৭ · আর <b>২৪৮ দিন</b></p>
        <div className="lpg-pace__stat"><em lang="bn">আজকের পড়া</em><b>2h 41m</b></div>
        <div className="lpg-pace__stat">
          <em lang="bn">স্ট্রিক</em>
          <b className="lpg-flame"><FlameIcon /> 17</b>
        </div>
        <div className="lpg-pace__stat"><em lang="bn">দৈনিক র‍্যাঙ্ক</em><b>#3</b></div>
        <div className="lpg-pace__bars" aria-hidden="true">
          <i style={{ height: '38%' }} /><i style={{ height: '58%' }} />
          <i className="hot" style={{ height: '86%' }} /><i style={{ height: '70%' }} />
          <i className="hot" style={{ height: '100%' }} /><i style={{ height: '62%' }} />
          <i style={{ height: '47%' }} />
        </div>
      </div>
    </div>
  );
}
