import policy from "../../data/catalog-update-policy.json" with { type: "json" };

export function nextCatalogReview(now: Date): Date {
  const next = new Date(now);
  next.setUTCHours(policy.hourUTC, policy.minuteUTC, 0, 0);
  next.setUTCDate(next.getUTCDate() + (policy.weekdayUTC - next.getUTCDay() + 7) % 7);
  if (next.getTime() <= now.getTime()) next.setUTCDate(next.getUTCDate() + 7);
  return next;
}

export function catalogReviewLabel(now: Date): string {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: policy.timeZone, day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).format(nextCatalogReview(now));
}
