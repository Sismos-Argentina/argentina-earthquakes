import type {CatalogFilters} from "./catalog";
export type FilterEditorState = {appliedKey: string; draft: CatalogFilters; tab: "date"|"magnitude"|"depth"};
export function filterEditorKey(filters: CatalogFilters): string {
  return [filters.dateFrom,filters.dateTo,filters.magnitudeMin,filters.magnitudeMax,filters.depthMin,filters.depthMax,Boolean(filters.includeProvisional)].join("|");
}
export function initialFilterEditor(filters: CatalogFilters, saved: FilterEditorState | null): FilterEditorState {
  const appliedKey=filterEditorKey(filters);
  return saved?.appliedKey===appliedKey
    ? {...saved,draft:{...saved.draft}}
    : {appliedKey,draft:{...filters},tab:"date"};
}
