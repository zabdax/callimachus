import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChapterPicker } from '@/features/timer/ChapterPicker';

const CHAPTERS = [
  { subjectId: 'physics1', subjectName: 'Physics 1st Paper', chapters: ['Vectors', 'Newtonian Mechanics'] },
  { subjectId: 'chem1', subjectName: 'Chemistry 1st Paper', chapters: ['Atomic Structure'] },
];

describe('ChapterPicker', () => {
  it('renders a subject select', () => {
    render(<ChapterPicker value={null} onChange={vi.fn()} subjects={CHAPTERS} />);
    expect(screen.getByRole('combobox', { name: /subject/i })).toBeInTheDocument();
  });

  it('after picking a subject, shows its chapters in a second select', () => {
    render(<ChapterPicker value={null} onChange={vi.fn()} subjects={CHAPTERS} />);
    fireEvent.change(screen.getByRole('combobox', { name: /subject/i }), {
      target: { value: 'physics1' },
    });
    expect(screen.getByRole('combobox', { name: /chapter/i })).toBeInTheDocument();
  });

  it('fires onChange with { subjectId, chapterName } when a chapter is chosen', () => {
    const onChange = vi.fn();
    render(<ChapterPicker value={null} onChange={onChange} subjects={CHAPTERS} />);
    fireEvent.change(screen.getByRole('combobox', { name: /subject/i }), {
      target: { value: 'physics1' },
    });
    fireEvent.change(screen.getByRole('combobox', { name: /chapter/i }), {
      target: { value: 'Vectors' },
    });
    expect(onChange).toHaveBeenCalledWith({ subjectId: 'physics1', chapterName: 'Vectors' });
  });

  it('renders nothing if subjects is empty', () => {
    render(<ChapterPicker value={null} onChange={vi.fn()} subjects={[]} />);
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });
});