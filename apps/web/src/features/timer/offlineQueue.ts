import { openDB, type IDBPDatabase } from 'idb';

export type QueuedSession = {
  id: string;
  uid: string;
  sessionId?: string;
  clientStartTs: number;
  clientEndedTs: number;
  serverStartTs: number;
  chapterId: string | null;
};

const DB_NAME = 'hsc-timer';
const STORE = 'pending-sessions';
let dbp: Promise<IDBPDatabase> | null = null;
function db() {
  if (!dbp) dbp = openDB(DB_NAME, 1, { upgrade(database) { if (!database.objectStoreNames.contains(STORE)) database.createObjectStore(STORE, { keyPath: 'id' }); } });
  return dbp;
}
export async function enqueueSession(session: QueuedSession) { await (await db()).put(STORE, session); }
export async function listPending(): Promise<QueuedSession[]> { return (await (await db()).getAll(STORE)) as QueuedSession[]; }
export async function dropPending() { await (await db()).clear(STORE); }
export async function removeQueued(id: string) { await (await db()).delete(STORE, id); }
