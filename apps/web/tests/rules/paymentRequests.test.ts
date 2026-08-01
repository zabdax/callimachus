import { describe, it, beforeAll, afterAll } from 'vitest';
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'node:fs';
import { doc, setDoc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-hsc-tracker-payment',
    firestore: { rules: readFileSync('../../firestore.rules', 'utf8') },
  });
});

afterAll(async () => {
  await env.cleanup();
});

describe('paymentRequests rules', () => {
  it('allows the owner to create their own paymentRequest', async () => {
    const ctx = env.authenticatedContext('u1');
    await assertSucceeds(
      setDoc(doc(ctx.firestore(), 'paymentRequests/req1'), {
        uid: 'u1',
        planId: '3m',
        trxId: 'TXN1',
        status: 'pending',
        storagePath: 'paymentRequests/u1/abc.png',
      }),
    );
  });

  it('forbids create when uid does not match the requester', async () => {
    const ctx = env.authenticatedContext('u2');
    await assertFails(
      setDoc(doc(ctx.firestore(), 'paymentRequests/req2'), {
        uid: 'u1',
        planId: '3m',
      }),
    );
  });

  it('forbids clients from updating a paymentRequest (admins use a Cloud Function)', async () => {
    const ctx = env.authenticatedContext('u3');
    await assertFails(
      updateDoc(doc(ctx.firestore(), 'paymentRequests/req3'), { status: 'approved' }),
    );
  });

  it('forbids clients from deleting a paymentRequest', async () => {
    const ctx = env.authenticatedContext('u4');
    await assertFails(deleteDoc(doc(ctx.firestore(), 'paymentRequests/req4')));
  });

  it('forbids reading another user\'s paymentRequest', async () => {
    const ctx = env.authenticatedContext('u5');
    await assertFails(getDoc(doc(ctx.firestore(), 'paymentRequests/someone-elses')));
  });
});