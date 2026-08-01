import { useState } from 'react';

export type SubjectChapters = {
  subjectId: string;
  subjectName: string;
  chapters: string[];
};

export type ChapterPick = {
  subjectId: string;
  chapterName: string;
};

type Props = {
  value: ChapterPick | null;
  onChange: (pick: ChapterPick) => void;
  subjects: SubjectChapters[];
};

/**
 * Subject → chapter dropdown. Used in the timer to tag sessions.
 * Returns null when subjects is empty so the timer hides the picker
 * until syllabus data has loaded.
 */
export function ChapterPicker({ value, onChange, subjects }: Props) {
  const [subjectId, setSubjectId] = useState<string>(
    value?.subjectId ?? subjects[0]?.subjectId ?? '',
  );
  const subject = subjects.find((s) => s.subjectId === subjectId);

  if (subjects.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      <label className="text-sm">
        <span className="sr-only">Subject</span>
        <select
          aria-label="Subject"
          value={subjectId}
          onChange={(e) => setSubjectId(e.target.value)}
          className="rounded-md border border-slate-300 px-2 py-1 text-sm bg-white"
        >
          {subjects.map((s) => (
            <option key={s.subjectId} value={s.subjectId}>
              {s.subjectName}
            </option>
          ))}
        </select>
      </label>
      {subject && (
        <label className="text-sm">
          <span className="sr-only">Chapter</span>
          <select
            aria-label="Chapter"
            defaultValue=""
            onChange={(e) => {
              if (!e.target.value) return;
              onChange({ subjectId, chapterName: e.target.value });
            }}
            className="rounded-md border border-slate-300 px-2 py-1 text-sm bg-white"
          >
            <option value="">Choose chapter</option>
            {subject.chapters.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}