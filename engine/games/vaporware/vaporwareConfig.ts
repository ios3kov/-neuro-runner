import type { VaporAction, VaporScreen, VaporwareRules } from './vaporwareTypes';

export const VAPOR_SCREENS: VaporScreen[] = ['LOGO', 'TERMINAL', 'ASSETS', 'SHADER', 'SERVER', 'BIOS', 'UPDATE', 'EULA', 'INSTALL', 'LOBBY'];
export const VAPOR_ACTIONS: VaporAction[] = ['TAP', 'LEFT', 'RIGHT', 'UP', 'DOWN'];

export const getVaporwareRules = (level: number): VaporwareRules => ({
  level,
  targetCorrect: 8 + Math.floor((level - 1) * 1.4),
  lives: level >= 8 ? 2 : 3,
  screenDurationMin: Math.max(1.15, 2.4 - level * 0.08),
  screenDurationMax: Math.max(1.8, 3.7 - level * 0.1),
  promptWindow: Math.max(0.58, 1.25 - level * 0.045),
  promptEveryMin: Math.max(0.65, 1.5 - level * 0.06),
  promptEveryMax: Math.max(1.2, 2.5 - level * 0.075),
});

export const vaporActionLabel = (action: VaporAction) => ({
  TAP: '[ TAP NOW ]',
  LEFT: '<< SWIPE LEFT',
  RIGHT: 'SWIPE RIGHT >>',
  UP: '^^ SWIPE UP ^^',
  DOWN: 'vv SWIPE DOWN vv',
}[action]);

export const pickDeterministic = <T,>(items: T[], seed: number): T => items[Math.abs(seed) % items.length];

export const FAKE_STUDIOS = [
  ['NULL_POINTER_INC', 'DE_REF_DREAMS'],
  ['INFINITE_LOOP_SYS', 'ONE_MORE_CYCLE'],
  ['STACK_OVERFLOW', 'COPY_PASTE_EXEC'],
  ['VOID_LOGIC_LLC', 'UNDEFINED_IS_NAN'],
  ['VAPOR_INTERACTIVE', 'COMING_SOON_TM'],
  ['GLITCH_CORP', 'IT_IS_A_FEATURE'],
] as const;

export const ASSET_NAMES = [
  'TEXTURE_GRASS_4K.DAT', 'SHADER_WATER_V2.FX', 'MODEL_HERO_LOD0.OBJ',
  'SFX_EXPLOSION.WAV', 'AI_PATHFINDING.LUA', 'SKYBOX_NIGHT.EXR',
  'LEVEL_01_FINAL_FINAL.MAP', 'DLC_ARMOR.PAK', 'LOOTBOX_ODDS.JSON',
];

export const TERMINAL_LINES = [
  'ALLOC_MEM... OK', 'GPU_CHECK... OUTDATED', 'VERIFY... ERROR',
  'CONNECT_DC_EAST...', 'HANDSHAKE... FAIL', 'LOAD_KERNEL...',
  'BYPASS_SEC...', 'COMPILE_SHADERS...', 'GEN_BUGS... OK',
];
