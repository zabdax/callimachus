import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';
import { app } from '@/lib/firebase/client';
import { Button } from '@/components/ui/Button';
import { BATCH_SEED } from '@/features/batches/seedData';
const Schema = z.object({ medium: z.enum(['bangla', 'english']), batchId: z.string().min(1), college: z.string().trim().min(1).max(80) });
export type FormData = z.infer<typeof Schema>;
export function OnboardingForm({ uid, onDone }: { uid: string; onDone: (value: FormData) => void }) {
  const { t } = useTranslation(); const [step, setStep] = useState(0); const [submitError, setSubmitError] = useState<string | null>(null);
  const { register, handleSubmit, setValue, trigger, formState: { errors, isSubmitting } } = useForm<FormData>({ resolver: zodResolver(Schema), defaultValues: { medium: 'bangla', batchId: 'HSC-2026', college: '' } });
  const next = async (fields: Array<keyof FormData>) => { if (await trigger(fields)) setStep((value) => value + 1); };
  const submit = handleSubmit(async (data) => {
    setSubmitError(null);
    try {
      await setDoc(doc(getFirestore(app), 'users', uid), { ...data, displayName: '', createdAt: serverTimestamp(), updatedAt: serverTimestamp() }, { merge: true });
      onDone(data);
    } catch (error) { setSubmitError((error as Error).message || 'We could not save your profile. Please try again.'); }
  });
  return <form onSubmit={submit} className="mx-auto max-w-md space-y-5 p-4 text-text">
    <p className="text-sm text-text-dim">Step {step + 1} of 3</p>
    {step === 0 && <fieldset className="space-y-3"><legend className="font-display text-xl">{t('onboarding.step1.title')}</legend>{(['bangla', 'english'] as const).map((medium) => <label key={medium} className="flex cursor-pointer items-center gap-2 rounded-md border border-surface-2 p-3"><input type="radio" value={medium} {...register('medium')} onChange={() => setValue('medium', medium, { shouldValidate: true })} />{t(`onboarding.step1.${medium}`)}</label>)}<Button type="button" onClick={() => void next(['medium'])}>{t('onboarding.next')}</Button></fieldset>}
    {step === 1 && <fieldset className="space-y-3"><legend className="font-display text-xl">{t('onboarding.step2.title')}</legend><label className="flex flex-col gap-1"><span className="text-sm font-medium">Batch</span><select {...register('batchId')} className="rounded-md border border-surface-2 bg-surface p-3">{BATCH_SEED.map((batch) => <option key={batch.id} value={batch.id}>{batch.label}</option>)}</select></label><div className="flex gap-2"><Button type="button" variant="ghost" onClick={() => setStep(0)}>{t('onboarding.back')}</Button><Button type="button" onClick={() => setStep(2)}>{t('onboarding.next')}</Button></div></fieldset>}
    {step === 2 && <fieldset className="space-y-3"><legend className="font-display text-xl">{t('onboarding.step3.title')}</legend><label className="flex flex-col gap-1"><span className="text-sm font-medium">College</span><input {...register('college')} className="rounded-md border border-surface-2 bg-surface p-3" autoComplete="organization" /></label>{errors.college && <p role="alert" className="text-sm text-danger">{errors.college.message}</p>}{submitError && <p role="alert" className="text-sm text-danger">{submitError}</p>}<div className="flex gap-2"><Button type="button" variant="ghost" onClick={() => setStep(1)}>{t('onboarding.back')}</Button><Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving…' : t('onboarding.finish')}</Button></div></fieldset>}
  </form>;
}
