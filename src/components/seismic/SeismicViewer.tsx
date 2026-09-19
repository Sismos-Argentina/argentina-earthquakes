"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

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
} from "@/lib/cartography/create-map-labels";
import {
  geographicToScene,
  VERTICAL_EXAGGERATION,
} from "@/lib/geo/scene-coordinates";
import { createGebcoGeometry } from "@/lib/terrain/create-gebco-geometry";
import { createSlab2Geometry } from "@/lib/slab2/create-slab2-geometry";
import {
  catalogFilterBounds,
  depthPresetRange,
  matchesCatalogFilters,
  sameCatalogFilters,
  type CatalogFilterBounds,
  type CatalogFilters,
} from "@/lib/filters/catalog";
import CuyoSection from "./CuyoSection";
import DualRangeFilter from "./DualRangeFilter";
import EventInspector from "./EventInspector";
import {
  CUYO,
  CUYO_LENGTH_KM,
  corridorEdge,
  positionAt,
  projectEvent,
  sampleCuyoProfile,
  type ProjectedEvent,
  type ProfileSample,
} from "@/lib/profile/cuyo";

type ReliefExaggeration = 1 | 5 | 10;
type ControlPanel = "filters" | "layers" | "information";

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
};

type ViewActions = {
  setRelief: (value: ReliefExaggeration) => void;
  toggleSlab: () => void;
  openProfile: () => void;
  closeProfile: () => void;
  selectEvent: (feature: InpresFeature) => void;
  clearSelection: () => void;
  setFilters: (filters: CatalogFilters) => void;
};

type TerrainLayer = {
  group: THREE.Group;
  labels: THREE.Group;
  surface: THREE.Mesh;
};

const TERRITORIAL_BBOX: [number, number, number, number] = [-100, -90, 8, 0];
const INITIAL_RELIEF_EXAGGERATION: ReliefExaggeration = 5;

function heapBytes(): number | undefined {
  const withMemory = performance as Performance & {
    memory?: { usedJSHeapSize: number };
  };
  return withMemory.memory?.usedJSHeapSize;
}

function formatMs(value: number | undefined) {
  return value === undefined ? "—" : `${value.toFixed(0)} ms`;
}

function formatMiB(value: number | undefined) {
  return value === undefined
    ? "no disponible"
    : `${(value / 1048576).toFixed(1)} MiB`;
}

function depthColor(depthKm: number): [number, number, number] {
  if (depthKm < 70) return [0.96, 0.66, 0.34];
  if (depthKm < 300) return [0.32, 0.78, 0.87];
  return [0.72, 0.58, 0.93];
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

function createCuyoFootprint() {
  const vertices: number[] = [];
  const center: number[] = [];
  const borders: number[] = [];
  const steps = Math.ceil(CUYO_LENGTH_KM / CUYO.sampleStepKm);
  const add = (point: { longitude: number; latitude: number }, array: number[]) => {
    const [x, , z] = geographicToScene(point.longitude, point.latitude, 0);
    array.push(x, 0, z);
  };
  for (let i = 0; i <= steps; i++) {
    const s = CUYO_LENGTH_KM * i / steps;
    const left = corridorEdge(s, -1);
    const right = corridorEdge(s, 1);
    add(left, vertices); add(right, vertices);
    add(left, borders); add(right, borders);
    add(positionAt(s), center);
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
    new THREE.MeshBasicMaterial({ color: 0xe6cf9d, transparent: true, opacity: 0.22, depthTest: false, depthWrite: false, side: THREE.DoubleSide }),
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
    sprite.scale.set(45, 45, 1);
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
  } = {},
) {
  const built = createGebcoGeometry(terrain);
  const terrainMesh = new THREE.Mesh(
    built.geometry,
    new THREE.MeshLambertMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      transparent: false,
      opacity: 1,
      depthWrite: true,
      depthTest: profile !== "scientific",
    }),
  );
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
      labels: options.surfaceOnly ? new THREE.Group() : createMapLabels(profile),
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

export default function SeismicViewer() {
  const canvasHost = useRef<HTMLDivElement>(null);
  const compassNeedle = useRef<HTMLSpanElement>(null);
  const views = useRef<ViewActions | null>(null);
  const [status, setStatus] = useState("Cargando catálogo INPRES…");
  const [surfaceStatus, setSurfaceStatus] = useState(
    "Cargando GEBCO y cartografía…",
  );
  const [slabStatus, setSlabStatus] = useState("Cargando modelo Slab2…");
  const [slabVisible, setSlabVisible] = useState(false);
  const [inversePanActive, setInversePanActive] = useState(false);
  const [slabSummary, setSlabSummary] = useState<Slab2Artifact["summary"] | null>(null);
  const [count, setCount] = useState(0);
  const [visibleCount, setVisibleCount] = useState(0);
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
  const [openPanel, setOpenPanel] = useState<ControlPanel | null>(null);

  useEffect(() => {
    const host = canvasHost.current;
    if (!host) return;

    let disposed = false;
    let animationFrame = 0;
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
    let depthGuide: THREE.LineSegments | null = null;
    let slabMesh: THREE.Mesh | null = null;
    let scientificTerrain: GebcoArtifact | null = null;
    let profileSlab: Slab2Artifact | null = null;
    let cachedProfile: ProjectedEvent[] | null = null;
    let profileTimer: ReturnType<typeof setTimeout> | null = null;
    let profileGeneration = 0;
    let slabEnabled = false;
    let beforeProfile: { camera: THREE.Vector3; target: THREE.Vector3; relief: ReliefExaggeration } | null = null;
    let currentRelief: ReliefExaggeration = INITIAL_RELIEF_EXAGGERATION;
    const terrainLayers: Partial<Record<GebcoProfile, TerrainLayer>> = {};
    const fetchController = new AbortController();
    const startedAt = performance.now();

    const markLayerReady = () => {
      if (catalogReady && surfaceReady) {
        pendingFirstRender = true;
        setMetrics((previous) => ({ ...previous, heapAfter: heapBytes() }));
      }
    };

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#061015");
    scene.fog = new THREE.FogExp2("#061015", 0.000035);

    const camera = new THREE.PerspectiveCamera(44, 1, 1, 80000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    host.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xbfe6ef, 0x132129, 1.25));
    const sun = new THREE.DirectionalLight(0xfff0d4, 1.7);
    sun.position.set(-3000, 5000, 2600);
    scene.add(sun);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.screenSpacePanning = true;
    controls.zoomToCursor = true;
    controls.minDistance = 30;
    controls.maxDistance = 70000;
    const footprint = createCuyoFootprint();
    scene.add(footprint);

    const setInitialCamera = () => {
      const [x, , z] = geographicToScene(-66, -39, 0);
      controls.target.set(x, -100, z);
      camera.position.set(x, 4800, z + 4300);
      controls.update();
    };
    const setRelief = (value: ReliefExaggeration) => {
      currentRelief = value;
      for (const layer of Object.values(terrainLayers)) {
        if (layer) layer.group.scale.y = value;
      }
      setReliefExaggeration(value);
    };
    const toggleSlab = () => {
      if (!slabMesh) return;
      slabEnabled = !slabEnabled;
      slabMesh.visible = slabEnabled;
      setSlabVisible(slabEnabled);
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
      setSelected(feature);
    };
    const clearSelection = () => {
      selectedFeature = null;
      if (selectedPoint) selectedPoint.visible = false;
      if (selectedDepthLine) selectedDepthLine.visible = false;
      setSelected(null);
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

      const position = catalogPoints.geometry.getAttribute("position") as THREE.BufferAttribute;
      const color = catalogPoints.geometry.getAttribute("color") as THREE.BufferAttribute;
      position.needsUpdate = true;
      color.needsUpdate = true;
      catalogPoints.geometry.setDrawRange(0, visible);
      catalogPoints.geometry.computeBoundingSphere();

      if (selectedFeature && !matchesCatalogFilters(selectedFeature, nextFilters)) {
        clearSelection();
      }
      setVisibleCount(visible);
      setMetrics((previous) => ({
        ...previous,
        filterMs: performance.now() - started,
      }));
    };
    const closeProfile = () => {
      profileGeneration++;
      if (profileTimer) clearTimeout(profileTimer);
      footprint.visible = false;
      setProfileOpen(false);
      if (beforeProfile) {
        setRelief(beforeProfile.relief);
        camera.position.copy(beforeProfile.camera);
        controls.target.copy(beforeProfile.target);
        controls.update();
        beforeProfile = null;
      }
    };
    const openProfile = () => {
      if (!features.length || !scientificTerrain || !profileSlab) return;
      if (beforeProfile) return;
      beforeProfile = { camera: camera.position.clone(), target: controls.target.clone(), relief: currentRelief };
      setRelief(1);
      footprint.visible = true;
      setProfileOpen(true);
      const [x, , z] = geographicToScene(-67, -31, 0);
      controls.target.set(x, -30, z);
      camera.position.set(x, 950, z + 650);
      controls.update();
      if (cachedProfile) {
        setProfileEvents(cachedProfile);
        setProfileStatus("");
        return;
      }
      setProfileStatus("Calculando selección geodésica WGS84…");
      const generation = ++profileGeneration;
      const result: ProjectedEvent[] = [];
      let next = 0;
      const processChunk = () => {
        if (disposed || generation !== profileGeneration) return;
        const end = Math.min(next + 1200, features.length);
        for (; next < end; next++) {
          if (currentFilters && !matchesCatalogFilters(features[next], currentFilters)) continue;
          const projected = projectEvent(features[next]);
          if (projected) result.push(projected);
        }
        if (next < features.length) {
          profileTimer = setTimeout(processChunk, 0);
        } else {
          cachedProfile = result;
          setProfileEvents(result);
          setProfileSamples(sampleCuyoProfile(scientificTerrain!, profileSlab!));
          setProfileStatus("");
          profileTimer = null;
        }
      };
      profileTimer = setTimeout(processChunk, 0);
    };
    views.current = {
      setRelief,
      toggleSlab,
      openProfile,
      closeProfile,
      selectEvent,
      clearSelection,
      setFilters: applyFilters,
    };
    setInitialCamera();

    const [guideX, , guideZ] = geographicToScene(-81, -20, 0);
    const guideVertices: number[] = [guideX, 0, guideZ, guideX, -750, guideZ];
    for (let depth = 0; depth <= 750; depth += 150) {
      guideVertices.push(
        guideX - 35,
        -depth,
        guideZ,
        guideX + 35,
        -depth,
        guideZ,
      );
    }
    depthGuide = new THREE.LineSegments(
      new THREE.BufferGeometry().setAttribute(
        "position",
        new THREE.Float32BufferAttribute(guideVertices, 3),
      ),
      new THREE.LineBasicMaterial({ color: 0x93a7a7 }),
    );
    scene.add(depthGuide);

    const resize = () => {
      const width = Math.max(host.clientWidth, 1);
      const height = Math.max(host.clientHeight, 1);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);
    resize();

    let frameCount = 0;
    let lastFpsSample = performance.now();
    const animate = () => {
      if (disposed) return;
      animationFrame = requestAnimationFrame(animate);
      controls.update();
      if (compassNeedle.current) {
        compassNeedle.current.style.transform = `rotate(${controls.getAzimuthalAngle()}rad)`;
      }
      renderer.render(scene, camera);

      const now = performance.now();
      if (pendingFirstRender) {
        pendingFirstRender = false;
        setMetrics((previous) => ({
          ...previous,
          firstRenderMs: now - startedAt,
        }));
      }
      frameCount++;
      if (now - lastFpsSample >= 1000) {
        const fps = (frameCount * 1000) / (now - lastFpsSample);
        setMetrics((previous) => ({
          ...previous,
          fps,
          drawCalls: renderer.info.render.calls,
        }));
        frameCount = 0;
        lastFpsSample = now;
      }
    };
    animate();

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
      // Recentrar conserva distancia y orientación. La superficie visible da
      // la ubicación horizontal; fuera de GEBCO se usa el plano del mar.
      setRayFromPointer(event);
      const surfaces = [terrainLayers.scientific, terrainLayers.context]
        .flatMap((layer) => layer ? [layer.surface] : []);
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
    let chordEngaged = false;
    let chordLastX = 0;
    let chordLastY = 0;
    const stopChord = () => {
      chordEngaged = false;
      setInversePanActive(false);
      controls.enabled = true;
      renderer.domElement.style.cursor = "";
    };
    const startChord = (clientX: number, clientY: number) => {
      chordEngaged = true;
      setInversePanActive(true);
      chordLastX = clientX;
      chordLastY = clientY;
      pointerDown = null;
      controls.enabled = false;
      renderer.domElement.style.cursor = "move";
    };
    const handleChordStart = (event: MouseEvent) => {
      if ((event.buttons & 3) !== 3) return;
      event.preventDefault();
      startChord(event.clientX, event.clientY);
    };
    const handleChordMove = (event: PointerEvent) => {
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
      pointerDown = { x: event.clientX, y: event.clientY };
    };
    const handlePointerUp = (event: PointerEvent) => {
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
      const hit = raycaster.intersectObject(catalogPoints, false)[0];
      if (hit?.index !== undefined) {
        const feature = visibleFeatures[hit.index];
        if (feature) selectEvent(feature);
      }
      setMetrics((previous) => ({
        ...previous,
        pickingMs: performance.now() - pickStart,
      }));
    };
    renderer.domElement.addEventListener("pointerdown", handlePointerDown);
    renderer.domElement.addEventListener("pointerup", handlePointerUp);
    renderer.domElement.addEventListener("dblclick", handleDoubleClick);
    renderer.domElement.addEventListener("mousedown", handleChordStart);
    renderer.domElement.addEventListener("contextmenu", preventCanvasContextMenu);
    document.addEventListener("pointermove", handleChordMove, true);
    document.addEventListener("mouseup", handleChordMouseUp, true);
    window.addEventListener("blur", stopChord);

    const loadCatalog = async () => {
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
          catalogColors.set(depthColor(depth), offset);
        }
        filteredPositions = catalogPositions.slice();
        filteredColors = catalogColors.slice();
        visibleFeatures = features.slice();

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute("position", new THREE.BufferAttribute(filteredPositions, 3));
        geometry.setAttribute("color", new THREE.BufferAttribute(filteredColors, 3));
        catalogPoints = new THREE.Points(
          geometry,
          new THREE.PointsMaterial({
            size: 3,
            sizeAttenuation: false,
            vertexColors: true,
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
        setVisibleCount(features.length);
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
            color: 0xd3ded8,
            transparent: true,
            opacity: 0.56,
            depthWrite: false,
            side: THREE.DoubleSide,
          }),
        );
        slabMesh.renderOrder = 3;
        slabMesh.visible = slabEnabled;
        scene.add(slabMesh);
        setSlabSummary(raw.summary);
        setSlabStatus("Modelo Slab2 disponible");
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
      fetchController.abort();
      if (profileTimer) clearTimeout(profileTimer);
      cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener("pointerdown", handlePointerDown);
      renderer.domElement.removeEventListener("pointerup", handlePointerUp);
      renderer.domElement.removeEventListener("dblclick", handleDoubleClick);
      renderer.domElement.removeEventListener("mousedown", handleChordStart);
      renderer.domElement.removeEventListener("contextmenu", preventCanvasContextMenu);
      document.removeEventListener("pointermove", handleChordMove, true);
      document.removeEventListener("mouseup", handleChordMouseUp, true);
      window.removeEventListener("blur", stopChord);
      views.current = null;
      controls.dispose();
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

  useEffect(() => {
    const closePanel = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenPanel(null);
    };
    window.addEventListener("keydown", closePanel);
    return () => window.removeEventListener("keydown", closePanel);
  }, []);

  const filtersAreDefault = Boolean(
    filters && filterBounds && sameCatalogFilters(filters, filterBounds),
  );
  const filtersActive = Boolean(filters && filterBounds && !filtersAreDefault);
  const togglePanel = (panel: ControlPanel) => {
    setOpenPanel((current) => current === panel ? null : panel);
  };

  return (
    <main className={[
      "viewer",
      profileOpen ? "viewer--section" : "",
      selected ? "viewer--has-selection" : "",
      openPanel ? "viewer--panel-open" : "",
      openPanel ? `viewer--panel-${openPanel}` : "",
    ].filter(Boolean).join(" ")}>
      <div
        ref={canvasHost}
        className="scene"
        aria-label="Escena tridimensional de sismos INPRES, relieve GEBCO, cartografía y modelo geofísico Slab2"
      />

      <div className="leftDock">
        <header className="viewerHeader">
          <p className="eyebrow">Catálogo INPRES · snapshot 14/09/2026</p>
          <h1>Sismos Visuales</h1>
          <p className="viewerStatus" aria-live="polite">
            {count > 0
              ? `${visibleCount.toLocaleString("es-AR")} de ${count.toLocaleString("es-AR")} eventos visibles`
              : status}
          </p>
        </header>

        <div className="filterDock">
          <button
            type="button"
            className="panelTrigger filterTrigger"
            aria-expanded={openPanel === "filters"}
            aria-controls="filters-panel"
            onClick={() => togglePanel("filters")}
          >
            Filtros · {visibleCount.toLocaleString("es-AR")} visibles
            {filtersActive ? <><i className="activeDot" aria-hidden="true" /><span className="srOnly">Filtros activos</span></> : null}
          </button>
          {openPanel === "filters" ? (
            <section id="filters-panel" className="controlPanel filterPanel" aria-labelledby="filters-title">
              <div className="panelHeader">
                <div>
                  <p className="panelEyebrow">Catálogo visible</p>
                  <h2 id="filters-title">Filtros</h2>
                </div>
                <button type="button" className="panelClose" onClick={() => setOpenPanel(null)} aria-label="Cerrar filtros">×</button>
              </div>
              {filters && filterBounds ? (
                <div className="catalogFiltersBody">
                  <fieldset className="filterDates">
                    <legend>Fecha del catálogo</legend>
                    <label>
                      Desde
                      <input
                        type="date"
                        min={filterBounds.dateFrom}
                        max={filterBounds.dateTo}
                        value={filters.dateFrom}
                        onChange={(event) => {
                          const value = event.currentTarget.value;
                          if (!value) return;
                          setFilters((current) => current ? {
                            ...current,
                            dateFrom: value,
                            dateTo: value > current.dateTo ? value : current.dateTo,
                          } : current);
                        }}
                      />
                    </label>
                    <label>
                      Hasta
                      <input
                        type="date"
                        min={filterBounds.dateFrom}
                        max={filterBounds.dateTo}
                        value={filters.dateTo}
                        onChange={(event) => {
                          const value = event.currentTarget.value;
                          if (!value) return;
                          setFilters((current) => current ? {
                            ...current,
                            dateFrom: value < current.dateFrom ? value : current.dateFrom,
                            dateTo: value,
                          } : current);
                        }}
                      />
                    </label>
                  </fieldset>

                  <DualRangeFilter
                    label="Magnitud reportada"
                    min={filterBounds.magnitudeMin}
                    max={filterBounds.magnitudeMax}
                    minValue={filters.magnitudeMin}
                    maxValue={filters.magnitudeMax}
                    step={0.1}
                    onChange={(magnitudeMin, magnitudeMax) => setFilters((current) => current ? {
                      ...current,
                      magnitudeMin,
                      magnitudeMax,
                    } : current)}
                  />

                  <div className="depthFilterGroup">
                    <DualRangeFilter
                      label="Profundidad catalogada"
                      min={filterBounds.depthMin}
                      max={filterBounds.depthMax}
                      minValue={filters.depthMin}
                      maxValue={filters.depthMax}
                      step={1}
                      unit=" km"
                      markers={[{ value: 70, label: "70" }, { value: 300, label: "300" }]}
                      onChange={(depthMin, depthMax) => setFilters((current) => current ? {
                        ...current,
                        depthMin,
                        depthMax,
                      } : current)}
                    />
                    <div className="depthPresets" aria-label="Accesos rápidos de profundidad">
                      {([
                        ["shallow", "Superficiales", "0–<70"],
                        ["intermediate", "Intermedios", "70–<300"],
                        ["deep", "Profundos", "≥300"],
                      ] as const).map(([preset, label, range]) => {
                        const values = depthPresetRange(filterBounds, preset);
                        const active = filters.depthMin === values.depthMin && filters.depthMax === values.depthMax;
                        return (
                          <button
                            type="button"
                            key={preset}
                            aria-pressed={active}
                            onClick={() => setFilters((current) => current ? { ...current, ...values } : current)}
                          >
                            {label}<small>{range} km</small>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="filterFooter">
                    <span aria-live="polite">
                      {visibleCount.toLocaleString("es-AR")} de {count.toLocaleString("es-AR")}
                    </span>
                    <button type="button" disabled={filtersAreDefault} onClick={() => setFilters(filterBounds)}>
                      Restablecer
                    </button>
                  </div>
                </div>
              ) : <p className="panelLoading">Cargando rangos del catálogo…</p>}
            </section>
          ) : null}
        </div>
      </div>

      <div className="rightDock">
        <nav className="viewToolbar" aria-label="Controles de la vista">
          <button
            type="button"
            className="panelTrigger"
            aria-expanded={openPanel === "layers"}
            aria-controls="layers-panel"
            onClick={() => togglePanel("layers")}
          >
            Capas · relieve {reliefExaggeration}×{slabVisible ? " · Slab2" : ""}
          </button>
          <button
            type="button"
            className="panelTrigger panelTrigger--icon"
            aria-expanded={openPanel === "information"}
            aria-controls="information-panel"
            onClick={() => togglePanel("information")}
          >
            Información
          </button>
          <button
            type="button"
            className="panelTrigger"
            disabled={!visibleCount || !slabSummary || !surfaceStatus.includes("cargados")}
            onClick={() => views.current?.openProfile()}
          >
            Sección Cuyo · 31°S
          </button>
        </nav>

        {openPanel === "layers" ? (
          <section id="layers-panel" className="controlPanel layersPanel" aria-labelledby="layers-title">
            <div className="panelHeader">
              <div><p className="panelEyebrow">Vista 3D</p><h2 id="layers-title">Capas</h2></div>
              <button type="button" className="panelClose" onClick={() => setOpenPanel(null)} aria-label="Cerrar capas">×</button>
            </div>
            <div className="layerGroup">
              <div className="layerHeading"><strong>Relieve GEBCO</strong><span>{reliefExaggeration}× activo</span></div>
              <div className="segmentedControl" aria-label="Exageración vertical del relieve">
                {([1, 5, 10] as const).map((value) => (
                  <button key={value} aria-pressed={reliefExaggeration === value} onClick={() => views.current?.setRelief(value)}>{value}×</button>
                ))}
              </div>
              <small>La exageración modifica sólo la superficie y sus límites; no cambia hipocentros ni Slab2.</small>
            </div>
            <div className="layerRow">
              <div><strong>Modelo Slab2</strong><small>{slabStatus}</small></div>
              <button aria-pressed={slabVisible} disabled={!slabSummary} onClick={() => views.current?.toggleSlab()}>{slabVisible ? "Visible" : "Oculto"}</button>
            </div>
            <div className="layerRow layerRow--status">
              <div><strong>Contexto cartográfico</strong><small>{surfaceStatus}</small></div>
              <span>Activo</span>
            </div>
          </section>
        ) : null}

        {openPanel === "information" ? (
          <section id="information-panel" className="controlPanel informationPanel" aria-labelledby="information-title">
            <div className="panelHeader">
              <div><p className="panelEyebrow">Lectura y método</p><h2 id="information-title">Información</h2></div>
              <button type="button" className="panelClose" onClick={() => setOpenPanel(null)} aria-label="Cerrar información">×</button>
            </div>
            <div className="informationCopy">
              <p><strong>Interacción.</strong> Doble clic: centrar · rueda: zoom hacia el cursor · arrastrar: rotar · botón derecho: desplazar.</p>
              <p aria-live="polite"><strong>Traslación.</strong> {inversePanActive ? "Modo inverso activo: el movimiento también cambia la profundidad." : "Ambos botones + arrastrar mueve la escena en sentido inverso, también en profundidad."}</p>
              <p><strong>Hipocentros INPRES.</strong> Profundidad catalogada hacia abajo (−Y), escala {VERTICAL_EXAGGERATION}×.</p>
              <p><strong>GEBCO 2026.</strong> Modelo continuo derivado de fuentes heterogéneas; relieve {reliefExaggeration}× y nivel del mar 0 km. Líneas doradas: IGN. Líneas grises: Natural Earth 5.1.1.</p>
              <p><strong>USGS Slab2 2018.</strong> Modelo geofísico, no observación. Profundidad 1×; el control de relieve no lo modifica.</p>
              {slabSummary ? <p>Profundidad modelada: {slabSummary.depthRangeKm[0]}–{slabSummary.depthRangeKm[1]} km. UNC: {slabSummary.uncertaintyRangeKm[0]}–{slabSummary.uncertaintyRangeKm[1]} km; mediana {slabSummary.uncertaintyMedianKm} km. Referencia vertical exacta INPRES no documentada; superposición aproximada, no clasificación.</p> : null}
              <p>Contexto GEBCO y cartográfico: 100°O–8°E, 90°S–0°. El límite oriental termina antes de África continental.</p>
            </div>
            <details className="benchmark">
              <summary>Mediciones de esta sesión</summary>
              <dl>
                <dt>GeoJSON recibido</dt><dd>{formatMiB(metrics.decodedBytes)}</dd>
                <dt>Transferencia INPRES</dt><dd>{formatMiB(metrics.transferBytes)}</dd>
                <dt>Fetch / parse INPRES</dt><dd>{formatMs(metrics.fetchMs)} / {formatMs(metrics.parseMs)}</dd>
                <dt>BufferGeometry sismos</dt><dd>{formatMs(metrics.buildMs)}</dd>
                <dt>GEBCO recibido</dt><dd>{formatMiB(metrics.terrainBytes)}</dd>
                <dt>Cartografía recibida</dt><dd>{formatMiB(metrics.cartographyBytes)}</dd>
                <dt>Transferencia superficie</dt><dd>{formatMiB(metrics.surfaceTransferBytes)}</dd>
                <dt>Fetch / parse superficie</dt><dd>{formatMs(metrics.surfaceFetchMs)} / {formatMs(metrics.surfaceParseMs)}</dd>
                <dt>Construcción superficie</dt><dd>{formatMs(metrics.surfaceBuildMs)}</dd>
                <dt>Vértices / triángulos GEBCO</dt><dd>{metrics.terrainVertices?.toLocaleString("es-AR") ?? "—"} / {metrics.terrainTriangles?.toLocaleString("es-AR") ?? "—"}</dd>
                <dt>Slab2 recibido / transferido</dt><dd>{formatMiB(metrics.slabBytes)} / {formatMiB(metrics.slabTransferBytes)}</dd>
                <dt>Fetch / parse / geometría Slab2</dt><dd>{formatMs(metrics.slabFetchMs)} / {formatMs(metrics.slabParseMs)} / {formatMs(metrics.slabBuildMs)}</dd>
                <dt>Nodos válidos / triángulos Slab2</dt><dd>{metrics.slabVertices?.toLocaleString("es-AR") ?? "—"} / {metrics.slabTriangles?.toLocaleString("es-AR") ?? "—"}</dd>
                <dt>Primer frame completo</dt><dd>{formatMs(metrics.firstRenderMs)}</dd>
                <dt>Heap antes / después</dt><dd>{formatMiB(metrics.heapBefore)} / {formatMiB(metrics.heapAfter)}</dd>
                <dt>FPS aprox.</dt><dd>{metrics.fps?.toFixed(0) ?? "—"}</dd>
                <dt>Último picking</dt><dd>{formatMs(metrics.pickingMs)}</dd>
                <dt>Último filtrado</dt><dd>{formatMs(metrics.filterMs)}</dd>
                <dt>Draw calls</dt><dd>{metrics.drawCalls ?? "—"}</dd>
              </dl>
              <small>Mediciones orientativas del navegador. Para comparar formalmente usar build de producción y caché fría.</small>
            </details>
          </section>
        ) : null}

        <div className="compass" aria-label="Orientación dinámica del norte">
          <span ref={compassNeedle} className="compassNeedle">↑</span>
          <b>N</b>
        </div>
      </div>

      <aside className="depthLegend" aria-label="Leyenda de profundidad y capas activas">
        <strong>Profundidad</strong>
        <span><i className="legendShallow" />0–&lt;70 km</span>
        <span><i className="legendIntermediate" />70–&lt;300 km</span>
        <span><i className="legendDeep" />≥300 km</span>
        <div className="legendLayers">
          <small>Capas activas</small>
          <span><i className="legendLand" />GEBCO · relieve {reliefExaggeration}×</span>
          {slabVisible ? <span><i className="legendSlab" />Slab2</span> : null}
        </div>
      </aside>

      {!selected && !profileOpen ? <p className="selectionHint">Seleccioná un sismo para inspeccionarlo</p> : null}

      {profileOpen ? profileEvents && profileSamples ? (
        <CuyoSection events={profileEvents} samples={profileSamples} selected={selected} onPick={(event) => views.current?.selectEvent(event)} onClose={() => views.current?.closeProfile()} />
      ) : <div className="sectionLoading" role="status"><button onClick={() => views.current?.closeProfile()}>← Volver al mapa</button><p>{profileStatus || "Preparando sección…"}</p></div> : null}

      {!profileOpen && selected ? <EventInspector event={selected} onClose={() => views.current?.clearSelection()} /> : null}
    </main>
  );
}
