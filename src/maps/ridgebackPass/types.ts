// Types for data/map.json and data/props.json (meters, +Y up, north = -Z).
export type Vec3 = [number, number, number];
export type Quat = [number, number, number, number];
export interface SpawnPoint { p: Vec3; yaw: number }                 // yaw: radians about +Y, 0 = facing -Z
export interface BombSite { center: Vec3; radius: number; height: number }
export interface Callout { name: string; points: [number, number][]; widths: number[] }   // points are [x, z]
export type StaticCollider =
  | { type: 'capsule'; p: Vec3; halfHeight: number; radius: number }
  | { type: 'capsule_axis'; a: Vec3; b: Vec3; radius: number }
  | { type: 'box'; p: Vec3; q: Quat; half: Vec3 }
  | { type: 'hull'; asset: string; p: Vec3; q: Quat; s: number };
export interface AssetInfo { kind: 'tree' | 'prop'; file?: string; nodes?: string[]; offset?: Vec3; lod1?: string; lods?: string[] }
export interface MapData {
  name: string; version: number; modes: string[]; size: number;
  bounds: { min: Vec3; max: Vec3; killY: number };
  player: { recommendedMaxSlopeDeg: number; eyeHeight: number; note: string };
  spawns: { T: SpawnPoint[]; CT: SpawnPoint[]; deathmatch: SpawnPoint[] };
  bombSites: Record<'A' | 'B', BombSite>;
  secrets: Record<string, { style: string; length: number; mouths: [Vec3, Vec3] }>;
  lights: { p: Vec3; color: string; intensity: number; distance: number }[];
  callouts: Callout[];
  chunks: { id: string; center: Vec3; size: number }[];
  terrainMaterial: { layers: string[]; tileMeters: number[]; padFraction: number; atlasCols?: number; atlasRows?: number; mapMin: [number, number]; mapSize: number };
  radar?: { image: string; worldMin: [number, number]; worldSize: number; note: string };
  assets: Record<string, AssetInfo>;
  colliders: StaticCollider[];
  hulls: Record<string, Vec3[]>;
  sun: { direction: Vec3; color: string; intensity: number };
  fog: { color: string; near: number; far: number };
  timingsSeconds: Record<string, number>;
}
export interface PropInstance { p: Vec3; q: Quat; s: number }
export type PropsData = Record<string, PropInstance[]>;
