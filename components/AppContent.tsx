import React from 'react';
import { useStore } from '../store';
import { AppState, GameId } from '../types';
import { BootSequence } from './BootSequence';
import { LoginScreen } from './LoginScreen';
import { FileSystem } from './FileSystem';
import { Terminal } from './Terminal';
import { SettingsTool } from './SettingsTool';
import { AiChat } from './AiChat';
import {
    ZeliAsteroidsGame,
    ZeliBombermanGame,
    ZeliBreakoutGame,
    ZeliDigDugGame,
    ZeliDonkeyKongGame,
    ZeliFlappyJellyGame,
    ZeliFroggerGame,
    ZeliGalagaGame,
    ZeliJumpManGame,
    ZeliJumpRunnerGame,
    ZeliMiniPacmanGame,
    ZeliMiniTetrisGame,
    ZeliPingPongGame,
    ZeliSnakeGame,
    ZeliSpaceInvaderGame,
} from '../engine/games/ZeliArcade';
import { PlaceholderGame } from '../engine/games/Placeholder';

const GAME_REGISTRY: Partial<Record<GameId, React.FC>> = {
    ZELI_ASTEROIDS: ZeliAsteroidsGame,
    ZELI_BOMBERMAN: ZeliBombermanGame,
    ZELI_BREAKOUT: ZeliBreakoutGame,
    ZELI_DIGDUG: ZeliDigDugGame,
    ZELI_DONKEY_KONG: ZeliDonkeyKongGame,
    ZELI_FLAPPY_JELLY: ZeliFlappyJellyGame,
    ZELI_FROGGER: ZeliFroggerGame,
    ZELI_GALAGA: ZeliGalagaGame,
    ZELI_JUMP_MAN: ZeliJumpManGame,
    ZELI_JUMP_RUNNER: ZeliJumpRunnerGame,
    ZELI_MINI_PACMAN: ZeliMiniPacmanGame,
    ZELI_MINI_TETRIS: ZeliMiniTetrisGame,
    ZELI_PING_PONG: ZeliPingPongGame,
    ZELI_SNAKE: ZeliSnakeGame,
    ZELI_SPACE_INVADER: ZeliSpaceInvaderGame,
    AI_CHAT: AiChat,
    SETTINGS: () => null,
};

export const AppContent: React.FC = () => {
    const appState = useStore((s) => s.appState);
    const currentGame = useStore((s) => s.currentGame);

    switch (appState) {
        case AppState.BOOT:
            return <BootSequence />;
        case AppState.LOGIN:
            return <LoginScreen />;
        case AppState.SETTINGS:
        case AppState.DESKTOP:
            return (
                <div className="h-full flex flex-col relative animate-in fade-in zoom-in-95 duration-700">
                    <FileSystem />
                    <Terminal />
                    {appState === AppState.SETTINGS && <SettingsTool />}
                </div>
            );
        case AppState.GAME: {
            if (!currentGame) return null;
            const GameComponent = GAME_REGISTRY[currentGame] || (() => <PlaceholderGame name={currentGame} />);
            return <GameComponent />;
        }
        default:
            return null;
    }
};
