import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { httpsCallable, getFunctions } from 'firebase/functions';
import { app } from '@/lib/firebase/client';
import { Button } from '@/components/ui/Button';
import { BATCH_SEED } from '@/features/batches/seedData';

const Schema = z.object({
  medium: z.enum(['bangla', 'english']),
  batchId: z.string().min(1),
  college: z.string().min(1).max(80),
});
export type FormData = z.infer<typeof Schema>;

export function OnboardingForm({ uid, onDone }: { uid: string; onDone: (v: FormData) => void }) {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(Schema),
    defaultValues: { medium: 'bangla', batchId: 'HSC-2026', college: '' },
  });

  const submit = handleSubmit(async (data) => {
    const payload = { ...data, displayName: '' };
    const fn = httpsCallable<typeof payload, { ok: boolean }>(getFunctions(app), 'onboardingProfile');
    await fn(payload);
    onDone(payload);
  });

  return (
    <form onSubmit={submit} className="mx-auto max-w-md space-y-4 p-4 text-text">
      {step === 0 && (
        <fieldset>
          <legend className="mb-2 font-display">{t('onboarding.step1.title')}</legend>
          <label className="block">
            <input
              type="radio"
              value="bangla"
              {...register('medium')}
              onChange={() => setValue('medium', 'bangla')}
            />{' '}
            {t('onboarding.step1.bangla')}
          </label>
          <label className="block">
            <input
              type="radio"
              value="english"
              {...register('medium')}
              onChange={() => setValue('medium', 'english')}
            />{' '}
            {t('onboarding.step1.english')}
          </label>
          <Button type="button" onClick={() => setStep(1)}>
            {t('onboarding.next')}
          </Button>
        </fieldset>
      )}
      {step === 1 && (
        <fieldset>
          <legend className="mb-2 font-display">{t('onboarding.step2.title')}</legend>
          <select
            {...register('batchId')}
            onChange={(e) => setValue('batchId', e.target.value)}
            className="rounded border p-2"
          >
            {BATCH_SEED.map((b) => (
              <option key={b.id} value={b.id}>
                {b.label}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={() => setStep(0)}>
              {t('onboarding.back')}
            </Button>
            <Button type="button" onClick={() => setStep(2)}>
              {t('onboarding.next')}
            </Button>
          </div>
        </fieldset>
      )}
      {step === 2 && (
        <fieldset>
          <legend className="mb-2 font-display">{t('onboarding.step3.title')}</legend>
          <input
            aria-label="college"
            {...register('college')}
            className="w-full rounded border p-2"
          />
          {errors.college && <p className="text-danger">{errors.college.message}</p>}
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={() => setStep(1)}>
              {t('onboarding.back')}
            </Button>
            <Button type="submit">{t('onboarding.finish')}</Button>
          </div>
        </fieldset>
      )}
      <p className="text-text-dim">uid: {uid}</p>
    </form>
  );
}
