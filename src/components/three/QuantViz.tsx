"use client";

import { useRef, useMemo, useState, useCallback, useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";
import * as THREE from "three";

// ===== Types =====
export interface DataPoint3D {
  id: string;
  x: number;
  y: number;
  z: number;
  value: number;
  isWin: boolean;
  isBreakEven?: boolean;
  symbol?: string;
  pl?: number;
  plPercent?: number;
  rr?: number;
  positionSize?: number;
  date?: string;
  label?: string;
  type?: "LONG" | "SHORT";
}

export interface QuantVizProps {
  data: DataPoint3D[];
  chartType?: "scatter" | "surface" | "equity";
  height?: number;
  colorBy?: "winLoss" | "pl" | "assetType";
  sizeBy?: "positionSize" | "plAbs" | "uniform";
  showLabels?: boolean;
  showGrid?: boolean;
  smoothSurface?: boolean;
  orbitMode?: boolean;
  viewPreset?: "isometric" | "top" | "front" | "side" | "custom";
  onHover?: (point: DataPoint3D | null) => void;
  onClick?: (point: DataPoint3D) => void;
}

// ===== Constants =====
const AXIS_COLORS = { x: "#ef4444", y: "#34d399", z: "#3b82f6" };
const BG_COLOR = "#0f172a";

const VIEW_PRESETS: Record<string, [number, number, number]> = {
  isometric: [4.5, 3.5, 4.5],
  top: [0, 7, 0.01],
  front: [0, 0, 7],
  side: [7, 0, 0],
};

// ===== Shared geometry cache (created once, reused across all instances) =====
const SPHERE_GEO = new THREE.SphereGeometry(1, 16, 16);
const CONE_GEO = new THREE.ConeGeometry(0.15, 0.2, 8);

// ===== Helpers =====
function getPointColor(point: DataPoint3D, colorBy: string): string {
  if (colorBy === "winLoss") {
    if (point.isBreakEven) return "#64748b";
    return point.isWin ? "#34d399" : "#f87171";
  }
  if (colorBy === "pl" && point.pl !== undefined) {
    const norm = Math.max(-1, Math.min(1, point.pl / 500));
    if (norm > 0) return `hsl(${120 - norm * 60}, 70%, ${50 + norm * 20}%)`;
    return `hsl(0, 70%, ${50 - norm * 20}%)`;
  }
  if (colorBy === "assetType") {
    const symbol = point.symbol || "";
    const hash = symbol.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    return `hsl(${(hash * 137.5) % 360}, 60%, 55%)`;
  }
  return "#34d399";
}

function getPointSize(point: DataPoint3D, sizeBy: string): number {
  let size = 0.12;
  if (sizeBy === "positionSize" && point.positionSize)
    size = 0.06 + Math.min(point.positionSize / 1000, 0.3);
  else if (sizeBy === "plAbs" && point.pl)
    size = 0.06 + Math.min(Math.abs(point.pl) / 500, 0.3);
  return Math.max(0.04, Math.min(size, 0.4));
}

// ===== Static axis geometry: pre-built merged line segments =====
const AXIS_LEN = 5;

function buildAxisLines() {
  const verts: number[] = [];
  const cols: number[] = [];
  const push = (x1: number, y1: number, z1: number, x2: number, y2: number, z2: number, r: number, g: number, b: number) => {
    verts.push(x1, y1, z1, x2, y2, z2);
    cols.push(r, g, b, r, g, b);
  };
  push(-AXIS_LEN, 0, 0, AXIS_LEN, 0, 0, 1, 0.27, 0.27);
  push(0, -AXIS_LEN * 0.8, 0, 0, AXIS_LEN, 0, 0.2, 0.83, 0.6);
  push(0, 0, -AXIS_LEN, 0, 0, AXIS_LEN, 0.23, 0.51, 0.96);
  return { verts: new Float32Array(verts), cols: new Float32Array(cols) };
}

const AXIS_CACHE = buildAxisLines();

function AxisLines() {
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(AXIS_CACHE.verts, 3));
    g.setAttribute("color", new THREE.BufferAttribute(AXIS_CACHE.cols, 3));
    return g;
  }, []);
  return (
    <lineSegments geometry={geo}>
      <lineBasicMaterial vertexColors transparent opacity={0.6} />
    </lineSegments>
  );
}

// ===== Merged Grid: single LineSegments geometry =====
function Grid3D({ size = 6, divisions = 6 }) {
  const grid = useMemo(() => {
    const half = size / 2;
    const step = size / divisions;
    const verts: number[] = [];
    for (let i = -half; i <= half + 0.001; i += step) {
      verts.push(i, 0, -half, i, 0, half);
      verts.push(-half, 0, i, half, 0, i);
    }
    return new Float32Array(verts);
  }, [size, divisions]);

  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(grid, 3));
    return g;
  }, [grid]);

  return (
    <lineSegments geometry={geo}>
      <lineBasicMaterial color="#94a3b8" transparent opacity={0.1} />
    </lineSegments>
  );
}

// ===== Axis arrows (memoized) =====
const AXIS_ARROW_DATA = [
  { from: [-AXIS_LEN, 0, 0], to: [AXIS_LEN, 0, 0], label: "X", color: AXIS_COLORS.x },
  { from: [0, -AXIS_LEN * 0.8, 0], to: [0, AXIS_LEN, 0], label: "Y", color: AXIS_COLORS.y },
  { from: [0, 0, -AXIS_LEN], to: [0, 0, AXIS_LEN], label: "Z", color: AXIS_COLORS.z },
];

function AxisArrows() {
  return (
    <group>
      {AXIS_ARROW_DATA.map((d, i) => {
        const fx = d.from[0], fy = d.from[1], fz = d.from[2];
        const tx = d.to[0], ty = d.to[1], tz = d.to[2];
        const dx = tx - fx, dy = ty - fy, dz = tz - fz;
        const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const nx = dx / len, ny = dy / len, nz = dz / len;

        return (
          <group key={i}>
            {/* Arrow head */}
            <mesh
              position={[tx, ty, tz]}
              quaternion={new THREE.Quaternion().setFromUnitVectors(
                new THREE.Vector3(0, 1, 0),
                new THREE.Vector3(nx, ny, nz)
              )}
            >
              <primitive object={CONE_GEO} />
              <meshBasicMaterial color={d.color} transparent opacity={0.6} />
            </mesh>
            {/* Label */}
            <Text
              position={[tx + nx * 0.35, ty + ny * 0.35, tz + nz * 0.35]}
              fontSize={0.25}
              color={d.color}
              anchorX="center"
              anchorY="middle"
            >
              {d.label}
            </Text>
          </group>
        );
      })}
    </group>
  );
}

// ===== Axis tick labels (rebuilt only when range changes) =====
function AxisTickLabels({ ranges }: { ranges: Record<string, [number, number]> }) {
  const labels = useMemo(() => {
    const result: { pos: [number, number, number]; val: string; axis: string }[] = [];
    const add = (axis: "x" | "y" | "z") => {
      const [min, max] = ranges[axis];
      const steps = 5;
      const step = (max - min) / steps;
      for (let i = 0; i <= steps; i++) {
        const val = min + i * step;
        const formatted = val.toFixed(1);
        if (axis === "x") result.push({ pos: [val, -0.3, 0], val: formatted, axis });
        else if (axis === "y") result.push({ pos: [-0.3, val, 0], val: formatted, axis });
        else result.push({ pos: [0, -0.3, val], val: formatted, axis });
      }
    };
    add("x"); add("y"); add("z");
    return result;
  }, [ranges]);

  return (
    <group>
      {labels.map((l, i) => (
        <Text
          key={i}
          position={l.pos}
          fontSize={0.1}
          color="#475569"
          anchorX={l.axis === "x" ? "center" : "right"}
          anchorY={l.axis === "y" ? "middle" : "top"}
        >
          {l.val}
        </Text>
      ))}
    </group>
  );
}

// ===== Instanced Scatter Points (1 draw call for all points!) =====
function InstancedPoints({
  data,
  colorBy,
  sizeBy,
  showLabels,
  onPointHover,
  onPointClick,
  hoveredId,
  setHoveredId,
}: {
  data: DataPoint3D[];
  colorBy: string;
  sizeBy: string;
  showLabels: boolean;
  onPointHover: (point: DataPoint3D | null, screenPos?: { x: number; y: number }) => void;
  onPointClick: (point: DataPoint3D) => void;
  hoveredId: string | null;
  setHoveredId: (id: string | null) => void;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const dataRef = useRef<DataPoint3D[]>(data);
  // Sync ref with latest data
  useEffect(() => { dataRef.current = data; }, [data]);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tmpColor = useMemo(() => new THREE.Color(), []);

  // Update instance matrices and colors when data changes
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh || !data.length) return;
    const count = data.length;

    // Ensure instanceColor buffer exists
    if (!mesh.instanceColor || mesh.instanceColor.count !== count) {
      mesh.instanceColor = new THREE.InstancedBufferAttribute(
        new Float32Array(count * 3), 3
      );
    }

    for (let i = 0; i < count; i++) {
      const p = data[i];
      const s = getPointSize(p, sizeBy);
      dummy.position.set(p.x, p.y, p.z);
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);

      tmpColor.set(getPointColor(p, colorBy));
      mesh.setColorAt(i, tmpColor);
    }

    mesh.instanceMatrix.needsUpdate = true;
    (mesh.instanceColor as THREE.InstancedBufferAttribute).needsUpdate = true;
  }, [data, colorBy, sizeBy, dummy, tmpColor]);

  const handlePointerOver = useCallback((e: THREE.Event) => {
    const ev = e as unknown as { instanceId: number; clientX: number; clientY: number; stopPropagation: () => void };
    ev.stopPropagation();
    const idx = ev.instanceId;
    if (idx !== undefined && dataRef.current[idx]) {
      const point = dataRef.current[idx];
      setHoveredId(point.id);
      onPointHover(point, { x: ev.clientX, y: ev.clientY });
      document.body.style.cursor = "pointer";
    }
  }, [onPointHover, setHoveredId]);

  const handlePointerOut = useCallback(() => {
    setHoveredId(null);
    onPointHover(null);
    document.body.style.cursor = "default";
  }, [onPointHover, setHoveredId]);

  const handleClick = useCallback((e: THREE.Event) => {
    const ev = e as unknown as { instanceId: number; stopPropagation: () => void };
    ev.stopPropagation();
    const idx = ev.instanceId;
    if (idx !== undefined && dataRef.current[idx]) {
      onPointClick(dataRef.current[idx]);
    }
  }, [onPointClick]);

  if (!data.length) return null;

  return (
    <group>
      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, data.length]}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
        frustumCulled={false}
      >
        <primitive object={SPHERE_GEO} />
        <meshStandardMaterial
          transparent
          opacity={0.85}
          metalness={0.15}
          roughness={0.3}
          vertexColors
        />
      </instancedMesh>

      {/* Hover ring: a larger sphere at the hovered position */}
      {hoveredId && (() => {
        const idx = data.findIndex((d) => d.id === hoveredId);
        if (idx === -1) return null;
        const p = data[idx];
        const s = getPointSize(p, sizeBy) * 1.6;
        return (
          <mesh position={[p.x, p.y, p.z]}>
            <sphereGeometry args={[s, 16, 16]} />
            <meshBasicMaterial
              color={getPointColor(p, colorBy)}
              transparent
              opacity={0.4}
              depthWrite={false}
            />
          </mesh>
        );
      })()}

      {/* Labels */}
      {showLabels && data.map((p) => p.label && (
        <Text
          key={p.id}
          position={[p.x, p.y + getPointSize(p, sizeBy) + 0.18, p.z]}
          fontSize={0.1}
          color="#94a3b8"
          anchorX="center"
          anchorY="bottom"
        >
          {p.label}
        </Text>
      ))}
    </group>
  );
}

// ===== Equity Line (optimized: precomputed area geometry) =====
function EquityLine({
  data,
  onPointHover,
  onPointClick,
}: {
  data: DataPoint3D[];
  onPointHover: (point: DataPoint3D | null, screenPos?: { x: number; y: number }) => void;
  onPointClick: (point: DataPoint3D) => void;
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Build line + area geometry (all pre-constructed in useMemo)
  const { line, areaGeo } = useMemo(() => {
    if (!data.length) return { line: null, areaGeo: null };
    const floor = Math.min(...data.map((d) => d.y)) - 0.2;

    // Line
    const lineVerts = data.flatMap((d) => [d.x, d.y, d.z]);
    const lGeo = new THREE.BufferGeometry();
    lGeo.setAttribute("position", new THREE.Float32BufferAttribute(lineVerts, 3));
    const lMat = new THREE.LineBasicMaterial({ color: "#34d399", transparent: true, opacity: 0.7 });
    const l = new THREE.Line(lGeo, lMat);

    // Area fill (triangles)
    const areaVerts: number[] = [];
    for (let i = 0; i < data.length - 1; i++) {
      const a = data[i], b = data[i + 1];
      areaVerts.push(a.x, a.y, a.z, b.x, b.y, b.z, b.x, floor, b.z);
      areaVerts.push(a.x, a.y, a.z, b.x, floor, b.z, a.x, floor, a.z);
    }
    const aGeo = new THREE.BufferGeometry();
    aGeo.setAttribute("position", new THREE.Float32BufferAttribute(areaVerts, 3));

    return { line: l, areaGeo: aGeo };
  }, [data]);

  if (!data.length || !line) return null;

  return (
    <group>
      {/* Line (using primitive to avoid SVG <line> conflict) */}
      <primitive object={line} />
      {/* Area fill */}
      {areaGeo && data.length > 1 && (
        <mesh geometry={areaGeo}>
          <meshBasicMaterial color="#34d399" transparent opacity={0.06} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      )}
      {/* Points */}
      {data.map((d, i) => {
        const isHovered = hoveredIdx === i;
        return (
          <mesh
            key={i}
            position={[d.x, d.y, d.z]}
            onPointerOver={(e) => {
              e.stopPropagation();
              setHoveredIdx(i);
              onPointHover(d, { x: e.clientX, y: e.clientY });
              document.body.style.cursor = "pointer";
            }}
            onPointerOut={() => {
              setHoveredIdx(null);
              onPointHover(null);
              document.body.style.cursor = "default";
            }}
            onClick={() => onPointClick(d)}
          >
            <sphereGeometry args={[isHovered ? 0.1 : 0.06, 8, 8]} />
            <meshBasicMaterial color={d.isWin ? "#34d399" : "#f87171"} />
          </mesh>
        );
      })}
    </group>
  );
}

// ===== Surface Mesh =====
function SurfaceMesh({ data, smoothSurface }: { data: DataPoint3D[]; smoothSurface: boolean }) {
  const geometry = useMemo(() => {
    if (!data.length) return null;
    const size = Math.ceil(Math.sqrt(data.length));
    const vertices: number[] = [];
    const indices: number[] = [];
    const colors: number[] = [];

    for (let i = 0; i < data.length; i++) {
      const d = data[i];
      vertices.push(d.x, d.y, d.z);
      const c = new THREE.Color(d.isWin ? "#34d399" : "#f87171");
      colors.push(c.r, c.g, c.b);
    }

    for (let row = 0; row < size - 1; row++) {
      for (let col = 0; col < size - 1; col++) {
        const a = row * size + col;
        const b = row * size + col + 1;
        const c = (row + 1) * size + col;
        const d2 = (row + 1) * size + col + 1;
        if (a < data.length && b < data.length && c < data.length && d2 < data.length) {
          indices.push(a, b, c, b, d2, c);
        }
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }, [data]);

  if (!geometry) return null;

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial
        vertexColors
        transparent
        opacity={0.45}
        side={THREE.DoubleSide}
        metalness={0.1}
        roughness={0.5}
        wireframe={!smoothSurface}
      />
    </mesh>
  );
}

// ===== Camera Controller =====
function CameraController({
  viewPreset,
  controlsRef,
}: {
  viewPreset: string;
  controlsRef: React.MutableRefObject<{ target: THREE.Vector3 } | null>;
}) {
  const { camera, invalidate } = useThree();

  useEffect(() => {
    if (viewPreset === "custom" || !controlsRef.current) return;

    const target = VIEW_PRESETS[viewPreset];
    if (!target) return;

    const [x, y, z] = target;
    const startPos = camera.position.clone();
    const endPos = new THREE.Vector3(x, y, z);
    const duration = 400; // shorter animation
    const startTime = performance.now();

    function animate() {
      const elapsed = performance.now() - startTime;
      const t = Math.min(elapsed / duration, 1);
      const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      camera.position.lerpVectors(startPos, endPos, ease);
      if (controlsRef.current) controlsRef.current.target.set(0, 0, 0);
      invalidate();
      if (t < 1) requestAnimationFrame(animate);
    }
    animate();
  }, [viewPreset, camera, controlsRef, invalidate]);

  return null;
}

// ===== Main Scene =====
function Scene({
  data, chartType, colorBy, sizeBy, showLabels, showGrid, smoothSurface,
  orbitMode, viewPreset, onPointHover, onPointClick,
  hoveredId, setHoveredId,
}: {
  data: DataPoint3D[];
  chartType: string;
  colorBy: string;
  sizeBy: string;
  showLabels: boolean;
  showGrid: boolean;
  smoothSurface: boolean;
  orbitMode: boolean;
  viewPreset: string;
  onPointHover: (point: DataPoint3D | null, screenPos?: { x: number; y: number }) => void;
  onPointClick: (point: DataPoint3D) => void;
  hoveredId: string | null;
  setHoveredId: (id: string | null) => void;
}) {
  const controlsRef = useRef<{ target: THREE.Vector3 } | null>(null);
  const { camera } = useThree();

  useEffect(() => {
    if (viewPreset === "custom") {
      camera.position.set(4.5, 3.5, 4.5);
      camera.lookAt(0, 0, 0);
    }
  }, [camera, viewPreset]);

  const range = useMemo(() => {
    if (!data.length) return { x: [-3, 3] as [number, number], y: [-3, 3] as [number, number], z: [-3, 3] as [number, number] };
    const expand = (vals: number[]): [number, number] => {
      const min = Math.min(...vals);
      const max = Math.max(...vals);
      const pad = Math.max((max - min) * 0.15, 0.5);
      return [min - pad, max + pad];
    };
    return {
      x: expand(data.map((d) => d.x)),
      y: expand(data.map((d) => d.y)),
      z: expand(data.map((d) => d.z)),
    };
  }, [data]);

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 10, 5]} intensity={0.8} />
      <directionalLight position={[-5, 5, -5]} intensity={0.3} />
      <color attach="background" args={[BG_COLOR]} />

      {showGrid && <Grid3D size={10} divisions={10} />}
      <AxisLines />
      <AxisArrows />
      <AxisTickLabels ranges={range} />

      {chartType === "scatter" && (
        <InstancedPoints
          data={data}
          colorBy={colorBy}
          sizeBy={sizeBy}
          showLabels={showLabels}
          onPointHover={onPointHover}
          onPointClick={onPointClick}
          hoveredId={hoveredId}
          setHoveredId={setHoveredId}
        />
      )}
      {chartType === "equity" && (
        <EquityLine data={data} onPointHover={onPointHover} onPointClick={onPointClick} />
      )}
      {chartType === "surface" && <SurfaceMesh data={data} smoothSurface={smoothSurface} />}

      <CameraController viewPreset={viewPreset} controlsRef={controlsRef} />
      <OrbitControls
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ref={controlsRef as any}
        enablePan={!orbitMode}
        enableRotate={orbitMode}
        enableZoom={true}
        minDistance={2}
        maxDistance={15}
        autoRotate={false}
        target={[0, 0, 0]}
        makeDefault
      />
    </>
  );
}

// ===== Tooltip =====
function TooltipOverlay({ hoveredPoint, mousePos }: {
  hoveredPoint: DataPoint3D | null;
  mousePos: { x: number; y: number } | null;
}) {
  if (!hoveredPoint || !mousePos) return null;
  const fmt = (v?: number) => v === undefined ? "\u2014" : `${v >= 0 ? "+" : ""}$${v.toFixed(2)}`;

  return (
    <div className="quant-tooltip" style={{ position: "fixed", left: mousePos.x, top: mousePos.y - 8, zIndex: 1000 }}>
      <div className="flex items-center gap-2 mb-1.5">
        <span className={`w-2 h-2 rounded-full ${hoveredPoint.isBreakEven ? "bg-slate-400" : hoveredPoint.isWin ? "bg-emerald-400" : "bg-red-400"}`} />
        <span className="text-xs font-semibold text-white">{hoveredPoint.symbol || `Trade #${hoveredPoint.label || hoveredPoint.id.slice(0, 6)}`}</span>
        {hoveredPoint.type && (
          <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${hoveredPoint.type === "LONG" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
            {hoveredPoint.type}
          </span>
        )}
      </div>
      <div className="space-y-1">
        {hoveredPoint.pl !== undefined && (
          <div className="flex justify-between gap-4">
            <span className="text-[10px] text-slate-400">P/L</span>
            <span className={`text-[10px] font-mono font-semibold ${hoveredPoint.pl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {fmt(hoveredPoint.pl)}
              {hoveredPoint.plPercent !== undefined && <span className="text-slate-500 ml-1">({hoveredPoint.plPercent >= 0 ? "+" : ""}{hoveredPoint.plPercent.toFixed(1)}%)</span>}
            </span>
          </div>
        )}
        {hoveredPoint.rr !== undefined && hoveredPoint.rr > 0 && (
          <div className="flex justify-between gap-4">
            <span className="text-[10px] text-slate-400">R:R</span>
            <span className="text-[10px] font-mono text-amber-400">{hoveredPoint.rr.toFixed(2)}</span>
          </div>
        )}
        {hoveredPoint.positionSize !== undefined && (
          <div className="flex justify-between gap-4">
            <span className="text-[10px] text-slate-400">Size</span>
            <span className="text-[10px] font-mono text-slate-300">{hoveredPoint.positionSize.toFixed(0)}</span>
          </div>
        )}
        {hoveredPoint.date && (
          <div className="flex justify-between gap-4">
            <span className="text-[10px] text-slate-400">Date</span>
            <span className="text-[10px] font-mono text-slate-300">{new Date(hoveredPoint.date).toLocaleDateString("id-ID")}</span>
          </div>
        )}
      </div>
      <div className="mt-1.5 pt-1.5 border-t border-slate-700/30">
        <span className="text-[9px] text-slate-500 italic">Klik untuk detail \u2192</span>
      </div>
    </div>
  );
}

// ===== Main Export =====
export default function QuantViz({
  data = [], chartType = "scatter", height = 500,
  colorBy = "winLoss", sizeBy = "uniform",
  showLabels = false, showGrid = true, smoothSurface = true,
  orbitMode = true, viewPreset = "isometric",
  onHover, onClick,
}: QuantVizProps) {
  const [hoveredPoint, setHoveredPoint] = useState<DataPoint3D | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  // Generate sample data if none provided (deterministic)
  const vizData = useMemo(() =>
    data.length > 0 ? data : Array.from({ length: 60 }, (_, i) => {
      const seed = (i * 9301 + 49297) % 233280;
      const rand = seed / 233280;
      return {
        id: `sample-${i}`, x: (i % 10) - 5, y: Math.sin(i * 0.5) * 2, z: Math.floor(i / 10) - 3,
        value: Math.abs(Math.sin(i * 1.5)), isWin: Math.sin(i * 0.7) > 0, isBreakEven: false,
        symbol: `SYM${i}`, type: (i % 3 === 0 ? "SHORT" : "LONG") as "LONG" | "SHORT",
        pl: Math.sin(i * 0.7) * 200, plPercent: Math.sin(i * 0.7) * 3,
        rr: 1 + rand * 3, positionSize: 100 + rand * 900,
        label: `T${i + 1}`, date: new Date(2026, 0, i + 1).toISOString(),
      };
    }), [data]);

  const handleHover = useCallback((point: DataPoint3D | null, screenPos?: { x: number; y: number }) => {
    setHoveredPoint(point);
    setMousePos(screenPos ?? null);
    onHover?.(point);
  }, [onHover]);

  const handleClick = useCallback((point: DataPoint3D) => onClick?.(point), [onClick]);

  return (
    <div className="relative rounded-xl overflow-hidden border border-slate-800/50 bg-slate-900/50 three-canvas" style={{ height }}>
      <Canvas
        camera={{ position: [4.5, 3.5, 4.5], fov: 45, near: 0.1, far: 50 }}
        gl={{ antialias: true, alpha: false }}
        dpr={[1, 1.5]}
        frameloop="demand"
      >
        <Scene
          data={vizData} chartType={chartType}
          colorBy={colorBy} sizeBy={sizeBy}
          showLabels={showLabels} showGrid={showGrid} smoothSurface={smoothSurface}
          orbitMode={orbitMode} viewPreset={viewPreset}
          onPointHover={handleHover} onPointClick={handleClick}
          hoveredId={hoveredId} setHoveredId={setHoveredId}
        />
      </Canvas>
      <TooltipOverlay hoveredPoint={hoveredPoint} mousePos={mousePos} />
    </div>
  );
}
