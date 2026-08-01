import { describe, it, beforeAll, afterAll } from 'vitest';
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'node:fs';
import { doc, setDoc, getDoc } from 'firebase/firestore';

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-hsc-tracker-fcm',
    firestore: { rules: readFileSync('../../firestore.rules', 'utf8') },
  });
});

afterAll(async () => {
  await env.cleanup();
});

describe('users/{uid}/fcmTokens rules', () => {
  it('allows the owner to write their own fcm token', async () => {
    const ctx = env.authenticatedContext('u1');
    await assertSucceeds(
      setDoc(doc(ctx.firestore(), 'users/u1/fcmTokens/abc'), {
        token: 'abc',
        createdAt: new Date(),
      }),
    );
  });

  it('forbids writing another user\'s fcm tokens', async () => {
    const ctx = env.authenticatedContext('u2');
    await assertFails(
      setDoc(doc(ctx.firestore(), 'users/u1/fcmTokens/abc'), {
        token: 'abc',
        createdAt: new Date(),
      }),
    );
  });

  it('allows the owner to read their own fcm tokens', async () => {
    const ctx = env.authenticatedContext('u3');
    await assertSucceeds(
      setDoc(doc(ctx.firestore(), 'users/u3/fcmTokens/x'), { token: 'x' }),
    );
    const ownCtx = env.authenticatedContext('u3');
    await assertSucceeds(getDoc(doc(ownCtx.firestore(), 'users/u3/fcmTokens/x')));
  });
});