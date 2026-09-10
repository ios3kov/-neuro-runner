import { FileNode, GameId } from '../types';

export const LORE_PASSWORD = 'QWERTY123';

const d = (id: string, name: string, children: FileNode[], rest: Partial<FileNode> = {}): FileNode => 
  ({ id, name, type: 'FOLDER', children, ...rest });

const f = (id: string, name: string, desc: string, gameId?: GameId, rest: Partial<FileNode> = {}): FileNode => 
  ({ id, name, type: 'EXE', description: desc, gameId, ...rest });

export const fileSystemData: FileNode = d('root', 'ROOT', [
  d('arcade', 'ARCADE', [
    f('crosswire', 'CROSSWIRE.EXE', 'Grid Crossing', 'CROSSWIRE'),
    f('vapor', 'VAPORWARE.EXE', 'Loading Sim', 'VAPORWARE'),
    f('run', 'AERO_RUN.EXE', 'Training Sim', 'RUNNER'),
    f('def', 'DEFENDER.EXE', 'Defense Sys', 'DEFENDER'),
    f('drift', 'DRIFT.EXE', 'Flow Sim', 'DRIFT'),
    f('ast', 'VOID.EXE', 'Space Combat', 'ASTEROIDS'),
    f('break', 'BREAKER.EXE', 'Decryption', 'BREAKOUT'),
    f('snake', 'SNAKE.EXE', 'Pattern Logic', 'SNAKE'),
    f('pong', 'PONG.EXE', 'Reflex Test', 'PONG')
  ]),
  d('downloads', 'DOWNLOADS', [
    f('arch', 'ARCHIVE_MGR.EXE', 'Unpack Data', 'BREAKOUT'),
    f('update', 'PATCH_v4.3.BIN', 'System Update', 'VAPORWARE'),
    f('blueprint', 'FACILITY_MAP.PDF', 'Schematic'),
    f('music', 'SYNTH_MIX_VOL1.MP3', 'Audio')
  ]),
  d('sys', 'SYSTEM', [
    f('config', 'KERNEL.CFG', 'Node Settings', 'SETTINGS'),
    f('epstein', 'FLIGHT_LOGS.CSV', 'Decrypted', undefined, { isHidden: true })
  ]),
  d('vault', 'VAULT', [
    f('omni', 'OMNI.AI', 'Neural Link', 'AI_CHAT')
  ]),
  d('personal', 'PRIVATE', [
    f('vid_01', 'MOV_001.VID', 'Encrypted'),
    f('img_02', 'IMG_002.DAT', 'Corrupted')
  ], { isHidden: true, isPasswordProtected: true }),
  d('trash', 'TRASH', [
    f('del_1', 'BAK_01.OLD', 'Backup'),
    f('del_2', 'ERR_LOG.TXT', 'Log File')
  ], { isHidden: true }),
  f('copyright', 'README.TXT', 'Legal Info'),
  f('passwords', '.SHADOW', 'Keys', undefined, { isHidden: true })
]);

export const resolvePath = (ids: string[], root: FileNode): FileNode[] => {
    const result: FileNode[] = [];
    let current: FileNode | undefined = root;
    for (const id of ids) {
        if (id === 'root') { result.push(root); continue; }
        current = current?.children?.find(c => c.id === id);
        if (current) result.push(current);
    }
    return result;
};

export const findNodeById = (id: string, root: FileNode): FileNode | null => {
    if (root.id === id) return root;
    if (root.children) {
        for (const child of root.children) {
            const found = findNodeById(id, child);
            if (found) return found;
        }
    }
    return null;
};

const TEXT_CONTENT: Record<string, string> = {
  copyright: `NEURO_OS v4.2\n(c) 2077 NEURO CORP\n\nUNAUTHORIZED ACCESS IS A FELONY.\nVIOLATORS WILL BE PURGED.\n\nCREDITS:\nARCHITECT: [REDACTED]\nDESIGN: UNIT_734`,
  passwords: `/// SHADOW_VAULT ///\n\n[CREDENTIALS]\nadmin / admin\n\n[KEYS]\n/PRIVATE : ${LORE_PASSWORD}\n\nSTATUS: COMPROMISED`,
  epstein: `/// FLIGHT_MANIFEST_RECOVERED ///\n\n[WARNING: TOP SECRET CLEARANCE REQUIRED]\n\nDATE: ██-██-20██\nDESTINATION: ████████ ISLAND\n\nPASSENGER LIST (REDACTED):\n-----------------------------------\n1. CLINTON, ██████    [CONFIRMED]\n2. TRUMP, D█████      [CONFIRMED]\n3. PRINCE A█████      [VIP_SUITE]\n4. GATES, ████        [LOGGED]\n5. SPACEY, K████      [GUEST]\n6. HAWKING, S██████   [ACADEMIC]\n\n[NOTES]\nPayment via ██████ Bank.\nSurveillance tapes █████████.`,
  blueprint: `SECTOR 7 SCHEMATICS\n\n[ACCESS RESTRICTED]\n\nLEVEL 1: HANGAR BAY\nLEVEL 2: R&D LABORATORIES\nLEVEL 3: NEURAL SERVER (PRIMARY TARGET)\n\nNOTES:\n- Thermal sensors in North Corridor active.\n- Ventilation shaft in Sector 4 unsecured.\n- Keycard required for Level 3 access.`
};

export const getFileContent = (id: string) => 
  TEXT_CONTENT[id] || (id.startsWith('del_') ? "ERR: DELETED // RECOVERY_FAILED" : "ERR: BINARY_DATA_CORRUPTED // VIEW_MODE_UNSUPPORTED");

const ICONS: Record<string, string> = {
  personal: '🔞', trash: '🗑️', AI_CHAT: '👁️', SETTINGS: '⚙️', 
  copyright: '®', passwords: '🔒', FOLDER: '📁', EXE: '💾',
  epstein: '✈️', RUNNER: '🏃', VAPORWARE: '⌛', CROSSWIRE: '⬆️',
  downloads: '📥', blueprint: '📐', music: '🎵',
  BREAKOUT: '🧱', SNAKE: '🐍', PONG: '🏓', ASTEROIDS: '☄️',
  DRIFT: '🏎️', DEFENDER: '🛡️'
};

export const getIcon = (node: FileNode & { isParentLink?: boolean }) => {
    if (node.isParentLink) return '↑';
    return ICONS[node.id] || ICONS[node.gameId || ''] || ICONS[node.type] || '📄';
};

export const getDecorStats = (id: string) => {
    const val = id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    return { 
      size: (val % 800) + 12, 
      perm: val % 2 === 0 ? 'rw-r--r--' : 'rwxr-xr-x', 
      addr: `0x${(val * 1234).toString(16).substring(0, 4).toUpperCase()}` 
    };
};