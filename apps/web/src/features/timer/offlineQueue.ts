import { openDB, type IDBPDatabase } from 'idb';

export type QueuedSession = {
  id: string;
  uid: string;
  clientStartTs: number;
  clientEndedTs: number;
  serverStartTs: number;
  chapterId: string | null;
};

const DB_NAME = 'hsc-timer';
const STORE = 'pending-sessions';

let dbp: Promise<IDBPDatabase> | null = null;
function db() {
  if (!dbp) {
    dbp = openDB(DB_NAME, 1, {
      upgrade(d) { if (!d.objectStoreNames.contains(STORE)) d.createObjectStore(STORE, { keyPath: 'id' }); },
    });
  }
  return dbp;
}

export async function enqueueSession(s: QueuedSession) {
  const d = await db();
  await d.put(STORE, s);
}

export async function listPending(): Promise<QueuedSession[]> {
  const d = await db();
  return (await d.getAll(STORE)) as QueuedSession[];
}

export async function dropPending() {
  const d = await db();
  await d.clear(STORE);
}

export async function removeQueued(id: string) {
  const d = await db();
  await d.delete(STORE, id);
}
