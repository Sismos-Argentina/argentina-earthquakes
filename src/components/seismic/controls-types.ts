import type { CatalogFilterBounds, CatalogFilters } from "@/lib/filters/catalog";
import type { EventColorMode } from "@/lib/geo/event-colors";
import type { FilterEditorState } from "@/lib/filters/editor";

export type ControlPanel = "filters" | "layers" | "information" | "navigation" | "camera";
type Mode = "turntable" | "orbital" | "pan" | "zoom";
type Actions = {
  showPlan: (v: boolean) => void; chooseArea: (v: "region" | "profile") => void; resetCamera: () => void;
  setRelief: (v: 1 | 5 | 10) => void; toggleSlab: () => void; setSlabOpacity: (v: number) => void;
  setNavigationMode: (v: Mode) => void; setCameraView: (v: "above" | "side" | "territory") => void;
};
export type ViewerControlProps = {
  count: number; visible: number; status: string; filters: CatalogFilters | null; bounds: CatalogFilterBounds | null;
  onFilters: (v: CatalogFilters) => void; panel: ControlPanel | null; onPanel: (v: ControlPanel | null) => void;
  actions: Actions | null; map2d: boolean; ready: boolean; navigationMode: Mode; relief: 1 | 5 | 10;
  slabVisible: boolean; slabOpacity: number; colorMode: EventColorMode; onColorMode: (v: EventColorMode) => void;
  terrainOpacity: number; onTerrainOpacity: (v: number) => void; onGuide?: () => void; onLeaveGuide: () => void;
  surfaceReady: boolean; slabAvailable: boolean; analysisReady: boolean;
  onTutorial?: () => void; tutorialCue?: string;
  filterEditor: FilterEditorState | null; onFilterEditor: (state: FilterEditorState) => void;
};
