import { sortTop10, isRankUnlocked, type LbUser } from './leaderboard';

export function RankGate({ todaySec, users }: { todaySec: number; users: LbUser[] }) {
  if (!isRankUnlocked(todaySec)) {
    return <p className="text-text-dim">🔒 Study {Math.max(0, 15 - Math.floor(todaySec / 60))}m more to unlock the leaderboard.</p>;
  }
  const top = sortTop10(users);
  return (
    <ol className="list-decimal pl-5 text-text">
      {top.map((u) => <li key={u.uid}>{u.name ?? u.uid} — {Math.round(u.durationSec / 60)}m</li>)}
    </ol>
  );
}
