from pathlib import Path
p=Path('store.ts')
s=p.read_text()
s="import { findNodePath } from './utils/filePath';\nimport { fileSystemData, findNodeById } from './data/fileSystem';\n"+s
start=s.index('        navigateDown: (id) => {')
end=s.index('        navigateUp:',start)
s=s[:start]+'''        navigateDown: (id) => {
            const node = findNodeById(id, fileSystemData);
            if (!node || node.type !== 'FOLDER') return;
            const path = findNodePath(id, fileSystemData);
            if (path) get().setNavigationPath(path);
        },

'''+s[end:]
p.write_text(s)
