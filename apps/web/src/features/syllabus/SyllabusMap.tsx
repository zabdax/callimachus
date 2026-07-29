import { useTranslation } from 'react-i18next';
import { useSyllabus } from './useSyllabus';
import { subjectCompletion } from './subjectCompletion';
import type { Stage } from './nextTypeFor';

const STAGES: Stage[] = ['firstStudy', 'firstRevision', 'secondRevision', 'thirdRevision'];

export function SyllabusMap({ uid, medium }: { uid: string; medium: 'bangla' | 'english' }) {
  const { t } = useTranslation();
  const { subjects, chapters, loading, toggle } = useSyllabus(uid, medium);

  if (loading) return <p>{t('common.loading')}</p>;

  return (
    <section className="space-y-6 p-4 text-text">
      {subjects.map((s) => {
        const cm = chapters[s.subjectId] ?? {};
        const pct = subjectCompletion(cm);
        return (
          <article
            key={s.subjectId}
            className="rounded-lg border border-surface-2 bg-surface p-3"
          >
            <header className="flex items-baseline justify-between">
              <h2 className="font-display text-lg">{s.subjectName}</h2>
              <span className="text-text-dim text-sm">
                {t('syllabus.completion', { pct: pct.firstStudy })}
              </span>
            </header>
            <ul className="divide-y divide-surface-2">
              {s.chapters.map((c) => {
                const ch = cm[c.id] ?? {
                  firstStudy: false,
                  firstRevision: false,
                  secondRevision: false,
                  thirdRevision: false,
                };
                return (
                  <li key={c.id} className="flex items-center justify-between py-2">
                    <span>{c.name}</span>
                    <div className="flex gap-3">
                      {STAGES.map((stage) => (
                        <label key={stage} className="flex items-center gap-1 text-sm">
                          <input
                            type="checkbox"
                            checked={!!ch[stage]}
                            aria-label={stage}
                            onChange={() =>
                              void toggle({ subjectId: s.subjectId, chapterId: c.id, stage })
                            }
                          />
                          <span>{t(`syllabus.${stage}`)}</span>
                        </label>
                      ))}
                    </div>
                  </li>
                );
              })}
            </ul>
          </article>
        );
      })}
    </section>
  );
}
