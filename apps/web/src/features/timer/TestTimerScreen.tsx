import { TimerUI } from './TimerUI';

/**
 * Dev-only screen mounted at `/__test/timer` to allow Playwright
 * to drive the timer without a real Google sign-in.
 *
 * The mock uid is read from VITE_E2E_UID. It is a *configurable* dev
 * value so that e2e suites can pin the uid they need.
 */
export function TestTimerScreen() {
  const uid = import.meta.env.VITE_E2E_UID ?? 'e2e-mock-uid';
  return (
    <div data-testid="test-timer-screen" className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Dev Timer</h1>
      <p className="text-sm text-slate-500 mb-4">
        Mock uid: <code>{uid}</code>
      </p>
      <TimerUI uid={uid} />
    </div>
  );
}
