export function pickDailyPlan(tasks, budgetMinutes) {
    const sorted = [...tasks].sort((a, b) => a.scheduledFor.getTime() - b.scheduledFor.getTime());
    const out = [];
    let used = 0;
    for (const t of sorted) {
        if (used + t.minutes > budgetMinutes)
            continue;
        out.push(t);
        used += t.minutes;
        if (out.length === 4)
            break;
    }
    return out;
}
