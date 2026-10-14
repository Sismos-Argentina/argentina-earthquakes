import quality from "../../data/catalog-quality.json" with { type: "json" };
import type { InpresFeature } from "./inpres";

export const qualityReviewDate = quality.reviewedAt;
export const provisionalExclusions = quality.entries.filter((entry) => entry.status === "provisional-exclusion");

export function eventQuality(id: string) {
  return quality.entries.find((entry) => entry.id === id);
}

export function allowedInVisualization(feature: InpresFeature, includeProvisional = false): boolean {
  return includeProvisional || eventQuality(feature.properties.id)?.status !== "provisional-exclusion";
}
