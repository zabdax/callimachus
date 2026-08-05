import { Button } from './Button';

export function PageLoading({ label = 'Loading…' }: { label?: string }) {
  return <main className="grid min-h-[40vh] place-items-center p-6 text-sm text-text-dim" role="status">{label}</main>;
}
export function PageMessage({ title, detail, retry }: { title: string; detail?: string; retry?: () => void }) {
  return <main className="mx-auto grid min-h-[35vh] max-w-md place-items-center p-6 text-center"><div className="space-y-3"><h1 className="font-display text-xl text-text">{title}</h1>{detail && <p className="text-sm text-text-dim">{detail}</p>}{retry && <Button onClick={retry}>Try again</Button>}</div></main>;
}
