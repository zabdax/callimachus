import { LanguageSwitcher } from './LanguageSwitcher';

export function SettingsScreen() {
  return (
    <main className="max-w-xl mx-auto p-4">
      <h1 className="text-2xl font-semibold mb-4">Settings</h1>
      <section className="rounded-lg border border-slate-200 p-4 bg-white">
        <LanguageSwitcher />
      </section>
    </main>
  );
}