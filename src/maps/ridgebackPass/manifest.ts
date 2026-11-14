// Web / Vite: assets are served as static files. Put the `ridgeback_pass` folder in `public/maps/` so the files are at
//   /maps/ridgeback_pass/terrain/..., /maps/ridgeback_pass/data/map.json, ...
// (or pass your own `resolve` to loadRidgebackPass). React Native / Expo uses manifest.native.ts (static requires).
export type AssetRef = number | string;
export const RIDGEBACK_BASE_URL = '/maps/ridgeback_pass/';
export const RIDGEBACK_ASSETS: { data: { map: unknown; props: unknown }; files: Record<string, AssetRef> } = {
  data: { map: RIDGEBACK_BASE_URL + 'data/map.json', props: RIDGEBACK_BASE_URL + 'data/props.json' },
  files: new Proxy({} as Record<string, AssetRef>, { get: (_t, p) => RIDGEBACK_BASE_URL + String(p) }),
};
