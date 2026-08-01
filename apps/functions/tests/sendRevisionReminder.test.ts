import { describe, it, expect, vi } from 'vitest';

const sendMock = vi.fn().mockResolvedValue('msg-id');
const messaging = vi.fn(() => ({ send: sendMock }));
const firestoreGet = vi.fn();

vi.mock('firebase-admin', () => ({
  initializeApp: vi.fn(),
  messaging: (...args: unknown[]) => messaging(...args),
  firestore: () => ({ doc: () => ({ get: firestoreGet, update: vi.fn() }) }),
}));

import { buildRevisionReminder } from '../src/sendRevisionReminder';

describe('sendRevisionReminder (pure builder)', () => {
  it('builds a payload with title, body, and topic=revisions', () => {
    const msg = buildRevisionReminder({ subjectId: 'physics1', chapterName: 'Vectors' });
    expect(msg.topic).toBe('revisions');
    expect(msg.notification.title).toBeTruthy();
    expect(msg.notification.body).toContain('Vectors');
  });

  it('truncates chapter name at 60 chars', () => {
    const long = 'A'.repeat(200);
    const msg = buildRevisionReminder({ subjectId: 'physics1', chapterName: long });
    expect(msg.notification.body.length).toBeLessThan(200);
  });
});