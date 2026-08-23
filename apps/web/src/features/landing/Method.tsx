import { useTranslation } from 'react-i18next';
import { ShieldCheck, Target, WifiOff } from './icons';

/** Small glass art panels for the feature rows — abstract, product-true. */

function SessionsArt() {
  const rows: Array<[string, string, boolean]> = [
    ['আজ · ২:৪১', 'Physics · ch 4', true],
    ['গতকাল · ১:৫৫', 'Chemistry · ch 2', true],
    ['২ দিন আগে · ০:৪৭', 'Higher Math · ch 7', true],
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }} aria-hidden="true">
      {rows.map(([time, what]) => (
        <div
          key={time}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14,
            padding: '13px 16px', borderRadius: 14,
            background: 'rgba(125,164,215,0.05)', border: '1px solid rgba(125,164,215,0.1)',
          }}
        >
          <span style={{ fontFamily: 'var(--lpg-font-bn)', fontSize: 14.5, color: '#c9d3e2' }}>{time}</span>
          <span style={{ fontSize: 12.5, color: 'var(--lpg-faint)' }}>{what}</span>
          <span style={{ color: 'var(--lpg-green)', display: 'inline-flex' }}><ShieldCheck size={16} /></span>
        </div>
      ))}
    </div>
  );
}

function OfflineArt() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }} aria-hidden="true">
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '15px 18px', borderRadius: 14,
          background: 'rgba(224,164,88,0.07)', border: '1px solid rgba(224,164,88,0.3)',
          color: 'var(--lpg-amber-hi)', fontSize: 14, fontWeight: 600,
        }}
      >
        <WifiOff size={17} />
        <span lang="bn">লাইন গেছে — টাইমার এখনও চলছে…</span>
      </div>
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '15px 18px', borderRadius: 14,
          background: 'rgba(125,164,215,0.05)', border: '1px solid rgba(125,164,215,0.12)',
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: 8, height: 8, borderRadius: '50%', background: 'var(--lpg-green)',
            boxShadow: '0 0 10px rgba(127,180,142,0.9)', flex: 'none',
          }}
        />
        <span style={{ color: 'var(--lpg-dim)', fontSize: 13.5 }}>
          <span lang="bn">লাইন ফিরেছে</span> · <span style={{ color: 'var(--lpg-text)', fontWeight: 600 }}>session submitted</span>
        </span>
      </div>
      <div style={{ display: 'flex', gap: 8 }} aria-hidden="true">
        {[38, 64, 90, 52, 76].map((h, i) => (
          <span
            key={i}
            style={{
              flex: 1, height: 52, borderRadius: 6,
              background: i % 2 ? 'rgba(107,155,209,0.24)' : 'rgba(224,164,88,0.2)',
            }}
          />
        ))}
      </div>
    </div>
  );
}

function BanglaArt() {
  return (
    <div
      style={{
        display: 'grid', placeItems: 'center', gap: 18, minHeight: 150,
      }}
      aria-hidden="true"
    >
      <span
        lang="bn"
        style={{
          fontFamily: 'var(--lpg-font-bn)', fontSize: 84, fontWeight: 600, lineHeight: 1,
          background: 'linear-gradient(140deg, var(--lpg-iris-hi), var(--lpg-amber))',
          WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
        }}
      >
        অ+আ
      </span>
      <span style={{ display: 'flex', gap: 10 }}>
        <span
          style={{
            padding: '7px 16px', borderRadius: 999, fontSize: 13, fontWeight: 600,
            background: 'rgba(107,155,209,0.16)', border: '1px solid rgba(107,155,209,0.4)', color: 'var(--lpg-iris-hi)',
          }}
        >
          বাংলা
        </span>
        <span
          style={{
            padding: '7px 16px', borderRadius: 999, fontSize: 13, fontWeight: 600,
            background: 'transparent', border: '1px solid rgba(125,164,215,0.16)', color: 'var(--lpg-faint)',
          }}
        >
          English
        </span>
      </span>
    </div>
  );
}

const PASSES: Array<[string, string]> = [
  ['0', 'landing.method.pass0'],
  ['3', 'landing.method.pass1'],
  ['10', 'landing.method.pass2'],
  ['30', 'landing.method.pass3'],
];

export function Method() {
  const { t } = useTranslation();

  const features = [
    { icon: <ShieldCheck size={26} />, title: t('landing.feat1.title'), body: t('landing.feat1.body'), art: <SessionsArt /> },
    { icon: <WifiOff size={26} />, title: t('landing.feat2.title'), body: t('landing.feat2.body'), art: <OfflineArt /> },
    { icon: <Target size={26} />, title: t('landing.feat3.title'), body: t('landing.feat3.body'), art: <BanglaArt /> },
  ];

  return (
    <section className="lpg-method lpg__wrap" id="method">
      <div className="lpg-method__head">
        <div>
          <p className="lpg__eyebrow lpg__eyebrow--amber" data-lpg-reveal>{t('landing.method.eyebrow')}</p>
          <h2 className="lpg-method__title" data-lpg-reveal style={{ ['--lpg-d' as string]: '70ms' }}>
            {t('landing.method.title')}
          </h2>
        </div>
        <div className="lpg-method__body" data-lpg-reveal style={{ ['--lpg-d' as string]: '140ms' }}>
          <p>{t('landing.method.body')}</p>
          <p><strong>{t('landing.method.body2')}</strong></p>
        </div>
      </div>

      <div className="lpg-timeline" role="img" aria-label={t('landing.method.aria')}>
        {PASSES.map(([day, key], index) => (
          <div key={key} data-lpg-reveal style={{ ['--lpg-d' as string]: `${index * 90}ms` }}>
            <div className="lpg-tl-node">
              <span className="lpg-tl-node__dot">{day}</span>
              <span className="lpg-tl-node__label">
                {t('landing.method.day')} {day}
                <b>{t(key)}</b>
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="lpg-features">
        {features.map((feat) => (
          <div key={feat.title} className="lpg-feat">
            <div data-lpg-reveal>
              <span className="lpg-feat__icon">{feat.icon}</span>
              <h3>{feat.title}</h3>
              <p>{feat.body}</p>
            </div>
            <div className="lpg-feat__art" data-lpg-reveal style={{ ['--lpg-d' as string]: '100ms' }}>
              {feat.art}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
