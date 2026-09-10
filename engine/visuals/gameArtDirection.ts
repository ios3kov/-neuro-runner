export type ArcadeBiome =
  | 'TRAINING_GRID'
  | 'FIREWALL_SECTOR'
  | 'MALWARE_ZONE'
  | 'VPN_TUNNEL'
  | 'COMPRESSION_CHAMBER'
  | 'TWO_FA_VAULT'
  | 'OVERCLOCK_RING'
  | 'ROOT_CORE'
  | 'DUEL_ARENA'
  | 'REACTOR'
  | 'VOID_FIELD'
  | 'MEGACITY'
  | 'DEFENSE_GRID'
  | 'VAPOR_VOID';

export interface ArcadeArtProfile {
  biome: ArcadeBiome;
  primary: string;
  secondary: string;
  accent: string;
  danger: string;
  gridAlpha: number;
  hazeAlpha: number;
  particleDensity: number;
  motion: number;
  label: string;
}

const serpentBiome = (level: number): ArcadeBiome => {
  if (level <= 3) return 'TRAINING_GRID';
  if (level <= 6) return 'FIREWALL_SECTOR';
  if (level <= 9) return 'MALWARE_ZONE';
  if (level <= 12) return 'VPN_TUNNEL';
  if (level <= 15) return 'COMPRESSION_CHAMBER';
  if (level <= 18) return 'TWO_FA_VAULT';
  if (level <= 21) return 'OVERCLOCK_RING';
  return 'ROOT_CORE';
};

const biomeFor = (gameId: string, level: number): ArcadeBiome => {
  switch (gameId) {
    case 'SNAKE': return serpentBiome(level);
    case 'PONG': return level >= 19 ? 'ROOT_CORE' : level >= 7 ? 'REACTOR' : 'DUEL_ARENA';
    case 'BREAKOUT': return level >= 16 ? 'ROOT_CORE' : level >= 8 ? 'REACTOR' : 'TRAINING_GRID';
    case 'ASTEROIDS': return level >= 16 ? 'VOID_FIELD' : 'VPN_TUNNEL';
    case 'DRIFT': return level >= 15 ? 'OVERCLOCK_RING' : 'MEGACITY';
    case 'DEFENDER': return level >= 18 ? 'ROOT_CORE' : 'DEFENSE_GRID';
    case 'RUNNER': return level >= 15 ? 'OVERCLOCK_RING' : 'MEGACITY';
    case 'VAPORWARE': return 'VAPOR_VOID';
    default: return 'TRAINING_GRID';
  }
};

const palette: Record<ArcadeBiome, Pick<ArcadeArtProfile, 'primary' | 'secondary' | 'accent' | 'danger' | 'gridAlpha' | 'hazeAlpha' | 'particleDensity' | 'motion' | 'label'>> = {
  TRAINING_GRID: { primary: '#00f3ff', secondary: '#0b4160', accent: '#8efaff', danger: '#ff315f', gridAlpha: 0.11, hazeAlpha: 0.08, particleDensity: 0.45, motion: 0.45, label: 'DIAGNOSTIC GRID' },
  FIREWALL_SECTOR: { primary: '#ff315f', secondary: '#ff8a00', accent: '#ffd166', danger: '#ff1744', gridAlpha: 0.14, hazeAlpha: 0.09, particleDensity: 0.6, motion: 0.7, label: 'FIREWALL SECTOR' },
  MALWARE_ZONE: { primary: '#ff0055', secondary: '#8b5cf6', accent: '#ff7ad9', danger: '#ff1744', gridAlpha: 0.08, hazeAlpha: 0.13, particleDensity: 0.75, motion: 0.82, label: 'MALWARE ZONE' },
  VPN_TUNNEL: { primary: '#3b82f6', secondary: '#00f3ff', accent: '#7dd3fc', danger: '#ff315f', gridAlpha: 0.09, hazeAlpha: 0.12, particleDensity: 0.6, motion: 0.62, label: 'VPN TUNNEL' },
  COMPRESSION_CHAMBER: { primary: '#60a5fa', secondary: '#a5f3fc', accent: '#ffffff', danger: '#ff315f', gridAlpha: 0.13, hazeAlpha: 0.07, particleDensity: 0.5, motion: 0.55, label: 'COMPRESSION CHAMBER' },
  TWO_FA_VAULT: { primary: '#facc15', secondary: '#00f3ff', accent: '#fff7ae', danger: '#ff315f', gridAlpha: 0.09, hazeAlpha: 0.1, particleDensity: 0.55, motion: 0.5, label: '2FA VAULT' },
  OVERCLOCK_RING: { primary: '#ffb000', secondary: '#00f3ff', accent: '#ffffff', danger: '#ff315f', gridAlpha: 0.12, hazeAlpha: 0.14, particleDensity: 0.9, motion: 1.0, label: 'OVERCLOCK RING' },
  ROOT_CORE: { primary: '#ffffff', secondary: '#00f3ff', accent: '#ffb000', danger: '#ff1744', gridAlpha: 0.16, hazeAlpha: 0.17, particleDensity: 1, motion: 1, label: 'ROOT CORE' },
  DUEL_ARENA: { primary: '#00f3ff', secondary: '#ff0055', accent: '#ffffff', danger: '#ff315f', gridAlpha: 0.08, hazeAlpha: 0.08, particleDensity: 0.4, motion: 0.5, label: 'DUEL ARENA' },
  REACTOR: { primary: '#ffb000', secondary: '#00f3ff', accent: '#ffe9a6', danger: '#ff315f', gridAlpha: 0.1, hazeAlpha: 0.13, particleDensity: 0.75, motion: 0.8, label: 'REACTOR' },
  VOID_FIELD: { primary: '#7c3aed', secondary: '#00f3ff', accent: '#c4b5fd', danger: '#ff315f', gridAlpha: 0.04, hazeAlpha: 0.18, particleDensity: 0.9, motion: 0.35, label: 'VOID FIELD' },
  MEGACITY: { primary: '#00f3ff', secondary: '#ff0055', accent: '#f3ff00', danger: '#ff315f', gridAlpha: 0.09, hazeAlpha: 0.12, particleDensity: 0.75, motion: 0.9, label: 'MEGACITY' },
  DEFENSE_GRID: { primary: '#00ff88', secondary: '#00f3ff', accent: '#ffffff', danger: '#ff315f', gridAlpha: 0.11, hazeAlpha: 0.08, particleDensity: 0.55, motion: 0.6, label: 'DEFENSE GRID' },
  VAPOR_VOID: { primary: '#ff4fd8', secondary: '#7c3aed', accent: '#00f3ff', danger: '#ff1744', gridAlpha: 0.05, hazeAlpha: 0.17, particleDensity: 0.85, motion: 0.74, label: 'VAPOR VOID' },
};

export const getArcadeArtProfile = (gameId: string, level: number): ArcadeArtProfile => {
  const biome = biomeFor(gameId, Math.max(1, level || 1));
  return { biome, ...palette[biome] };
};
