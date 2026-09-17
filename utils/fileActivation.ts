import type { FileNode, GameId } from '../types';

interface FileActivationActions {
  navigateDown: (id: string) => void;
  startGame: (id: GameId) => void;
  openFile: (id: string) => void;
  openExternalUrl: (url: string) => void;
}

/** Shared activation path for grid, list, tree and keyboard navigation. */
export const activateFileNode = (node: FileNode, actions: FileActivationActions): void => {
  if (node.type === 'FOLDER') {
    actions.navigateDown(node.id);
    return;
  }
  if (node.externalUrl) {
    actions.openExternalUrl(node.externalUrl);
    return;
  }
  if (node.gameId) {
    actions.startGame(node.gameId);
    return;
  }
  actions.openFile(node.id);
};
