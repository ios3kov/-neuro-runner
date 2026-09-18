import type { FileNode } from '../types';

/** Resolve an absolute path; tree navigation must not append unrelated sibling IDs. */
export function findNodePath(id: string, root: FileNode): string[] | null {
  if (root.id === id) return [root.id];
  for (const child of root.children || []) {
    const path = findNodePath(id, child);
    if (path) return [root.id, ...path];
  }
  return null;
}
