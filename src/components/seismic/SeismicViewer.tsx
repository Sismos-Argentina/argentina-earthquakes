"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { TrackballControls } from "three/addons/controls/TrackballControls.js";

import {
  assertCartographyArtifact,
  CARTOGRAPHY_URL,
  type CartographyArtifact,
} from "@/lib/data/cartography";
import {
  assertCatalog,
  CATALOG_URL,
  type InpresFeature,
} from "@/lib/data/inpres";
import {
  assertGebcoArtifact,
  GEBCO_PROFILES,
  type GebcoArtifact,
  type GebcoProfile,
} from "@/lib/data/gebco";
import { assertSlab2Artifact, SLAB2_URL, type Slab2Artifact } from "@/lib/data/slab2";
import {
  createCartographyGroup,
} from "@/lib/cartography/create-map-lines";
import {
  createMapLabels,
  createRegionalPlaceLabels,
  updatePlaceLabels,
} from "@/lib/cartography/create-map-labels";
import {
  geographicToScene,
  sceneToGeographic,
} from "@/lib/geo/scene-coordinates";
import { sampleGebcoElevationMeters, createGebcoGeometry } from "@/lib/terrain/create-gebco-geometry";
import { createSlab2Geometry } from "@/lib/slab2/create-slab2-geometry";
import {
  catalogFilterBounds,
  matchesCatalogFilters,
  type CatalogFilterBounds,
  type CatalogFilters,
} from "@/lib/filters/catalog";
import CuyoSection, { type SectionOptions } from "./CuyoSection";
import { sameCatalogFilters } from "@/lib/filters/catalog";
import ViewerControls, { type ControlPanel } from "./ViewerControls";
import { eventColor, type EventColorMode } from "@/lib/geo/event-colors";
import EventInspector from "./EventInspector";
import EventHover from "./EventHover";
import RegionalLocator from "./RegionalLocator";
import PlanView, { type PlanViewSession } from "./PlanView";
import { VIEWER_UI_RESTORED } from "@/lib/ui/viewer-ui";
import type { FilterEditorState } from "@/lib/filters/editor";
import ViewerTour from "@/components/story/ViewerTour";
import { advanceTour, nextTourChapter, previousTourChapter, rectangleProgress, tourCueAt, TOUR_CONTEXT, TOUR_DURATION, TOUR_REGION, type TourPlayback } from "@/lib/story/viewer-tour";
import { constrainCamera, navigationEnvelope, TERRITORY_BOUNDS, type Point3 } from "@/lib/geo/navigation-limits";
import { createAnalysisAxes, depthTickStep, disposeAnalysisGroup } from "@/lib/geo/analysis-axes";
import { cropGebco, cropSlab, insideRegion, type RegionBounds } from "@/lib/geo/region";
import presets from "@/data/flat-slab-guide.json";

import {
  CUYO_PROFILE,
  LATITUDE_PROFILE,
  corridorEdgeForProfile,
  createLatitudeProfile,
  createGeodesicProfile,
  profileKey,
  sampleSlab,
  positionAtProfile,
  projectEventToProfile,
  sampleProfile,
  type ProfileDefinition,
  type ProjectedEvent,
  type ProfileSample,
} from "@/lib/profile/cuyo";

type ReliefExaggeration = 1 | 5 | 10;
type NavigationMode = "turntable" | "orbital" | "pan" | "zoom";

type Metrics = {
  decodedBytes?: number;
  transferBytes?: number;
  fetchMs?: number;
  parseMs?: number;
  buildMs?: number;
  firstRenderMs?: number;
  heapBefore?: number;
  heapAfter?: number;
  fps?: number;
  pickingMs?: number;
  terrainBytes?: number;
  cartographyBytes?: number;
  surfaceTransferBytes?: number;
  surfaceFetchMs?: number;
  surfaceParseMs?: number;
  surfaceBuildMs?: number;
  terrainVertices?: number;
  terrainTriangles?: number;
  drawCalls?: number;
  slabBytes?: number;
  slabTransferBytes?: number;
  slabFetchMs?: number;
  slabParseMs?: number;
  slabBuildMs?: number;
  slabVertices?: number;
  slabTriangles?: number;
  filterMs?: number;
  geometryCount?: number;
  heapCurrent?: number;
};

type SavedCamera = { position: Point3; target: Point3; up: Point3 };
type SceneSession = {
  camera: SavedCamera; navigation: NavigationMode; filters: CatalogFilters;
  color: EventColorMode; terrainOpacity: number; relief: ReliefExaggeration; slabVisible: boolean; slabOpacity: number;
  selectedId: string | null; region: RegionBounds | null; profile: ProfileDefinition; profileOpen: boolean;
  plan: boolean; choosing: "region" | "profile" | null; guided: boolean;
  beforeRegion: SavedCamera | null; beforeProfile: (SavedCamera & { relief: ReliefExaggeration }) | null;
};
type SavedViewUI = { toolsPinned: boolean; page: [number,number]; plot: [number,number] | null; panelScroll: [number,number] | null; details: boolean[] };
type TourSession = { scene: SceneSession; panel: ControlPanel | null; guidedIndex: number | null; plan?: PlanViewSession; section?: SectionOptions; areaStatus: string; filterEditor: FilterEditorState | null; ui: SavedViewUI };
type ViewActions = {
  capture: () => SceneSession;
  restore: (session: SceneSession) => void;
  prepareTour: () => CatalogFilters;
  pauseMotion: () => void;
  inspectRegion: () => void;
  setSlabVisible: (value: boolean) => void;
  setColorMode: (value: EventColorMode) => void;
  setTerrainOpacity: (value: number) => void;
  setRelief: (value: ReliefExaggeration) => void;
  toggleSlab: () => void;
  setSlabOpacity: (opacity: number) => void;
  openProfile: () => void;
  closeProfile: () => void;
  resetCamera: () => void;
  setNavigationMode: (mode: NavigationMode) => void;
  setCameraView: (view: "above" | "side" | "territory") => void;
  selectEvent: (feature: InpresFeature) => void;
  clearSelection: () => void;
  setFilters: (filters: CatalogFilters) => void;
  setProfileLatitude: (latitude: number) => void;
  startGuidedProfile: (latitude: number, bounds: CatalogFilters) => void;
  setReducedMotion: (value: boolean) => void;
  chooseArea: (kind: "region" | "profile") => void;
  cancelArea: () => void;
  closeRegion: () => void;
  openRegion: (bounds: RegionBounds) => void;
  alignNorth: () => void;
  setCustomProfile: (a: [number,number], b: [number,number]) => void;
  showPlan: (value: boolean) => void;
};

type TerrainLayer = {
  group: THREE.Group;
  labels: THREE.Group;
  surface: THREE.Mesh;
};

const TERRITORIAL_BBOX = TERRITORY_BOUNDS;
const INITIAL_RELIEF_EXAGGERATION: ReliefExaggeration = 5;

function heapBytes(): number | undefined {
  const withMemory = performance as Performance & {
    memory?: { usedJSHeapSize: number };
  };
  return withMemory.memory?.usedJSHeapSize;
}

function createSeaLevel(bbox: [number, number, number, number]) {
  const [west, south, east, north] = bbox;
  const [westX, , northZ] = geographicToScene(west, north, 0);
  const [eastX, , southZ] = geographicToScene(east, south, 0);
  const geometry = new THREE.PlaneGeometry(
    Math.abs(eastX - westX),
    Math.abs(southZ - northZ),
  );
  geometry.rotateX(-Math.PI / 2);
  const material = new THREE.MeshBasicMaterial({
    color: 0x4b9fb4,
    transparent: true,
    opacity: 0.13,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const sea = new THREE.Mesh(geometry, material);
  sea.position.set((westX + eastX) / 2, 0, (northZ + southZ) / 2);
  sea.renderOrder = 1;
  return sea;
}

function createProfileFootprint(profile: ProfileDefinition) {
  const vertices: number[] = [];
  const center: number[] = [];
  const borders: number[] = [];
  const steps = Math.ceil(profile.lengthKm / profile.sampleStepKm);
  const add = (point: { longitude: number; latitude: number }, array: number[]) => {
    const [x, , z] = geographicToScene(point.longitude, point.latitude, 0);
    array.push(x, 0, z);
  };
  for (let i = 0; i <= steps; i++) {
    const s = profile.lengthKm * i / steps;
    const left = corridorEdgeForProfile(profile, s, -1);
    const right = corridorEdgeForProfile(profile, s, 1);
    add(left, vertices); add(right, vertices);
    add(left, borders); add(right, borders);
    add(positionAtProfile(profile, s), center);
  }
  const footprint = new THREE.Group();
  const positions: number[] = [];
  for (let i = 0; i < steps; i++) {
    const offset = i * 6;
    positions.push(...vertices.slice(offset, offset + 3), ...vertices.slice(offset + 3, offset + 6), ...vertices.slice(offset + 6, offset + 9));
    positions.push(...vertices.slice(offset + 3, offset + 6), ...vertices.slice(offset + 9, offset + 12), ...vertices.slice(offset + 6, offset + 9));
  }
  const fill = new THREE.Mesh(
    new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(positions, 3)),
    new THREE.MeshBasicMaterial({ color: 0xe6cf9d, transparent: true, opacity: 0.34, depthTest: false, depthWrite: false, side: THREE.DoubleSide }),
  );
  fill.renderOrder = 9;
  footprint.add(fill);
  for (const [array, color, order] of [[center, 0xffffff, 11], [borders.filter((_, index) => Math.floor(index / 3) % 2 === 0), 0xf2bb70, 10], [borders.filter((_, index) => Math.floor(index / 3) % 2 === 1), 0xf2bb70, 10]] as const) {
    const line = new THREE.Line(
      new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(array, 3)),
      new THREE.LineBasicMaterial({ color, depthTest: false }),
    );
    line.renderOrder = order;
    footprint.add(line);
  }
  const endpoints = new THREE.Points(
    new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute([...center.slice(0, 3), ...center.slice(-3)], 3)),
    new THREE.PointsMaterial({ color: 0xffffff, size: 11, sizeAttenuation: false, depthTest: false }),
  );
  endpoints.renderOrder = 12;
  footprint.add(endpoints);
  for (const [index, label] of [[0, "A"], [center.length - 3, "B"]] as const) {
    const badge = document.createElement("canvas");
    badge.width = 64; badge.height = 64;
    const ctx = badge.getContext("2d")!;
    ctx.fillStyle = "#17242a";
    ctx.beginPath(); ctx.arc(32, 32, 25, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = 4; ctx.strokeStyle = "#f2bb70"; ctx.stroke();
    ctx.fillStyle = "#ffffff"; ctx.font = "bold 32px Arial";
    ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(label, 32, 34);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(badge), depthTest: false }));
    sprite.position.set(center[index], 12, center[index + 2]);
    sprite.scale.set(85, 85, 1);
    sprite.renderOrder = 13;
    footprint.add(sprite);
  }
  footprint.visible = false;
  return footprint;
}

function createTerrainLayer(
  profile: GebcoProfile,
  terrain: GebcoArtifact,
  cartography: CartographyArtifact,
  reliefExaggeration: ReliefExaggeration,
  options: {
    surfaceOnly?: boolean;
    labels?: boolean;
  } = {},
) {
  const built = createGebcoGeometry(terrain);
  const terrainMesh = new THREE.Mesh(
    built.geometry,
    new THREE.MeshBasicMaterial({
      vertexColors: true,
      toneMapped: false,
      side: THREE.DoubleSide,
      transparent: false,
      opacity: 1,
      depthWrite: true,
      depthTest: true,
    }),
  );
  terrainMesh.userData.terrainSurface=true;
  terrainMesh.renderOrder = profile === "scientific" ? 3 : 2;

  const displayBbox =
    profile === "scientific" ? terrain.grid.bbox : TERRITORIAL_BBOX;
  const group = new THREE.Group();
  group.add(terrainMesh);
  if (!options.surfaceOnly) {
    group.add(
      createSeaLevel(terrain.grid.bbox),
      createCartographyGroup(cartography, terrain, displayBbox),
    );
  }
  group.scale.y = reliefExaggeration;
  return {
    layer: {
      group,
      labels: options.surfaceOnly || options.labels === false ? new THREE.Group() : createMapLabels(profile),
      surface: terrainMesh,
    },
    vertices: built.vertices,
    triangles: built.triangles,
  };
}

function transferSizeFor(urls: string[]): number | undefined {
  const values = urls
    .map((url) => {
      const entries = performance.getEntriesByName(
        new URL(url, window.location.href).href,
        "resource",
      ) as PerformanceResourceTiming[];
      return entries.at(-1)?.transferSize;
    })
    .filter((value): value is number => value !== undefined);
  return values.length === urls.length
    ? values.reduce((sum, value) => sum + value, 0)
    : undefined;
}

export default function SeismicViewer({ guidedIndex = null, onGuideChange, onStartGuide, reducedMotion = false }: {
  guidedIndex?: number | null;
  onGuideChange?: (index: number | null) => void;
  onHistory?: () => void;
  onStartGuide?: () => void;
  reducedMotion?: boolean;
}) {
  const canvasHost = useRef<HTMLDivElement>(null);
  const compassNeedle = useRef<HTMLSpanElement>(null);
  const views = useRef<ViewActions | null>(null);
  const [status, setStatus] = useState("Cargando catálogo INPRES…");
  const [surfaceStatus, setSurfaceStatus] = useState(
    "Cargando GEBCO y cartografía…",
  );
  const [slabStatus, setSlabStatus] = useState("Cargando modelo Slab2…");
  const [slabVisible, setSlabVisibleReact] = useState(false);
  const [slabOpacity, setSlabOpacity] = useState(0.4);
  const [, setInversePanActive] = useState(false);
  const [navigationMode, setNavigationModeReact] = useState<NavigationMode>("turntable");
  const [hovered, setHovered] = useState<{ event: InpresFeature; x: number; y: number } | null>(null);
  const [modelHover, setModelHover] = useState<{ text: string; x: number; y: number } | null>(null);
  const [areaSelection, setAreaSelection] = useState<"region" | "profile" | null>(null);
  const [areaStatus, setAreaStatus] = useState("");
  const [activeRegion, setActiveRegion] = useState<RegionBounds | null>(null);
  const [regionDepth, setRegionDepth] = useState(700);
  const [colorMode, setColorMode] = useState<EventColorMode>("depth");
  const [terrainOpacity, setTerrainOpacity] = useState(1);
  const [map2d, setMap2d] = useState(false);
  const [mapEvents, setMapEvents] = useState<InpresFeature[]>([]);
  const [mapCartography, setMapCartography] = useState<CartographyArtifact | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [slabSummary, setSlabSummary] = useState<Slab2Artifact["summary"] | null>(null);
  const [count, setCount] = useState(0);
  const [visibleCount, setVisibleCount] = useState(0);
  const [filterEditor, setFilterEditor] = useState<FilterEditorState | null>(null);
  const [filterBounds, setFilterBounds] = useState<CatalogFilterBounds | null>(null);
  const [filters, setFilters] = useState<CatalogFilters | null>(null);
  const [selected, setSelected] = useState<InpresFeature | null>(null);
  const [reliefExaggeration, setReliefExaggeration] =
    useState<ReliefExaggeration>(INITIAL_RELIEF_EXAGGERATION);
  const [metrics, setMetrics] = useState<Metrics>({});
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileStatus, setProfileStatus] = useState("");
  const [profileEvents, setProfileEvents] = useState<ProjectedEvent[] | null>(null);
  const [profileSamples, setProfileSamples] = useState<ProfileSample[] | null>(null);
  const [profileDefinition, setProfileDefinition] = useState<ProfileDefinition>(CUYO_PROFILE);
  const [openPanel, setOpenPanel] = useState<ControlPanel | null>(null);
  const appliedGuide = useRef<number | null>(null);
  const tourSession = useRef<TourSession | null>(null);
  const tourFocus = useRef<HTMLElement | null>(null);
  const pendingViewRestore = useRef<SavedViewUI | null>(null);
  const planSaved = useRef<PlanViewSession | undefined>(undefined);
  const sectionSaved = useRef<SectionOptions | undefined>(undefined);
  const [planSeed, setPlanSeed] = useState<PlanViewSession | undefined>(undefined);
  const [sectionSeed, setSectionSeed] = useState<SectionOptions | undefined>(undefined);
  const [sessionRevision, setSessionRevision] = useState(0);
  const [tour, setTour] = useState<TourPlayback | null>(null);
  const [tourRevision, setTourRevision] = useState(0);
  const [tourApplied, setTourApplied] = useState<string | null>(null);
  const [tourError, setTourError] = useState("");
  const [tourInteraction, setTourInteraction] = useState(false);
  const [tourMotionAllowed, setTourMotionAllowed] = useState(false);
  const tourReducedMotion=reducedMotion&&!tourMotionAllowed;
  const tourActive=Boolean(tour);
  const [tourPeriod, setTourPeriod] = useState("");
  // Las semillas se consumen al montar: una nueva exploración posterior
  // no debe volver a aplicar una selección antigua restaurada por la guía.
  const savePlan = useCallback((value: PlanViewSession) => { planSaved.current=value;setPlanSeed(undefined); }, []);
  const saveSection = useCallback((value: SectionOptions) => { sectionSaved.current=value;setSectionSeed(undefined); }, []);

  useEffect(() => {
    const host = canvasHost.current;
    if (!host) return;

    let disposed = false;
    let animationFrame = 0;
    let renderDirty = true;
    let interacting = false;
    let motionReduced=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    type CameraPose={position:THREE.Vector3;target:THREE.Vector3;up:THREE.Vector3};
    let cameraTransition:{from:CameraPose;to:CameraPose;start:number}|null=null;
    let surfaceOpacity = 1;
    let currentColorMode:EventColorMode="depth";
    const diagnostic = ["localhost","127.0.0.1"].includes(window.location.hostname) && new URLSearchParams(window.location.search).get("diagnostico")==="1";
    const invalidate = () => { renderDirty=true; if(!disposed && !document.hidden && !animationFrame) animationFrame=requestAnimationFrame(animate); };
    const visibilityChanged = () => { if(document.hidden){cancelAnimationFrame(animationFrame);animationFrame=0;}else invalidate(); };
    document.addEventListener("visibilitychange",visibilityChanged);
    let pendingFirstRender = false;
    let catalogReady = false;
    let surfaceReady = false;
    let features: InpresFeature[] = [];
    let visibleFeatures: InpresFeature[] = [];
    let catalogPositions: Float32Array | null = null;
    let catalogColors: Float32Array | null = null;
    let filteredPositions: Float32Array | null = null;
    let filteredColors: Float32Array | null = null;
    let currentFilters: CatalogFilters | null = null;
    let selectedFeature: InpresFeature | null = null;
    let catalogPoints: THREE.Points | null = null;
    let selectedPoint: THREE.Points | null = null;
    let selectedDepthLine: THREE.Line | null = null;
    let depthGuide: THREE.Group | null = null;
    let slabMesh: THREE.Mesh | null = null;
    let scientificTerrain: GebcoArtifact | null = null;
    let profileSlab: Slab2Artifact | null = null;
    let cachedProfile: { key: string; events: ProjectedEvent[]; samples: ProfileSample[] } | null = null;
    let profileTimer: ReturnType<typeof setTimeout> | null = null;
    let profileDebounce: ReturnType<typeof setTimeout> | null = null;
    let profileGeneration = 0;
    let currentProfile = CUYO_PROFILE;
    let slabEnabled = false;
    let beforeProfile: { camera: THREE.Vector3; target: THREE.Vector3; up: THREE.Vector3; relief: ReliefExaggeration } | null = null;
    let region: RegionBounds | null = null;
    let regionalGroup: THREE.Group | null = null;
    let regionalSlab: THREE.Mesh | null = null;
    let regionalTerrain: THREE.Group | null = null;
    let regionalAxes: THREE.Group | null = null;
    let planActive = false;
    let choosingArea: "region" | "profile" | null = null;
    let beforeRegion: { camera: THREE.Vector3; target: THREE.Vector3; up: THREE.Vector3 } | null = null;
    let regionDepthKm = 700;
    let cartographySource: CartographyArtifact | null = null;
    let currentRelief: ReliefExaggeration = INITIAL_RELIEF_EXAGGERATION;
    const terrainLayers: Partial<Record<GebcoProfile, TerrainLayer>> = {};
    const fetchController = new AbortController();
    const startedAt = performance.now();

    const markLayerReady = () => {
      if (catalogReady && surfaceReady) {
        pendingFirstRender = true; invalidate();
        setMetrics((previous) => ({ ...previous, heapAfter: heapBytes() }));
      }
    };

    const scene = new THREE.Scene();
    const sceneColor=()=>"#061015";
    host.dataset.sceneTheme=document.documentElement.dataset.theme??"dark";
    scene.background = new THREE.Color(sceneColor());
    scene.fog = new THREE.FogExp2(sceneColor(), 0.000035);


    const camera = new THREE.PerspectiveCamera(44, 1, 1, 80000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.localClippingEnabled = true;
    host.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xbfe6ef, 0x132129, 1.25));
    const sun = new THREE.DirectionalLight(0xfff0d4, 1.7);
    sun.position.set(-3000, 5000, 2600);
    scene.add(sun);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.addEventListener("change", invalidate);
    controls.addEventListener("start",()=>{cameraTransition=null;interacting=true;invalidate();});
    controls.addEventListener("end",()=>{interacting=false;invalidate();});
    controls.enableDamping = !motionReduced;
    controls.dampingFactor = .15;
    controls.screenSpacePanning = true;
    controls.zoomToCursor = true;
    controls.zoomSpeed = 1.8;
    controls.minDistance = 30;
    controls.maxDistance = 70000;
    const orbital = new TrackballControls(camera, renderer.domElement);
    orbital.addEventListener("change",invalidate);
    orbital.addEventListener("start",()=>{cameraTransition=null;interacting=true;invalidate();});
    orbital.addEventListener("end",()=>{interacting=false;invalidate();});
    orbital.zoomSpeed = 1.8;
    orbital.enabled = false; orbital.staticMoving = true; orbital.panSpeed = .6; orbital.rotateSpeed = 1.2;
    orbital.minDistance = 30; orbital.maxDistance = 70000; orbital.keys = ["", "", ""];
    orbital.target = controls.target;
    const cameraPose=():CameraPose=>({position:camera.position.clone(),target:controls.target.clone(),up:camera.up.clone()});
    const applyCameraPose=(pose:CameraPose)=>{camera.position.copy(pose.position);controls.target.copy(pose.target);camera.up.copy(pose.up);camera.lookAt(controls.target);};
    const limitNavigation=()=>{
      const limits=navigationEnvelope(region??TERRITORY_BOUNDS,camera.aspect,region?regionDepthKm:800,Boolean(region));
      controls.minDistance=orbital.minDistance=limits.minDistance;
      controls.maxDistance=orbital.maxDistance=limits.maxDistance;
      if(beforeProfile||planActive||cameraTransition)return;
      const bounded=constrainCamera(camera.position.toArray(),controls.target.toArray(),limits);
      if(camera.position.distanceToSquared(new THREE.Vector3(...bounded.position))>1e-12||controls.target.distanceToSquared(new THREE.Vector3(...bounded.target))>1e-12){
        camera.position.fromArray(bounded.position);controls.target.fromArray(bounded.target);camera.lookAt(controls.target);renderDirty=true;
      }
    };
    const animateCameraFrom=(from:CameraPose)=>{
      cameraTransition=null;
      if(!motionReduced){const to=cameraPose();applyCameraPose(from);cameraTransition={from,to,start:performance.now()};}
      invalidate();
    };
    let currentNavigationMode: NavigationMode = "turntable";
    const syncControls = () => {
      const allowed = !beforeProfile && !choosingArea && !planActive;
      controls.enabled = allowed && currentNavigationMode === "turntable";
      orbital.enabled = allowed && currentNavigationMode !== "turntable";
    };
    const setNavigationMode = (mode: NavigationMode) => {
      stopChord();
      currentNavigationMode = mode;
      orbital.noRotate = mode !== "orbital";
      orbital.mouseButtons.LEFT = mode === "pan" ? THREE.MOUSE.PAN : mode === "zoom" ? THREE.MOUSE.DOLLY : THREE.MOUSE.ROTATE;
      if (mode === "turntable") { camera.up.set(0, 1, 0); controls.update(); }
      syncControls();
      renderer.domElement.style.cursor = mode === "pan" ? "move" : mode === "zoom" ? "ns-resize" : "grab";
      setNavigationModeReact(mode);
      invalidate();
    };
    let footprint = createProfileFootprint(CUYO_PROFILE);
    scene.add(footprint);
    let guidedProfile = false;
    const setProfileCamera = (profile: ProfileDefinition) => {
      const center = positionAtProfile(profile, profile.lengthKm / 2);
      const [x, , z] = geographicToScene(center.longitude, center.latitude, 0);
      const damping = controls.enableDamping;
      controls.enableDamping = false; controls.update();
      controls.target.set(x, 0, z);
      // Vista superior y norte arriba; A–B ocupa su lugar geográfico real.
      camera.up.set(0, 1, 0); camera.position.set(x, Math.max(160, profile.lengthKm * .6), z + 0.1);
      controls.update(); controls.enableDamping = damping;
    };

    const setInitialCamera = () => {
      const [x, , z] = geographicToScene(-67, -31, 0);
      controls.target.set(x, -100, z);
      camera.up.set(0, 1, 0);
      camera.position.set(x, 3800, z + 3800);
      controls.update();
    };
    const setRelief = (value: ReliefExaggeration) => {
      currentRelief = value;
      for (const layer of Object.values(terrainLayers)) {
        if (layer) layer.group.scale.y = value;
      }
      if (regionalTerrain) regionalTerrain.scale.y = value;
      setReliefExaggeration(value); invalidate();
    };
    const toggleSlab = () => {
      if (!slabMesh) return;
      slabEnabled = !slabEnabled;
      slabMesh.visible = slabEnabled && !region;
      if (regionalSlab) regionalSlab.visible = slabEnabled;
      setSlabVisibleReact(slabEnabled); invalidate();
    };
    const selectEvent = (feature: InpresFeature) => {
      const [x, y, z] = geographicToScene(...feature.geometry.coordinates, feature.properties.profundidad);
      selectedPoint?.position.set(x, y, z);
      if (selectedPoint) selectedPoint.visible = true;
      if (selectedDepthLine) {
        const linePositions = selectedDepthLine.geometry.getAttribute("position") as THREE.BufferAttribute;
        linePositions.setXYZ(0, x, 0, z);
        linePositions.setXYZ(1, x, y, z);
        linePositions.needsUpdate = true;
        selectedDepthLine.geometry.computeBoundingSphere();
        selectedDepthLine.visible = true;
      }
      selectedFeature = feature;
      setOpenPanel(null);
      setSelected(feature); invalidate();
    };
    const clearSelection = () => {
      selectedFeature = null;
      if (selectedPoint) selectedPoint.visible = false;
      if (selectedDepthLine) selectedDepthLine.visible = false;
      setSelected(null); invalidate();
    };
    const applyFilters = (nextFilters: CatalogFilters) => {
      currentFilters = nextFilters;
      cachedProfile = null;
      if (!catalogPoints || !catalogPositions || !catalogColors || !filteredPositions || !filteredColors) return;

      const started = performance.now();
      let visible = 0;
      for (let index = 0; index < features.length; index++) {
        const feature = features[index];
        if (!matchesCatalogFilters(feature, nextFilters)) continue;
        if (region && !insideRegion(...feature.geometry.coordinates, region)) continue;
        const source = index * 3;
        const target = visible * 3;
        filteredPositions[target] = catalogPositions[source];
        filteredPositions[target + 1] = catalogPositions[source + 1];
        filteredPositions[target + 2] = catalogPositions[source + 2];
        filteredColors[target] = catalogColors[source];
        filteredColors[target + 1] = catalogColors[source + 1];
        filteredColors[target + 2] = catalogColors[source + 2];
        visibleFeatures[visible] = feature;
        visible++;
      }
      visibleFeatures.length = visible;
      setMapEvents(visibleFeatures.slice());

      const position = catalogPoints.geometry.getAttribute("position") as THREE.BufferAttribute;
      const color = catalogPoints.geometry.getAttribute("color") as THREE.BufferAttribute;
      position.needsUpdate = true;
      color.needsUpdate = true;
      catalogPoints.geometry.setDrawRange(0, visible);
      catalogPoints.geometry.computeBoundingSphere();

      if (selectedFeature && (!matchesCatalogFilters(selectedFeature, nextFilters) || !visibleFeatures.includes(selectedFeature))) {
        clearSelection();
      }
      setVisibleCount(visible); invalidate();
      setHovered(null); setModelHover(null);
      setMetrics((previous) => ({
        ...previous,
        filterMs: performance.now() - started,
      }));
      if (beforeProfile) calculateProfile(currentProfile);
    };
    const closeProfile = () => {
      profileGeneration++;
      if (profileTimer) clearTimeout(profileTimer);
      if (profileDebounce) clearTimeout(profileDebounce);
      footprint.visible = false;
      setProfileOpen(false);
      if (catalogPoints) catalogPoints.visible = true;
      if (depthGuide) depthGuide.visible = !region;
      renderer.domElement.style.cursor = currentNavigationMode === "pan" ? "move" : "grab";
      if (beforeProfile) {
        setRelief(beforeProfile.relief);
        camera.position.copy(beforeProfile.camera);
        controls.target.copy(beforeProfile.target);
        camera.up.copy(beforeProfile.up);
        controls.update();
        beforeProfile = null;
      }
      syncControls();
    };
    const showPlan = (value: boolean) => {
      cameraTransition=null;
      if (!value) { choosingArea=null; setAreaSelection(null); }
      planActive = value; setMap2d(value); invalidate(); setHovered(null); setModelHover(null); syncControls();
    };
    const closeRegion = () => {
      if (!region) return;
      region = null; setActiveRegion(null);
      if (regionalGroup) { scene.remove(regionalGroup); disposeAnalysisGroup(regionalGroup); }
      regionalGroup = null; regionalSlab = null; regionalTerrain = null; regionalAxes = null;
      for (const layer of Object.values(terrainLayers)) if (layer) { layer.group.visible = true; layer.labels.visible = true; }
      if (slabMesh) slabMesh.visible = slabEnabled;
      if (depthGuide) depthGuide.visible = true;
      if (beforeRegion) { camera.position.copy(beforeRegion.camera); camera.up.copy(beforeRegion.up); controls.target.copy(beforeRegion.target); }
      beforeRegion = null; clearSelection();
      if (currentFilters) applyFilters(currentFilters);
    };
    const fitRegionCamera=(view:"above"|"side"|"oblique")=>{
      if(!region)return;
      limitNavigation();
      const [x0,,z0]=geographicToScene(region[0],region[3],0),[x1,,z1]=geographicToScene(region[2],region[1],0);
      const damping=controls.enableDamping;controls.enableDamping=false;controls.update();
      const center=new THREE.Vector3((x0+x1)/2,-regionDepthKm/2,(z0+z1)/2);
      const dir=(view==="above"?new THREE.Vector3(0,1,.001):view==="side"?new THREE.Vector3(.15,0,1):new THREE.Vector3(.35,.65,1)).normalize();
      const right=new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),dir).normalize(),up=new THREE.Vector3().crossVectors(dir,right);
      const tanV=Math.tan(THREE.MathUtils.degToRad(camera.fov/2)),tanH=tanV*camera.aspect;
      let distance=30;
      for(const x of [x0,x1])for(const y of [0,-regionDepthKm])for(const z of [z0,z1]){
        const offset=new THREE.Vector3(x,y,z).sub(center);
        distance=Math.max(distance,Math.abs(offset.dot(right))/tanH+offset.dot(dir),Math.abs(offset.dot(up))/tanV+offset.dot(dir));
      }
      controls.target.copy(center);camera.up.set(0,1,0);camera.position.copy(center).addScaledVector(dir,distance*1.12);
      controls.update();controls.enableDamping=damping;invalidate();
    };
    const openRegion = (bounds: RegionBounds) => {
      if (!scientificTerrain || !cartographySource) throw new Error("Esperá a que termine de cargar el mapa.");
      closeProfile(); closeRegion(); showPlan(false); choosingArea = null; setAreaSelection(null); setAreaStatus("");
      beforeRegion = { camera: camera.position.clone(), target: controls.target.clone(), up: camera.up.clone() };
      region = bounds; if(diagnostic)host.dataset.regionBounds=JSON.stringify(bounds); setActiveRegion(bounds); clearSelection();
      if (currentFilters) applyFilters(currentFilters);
      for (const layer of Object.values(terrainLayers)) if (layer) { layer.group.visible = false; layer.labels.visible = false;
        layer.group.traverse(o => (o as THREE.Mesh).geometry?.dispose()); }
      if (slabMesh) slabMesh.visible = false;
      if (depthGuide) depthGuide.visible = false;
      regionalGroup = new THREE.Group();
      const terrain = createTerrainLayer("scientific", cropGebco(scientificTerrain, bounds), cartographySource, currentRelief, {labels:false});
      regionalTerrain = terrain.layer.group; regionalGroup.add(regionalTerrain);
      regionalTerrain.add(createRegionalPlaceLabels(bounds,scientificTerrain));
      changeSurfaceOpacity(surfaceOpacity);
      const [x0,,z0] = geographicToScene(bounds[0], bounds[3], 0), [x1,,z1] = geographicToScene(bounds[2], bounds[1], 0);
      const planes = [new THREE.Plane(new THREE.Vector3(1,0,0),-x0),new THREE.Plane(new THREE.Vector3(-1,0,0),x1),
        new THREE.Plane(new THREE.Vector3(0,0,1),-z0),new THREE.Plane(new THREE.Vector3(0,0,-1),z1)];
      regionalTerrain.traverse(o => { const material=(o as THREE.Mesh).material;
        if(material) for(const m of Array.isArray(material)?material:[material]) m.clippingPlanes=planes; });
      let maxDepth = visibleFeatures.reduce((depth,f)=>Math.max(depth,f.properties.profundidad),200);
      if (profileSlab) {
        const clipped = cropSlab(profileSlab,bounds);
        const validDepths = clipped.grid.depthKm.filter((v):v is number=>v!==null);
        if (clipped.grid.width>=2 && clipped.grid.height>=2 && validDepths.length) {
          maxDepth = validDepths.reduce((depth,value)=>Math.max(depth,value),maxDepth);
          const geometry = createSlab2Geometry(clipped).geometry;
          regionalSlab = new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color:0xf4d97f,transparent:true,
            opacity:(slabMesh?.material as THREE.MeshBasicMaterial)?.opacity ?? .4,depthWrite:false,side:THREE.DoubleSide,clippingPlanes:planes}));
          const wire = new THREE.LineSegments(new THREE.WireframeGeometry(geometry),new THREE.LineBasicMaterial({color:0xffe7a3,transparent:true,opacity:.22,depthWrite:false,clippingPlanes:planes}));
          regionalSlab.add(wire); regionalSlab.visible=slabEnabled; regionalGroup.add(regionalSlab);
        }
      }
      maxDepth=Math.ceil(maxDepth/100)*100;regionDepthKm=maxDepth;setRegionDepth(maxDepth);
      regionalAxes=createAnalysisAxes(bounds,maxDepth);regionalGroup.add(regionalAxes);scene.add(regionalGroup);
      fitRegionCamera("oblique");
      setNavigationMode("turntable"); controls.update(); syncControls();
    };
    const chooseArea = (kind: "region" | "profile") => {
      closeProfile();closeRegion();clearSelection();choosingArea=kind;setAreaSelection(kind);setAreaStatus("");showPlan(true);
    };
    const setCustomProfile = (a: [number,number], b: [number,number]) => {
      const profile = createGeodesicProfile({longitude:a[0],latitude:a[1]},{longitude:b[0],latitude:b[1]});
      choosingArea=null;setAreaSelection(null);showPlan(false);closeRegion();currentProfile=profile;
      cachedProfile=null;moveFootprint(profile);setProfileDefinition(profile);guidedProfile=false;openProfile();
    };
    const moveFootprint = (profile: ProfileDefinition) => {
      const wasVisible = footprint.visible;
      scene.remove(footprint);
      footprint.traverse((object) => {
        const drawable = object as THREE.Mesh;
        drawable.geometry?.dispose();
        if (drawable.material) {
          const materials = Array.isArray(drawable.material) ? drawable.material : [drawable.material];
          for (const material of materials) {
            (material as THREE.SpriteMaterial).map?.dispose();
            material.dispose();
          }
        }
      });
      footprint = createProfileFootprint(profile);
      footprint.visible = wasVisible;
      scene.add(footprint);
    };
    const calculateProfile = (profile: ProfileDefinition) => {
      if (!features.length || !scientificTerrain || !profileSlab) return;
      if (cachedProfile?.key === profileKey(profile)) {
        setProfileEvents(cachedProfile.events);
        setProfileSamples(cachedProfile.samples);
        setProfileStatus("");
        return;
      }
      setProfileStatus(profile.custom ? "Calculando selección geodésica WGS84 entre A y B…" : `Calculando selección geodésica WGS84 a ${Math.abs(profile.latitude).toFixed(2)}°S…`);
      const generation = ++profileGeneration;
      const result: ProjectedEvent[] = [];
      let next = 0;
      const processChunk = () => {
        if (disposed || generation !== profileGeneration) return;
        const end = Math.min(next + 1200, features.length);
        for (; next < end; next++) {
          if (currentFilters && !matchesCatalogFilters(features[next], currentFilters)) continue;
          const projected = projectEventToProfile(features[next], profile);
          if (projected) result.push(projected);
        }
        if (next < features.length) {
          profileTimer = setTimeout(processChunk, 0);
        } else {
          const samples = sampleProfile(scientificTerrain!, profileSlab!, profile);
          cachedProfile = { key: profileKey(profile), events: result, samples };
          setProfileEvents(result);
          setProfileSamples(samples);
          if (selectedFeature && !result.some(({ feature }) => feature.properties.id === selectedFeature?.properties.id)) {
            clearSelection();
          }
          setProfileStatus("");
          profileTimer = null;
        }
      };
      profileTimer = setTimeout(processChunk, 0);
    };
    const setProfileLatitude = (latitude: number) => {
      const nextProfile = createLatitudeProfile(latitude);
      currentProfile = nextProfile;
      moveFootprint(nextProfile);
      setProfileDefinition(nextProfile);
      if (beforeProfile) setProfileCamera(nextProfile);
      setProfileStatus("Moviendo perfil…");
      profileGeneration++;
      if (profileTimer) clearTimeout(profileTimer);
      if (profileDebounce) clearTimeout(profileDebounce);
      profileDebounce = setTimeout(() => calculateProfile(nextProfile), 160);
    };
    const openProfile = () => {
      if (!features.length || !scientificTerrain || !profileSlab) return;
      if (beforeProfile) return;
      closeRegion();showPlan(false);choosingArea=null;setAreaSelection(null);
      beforeProfile = { camera: camera.position.clone(), target: controls.target.clone(), up: camera.up.clone(), relief: currentRelief };
      setRelief(1);
      moveFootprint(currentProfile);
      footprint.visible = true;
      setProfileOpen(true);
      if(catalogPoints){catalogPoints.visible=false;catalogPoints.geometry.dispose();}
      if(selectedPoint)selectedPoint.visible=false;if(selectedDepthLine)selectedDepthLine.visible=false;
      if(depthGuide)depthGuide.visible=false;
      syncControls();
      setProfileCamera(currentProfile);
      calculateProfile(currentProfile);
    };
    const changeSurfaceOpacity=(value:number)=>{
      surfaceOpacity=value;
      setTerrainOpacity(value);
      for(const group of [regionalTerrain,...Object.values(terrainLayers).map(v=>v?.group)])group?.traverse(o=>{
        if(o instanceof THREE.Mesh && o.userData.terrainSurface && o.material instanceof THREE.MeshBasicMaterial){o.material.opacity=value;o.material.transparent=value<1;o.material.depthWrite=value===1;o.material.needsUpdate=true;}
      });
      invalidate();
    };
    const changeColorMode=(mode:EventColorMode)=>{
      currentColorMode=mode;
      setColorMode(mode);
      if(catalogColors)for(let i=0;i<features.length;i++){
        const props=features[i].properties;
        const color=new THREE.Color().setRGB(...eventColor(mode==="depth"?props.profundidad:props.magnitud,mode),THREE.SRGBColorSpace);
        catalogColors.set([color.r,color.g,color.b],i*3);
      }
      if(filteredColors&&catalogPoints)for(let i=0;i<visibleFeatures.length;i++){
        const props=visibleFeatures[i].properties;
        const color=new THREE.Color().setRGB(...eventColor(mode==="depth"?props.profundidad:props.magnitud,mode),THREE.SRGBColorSpace);
        filteredColors.set([color.r,color.g,color.b],i*3);
      }
      if(catalogPoints)(catalogPoints.geometry.getAttribute("color") as THREE.BufferAttribute).needsUpdate=true;
      invalidate();
    };
    const savePose=():SavedCamera=>({position:camera.position.toArray(),target:controls.target.toArray(),up:camera.up.toArray()});
    const saveReturn=(value:{camera:THREE.Vector3;target:THREE.Vector3;up:THREE.Vector3}|null):SavedCamera|null=>value?{position:value.camera.toArray(),target:value.target.toArray(),up:value.up.toArray()}:null;
    const loadReturn=(value:SavedCamera)=>({camera:new THREE.Vector3(...value.position),target:new THREE.Vector3(...value.target),up:new THREE.Vector3(...value.up)});
    const setSlabVisible=(value:boolean)=>{if(slabEnabled!==value)toggleSlab();};
    const changeSlabOpacity=(opacity:number)=>{
      if(slabMesh)(slabMesh.material as THREE.MeshBasicMaterial).opacity=opacity;
      if(regionalSlab)(regionalSlab.material as THREE.MeshBasicMaterial).opacity=opacity;
      setSlabOpacity(opacity);invalidate();
    };
    const capture=():SceneSession=>{
      if(!currentFilters)throw new Error("Esperá a que termine de cargar el catálogo.");
      return structuredClone({camera:savePose(),navigation:currentNavigationMode,filters:currentFilters,
        color:currentColorMode,terrainOpacity:surfaceOpacity,relief:currentRelief,slabVisible:slabEnabled,
        slabOpacity:slabMesh?(slabMesh.material as THREE.MeshBasicMaterial).opacity:.4,
        selectedId:selectedFeature?.properties.id??null,region,profile:currentProfile,profileOpen:Boolean(beforeProfile),
        plan:planActive,choosing:choosingArea,guided:guidedProfile,beforeRegion:saveReturn(beforeRegion),
        beforeProfile:beforeProfile?{...saveReturn(beforeProfile)!,relief:beforeProfile.relief}:null});
    };
    const pauseMotion=()=>{cameraTransition=null;stopChord();interacting=false;invalidate();};
    const restore=(saved:SceneSession)=>{
      pauseMotion();closeProfile();closeRegion();showPlan(false);
      const damping=controls.enableDamping;controls.enableDamping=false;controls.update();
      applyFilters({...saved.filters});setFilters({...saved.filters});
      changeColorMode(saved.color);changeSurfaceOpacity(saved.terrainOpacity);setRelief(saved.relief);
      setSlabVisible(saved.slabVisible);changeSlabOpacity(saved.slabOpacity);
      currentProfile=structuredClone(saved.profile);setProfileDefinition(currentProfile);moveFootprint(currentProfile);
      if(saved.region){openRegion([...saved.region]);beforeRegion=saved.beforeRegion?loadReturn(saved.beforeRegion):null;}
      guidedProfile=saved.guided;
      if(saved.profileOpen){openProfile();beforeProfile=saved.beforeProfile?{...loadReturn(saved.beforeProfile),relief:saved.beforeProfile.relief}:null;}
      if(saved.plan)showPlan(true);
      choosingArea=saved.choosing;setAreaSelection(saved.choosing);
      setNavigationMode(saved.navigation);
      // Actualizar el dominio antes de aplicar la pose: la vista 2D mantiene
      // una cámara 3D de retorno que no debe usar los límites de la demo.
      limitNavigation();
      applyCameraPose({position:new THREE.Vector3(...saved.camera.position),target:new THREE.Vector3(...saved.camera.target),up:new THREE.Vector3(...saved.camera.up)});
      controls.update();controls.enableDamping=damping;syncControls();
      const original=features.find(feature=>feature.properties.id===saved.selectedId);
      if(original)selectEvent(original);else clearSelection();
      invalidate();
    };
    const prepareTour=()=>{
      closeProfile();closeRegion();showPlan(false);choosingArea=null;setAreaSelection(null);clearSelection();
      changeColorMode("depth");changeSurfaceOpacity(1);setRelief(1);setSlabVisible(false);changeSlabOpacity(.4);
      const bounds=catalogFilterBounds(features);let sample={...bounds};
      for(const days of [30,365]){
        const date=new Date(`${bounds.dateTo}T12:00:00Z`);date.setUTCDate(date.getUTCDate()-days);
        const recent={...bounds,dateFrom:[bounds.dateFrom,date.toISOString().slice(0,10)].sort().at(-1)!};
        if(features.some(feature=>matchesCatalogFilters(feature,recent)&&insideRegion(...feature.geometry.coordinates,TOUR_REGION))){sample=recent;break;}
      }
      applyFilters(sample);setFilters(sample);setNavigationMode("turntable");return sample;
    };
    views.current = {
      capture,restore,prepareTour,pauseMotion,setSlabVisible,
      inspectRegion:()=>{const feature=visibleFeatures.find(f=>f.properties.profundidad>=70)??visibleFeatures[0];if(feature)selectEvent(feature);},
      setColorMode:changeColorMode,
      setTerrainOpacity:changeSurfaceOpacity,
      setRelief,
      toggleSlab,
      setSlabOpacity: changeSlabOpacity,
      openProfile: () => { guidedProfile = false; openProfile(); },
      closeProfile,
      chooseArea,
      cancelArea: () => { choosingArea=null;setAreaSelection(null);setAreaStatus("");syncControls(); },
      closeRegion,
      openRegion,
      setCustomProfile,
      showPlan,
      resetCamera: () => {
        const from=cameraPose();
        closeProfile();closeRegion();choosingArea=null;setAreaSelection(null);showPlan(false);
        clearSelection();
        stopChord();
        const damping = controls.enableDamping;
        controls.enableDamping = false;
        controls.update();
        setInitialCamera();
        controls.enableDamping = damping;
        setNavigationMode("turntable");
        setOpenPanel(null);
        animateCameraFrom(from);
      },
      setNavigationMode,
      alignNorth: () => {
        const from=cameraPose();stopChord();
        const offset=camera.position.clone().sub(controls.target);
        const horizontal=Math.max(.001,Math.hypot(offset.x,offset.z));
        camera.position.copy(controls.target).add(new THREE.Vector3(0,offset.y,horizontal));
        camera.up.set(0,1,0);controls.update();animateCameraFrom(from);
      },
      setCameraView: (view) => {
        const from=cameraPose();
        closeProfile(); clearSelection(); stopChord();
        if (region && view === "territory") closeRegion();
        const damping = controls.enableDamping;
        controls.enableDamping = false; controls.update();
        const [x, , z] = geographicToScene(-67, -35, 0);
        if(region){fitRegionCamera(view==="above"?"above":"side");setNavigationMode("turntable");controls.enableDamping=damping;animateCameraFrom(from);return;}

        camera.up.set(0,1,0);
        controls.target.set(x, -150, z);
        camera.position.set(x, view === "above" ? 5000 : -150, z + (view === "above" ? 1 : 3600));
        if (view === "territory") {
          const [westX, , northZ] = geographicToScene(TERRITORIAL_BBOX[0], TERRITORIAL_BBOX[3], 0);
          const [eastX, , southZ] = geographicToScene(TERRITORIAL_BBOX[2], TERRITORIAL_BBOX[1], 0);
          const centerX = (westX + eastX) / 2, centerZ = (northZ + southZ) / 2;
          const distance = Math.max(Math.abs(eastX - westX) / camera.aspect, Math.abs(southZ - northZ)) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) * 1.08;
          controls.target.set(centerX, 0, centerZ); camera.position.set(centerX, distance, centerZ + 0.1);
        }
        controls.update(); controls.enableDamping = damping;
        setOpenPanel(null);
        animateCameraFrom(from);
      },
      selectEvent,
      clearSelection,
      setFilters: applyFilters,
      setProfileLatitude,
      setReducedMotion: (value) => { motionReduced=value;controls.enableDamping = !value;if(value&&cameraTransition){applyCameraPose(cameraTransition.to);cameraTransition=null;invalidate();} },
      startGuidedProfile: (latitude, bounds) => {
        closeRegion();showPlan(false);choosingArea=null;setAreaSelection(null);
        guidedProfile = true;
        setOpenPanel(null);
        clearSelection();
        applyFilters(bounds);
        setFilters(bounds);
        setProfileLatitude(latitude);
        openProfile();
      },
    };
    setInitialCamera();

    let axesKey="",regionalAxesKey="";
    const refreshAxes = () => {
      if(beforeProfile||planActive)return;
      const distance=camera.position.distanceTo(controls.target),tanH=Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*camera.aspect;
      const right=new THREE.Vector3(1,0,0).applyQuaternion(camera.quaternion);right.y=0;
      if(right.lengthSq()<.01)right.set(1,0,0);right.normalize();
      const anchor=controls.target.clone().addScaledVector(right,-distance*tanH*.5);
      const snap=Math.max(.1,distance/60);anchor.x=Math.round(anchor.x/snap)*snap;anchor.z=Math.round(anchor.z/snap)*snap;
      const [lon,lat]=sceneToGeographic(anchor.x,anchor.z),[east]=sceneToGeographic(anchor.x+distance*tanH*.1,anchor.z);
      const rulerBounds:RegionBounds=[lon,lat,east,lat+.01];
      const max=region?regionDepthKm:800,center=Math.max(0,-controls.target.y);
      const a=new THREE.Vector3(anchor.x,-center,anchor.z).project(camera),b=new THREE.Vector3(anchor.x,-center-100,anchor.z).project(camera);
      const pxPerKm=Math.hypot((a.x-b.x)*host.clientWidth,(a.y-b.y)*host.clientHeight)/200;
      const step=depthTickStep(pxPerKm),halfRange=host.clientHeight/Math.max(.1,pxPerKm)*.65;
      const range=[Math.max(0,center-halfRange),Math.min(max,center+halfRange)];
      const key=[step,max,Math.ceil(range[0]/step),Math.floor(range[1]/step),Boolean(region)].join(":");
      if(key!==axesKey){
        axesKey=key;
        if(depthGuide){scene.remove(depthGuide);disposeAnalysisGroup(depthGuide);}
        depthGuide=createAnalysisAxes(rulerBounds,max,true,step,range);
        // Trasladar la regla en lugar de reconstruir sus texturas en cada arrastre.
        depthGuide.userData.anchor=[anchor.x,anchor.z];scene.add(depthGuide);
      }
      const previousAnchor=depthGuide!.userData.anchor as number[];
      depthGuide!.position.set(anchor.x-previousAnchor[0],0,anchor.z-previousAnchor[1]);
      depthGuide!.visible=true;
      if(region&&regionalGroup){
        const regionKey=[region.join(","),step,Math.floor(range[0]/step),Math.ceil(range[1]/step)].join(":");
        if(regionKey!==regionalAxesKey){
          regionalAxesKey=regionKey;
          if(regionalAxes){regionalGroup.remove(regionalAxes);disposeAnalysisGroup(regionalAxes);}
          regionalAxes=createAnalysisAxes(region,max,false,step,range,false);regionalGroup.add(regionalAxes);
        }
      }else regionalAxesKey="";
      if(diagnostic)host.dataset.depthStep=String(step);
    };

    const resize = () => {
      const width = Math.max(host.clientWidth, 1);
      const height = Math.max(host.clientHeight, 1);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false); invalidate();
      orbital.handleResize();
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);
    resize();

    let frameCount=0;
    let lastFpsSample=performance.now();
    function animate() {
      animationFrame=0;
      if(disposed||document.hidden)return;
      limitNavigation();
      if(cameraTransition){
        const {from,to,start}=cameraTransition,t=Math.min(1,(performance.now()-start)/320),ease=t*t*(3-2*t);
        camera.position.lerpVectors(from.position,to.position,ease);controls.target.lerpVectors(from.target,to.target,ease);camera.up.lerpVectors(from.up,to.up,ease).normalize();camera.lookAt(controls.target);renderDirty=true;
        if(t===1){cameraTransition=null;controls.update();}
      }else if(orbital.enabled)orbital.update();else if(controls.enabled)controls.update();
      limitNavigation();
      if(renderDirty){
        renderDirty=false;
        if(catalogPoints){
          const material=catalogPoints.material as THREE.PointsMaterial;
          material.size=visibleFeatures.length<=500?8:visibleFeatures.length<=5000?5:2.2*Math.max(1,Math.min(3,1500/camera.position.distanceTo(controls.target)));
          material.opacity=visibleFeatures.length<=500?.95:.75;
        }
        if(compassNeedle.current){
          const right=new THREE.Vector3(1,0,0).applyQuaternion(camera.quaternion),up=new THREE.Vector3(0,1,0).applyQuaternion(camera.quaternion);
          compassNeedle.current.style.transform=`rotate(${Math.atan2(-right.z,-up.z)}rad)`;
          compassNeedle.current.style.visibility=Math.hypot(right.z,up.z)>1e-6?"visible":"hidden";
        }
        camera.updateMatrixWorld();refreshAxes();
        updatePlaceLabels(scene,camera,host!.clientWidth,host!.clientHeight);
        if(!planActive)renderer.render(scene,camera);
        if(pendingFirstRender){pendingFirstRender=false;setMetrics(previous=>({...previous,firstRenderMs:performance.now()-startedAt}));}
        frameCount++;
        const now=performance.now();
        if(diagnostic){
          host!.dataset.cameraPose=JSON.stringify({position:camera.position.toArray(),target:controls.target.toArray(),up:camera.up.toArray()});
          if(currentFilters)host!.dataset.exploration=JSON.stringify(capture());
          if(now-lastFpsSample>=1000){
            setMetrics(previous=>({...previous,fps:frameCount*1000/(now-lastFpsSample),drawCalls:renderer.info.render.calls,geometryCount:renderer.info.memory.geometries,heapCurrent:heapBytes()}));
            frameCount=0;lastFpsSample=now;
          }
        }
      }
      if((interacting||cameraTransition)&&!animationFrame)animationFrame=requestAnimationFrame(animate);
    }
    invalidate();

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const seaLevelPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const setRayFromPointer = (event: PointerEvent | MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(pointer, camera);
    };
    const handleDoubleClick = (event: MouseEvent) => {
      if (beforeProfile || planActive) return;
      // Recentrar conserva distancia y orientación. La superficie visible da
      // la ubicación horizontal; fuera de GEBCO se usa el plano del mar.
      setRayFromPointer(event);
      const surfaces = region && regionalTerrain ? regionalTerrain.children.filter((o):o is THREE.Mesh=>o instanceof THREE.Mesh)
        : [terrainLayers.scientific, terrainLayers.context].flatMap((layer) => layer ? [layer.surface] : []);
      const point = raycaster.intersectObjects(surfaces, false)[0]?.point;
      const destination = point ?? raycaster.ray.intersectPlane(
        seaLevelPlane,
        new THREE.Vector3(),
      );
      if (!destination) return;
      const offsetX = destination.x - controls.target.x;
      const offsetZ = destination.z - controls.target.z;
      camera.position.x += offsetX;
      camera.position.z += offsetZ;
      controls.target.x += offsetX;
      controls.target.z += offsetZ;
      controls.update();
    };
    let pointerDown: { x: number; y: number } | null = null;
    let profileDrag: { latitude: number; geographicLatitude: number; camera: THREE.PerspectiveCamera } | null = null;
    const profilePointerLatitude = (event: PointerEvent, view: THREE.PerspectiveCamera) => {
      const rect = renderer.domElement.getBoundingClientRect();
      const ray = new THREE.Raycaster();
      ray.setFromCamera(new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1), view);
      const point = ray.ray.intersectPlane(seaLevelPlane, new THREE.Vector3());
      return point ? sceneToGeographic(point.x, point.z)[1] : null;
    };
    let chordEngaged = false;
    let chordLastX = 0;
    let chordLastY = 0;
    const stopChord = () => {
      chordEngaged = false;
      profileDrag = null;
      setInversePanActive(false);
      syncControls();
      renderer.domElement.style.cursor = currentNavigationMode === "pan" ? "move" : "grab";
    };
    const startChord = (clientX: number, clientY: number) => {
      chordEngaged = true;
      setInversePanActive(true);
      chordLastX = clientX;
      chordLastY = clientY;
      pointerDown = null;
      controls.enabled = false;
      orbital.enabled = false;
      renderer.domElement.style.cursor = "move";
    };
    const handleChordStart = (event: MouseEvent) => {
      if (beforeProfile) return;
      if ((event.buttons & 3) !== 3) return;
      event.preventDefault();
      startChord(event.clientX, event.clientY);
    };
    const handleChordMove = (event: PointerEvent) => {
      if (beforeProfile) return;
      if (event.pointerType === "touch" || (event.buttons & 3) !== 3) return;
      if (!chordEngaged) {
        // Con mouse hay navegadores que no emiten un segundo pointerdown al
        // pulsar el otro botón. Activar también desde el primer movimiento.
        if (!pointerDown) return;
        startChord(event.clientX, event.clientY);
      }
      event.preventDefault();
      event.stopPropagation();
      const deltaX = event.clientX - chordLastX;
      const deltaY = event.clientY - chordLastY;
      chordLastX = event.clientX;
      chordLastY = event.clientY;

      // Trasladar cámara y objetivo juntos conserva orientación y zoom.
      // El sentido es opuesto al mouse en pantalla; la base vertical de la
      // cámara incluye Y, permitiendo bajar hasta los hipocentros profundos.
      const worldPerPixel = 2 * camera.position.distanceTo(controls.target)
        * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2)
        / Math.max(renderer.domElement.clientHeight, 1);
      const translation = new THREE.Vector3(1, 0, 0)
        .applyQuaternion(camera.quaternion)
        .multiplyScalar(deltaX * worldPerPixel)
        .addScaledVector(
          new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion),
          -deltaY * worldPerPixel,
        );
      camera.position.add(translation);
      controls.target.add(translation);
      controls.update();
    };
    const handleChordMouseUp = (event: MouseEvent) => {
      if (chordEngaged && event.buttons === 0) stopChord();
    };
    const preventCanvasContextMenu = (event: MouseEvent) => event.preventDefault();
    const handlePointerDown = (event: PointerEvent) => {
      if (beforeProfile) {
        if (guidedProfile || currentProfile.custom) return;
        const view = camera.clone(); view.updateMatrixWorld();
        const latitude = profilePointerLatitude(event, view);
        if (latitude !== null) {
          profileDrag = { latitude: currentProfile.latitude, geographicLatitude: latitude, camera: view };
          renderer.domElement.setPointerCapture(event.pointerId);
        }
        return;
      }
      pointerDown = { x: event.clientX, y: event.clientY };
    };
    const handleProfilePointerMove = (event: PointerEvent) => {
      if (!profileDrag) return;
      const latitude = profilePointerLatitude(event, profileDrag.camera);
      if (latitude !== null) setProfileLatitude(Math.min(LATITUDE_PROFILE.maxLatitude, Math.max(LATITUDE_PROFILE.minLatitude, profileDrag.latitude + latitude - profileDrag.geographicLatitude)));
    };
    const handlePointerUp = (event: PointerEvent) => {
      if (beforeProfile) {
        profileDrag = null;
        if (renderer.domElement.hasPointerCapture(event.pointerId)) renderer.domElement.releasePointerCapture(event.pointerId);
        return;
      }
      if (!catalogPoints || !pointerDown) return;
      const moved = Math.hypot(
        event.clientX - pointerDown.x,
        event.clientY - pointerDown.y,
      );
      pointerDown = null;
      if (moved > 5) return;

      const pickStart = performance.now();
      setRayFromPointer(event);
      raycaster.params.Points.threshold = Math.max(
        3,
        camera.position.distanceTo(controls.target) * 0.003,
      );
      const hit = raycaster.intersectObject(catalogPoints, false).find(hit=>!hiddenByTerrain(hit.distance));
      if (hit?.index !== undefined) {
        const feature = visibleFeatures[hit.index];
        if (feature) selectEvent(feature);
      }
      setMetrics((previous) => ({
        ...previous,
        pickingMs: performance.now() - pickStart,
      }));
    };
    const hiddenByTerrain=(distance:number)=>{
      if(surfaceOpacity<1||!scientificTerrain||camera.position.y<=0||Math.abs(raycaster.ray.direction.y)<1e-6)return false;
      let t=-raycaster.ray.origin.y/raycaster.ray.direction.y;
      for(let i=0;i<4;i++){
        if(t<0||t>=distance)return false;
        const p=raycaster.ray.at(t,new THREE.Vector3()),[lon,lat]=sceneToGeographic(p.x,p.z);
        if(region&&!insideRegion(lon,lat,region))return false;
        const meters=sampleGebcoElevationMeters(scientificTerrain,lon,lat);
        if(meters===null)return false;
        t=(meters/1000*currentRelief-raycaster.ray.origin.y)/raycaster.ray.direction.y;
      }
      return t>0&&t<distance-1;
    };
    let lastHoverAt=0;
    const handleHover = (event: PointerEvent) => {
      if(event.pointerType==="touch" || event.buttons || beforeProfile || planActive || choosingArea || !catalogPoints?.visible) return;
      const now=performance.now();if(now-lastHoverAt<90)return;lastHoverAt=now;
      setRayFromPointer(event);raycaster.params.Points.threshold=Math.max(1,camera.position.distanceTo(controls.target)*.0035);
      const hit=raycaster.intersectObject(catalogPoints,false).find(hit=>!hiddenByTerrain(hit.distance));
      const feature=hit?.index!==undefined?visibleFeatures[hit.index]:undefined;
      if(feature){setHovered({event:feature,x:event.clientX,y:event.clientY});setModelHover(null);return;}
      setHovered(null);
      const model=region?regionalSlab:slabMesh;
      if(slabEnabled&&model?.visible&&profileSlab){
        const hit=raycaster.intersectObject(model,false)[0];
        if(hit&&!hiddenByTerrain(hit.distance)){const[lon,lat]=sceneToGeographic(hit.point.x,hit.point.z);
          const sample=(!region||insideRegion(lon,lat,region))?sampleSlab(profileSlab,lon,lat):null;
          if(sample){setModelHover({text:`Placa de Nazca · modelo Slab2\n${lat.toFixed(3)}° lat · ${lon.toFixed(3)}° lon\nProfundidad ≈ ${sample.depthKm.toFixed(1)} km · incertidumbre ± ${sample.uncertaintyKm.toFixed(1)} km\nNo clasifica el origen de un sismo.`,x:event.clientX,y:event.clientY});return;}
        }
      }
      setModelHover(null);
    };
    const clearHover = () => {setHovered(null);setModelHover(null);};
    controls.addEventListener("start",clearHover);orbital.addEventListener("start",clearHover);
    const touchPointers=new Map<number,{x:number;y:number}>();
    let touchState:{camera:THREE.Vector3;target:THREE.Vector3;x:number;y:number;distance:number}|null=null;
    let touchMoved=false;
    const resetTouchState=()=>{
      const points=Array.from(touchPointers.values());if(!points.length){touchState=null;return;}
      touchState={camera:camera.position.clone(),target:controls.target.clone(),x:points.reduce((s,p)=>s+p.x,0)/points.length,
        y:points.reduce((s,p)=>s+p.y,0)/points.length,distance:points.length>1?Math.hypot(points[1].x-points[0].x,points[1].y-points[0].y):0};
    };
    const touchStart=(event:PointerEvent)=>{
      if(event.pointerType==="touch")cameraTransition=null;
      if(event.pointerType!=="touch"||beforeProfile||planActive||choosingArea||!["pan","zoom"].includes(currentNavigationMode))return;
      touchPointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
      if(touchPointers.size===1){pointerDown={x:event.clientX,y:event.clientY};touchMoved=false;}else touchMoved=true;
      resetTouchState();orbital.enabled=false;controls.enabled=false;clearHover();
      renderer.domElement.setPointerCapture(event.pointerId);event.stopImmediatePropagation();
    };
    const touchMove=(event:PointerEvent)=>{
      if(!touchPointers.has(event.pointerId)||!touchState)return;
      touchPointers.set(event.pointerId,{x:event.clientX,y:event.clientY});const points=Array.from(touchPointers.values());
      const x=points.reduce((s,p)=>s+p.x,0)/points.length,y=points.reduce((s,p)=>s+p.y,0)/points.length;
      const dx=x-touchState.x,dy=y-touchState.y;if(Math.hypot(dx,dy)>5)touchMoved=true;
      const offset=touchState.camera.clone().sub(touchState.target),distance=offset.length();
      if(points.length>1 || currentNavigationMode==="zoom"){
        const factor=points.length>1?touchState.distance/Math.max(1,Math.hypot(points[1].x-points[0].x,points[1].y-points[0].y)):Math.exp(dy*.006);
        const limits=navigationEnvelope(region??TERRITORY_BOUNDS,camera.aspect,region?regionDepthKm:800,Boolean(region));
        camera.position.copy(touchState.target).add(offset.multiplyScalar(Math.min(limits.maxDistance,Math.max(limits.minDistance,distance*factor))/distance));
      }else{
        const perPixel=2*distance*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))/renderer.domElement.clientHeight;
        const delta=new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,0).multiplyScalar(-dx*perPixel)
          .add(new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,1).multiplyScalar(dy*perPixel));
        camera.position.copy(touchState.camera).add(delta);controls.target.copy(touchState.target).add(delta);
      }
      camera.lookAt(controls.target);camera.updateMatrixWorld();invalidate();event.stopImmediatePropagation();
    };
    const touchEnd=(event:PointerEvent)=>{
      if(!touchPointers.has(event.pointerId))return;
      touchPointers.delete(event.pointerId);if(renderer.domElement.hasPointerCapture(event.pointerId))renderer.domElement.releasePointerCapture(event.pointerId);
      if(touchPointers.size){resetTouchState();}else{touchState=null;syncControls();if(touchMoved||event.type==="pointercancel")pointerDown=null;else handlePointerUp(event);}
      event.stopImmediatePropagation();
    };
    renderer.domElement.addEventListener("pointerdown", handlePointerDown);
    renderer.domElement.addEventListener("pointermove", handleProfilePointerMove);
    renderer.domElement.addEventListener("pointercancel", handlePointerUp);
    renderer.domElement.addEventListener("pointerup", handlePointerUp);
    renderer.domElement.addEventListener("pointermove",handleHover);
    renderer.domElement.addEventListener("pointerleave",clearHover);
    renderer.domElement.addEventListener("pointerdown",touchStart,true);
    renderer.domElement.addEventListener("pointermove",touchMove,true);
    renderer.domElement.addEventListener("pointerup",touchEnd,true);
    renderer.domElement.addEventListener("pointercancel",touchEnd,true);
    renderer.domElement.addEventListener("dblclick", handleDoubleClick);
    renderer.domElement.addEventListener("mousedown", handleChordStart);
    renderer.domElement.addEventListener("contextmenu", preventCanvasContextMenu);
    document.addEventListener("pointermove", handleChordMove, true);
    document.addEventListener("mouseup", handleChordMouseUp, true);
    const handleBlur = () => { touchPointers.clear(); touchState=null; pointerDown=null; stopChord(); };
    window.addEventListener("blur", handleBlur);

    const loadCatalog = async () => {
      setShowDiagnostics(["localhost","127.0.0.1"].includes(window.location.hostname) && new URLSearchParams(window.location.search).get("diagnostico")==="1");
      try {
        const heapBefore = heapBytes();
        const fetchStart = performance.now();
        const response = await fetch(CATALOG_URL, {
          signal: fetchController.signal,
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const bytes = await response.arrayBuffer();
        if (disposed) return;
        const fetchMs = performance.now() - fetchStart;
        const parseStart = performance.now();
        const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes));
        assertCatalog(parsed);
        const parseMs = performance.now() - parseStart;
        if (disposed) return;

        const buildStart = performance.now();
        features = parsed.features;
        const bounds = catalogFilterBounds(features);
        currentFilters = bounds;
        catalogPositions = new Float32Array(features.length * 3);
        catalogColors = new Float32Array(features.length * 3);
        for (let index = 0; index < features.length; index++) {
          const feature = features[index];
          const [longitude, latitude] = feature.geometry.coordinates;
          const depth = feature.properties.profundidad;
          const [x, y, z] = geographicToScene(longitude, latitude, depth);
          const offset = index * 3;
          catalogPositions.set([x, y, z], offset);
          const rgb=new THREE.Color().setRGB(...eventColor(currentColorMode==="depth"?depth:feature.properties.magnitud,currentColorMode),THREE.SRGBColorSpace);
          catalogColors.set([rgb.r,rgb.g,rgb.b], offset);
        }
        filteredPositions = catalogPositions.slice();
        filteredColors = catalogColors.slice();
        visibleFeatures = features.slice();

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute("position", new THREE.BufferAttribute(filteredPositions, 3));
        geometry.setAttribute("color", new THREE.BufferAttribute(filteredColors, 3));
        const dot=document.createElement("canvas");dot.width=32;dot.height=32;
        const dotContext=dot.getContext("2d")!;dotContext.fillStyle="#ffffff";dotContext.beginPath();dotContext.arc(16,16,14,0,Math.PI*2);dotContext.fill();
        const dotMap=new THREE.CanvasTexture(dot);
        catalogPoints = new THREE.Points(
          geometry,
          new THREE.PointsMaterial({
            size: 2.2,
            map: dotMap,
            alphaTest: .25,
            sizeAttenuation: false,
            vertexColors: true,
            transparent: true,
            opacity: 0.32,
            // La superficie opaca oculta hipocentros que están detrás.
            depthTest: true,
            toneMapped: false,
            depthWrite: false,
          }),
        );
        catalogPoints.renderOrder = 5;
        scene.add(catalogPoints);

        selectedPoint = new THREE.Points(
          new THREE.BufferGeometry().setAttribute(
            "position",
            new THREE.Float32BufferAttribute([0, 0, 0], 3),
          ),
          new THREE.PointsMaterial({
            color: 0xffffff,
            size: 12,
            sizeAttenuation: false,
            depthTest: false,
          }),
        );
        selectedPoint.visible = false;
        selectedPoint.renderOrder = 8;
        scene.add(selectedPoint);

        selectedDepthLine = new THREE.Line(
          new THREE.BufferGeometry().setAttribute(
            "position",
            new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, 0], 3),
          ),
          new THREE.LineBasicMaterial({ color: 0xffffff, depthTest: false }),
        );
        selectedDepthLine.visible = false;
        selectedDepthLine.renderOrder = 7;
        scene.add(selectedDepthLine);

        const resourceEntries = performance.getEntriesByName(
          response.url,
          "resource",
        ) as PerformanceResourceTiming[];
        setMetrics((previous) => ({
          ...previous,
          decodedBytes: bytes.byteLength,
          transferBytes: resourceEntries.at(-1)?.transferSize,
          fetchMs,
          parseMs,
          buildMs: performance.now() - buildStart,
          heapBefore,
        }));
        setCount(features.length);
        applyFilters(bounds);
        setFilterBounds(bounds);
        setFilters(bounds);
        setStatus("Catálogo cargado");
        catalogReady = true;
        markLayerReady();
      } catch (error) {
        if (!disposed && !(error instanceof DOMException && error.name === "AbortError")) {
          setStatus(
            `No se pudo cargar el catálogo: ${error instanceof Error ? error.message : "error desconocido"}`,
          );
        }
      }
    };

    const loadSurface = async () => {
      const urls = [
        GEBCO_PROFILES.scientific.url,
        GEBCO_PROFILES.context.url,
        CARTOGRAPHY_URL,
      ];
      try {
        const fetchStart = performance.now();
        const responses = await Promise.all(
          urls.map((url) => fetch(url, { signal: fetchController.signal })),
        );
        for (const response of responses) {
          if (!response.ok) throw new Error(`${response.url}: HTTP ${response.status}`);
        }
        const buffers = await Promise.all(responses.map((response) => response.arrayBuffer()));
        if (disposed) return;
        const fetchMs = performance.now() - fetchStart;
        const parseStart = performance.now();
        const scientificRaw: unknown = JSON.parse(new TextDecoder().decode(buffers[0]));
        const contextRaw: unknown = JSON.parse(new TextDecoder().decode(buffers[1]));
        const cartographyRaw: unknown = JSON.parse(new TextDecoder().decode(buffers[2]));
        assertGebcoArtifact(scientificRaw, "scientific");
        assertGebcoArtifact(contextRaw, "context");
        assertCartographyArtifact(cartographyRaw);
        const parseMs = performance.now() - parseStart;
        if (disposed) return;
        scientificTerrain = scientificRaw;
        cartographySource = cartographyRaw;setMapCartography(cartographyRaw);

        const buildStart = performance.now();
        const scientific = createTerrainLayer(
          "scientific",
          scientificRaw,
          cartographyRaw,
          INITIAL_RELIEF_EXAGGERATION,
          { surfaceOnly: true },
        );
        const context = createTerrainLayer(
          "context",
          contextRaw,
          cartographyRaw,
          INITIAL_RELIEF_EXAGGERATION,
        );
        terrainLayers.scientific = scientific.layer;
        terrainLayers.context = context.layer;
        changeSurfaceOpacity(surfaceOpacity);
        const [wx,,nz]=geographicToScene(scientificTerrain.grid.bbox[0],scientificTerrain.grid.bbox[3],0),[ex,,sz]=geographicToScene(scientificTerrain.grid.bbox[2],scientificTerrain.grid.bbox[1],0);
        const contextMaterial=context.layer.surface.material as THREE.Material;
        contextMaterial.clippingPlanes=[new THREE.Plane(new THREE.Vector3(-1,0,0),wx),new THREE.Plane(new THREE.Vector3(1,0,0),-ex),new THREE.Plane(new THREE.Vector3(0,0,-1),nz),new THREE.Plane(new THREE.Vector3(0,0,1),-sz)];
        contextMaterial.clipIntersection=true;

        for (const layer of Object.values(terrainLayers)) {
          if (!layer) continue;
          scene.add(layer.group, layer.labels);
        }

        setMetrics((previous) => ({
          ...previous,
          terrainBytes: buffers[0].byteLength + buffers[1].byteLength,
          cartographyBytes: buffers[2].byteLength,
          surfaceTransferBytes: transferSizeFor(urls),
          surfaceFetchMs: fetchMs,
          surfaceParseMs: parseMs,
          surfaceBuildMs: performance.now() - buildStart,
          terrainVertices: scientific.vertices + context.vertices,
          terrainTriangles: scientific.triangles + context.triangles,
        }));
        setSurfaceStatus("GEBCO + IGN + Natural Earth cargados");
        surfaceReady = true;
        markLayerReady();
      } catch (error) {
        if (!disposed && !(error instanceof DOMException && error.name === "AbortError")) {
          setSurfaceStatus(
            `Superficie/cartografía no disponible: ${error instanceof Error ? error.message : "error desconocido"}`,
          );
          // La cartografía liviana permite usar 2D aunque falle la descarga del relieve.
          try {
            const response = await fetch(CARTOGRAPHY_URL, { signal: fetchController.signal });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const cartography: unknown = await response.json(); assertCartographyArtifact(cartography);
            if (!disposed) { cartographySource = cartography; setMapCartography(cartography); }
          } catch { /* El aviso de carga permanece visible; no se fabrican límites ni terreno. */ }
        }
      }
    };

    const loadSlab2 = async () => {
      try {
        const fetchStart = performance.now();
        const response = await fetch(SLAB2_URL, { signal: fetchController.signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const bytes = await response.arrayBuffer();
        if (disposed) return;
        const fetchMs = performance.now() - fetchStart;
        const parseStart = performance.now();
        const raw: unknown = JSON.parse(new TextDecoder().decode(bytes));
        assertSlab2Artifact(raw);
        const parseMs = performance.now() - parseStart;
        if (disposed) return;
        profileSlab = raw;
        const buildStart = performance.now();
        const built = createSlab2Geometry(raw);
        slabMesh = new THREE.Mesh(
          built.geometry,
          new THREE.MeshBasicMaterial({
              color: 0xf4d97f,
            transparent: true,
              opacity: 0.4,
            depthWrite: false,
            side: THREE.DoubleSide,
          }),
        );
        slabMesh.renderOrder = 3;
        slabMesh.visible = slabEnabled;
        scene.add(slabMesh);
        setSlabSummary(raw.summary);
        setSlabStatus("Modelo Slab2 disponible"); invalidate();
        const entries = performance.getEntriesByName(response.url, "resource") as PerformanceResourceTiming[];
        setMetrics((previous) => ({
          ...previous,
          slabBytes: bytes.byteLength,
          slabTransferBytes: entries.at(-1)?.transferSize,
          slabFetchMs: fetchMs,
          slabParseMs: parseMs,
          slabBuildMs: performance.now() - buildStart,
          slabVertices: built.validVertices,
          slabTriangles: built.triangles,
        }));
      } catch (error) {
        if (!disposed && !(error instanceof DOMException && error.name === "AbortError")) {
          setSlabStatus(`Modelo Slab2 no disponible: ${error instanceof Error ? error.message : "error desconocido"}`);
        }
      }
    };

    void loadCatalog();
    void loadSurface();
    void loadSlab2();

    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange",visibilityChanged);
      fetchController.abort();
      if (profileTimer) clearTimeout(profileTimer);
      if (profileDebounce) clearTimeout(profileDebounce);
      cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener("pointerdown", handlePointerDown);
      renderer.domElement.removeEventListener("pointermove", handleProfilePointerMove);
      renderer.domElement.removeEventListener("pointercancel", handlePointerUp);
      renderer.domElement.removeEventListener("pointerup", handlePointerUp);
      renderer.domElement.removeEventListener("pointermove",handleHover);
      renderer.domElement.removeEventListener("pointerleave",clearHover);
      renderer.domElement.removeEventListener("pointerdown",touchStart,true);
      renderer.domElement.removeEventListener("pointermove",touchMove,true);
      renderer.domElement.removeEventListener("pointerup",touchEnd,true);
      renderer.domElement.removeEventListener("pointercancel",touchEnd,true);
      renderer.domElement.removeEventListener("dblclick", handleDoubleClick);
      renderer.domElement.removeEventListener("mousedown", handleChordStart);
      renderer.domElement.removeEventListener("contextmenu", preventCanvasContextMenu);
      document.removeEventListener("pointermove", handleChordMove, true);
      document.removeEventListener("mouseup", handleChordMouseUp, true);
      window.removeEventListener("blur", handleBlur);
      views.current = null;
      controls.dispose();
      orbital.dispose();
      scene.traverse((object) => {
        if ("geometry" in object && object.geometry instanceof THREE.BufferGeometry) {
          object.geometry.dispose();
        }
        if (!("material" in object)) return;
        const materials = Array.isArray(object.material)
          ? object.material
          : [object.material];
        for (const material of materials) {
          if (!(material instanceof THREE.Material)) continue;
          if ("map" in material && material.map instanceof THREE.Texture) {
            material.map.dispose();
          }
          material.dispose();
        }
      });
      scene.clear();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  useEffect(() => {
    if (filters) views.current?.setFilters(filters);
  }, [filters]);

  useEffect(() => { views.current?.setReducedMotion(tourActive?tourReducedMotion:reducedMotion); }, [reducedMotion,tourActive,tourReducedMotion]);

  const saveFilterEditor = useCallback((state: FilterEditorState) => { if(!tourSession.current)setFilterEditor(state); }, []);

  const startTutorial = useCallback(() => {
    if(!views.current || tourSession.current)return;
    const root=canvasHost.current?.closest("main"),plot=root?.querySelector(".sectionPlot"),panelBody=root?.querySelector(".studioPanelBody,.viewerPanelContent");
    const scene=views.current.capture();
    tourSession.current=structuredClone({scene,panel:openPanel,guidedIndex,filterEditor,
      plan:scene.plan?planSaved.current:undefined,section:scene.profileOpen?sectionSaved.current:undefined,areaStatus,
      ui:{toolsPinned:document.documentElement.dataset.toolsPinned==="true",page:[window.scrollX,window.scrollY],plot:plot?[plot.scrollLeft,plot.scrollTop]:null,panelScroll:panelBody?[panelBody.scrollLeft,panelBody.scrollTop]:null,
        details:[...root?.querySelectorAll<HTMLDetailsElement>(".sectionMode details,.inspector details,.studioPanel details,.viewerPanel details")??[]].map(item=>item.open)}});
    tourFocus.current=document.activeElement instanceof HTMLElement?document.activeElement:null;
    appliedGuide.current=null;onGuideChange?.(null);setOpenPanel(null);
    setPlanSeed(undefined);setSectionSeed(undefined);setTourError("");setTourApplied(null);setTourInteraction(false);setTourMotionAllowed(false);
    setTourRevision(value=>value+1);setTour({elapsed:0,playing:!reducedMotion});
  },[openPanel,guidedIndex,areaStatus,onGuideChange,reducedMotion,filterEditor]);

  const exitTutorial = useCallback((chooseOwnZone=false) => {
    const saved=tourSession.current;if(!saved)return;
    tourSession.current=null;setTour(null);setTourApplied(null);setTourError("");setTourMotionAllowed(false);
    appliedGuide.current=saved.guidedIndex;onGuideChange?.(saved.guidedIndex);
    planSaved.current=saved.plan;sectionSaved.current=saved.section;
    pendingViewRestore.current=chooseOwnZone?null:saved.ui;
    setPlanSeed(saved.plan);setSectionSeed(saved.section);setSessionRevision(value=>value+1);
    document.documentElement.dataset.toolsPinned=String(saved.ui.toolsPinned);
    window.dispatchEvent(new Event(VIEWER_UI_RESTORED));
    setFilterEditor(saved.filterEditor);
    views.current?.restore(saved.scene);setAreaStatus(saved.areaStatus);setOpenPanel(saved.panel);
    requestAnimationFrame(()=>{
      if(chooseOwnZone){setPlanSeed(undefined);setSessionRevision(value=>value+1);appliedGuide.current=null;onGuideChange?.(null);views.current?.chooseArea("region");setOpenPanel(null);return;}
      const previous=tourFocus.current;
      if(previous?.isConnected && previous.getClientRects().length)previous.focus({preventScroll:true});
      else [...canvasHost.current?.closest("main")?.querySelectorAll<HTMLElement>(".coordinateDialog input,.sectionBack,[data-tour-target='launch']")??[]].find(item=>item.getClientRects().length)?.focus({preventScroll:true});
    });
  },[onGuideChange]);
  useEffect(()=>{
    const saved=pendingViewRestore.current;
    if(!saved||tourActive||(profileOpen&&profileStatus))return;
    const frame=requestAnimationFrame(()=>{
      const root=canvasHost.current?.closest("main"),plot=root?.querySelector(".sectionPlot"),panelBody=root?.querySelector(".studioPanelBody,.viewerPanelContent");
      root?.querySelectorAll<HTMLDetailsElement>(".sectionMode details,.inspector details,.studioPanel details,.viewerPanel details").forEach((item,index)=>{item.open=saved.details[index]??item.open;});
      if(plot&&saved.plot){plot.scrollLeft=saved.plot[0];plot.scrollTop=saved.plot[1];}
      if(panelBody&&saved.panelScroll){panelBody.scrollLeft=saved.panelScroll[0];panelBody.scrollTop=saved.panelScroll[1];}
      window.scrollTo({left:saved.page[0],top:saved.page[1],behavior:"instant"});
      pendingViewRestore.current=null;
    });
    return()=>cancelAnimationFrame(frame);
  },[tourActive,profileOpen,profileStatus,profileEvents,profileSamples]);
  const pauseTutorial = useCallback(() => { setTour(current=>current&&current.playing?{...current,playing:false}:current);views.current?.pauseMotion(); },[]);
  const tourCue=tour?tourCueAt(tour.elapsed):null;
  useEffect(()=>{
    if(!tourCue||!tourSession.current||!views.current||!filterBounds)return;
    const api=views.current;setTourError("");
    try{
      switch(tourCue.id){
        case "territory": {
          const sample=api.prepareTour();
          setTourPeriod(`Ejemplo real · ${sample.dateFrom.split("-").reverse().join("/")}–${sample.dateTo.split("-").reverse().join("/")}`);
          api.setCameraView("above");setOpenPanel("navigation");break;
        }
        case "map": setOpenPanel(null);setPlanSeed(undefined);setSessionRevision(value=>value+1);api.chooseArea("region");break;
        case "rectangle": api.chooseArea("region");break;
        case "region": setOpenPanel(null);api.openRegion([...TOUR_REGION]);break;
        case "event": api.setCameraView("side");api.inspectRegion();break;
        case "slab": api.clearSelection();api.setSlabVisible(true);api.setSlabOpacity(.55);setOpenPanel("layers");break;
        case "section31":
          setOpenPanel(null);setSectionSeed({showSlab:true,fullDepth:true,minimumMagnitude:null,theme:"dark"});
          setTourPeriod("Cortes comparables · período completo del catálogo · escala 1×");
          api.startGuidedProfile(-31,{...filterBounds});break;
        case "section35": api.startGuidedProfile(-35,{...filterBounds});break;
      }
      setTourApplied(tourCue.id);
    }catch(error){setTourError(error instanceof Error?error.message:"No se pudo preparar esta vista.");pauseTutorial();}
  },[tourCue,tourRevision,filterBounds,tourReducedMotion,pauseTutorial]);
  const tourWaiting=Boolean(tour && (tourApplied!==tourCue?.id || (tourCue?.chapter===4 && (Boolean(profileStatus)||!profileOpen||!profileEvents||!profileSamples))));
  useEffect(()=>{
    if(!tourActive)return;
    let previous=performance.now();
    const tick=setInterval(()=>{
      const now=performance.now(),delta=now-previous;previous=now;
      if(document.hidden)return;
      setTour(current=>current?advanceTour(current,delta,!tourWaiting&&!tourError):null);
    },100);
    return()=>clearInterval(tick);
  },[tourActive,tourWaiting,tourError]);
  useEffect(()=>{
    if(!tourActive)return;
    const key=(event:KeyboardEvent)=>{
      if(event.key==="Escape"){event.preventDefault();event.stopImmediatePropagation();exitTutorial();}
    };
    const visibility=()=>{if(document.hidden)pauseTutorial();};
    const blur=()=>pauseTutorial();
    const preference=window.matchMedia("(prefers-reduced-motion: reduce)");
    const motion=(event:MediaQueryListEvent)=>{if(event.matches){setTourMotionAllowed(false);pauseTutorial();}};
    preference.addEventListener("change",motion);
    window.addEventListener("keydown",key,true);document.addEventListener("visibilitychange",visibility);window.addEventListener("blur",blur);
    return()=>{preference.removeEventListener("change",motion);window.removeEventListener("keydown",key,true);document.removeEventListener("visibilitychange",visibility);window.removeEventListener("blur",blur);};
  },[tourActive,exitTutorial,pauseTutorial]);

  useEffect(() => {
    if (guidedIndex === null) {
      if (appliedGuide.current !== null) views.current?.closeProfile();
      appliedGuide.current = null;
      return;
    }
    if (!count || !slabSummary || !surfaceStatus.includes("cargados") || !filterBounds || appliedGuide.current === guidedIndex) return;
    const stop = presets.stops[guidedIndex];
    if (!stop) return;
    appliedGuide.current = guidedIndex;
    // Los números narrativos corresponden a la muestra completa, no a un filtro anterior.
    views.current?.startGuidedProfile(stop.latitude, filterBounds);
  }, [guidedIndex, count, slabSummary, surfaceStatus, filterBounds]);

  useEffect(() => {
    const closePanel = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.defaultPrevented) {
        if (openPanel) setOpenPanel(null);
        else views.current?.cancelArea();
      }
    };
    window.addEventListener("keydown", closePanel);
    return () => window.removeEventListener("keydown", closePanel);
  }, [openPanel]);

  const filtersActive=Boolean(filters&&filterBounds&&!sameCatalogFilters(filters,filterBounds));
  const catalogFailed=status.startsWith("No se pudo cargar el catálogo");
  const surfaceFailed=surfaceStatus.includes("no disponible");
  const slabFailed=slabStatus.includes("no disponible");
  const resourceFailure=catalogFailed||surfaceFailed||slabFailed;
  return (
    <main className={[
      "viewer",
      guidedIndex !== null ? "viewer--guided" : "",
      profileOpen ? "viewer--section" : "",
      map2d ? "viewer--plan" : "",
      activeRegion ? "viewer--region" : "",
      selected ? "viewer--has-selection" : "",
      openPanel ? `viewer--panel-${openPanel}` : "",
      tour ? "viewer--tour" : "",
    ].filter(Boolean).join(" ")} data-tour-cue={tourCue?.id} data-tour-playing={tour?.playing}
      onPointerDownCapture={event=>{if(tour && event.target instanceof Element && !event.target.closest("[data-tour-card]")){setTourInteraction(true);pauseTutorial();}}}
      onWheelCapture={()=>{if(tour){setTourInteraction(true);pauseTutorial();}}}>
      <div
        ref={canvasHost}
        className="scene"
        aria-label="Escena tridimensional de sismos INPRES, relieve GEBCO, cartografía y modelo geofísico Slab2"
      />

      <ViewerControls count={count} visible={map2d?mapEvents.length:visibleCount} status={catalogFailed?"Catálogo no disponible":status} filters={filters} bounds={filterBounds}
        onFilters={setFilters} filterEditor={filterEditor} onFilterEditor={saveFilterEditor} panel={openPanel} onPanel={setOpenPanel} actions={{showPlan:v=>views.current?.showPlan(v),chooseArea:v=>views.current?.chooseArea(v),resetCamera:()=>views.current?.resetCamera(),setRelief:v=>views.current?.setRelief(v),toggleSlab:()=>views.current?.toggleSlab(),setSlabOpacity:v=>views.current?.setSlabOpacity(v),setNavigationMode:v=>views.current?.setNavigationMode(v),setCameraView:v=>views.current?.setCameraView(v)}}
        map2d={map2d} ready={Boolean(count&&mapCartography)} navigationMode={navigationMode} relief={reliefExaggeration}
        surfaceReady={surfaceStatus.includes("cargados")} slabAvailable={Boolean(slabSummary)} analysisReady={Boolean(count&&mapCartography&&slabSummary&&surfaceStatus.includes("cargados"))}
        slabVisible={slabVisible} slabOpacity={slabOpacity} colorMode={colorMode}
        onColorMode={mode=>{setColorMode(mode);views.current?.setColorMode(mode);}}
        terrainOpacity={terrainOpacity} onTerrainOpacity={value=>{setTerrainOpacity(value);views.current?.setTerrainOpacity(value);}}
        onGuide={onStartGuide} onLeaveGuide={()=>onGuideChange?.(null)} tutorialCue={tourCue?.id} onTutorial={tour?undefined:startTutorial}/>
      {!profileOpen&&!map2d?<button className="compass" aria-label="Orientar hacia el norte" title="Orientar hacia el norte" onClick={()=>views.current?.alignNorth()}><span ref={compassNeedle} className="compassNeedle" aria-hidden="true">↑</span><b aria-hidden="true">N</b></button>:null}
      {activeRegion&&!map2d&&!profileOpen?<aside className="regionBanner" aria-label="Ubicación de la zona 3D">
        <div><strong>Zona 3D · {visibleCount.toLocaleString("es-AR")} sismos</strong><small>Profundidad 1× · 0–{regionDepth} km</small><button onClick={()=>views.current?.closeRegion()}>Volver al mapa completo</button></div>
        {mapCartography?<RegionalLocator bounds={activeRegion} cartography={mapCartography} onOpen={()=>views.current?.showPlan(true)}/>:null}
      </aside>:null}
      {map2d&&mapCartography?<PlanView key={`${areaSelection??"browse"}:${sessionRevision}`} events={mapEvents} cartography={mapCartography} selection={areaSelection} region={activeRegion} colorMode={colorMode}
        initialState={planSeed} onStateChange={savePlan}
        demonstration={tour&&!tourInteraction&&tourCue?.chapter===1?{bounds:TOUR_REGION,context:TOUR_CONTEXT,progress:tourReducedMotion?1:rectangleProgress(tour.elapsed),select:tourReducedMotion||tourCue.id==="rectangle"}:undefined}
        onRegion={bounds=>views.current?.openRegion(bounds)} onProfile={(a,b)=>views.current?.setCustomProfile(a,b)}
        onPick={event=>views.current?.selectEvent(event)} onCancel={()=>views.current?.cancelArea()} onClose={()=>{views.current?.cancelArea();views.current?.showPlan(false);}}/>:null}
      {areaStatus?<p role="status">{areaStatus}</p>:null}
      {resourceFailure&&!profileOpen?<div className="resourceNotice" role="status"><p>{catalogFailed?"No se pudo cargar el catálogo de sismos.":surfaceFailed?"El relieve no se pudo cargar. El mapa 2D seguirá disponible si se cargan los límites.":"El modelo de Nazca no se pudo cargar. Podés explorar los sismos; los cortes requieren ese modelo."}</p>{count>0&&visibleCount===0?<p>No hay sismos con los filtros actuales en esta zona.</p>:null}<button onClick={()=>window.location.reload()}>Reintentar carga</button></div>:null}
      {count>0&&visibleCount===0&&!profileOpen&&!map2d&&!resourceFailure?<p className="emptyNotice" role="status">No hay sismos con estos filtros en la zona elegida. Probá ampliar la fecha o elegir otra zona.</p>:null}
      {hovered&&!profileOpen&&!map2d?<EventHover {...hovered}/>:null}
      {modelHover&&!profileOpen&&!map2d?<div className="eventHover modelHover" role="tooltip" style={{left:Math.min(modelHover.x+15,window.innerWidth-290),top:Math.min(modelHover.y+15,window.innerHeight-120)}}>{modelHover.text}</div>:null}
      {showDiagnostics?<output hidden data-session-metrics={JSON.stringify(metrics)}>{surfaceStatus} · {slabStatus}</output>:null}

      {profileOpen ? profileEvents && profileSamples ? (
        <CuyoSection
          key={sessionRevision}
          demonstration={Boolean(tour)}
          initialOptions={sectionSeed} onOptionsChange={saveSection}
          onStartTutorial={!tour&&!profileStatus?startTutorial:undefined}
          colorMode={colorMode}
          onColorMode={mode=>{setColorMode(mode);views.current?.setColorMode(mode);}}
          profile={profileDefinition}
          events={profileEvents}
          samples={profileSamples}
          selected={selected}
          status={profileStatus}
          guidedIndex={tourCue?.chapter===4?(tourCue.id==="section35"?1:0):guidedIndex}
          onGuideChange={tour?index=>setTour(current=>current?{...current,elapsed:index===0?38000:44000,playing:false}:current):onGuideChange}
          inheritedFilters={filtersActive}
          includeProvisional={Boolean(filters?.includeProvisional)}
          catalogFilters={filters}
          onResetFilters={() => { if (filterBounds) setFilters({ ...filterBounds }); }}
          onClearSelection={()=>views.current?.clearSelection()}
          onChooseProfile={()=>{onGuideChange?.(null);views.current?.chooseArea("profile");}}
          onLatitudeChange={(latitude) => views.current?.setProfileLatitude(latitude)}
          onPick={(event) => views.current?.selectEvent(event)}
          onClose={() => { onGuideChange?.(null); views.current?.closeProfile(); }}
        />
      ) : <div className="sectionLoading" role="status"><button onClick={() => { onGuideChange?.(null); views.current?.closeProfile(); }}>← Volver al mapa</button><p>{profileStatus || "Preparando sección…"}</p></div> : null}

      {!profileOpen && selected && !tour ? <EventInspector event={selected} onClose={() => views.current?.clearSelection()} /> : null}
      {tour ? <><p className="tourSample" aria-label="Muestra de la demostración">{tourPeriod}</p><ViewerTour playback={tour} waiting={tourWaiting} reducedMotion={tourReducedMotion} error={tourError}
        detail={selected&&!profileOpen?`M ${selected.properties.magnitud.toFixed(1)} · ${selected.properties.profundidad.toFixed(0)} km de profundidad. Tocá un punto para leerlo.`:undefined}
        onAnimate={reducedMotion&&!tourMotionAllowed?()=>{setTourMotionAllowed(true);setTour({...tour,playing:true});}:undefined}
        onPause={()=>{if(tour.playing)pauseTutorial();else{setTourInteraction(false);setTour({...tour,playing:true});}}}
        onReplay={()=>{setTourInteraction(false);setTourApplied(null);setTourError("");setTourRevision(value=>value+1);setTour({elapsed:0,playing:!tourReducedMotion});}}
        onExit={()=>exitTutorial()} onTry={()=>exitTutorial(true)}
        onNext={()=>setTour(current=>{if(!current)return null;const elapsed=nextTourChapter(current.elapsed);return {...current,elapsed,playing:elapsed<TOUR_DURATION&&current.playing};})}
        onPrevious={()=>setTour(current=>current?{...current,elapsed:tourCueAt(current.elapsed).id==="section35"?38000:previousTourChapter(current.elapsed)}:null)}/></>:null}
    </main>
  );
}
