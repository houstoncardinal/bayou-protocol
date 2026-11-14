// Map registry: add future maps here so menus / matchmaking can list them.
import { loadRidgebackPass } from './ridgebackPass/loadRidgebackPass';

export const MAPS = {
  ridgeback_pass: {
    id: 'ridgeback_pass',
    name: 'Ridgeback Pass',
    modes: ['defusal', 'deathmatch'] as const,
    maxPlayers: 20,
    load: loadRidgebackPass,
  },
} as const;

export type MapId = keyof typeof MAPS;
export { loadRidgebackPass };
export type { LoadedMap, LoadOptions } from './ridgebackPass/loadRidgebackPass';
