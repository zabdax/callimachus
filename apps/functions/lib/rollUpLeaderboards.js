import { onSchedule } from 'firebase-functions/v2/scheduler';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
initializeApp();
export function mergeUsersMap(days) {
    const out = {};
    for (const d of days) {
        for (const [uid, sec] of Object.entries(d.users ?? {}))
            out[uid] = (out[uid] ?? 0) + sec;
    }
    return out;
}
export function monthKey(d) { return d.toISOString().slice(0, 7); }
export function pruneCutoff(now) {
    // 30 calendar days before `now`, read in Asia/Dhaka (the project reference TZ)
    // and returned as a UTC Date so the ISO date slice is the calendar date.
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Dhaka', year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(now);
    const y = Number(parts.find((p) => p.type === 'year').value);
    const m = Number(parts.find((p) => p.type === 'month').value);
    const d = Number(parts.find((p) => p.type === 'day').value);
    return new Date(Date.UTC(y, m - 1, d - 30));
}
export const rollUpLeaderboards = onSchedule({ schedule: '0 * * * *', timeZone: 'Asia/Dhaka' }, async () => {
    const db = getFirestore();
    const now = new Date();
    const month = monthKey(now);
    const dailySnap = await db.collection('analytics/leaderboard_daily').get();
    const merged = mergeUsersMap(dailySnap.docs.map((d) => d.data()));
    await db.doc(`analytics/leaderboard_monthly/${month}`).set({
        users: merged, updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    // Prune daily docs older than 30 days
    const cutoff = pruneCutoff(now);
    const old = dailySnap.docs.filter((d) => new Date(d.id) < cutoff);
    await Promise.all(old.map((d) => d.ref.delete()));
    void merged;
    void old; // referenced for handler context
});
