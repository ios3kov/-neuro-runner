import React from 'react';
import { useStore } from '../store';
import { AppState, GameId } from '../types';
import { BootSequence } from './BootSequence';
import { LoginScreen } from './LoginScreen';
import { FileSystem } from './FileSystem';
import { Terminal } from './Terminal';
import { SettingsTool } from './SettingsTool';
import { AiChat } from './AiChat';
import { SnakeGame } from '../engine/games/Snake';
import { PongGame } from '../engine/games/Pong';
import { BreakoutGame } from '../engine/games/Breakout';
import { AsteroidsGame } from '../engine/games/Asteroids';
import { DriftGame } from '../engine/games/Drift';
import { DefenderGame } from '../engine/games/Defender';
import { RunnerGame } from '../engine/games/Runner';
import { VaporwareGame } from '../engine/games/Vaporware';
import { PlaceholderGame } from '../engine/games/Placeholder';

const GAME_REGISTRY: Record<GameId, React.FC> = {
    SNAKE: SnakeGame,
    PONG: PongGame,
    BREAKOUT: BreakoutGame,
    ASTEROIDS: AsteroidsGame,
    DRIFT: DriftGame,
    DEFENDER: DefenderGame,
    RUNNER: RunnerGame,
    VAPORWARE: VaporwareGame,
    AI_CHAT: AiChat,
    SETTINGS: () => null, // Should not happen via registry, handled via AppState
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
            
            const GameComponent = GAME_REGISTRY[currentGame] || 
                (() => <PlaceholderGame name={currentGame} />);
            
            return <GameComponent />;
        }
        
        default:
            return null;
    }
};