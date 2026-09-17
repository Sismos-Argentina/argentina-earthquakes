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
import CuyoSection from "./CuyoSection";
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

type ViewMode = "scientific" | "territorial" | "catalog";
type ReliefExaggeration = 1 | 5 | 10;

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
};

type ViewActions = {
  scientific: () => void;
  territorial: () => void;
  catalog: () => void;
  setRelief: (value: ReliefExaggeration) => void;
  toggleSlab: () => void;
  openProfile: () => void;
  closeProfile: () => void;
  selectEvent: (feature: InpresFeature) => void;
};

type TerrainLayer = {
  group: THREE.Group;
  labels: THREE.Group;
  surface: THREE.Mesh;
};

const TERRITORIAL_BBOX: [number, number, number, number] = [-85, -90, -25, -10];
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
) {
  const built = createGebcoGeometry(terrain);
  const terrainMesh = new THREE.Mesh(
    built.geometry,
    new THREE.MeshLambertMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.84,
      depthWrite: false,
    }),
  );
  terrainMesh.renderOrder = 2;

  const displayBbox =
    profile === "scientific" ? terrain.grid.bbox : TERRITORIAL_BBOX;
  const group = new THREE.Group();
  group.add(
    createSeaLevel(terrain.grid.bbox),
    terrainMesh,
    createCartographyGroup(cartography, terrain, displayBbox),
  );
  group.scale.y = reliefExaggeration;
  return {
    layer: { group, labels: createMapLabels(profile), surface: terrainMesh },
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
  const [selected, setSelected] = useState<InpresFeature | null>(null);
  const [activeView, setActiveView] = useState<ViewMode>("scientific");
  const [reliefExaggeration, setReliefExaggeration] =
    useState<ReliefExaggeration>(INITIAL_RELIEF_EXAGGERATION);
  const [metrics, setMetrics] = useState<Metrics>({});
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileStatus, setProfileStatus] = useState("");
  const [profileEvents, setProfileEvents] = useState<ProjectedEvent[] | null>(null);
  const [profileSamples, setProfileSamples] = useState<ProfileSample[] | null>(null);

  useEffect(() => {
    const host = canvasHost.current;
    if (!host) return;

    let disposed = false;
    let animationFrame = 0;
    let pendingFirstRender = false;
    let catalogReady = false;
    let surfaceReady = false;
    let features: InpresFeature[] = [];
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
    let currentView: ViewMode = "scientific";
    let beforeProfile: { camera: THREE.Vector3; target: THREE.Vector3; view: ViewMode; relief: ReliefExaggeration } | null = null;
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

    const setLayerVisibility = (mode: ViewMode) => {
      currentView = mode;
      const contextVisible = mode === "territorial";
      if (terrainLayers.scientific) {
        terrainLayers.scientific.group.visible = !contextVisible;
        terrainLayers.scientific.labels.visible = !contextVisible;
      }
      if (terrainLayers.context) {
        terrainLayers.context.group.visible = contextVisible;
        terrainLayers.context.labels.visible = contextVisible;
      }
      if (depthGuide) depthGuide.visible = !contextVisible;
      setActiveView(mode);
    };

    const scientificView = () => {
      setLayerVisibility("scientific");
      const [x, , z] = geographicToScene(-66, -39, 0);
      controls.target.set(x, -100, z);
      camera.position.set(x, 4800, z + 4300);
      controls.update();
    };
    const territorialView = () => {
      setLayerVisibility("territorial");
      const [x, , z] = geographicToScene(-55, -52, 0);
      controls.target.set(x, -80, z);
      camera.position.set(x, 11200, z + 10400);
      controls.update();
    };
    const catalogView = () => {
      setLayerVisibility("catalog");
      if (!catalogPoints) return;
      catalogPoints.geometry.computeBoundingSphere();
      const sphere = catalogPoints.geometry.boundingSphere;
      if (!sphere) return;
      controls.target.copy(sphere.center);
      camera.position
        .copy(sphere.center)
        .add(
          new THREE.Vector3(0.35, 0.75, 1)
            .normalize()
            .multiplyScalar(sphere.radius * 2.5),
        );
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
      setSelected(feature);
    };
    const closeProfile = () => {
      profileGeneration++;
      if (profileTimer) clearTimeout(profileTimer);
      footprint.visible = false;
      setProfileOpen(false);
      if (beforeProfile) {
        setLayerVisibility(beforeProfile.view);
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
      beforeProfile = { camera: camera.position.clone(), target: controls.target.clone(), view: currentView, relief: currentRelief };
      scientificView();
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
      scientific: scientificView,
      territorial: territorialView,
      catalog: catalogView,
      setRelief,
      toggleSlab,
      openProfile,
      closeProfile,
      selectEvent,
    };
    scientificView();

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
      const activeTerrain = currentView === "territorial"
        ? terrainLayers.context
        : terrainLayers.scientific;
      const point = activeTerrain
        ? raycaster.intersectObject(activeTerrain.surface, false)[0]?.point
        : undefined;
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
        const feature = features[hit.index];
        selectEvent(feature);
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
        const positions = new Float32Array(features.length * 3);
        const colors = new Float32Array(features.length * 3);
        for (let index = 0; index < features.length; index++) {
          const feature = features[index];
          const [longitude, latitude] = feature.geometry.coordinates;
          const depth = feature.properties.profundidad;
          const [x, y, z] = geographicToScene(longitude, latitude, depth);
          const offset = index * 3;
          positions.set([x, y, z], offset);
          colors.set(depthColor(depth), offset);
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
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
        setLayerVisibility("scientific");

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

  const activeViewLabel =
    activeView === "territorial"
      ? "Contexto territorial completo"
      : activeView === "catalog"
        ? "Extensión del catálogo"
        : "Área científica principal";

  return (
    <main className={profileOpen ? "viewer viewer--section" : "viewer"}>
      <div
        ref={canvasHost}
        className="scene"
        aria-label="Escena tridimensional de sismos INPRES, relieve GEBCO, cartografía y modelo geofísico Slab2"
      />

      <header className="viewerHeader">
        <p className="eyebrow">Catálogo INPRES · snapshot 14/09/2026</p>
        <h1>Sismos Visuales</h1>
        <p>
          {status}
          {count > 0 ? ` · ${count.toLocaleString("es-AR")} eventos` : ""}
          <br />
          {surfaceStatus}
          <br />
          {slabStatus}
        </p>
      </header>

      <div className="viewControls" aria-label="Vistas de cámara">
        <button
          aria-pressed={activeView === "scientific"}
          onClick={() => views.current?.scientific()}
        >
          Área científica
        </button>
        <button
          aria-pressed={activeView === "territorial"}
          onClick={() => views.current?.territorial()}
        >
          Contexto territorial
        </button>
        <button
          aria-pressed={activeView === "catalog"}
          onClick={() => views.current?.catalog()}
        >
          Todo el catálogo
        </button>
      </div>

      <div className="reliefControls" aria-label="Exageración vertical del relieve">
        <span>Relieve</span>
        {([1, 5, 10] as const).map((value) => (
          <button
            key={value}
            aria-pressed={reliefExaggeration === value}
            onClick={() => views.current?.setRelief(value)}
          >
            {value}×
          </button>
        ))}
      </div>

      <div className="slabControl">
        <button
          aria-pressed={slabVisible}
          disabled={!slabSummary}
          onClick={() => views.current?.toggleSlab()}
        >
          Modelo Slab2 {slabVisible ? "visible" : "oculto"}
        </button>
      </div>

      <div className="profileControl">
        <button disabled={!count || !slabSummary || !surfaceStatus.includes("cargados")} onClick={() => profileOpen ? views.current?.closeProfile() : views.current?.openProfile()} aria-expanded={profileOpen}>
          {profileOpen ? "Cerrar sección Cuyo" : "Abrir sección Cuyo · 31°S"}
        </button>
      </div>

      <div className="compass" aria-label="Orientación dinámica del norte">
        <span ref={compassNeedle} className="compassNeedle">↑</span>
        <b>N</b>
      </div>

      <aside className="depthLegend" aria-label="Referencias de la escena">
        <strong>{activeViewLabel}</strong>
        <span><i className="legendShallow" />0 ≤ d &lt; 70 km</span>
        <span><i className="legendIntermediate" />70 ≤ d &lt; 300 km</span>
        <span><i className="legendDeep" />300 km o más (d ≥ 300)</span>
        <small>
          Hipocentros: profundidad hacia abajo (−Y), escala {VERTICAL_EXAGGERATION}×.
        </small>
        <small>
          Doble clic: centrar el mapa · rueda: zoom hacia el cursor · arrastrar: rotar · botón derecho: desplazar.
        </small>
        <small aria-live="polite">
          {inversePanActive
            ? "Traslación inversa activa · el movimiento también cambia la profundidad."
            : "Ambos botones + arrastrar: mover la escena en sentido inverso, también en profundidad."}
        </small>
        <strong className="terrainTitle">GEBCO 2026</strong>
        <span><i className="legendLand" />topografía sobre 0 m</span>
        <span><i className="legendOcean" />batimetría bajo 0 m</span>
        <small>
          Relieve {reliefExaggeration}× · nivel del mar 0 km. La exageración afecta sólo la superficie y sus límites.
        </small>
        <small>
          Líneas doradas: IGN. Líneas grises: Natural Earth 5.1.1.
        </small>
        <strong className="terrainTitle">USGS Slab2 2018</strong>
        <span><i className="legendSlab" />superficie modelada</span>
        <small>
          Modelo geofísico, no observación. Profundidad Slab2 1×; el control de relieve no la modifica.
        </small>
        {slabSummary ? (
          <small>
            Profundidad modelada: {slabSummary.depthRangeKm[0]}–{slabSummary.depthRangeKm[1]} km. UNC: {slabSummary.uncertaintyRangeKm[0]}–{slabSummary.uncertaintyRangeKm[1]} km; mediana {slabSummary.uncertaintyMedianKm} km. Referencia vertical exacta INPRES no documentada; superposición aproximada, no clasificación.
          </small>
        ) : null}
        {activeView === "territorial" ? (
          <small>
            El contexto IGN continúa hasta 90°S; el GEBCO local termina en 77°S. El tramo restante no representa elevación.
          </small>
        ) : null}
      </aside>

      {profileOpen ? profileEvents && profileSamples ? (
        <CuyoSection events={profileEvents} samples={profileSamples} selected={selected} onPick={(event) => views.current?.selectEvent(event)} onClose={() => views.current?.closeProfile()} />
      ) : <div className="sectionLoading" role="status"><button onClick={() => views.current?.closeProfile()}>← Volver al mapa</button><p>{profileStatus || "Preparando sección…"}</p></div> : null}

      {!profileOpen ? <EventInspector event={selected} /> : null}

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
          <dt>Draw calls</dt><dd>{metrics.drawCalls ?? "—"}</dd>
        </dl>
        <small>
          Mediciones orientativas del navegador. Para comparar formalmente usar build de producción y caché fría.
        </small>
      </details>
    </main>
  );
}
