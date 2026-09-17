"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

import {
  assertCatalog,
  CATALOG_SOURCE_COMMIT,
  CATALOG_URL,
  type InpresFeature,
} from "@/lib/data/inpres";
import {
  assertGebcoArtifact,
  GEBCO_URL,
} from "@/lib/data/gebco";
import {
  geographicToScene,
  VERTICAL_EXAGGERATION,
} from "@/lib/geo/scene-coordinates";
import { createGebcoGeometry } from "@/lib/terrain/create-gebco-geometry";

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
  terrainTransferBytes?: number;
  terrainFetchMs?: number;
  terrainParseMs?: number;
  terrainBuildMs?: number;
  terrainVertices?: number;
  terrainTriangles?: number;
  drawCalls?: number;
};

type ViewActions = {
  region: () => void;
  all: () => void;
};

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
  return value === undefined ? "no disponible" : `${(value / 1048576).toFixed(1)} MiB`;
}

function depthColor(depthKm: number): [number, number, number] {
  if (depthKm < 70) return [0.96, 0.66, 0.34];
  if (depthKm < 300) return [0.32, 0.78, 0.87];
  return [0.72, 0.58, 0.93];
}

export default function SeismicViewer() {
  const canvasHost = useRef<HTMLDivElement>(null);
  const views = useRef<ViewActions | null>(null);
  const [status, setStatus] = useState("Cargando catálogo INPRES…");
  const [terrainStatus, setTerrainStatus] = useState("Cargando modelo GEBCO…");
  const [count, setCount] = useState(0);
  const [selected, setSelected] = useState<InpresFeature | null>(null);
  const [metrics, setMetrics] = useState<Metrics>({});

  useEffect(() => {
    const host = canvasHost.current;
    if (!host) return;

    let disposed = false;
    let animationFrame = 0;
    let pendingFirstRender = false;
    let catalogReady = false;
    let terrainReady = false;
    let features: InpresFeature[] = [];
    let catalogPoints: THREE.Points | null = null;
    let terrainMesh: THREE.Mesh | null = null;
    let selectedPoint: THREE.Points | null = null;
    let selectedDepthLine: THREE.Line | null = null;
    const fetchController = new AbortController();
    const startedAt = performance.now();
    const markLayerReady = () => {
      if (catalogReady && terrainReady) {
        pendingFirstRender = true;
        setMetrics((previous) => ({ ...previous, heapAfter: heapBytes() }));
      }
    };

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#071014");
    const camera = new THREE.PerspectiveCamera(46, 1, 1, 60000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    host.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.screenSpacePanning = true;
    controls.minDistance = 30;
    controls.maxDistance = 50000;

    const regionView = () => {
      controls.target.set(0, -150, 0);
      camera.position.set(1900, 2200, 3500);
      controls.update();
    };
    const allView = () => {
      if (!catalogPoints) return;
      catalogPoints.geometry.computeBoundingSphere();
      const sphere = catalogPoints.geometry.boundingSphere;
      if (!sphere) return;
      controls.target.copy(sphere.center);
      camera.position
        .copy(sphere.center)
        .add(new THREE.Vector3(0.75, 0.8, 1).normalize().multiplyScalar(sphere.radius * 2.4));
      controls.update();
    };
    views.current = { region: regionView, all: allView };
    regionView();

    // Cuadrícula del nivel 0 km: referencia geométrica, NO terreno ni costa.
    const grid = new THREE.GridHelper(5000, 20, 0x52666b, 0x243a40);
    scene.add(grid);
    const guideVertices: number[] = [-1500, 0, -1600, -1500, -750, -1600];
    for (let depth = 0; depth <= 750; depth += 150) {
      guideVertices.push(-1530, -depth, -1600, -1470, -depth, -1600);
    }
    const guide = new THREE.LineSegments(
      new THREE.BufferGeometry().setAttribute(
        "position",
        new THREE.Float32BufferAttribute(guideVertices, 3),
      ),
      new THREE.LineBasicMaterial({ color: 0x93a7a7 }),
    );
    scene.add(guide);

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
    let pointerDown: { x: number; y: number } | null = null;
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
      if (moved > 5) return; // La órbita no debe seleccionar un evento.

      const pickStart = performance.now();
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(pointer, camera);
      raycaster.params.Points.threshold = Math.max(
        3,
        camera.position.distanceTo(controls.target) * 0.003,
      );
      const hit = raycaster.intersectObject(catalogPoints, false)[0];
      if (hit?.index !== undefined) {
        const feature = features[hit.index];
        const position = (catalogPoints.geometry.getAttribute(
          "position",
        ) as THREE.BufferAttribute);
        const x = position.getX(hit.index);
        const y = position.getY(hit.index);
        const z = position.getZ(hit.index);
        selectedPoint?.position.set(x, y, z);
        if (selectedPoint) selectedPoint.visible = true;
        if (selectedDepthLine) {
          const linePositions = selectedDepthLine.geometry.getAttribute(
            "position",
          ) as THREE.BufferAttribute;
          linePositions.setXYZ(0, x, 0, z);
          linePositions.setXYZ(1, x, y, z);
          linePositions.needsUpdate = true;
          selectedDepthLine.geometry.computeBoundingSphere();
          selectedDepthLine.visible = true;
        }
        setSelected(feature);
      }
      setMetrics((previous) => ({
        ...previous,
        pickingMs: performance.now() - pickStart,
      }));
    };
    renderer.domElement.addEventListener("pointerdown", handlePointerDown);
    renderer.domElement.addEventListener("pointerup", handlePointerUp);

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
        const text = new TextDecoder().decode(bytes);
        const parseStart = performance.now();
        const parsed: unknown = JSON.parse(text);
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
        geometry.setAttribute(
          "position",
          new THREE.BufferAttribute(positions, 3),
        );
        geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
        catalogPoints = new THREE.Points(
          geometry,
          new THREE.PointsMaterial({
            size: 3,
            sizeAttenuation: false,
            vertexColors: true,
          }),
        );
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
        scene.add(selectedPoint);

        selectedDepthLine = new THREE.Line(
          new THREE.BufferGeometry().setAttribute(
            "position",
            new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, 0], 3),
          ),
          new THREE.LineBasicMaterial({ color: 0xffffff, depthTest: false }),
        );
        selectedDepthLine.visible = false;
        scene.add(selectedDepthLine);

        const resourceEntries = performance.getEntriesByName(
          response.url,
          "resource",
        ) as PerformanceResourceTiming[];
        const resource = resourceEntries.at(-1);
        setMetrics((previous) => ({
          ...previous,
          decodedBytes: bytes.byteLength,
          transferBytes: resource?.transferSize,
          fetchMs,
          parseMs,
          buildMs: performance.now() - buildStart,
          heapBefore,
          heapAfter: heapBytes(),
        }));
        setCount(features.length);
        setStatus("Catálogo cargado");
        catalogReady = true;
        markLayerReady();
      } catch (error) {
        if (!disposed) {
          setStatus(
            `No se pudo cargar el catálogo: ${error instanceof Error ? error.message : "error desconocido"}`,
          );
        }
      }
    };
    const loadTerrain = async () => {
      try {
        const fetchStart = performance.now();
        const response = await fetch(GEBCO_URL, {
          signal: fetchController.signal,
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const bytes = await response.arrayBuffer();
        if (disposed) return;
        const fetchMs = performance.now() - fetchStart;
        const parseStart = performance.now();
        const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes));
        assertGebcoArtifact(parsed);
        const parseMs = performance.now() - parseStart;
        const buildStart = performance.now();
        const terrain = createGebcoGeometry(parsed);
        terrainMesh = new THREE.Mesh(
          terrain.geometry,
          new THREE.MeshBasicMaterial({
            vertexColors: true,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.68,
            depthWrite: false,
          }),
        );
        terrainMesh.renderOrder = 1;
        scene.add(terrainMesh);

        const resourceEntries = performance.getEntriesByName(
          response.url,
          "resource",
        ) as PerformanceResourceTiming[];
        const resource = resourceEntries.at(-1);
        setMetrics((previous) => ({
          ...previous,
          terrainBytes: bytes.byteLength,
          terrainTransferBytes: resource?.transferSize,
          terrainFetchMs: fetchMs,
          terrainParseMs: parseMs,
          terrainBuildMs: performance.now() - buildStart,
          terrainVertices: terrain.vertices,
          terrainTriangles: terrain.triangles,
        }));
        setTerrainStatus("GEBCO cargado");
        terrainReady = true;
        markLayerReady();
      } catch (error) {
        if (!disposed) {
          setTerrainStatus(
            `GEBCO no disponible: ${error instanceof Error ? error.message : "error desconocido"}`,
          );
        }
      }
    };
    void loadCatalog();
    void loadTerrain();

    return () => {
      disposed = true;
      fetchController.abort();
      cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener("pointerdown", handlePointerDown);
      renderer.domElement.removeEventListener("pointerup", handlePointerUp);
      views.current = null;
      controls.dispose();
      grid.geometry.dispose();
      (grid.material as THREE.Material).dispose();
      guide.geometry.dispose();
      (guide.material as THREE.Material).dispose();
      for (const object of [
        catalogPoints,
        terrainMesh,
        selectedPoint,
        selectedDepthLine,
      ]) {
        object?.geometry.dispose();
        if (object?.material instanceof THREE.Material) object.material.dispose();
      }
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  const properties = selected?.properties;
  return (
    <main className="viewer">
      <div ref={canvasHost} className="scene" aria-label="Escena tridimensional de sismos INPRES" />

      <header className="viewerHeader">
        <p className="eyebrow">Catálogo INPRES · snapshot 14/09/2026</p>
        <h1>Sismos Visuales</h1>
        <p>{status}{count > 0 ? ` · ${count.toLocaleString("es-AR")} eventos` : ""}<br />{terrainStatus}</p>
      </header>

      <div className="viewControls" aria-label="Vistas de cámara">
        <button onClick={() => views.current?.region()}>Región principal</button>
        <button onClick={() => views.current?.all()}>Todo el catálogo</button>
      </div>

      <aside className="depthLegend" aria-label="Referencias de la escena">
        <strong>Profundidad (km)</strong>
        <span><i className="legendShallow" />0–70</span>
        <span><i className="legendIntermediate" />70–300</span>
        <span><i className="legendDeep" />más de 300</span>
        <small>Hacia abajo (−Y) · escala vertical {VERTICAL_EXAGGERATION}×</small>
        <small>Cuadrícula = plano 0 km, no terreno. Este +X · norte −Z.</small>
        <strong className="terrainTitle">Superficie GEBCO 2026</strong>
        <span><i className="legendLand" />elevación &gt; 0 m</span>
        <span><i className="legendOcean" />batimetría &lt; 0 m</span>
        <small>Modelo continuo externo, no terreno medido uniformemente · nivel del mar nominal 0 km · BBOX científico provisional.</small>
        <small>Vista inicial centrada en región andina; “Todo el catálogo” incluye registros lejanos.</small>
      </aside>

      <aside className="inspector" aria-live="polite">
        <h2>Evento</h2>
        {properties ? (
          <>
            <dl>
              <dt>Fecha</dt><dd>{properties.fecha}</dd>
              <dt>Hora del catálogo</dt><dd>{properties.hora}</dd>
              <dt>Latitud</dt><dd>{properties.latitud.toFixed(3)}°</dd>
              <dt>Longitud</dt><dd>{properties.longitud.toFixed(3)}°</dd>
              <dt>Profundidad</dt><dd>{properties.profundidad.toFixed(1)} km</dd>
              <dt>Magnitud reportada</dt><dd>{properties.magnitud.toFixed(1)}</dd>
              <dt>Ubicación original</dt><dd>{properties.ubicacion_original || "No disponible"}</dd>
              <dt>Sentido</dt><dd>{properties.sentido === "Si" ? "Marcado como sentido" : properties.sentido === "No" ? "Sin marca de sentido" : "No disponible"}</dd>
              <dt>ID derivado</dt><dd className="eventId">{properties.id}</dd>
            </dl>
            <p className="caveat">Hora local argentina (UTC−3) cuando corresponde a la fuente. Los segundos de eventos recientes pueden ser sintéticos. Tipo de magnitud, revisión e incertidumbres no disponibles. “Sin marca de sentido” no demuestra que nadie lo percibió.</p>
          </>
        ) : (
          <p>Hacé clic en un punto para inspeccionar el evento.</p>
        )}
        <p className="source">Fuente: INPRES vía inpres-sismos · commit {CATALOG_SOURCE_COMMIT.slice(0, 7)}. Los puntos son hipocentros catalogados; la cuadrícula no es topografía.</p>
      </aside>

      <details className="benchmark">
        <summary>Mediciones de esta sesión</summary>
        <dl>
          <dt>GeoJSON recibido</dt><dd>{formatMiB(metrics.decodedBytes)}</dd>
          <dt>Transferencia reportada</dt><dd>{formatMiB(metrics.transferBytes)}</dd>
          <dt>Fetch</dt><dd>{formatMs(metrics.fetchMs)}</dd>
          <dt>JSON.parse</dt><dd>{formatMs(metrics.parseMs)}</dd>
          <dt>BufferGeometry</dt><dd>{formatMs(metrics.buildMs)}</dd>
          <dt>Primer frame completo</dt><dd>{formatMs(metrics.firstRenderMs)}</dd>
          <dt>Heap antes/después</dt><dd>{formatMiB(metrics.heapBefore)} / {formatMiB(metrics.heapAfter)}</dd>
          <dt>FPS aprox.</dt><dd>{metrics.fps?.toFixed(0) ?? "—"}</dd>
          <dt>Último picking</dt><dd>{formatMs(metrics.pickingMs)}</dd>
          <dt>GEBCO recibido</dt><dd>{formatMiB(metrics.terrainBytes)}</dd>
          <dt>Transferencia GEBCO</dt><dd>{formatMiB(metrics.terrainTransferBytes)}</dd>
          <dt>Fetch/parse GEBCO</dt><dd>{formatMs(metrics.terrainFetchMs)} / {formatMs(metrics.terrainParseMs)}</dd>
          <dt>Geometría GEBCO</dt><dd>{formatMs(metrics.terrainBuildMs)}</dd>
          <dt>Vértices/triángulos</dt><dd>{metrics.terrainVertices?.toLocaleString("es-AR") ?? "—"} / {metrics.terrainTriangles?.toLocaleString("es-AR") ?? "—"}</dd>
          <dt>Draw calls</dt><dd>{metrics.drawCalls ?? "—"}</dd>
        </dl>
        <small>Mediciones orientativas del navegador; el heap y bytes transferidos pueden no estar disponibles. Para comparar, usar build de producción y caché fría.</small>
      </details>
    </main>
  );
}
