import { describe, it, beforeAll, afterAll } from 'vitest';
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'node:fs';
import { doc, setDoc, getDoc, Timestamp } from 'firebase/firestore';

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-hsc-tracker',
    firestore: { rules: readFileSync('../../firestore.rules', 'utf8') },
  });
});

afterAll(async () => {
  await env.cleanup();
});

describe('users/{uid} rules', () => {
  it('allows the owner to create their own doc with whitelisted fields', async () => {
    const ctx = env.authenticatedContext('u1');
    await assertSucceeds(
      setDoc(doc(ctx.firestore(), 'users/u1'), {
        displayName: 'A',
        email: 'a@b.c',
        photoURL: 'https://a.b',
        college: 'X',
        batchId: 'HSC-2026',
        medium: 'bangla',
        timezone: 'Asia/Dhaka',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      }),
    );
  });

  it('forbids the owner writing trialEnd', async () => {
    const ctx = env.authenticatedContext('u2');
    await assertFails(
      setDoc(doc(ctx.firestore(), 'users/u2'), {
        displayName: 'A',
        batchId: 'HSC-2026',
        medium: 'bangla',
        trialEnd: new Date(),
      }),
    );
  });

  it('forbids other users reading your user doc', async () => {
    const ctx = env.authenticatedContext('u3');
    await assertFails(getDoc(doc(ctx.firestore(), 'users/u4')));
  });

  it('forbids clients from writing sessions/{sid}', async () => {
    const ctx = env.authenticatedContext('u5');
    await assertFails(
      setDoc(doc(ctx.firestore(), 'users/u5/sessions/s1'), { durationSec: 60 }),
    );
  });
});
