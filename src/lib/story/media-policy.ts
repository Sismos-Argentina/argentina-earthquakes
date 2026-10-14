import policy from "../../data/historical-rights.json" with { type: "json" };

type Approval = { photoId: string; license: string; evidenceUrl: string };

export function canPublishHistoricalPhoto(photoId: string): boolean {
  return (policy.approvedPhotos as Approval[]).some((approval) =>
    approval.photoId === photoId && Boolean(approval.license.trim())
    && /^https?:\/\//.test(approval.evidenceUrl),
  );
}
