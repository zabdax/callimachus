import { describe, it, beforeAll, afterAll } from 'vitest';
import {
  initializeTestEnvironment, assertSucceeds, assertFails,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'node:fs';
import { doc, setDoc } from 'firebase/firestore';

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-hsc-tracker',
    firestore: { rules: readFileSync('../../firestore.rules', 'utf8') },
  });
});

afterAll(async () => { await env.cleanup(); });

describe('users/{uid}/activeSession/current rules', () => {
  it('allows the owner to write their own anchor', async () => {
    const ctx = env.authenticatedContext('u1');
    await assertSucceeds(
      setDoc(doc(ctx.firestore(), 'users/u1/activeSession/current'), {
        startTs: 1, pausedAccumMs: 0, serverStartTs: 2, updatedAt: Date.now(),
      }),
    );
  });

  it('forbids other users from writing your anchor', async () => {
    const ctx = env.authenticatedContext('u2');
    await assertFails(
      setDoc(doc(ctx.firestore(), 'users/u1/activeSession/current'), { startTs: 1 }),
    );
  });
});
