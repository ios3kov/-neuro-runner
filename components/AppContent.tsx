import React, { useEffect } from 'react';
import { useStore } from '../store';
import { AppState } from '../types';
import { BootSequence } from './BootSequence';
import { LoginScreen } from './LoginScreen';
import { FileSystem } from './FileSystem';
import { Terminal } from './Terminal';
import { SettingsTool } from './SettingsTool';
import { AiChat } from './AiChat';

export const AppContent: React.FC = () => {
    const appState = useStore((s) => s.appState);
    const currentGame = useStore((s) => s.currentGame);
    const stopGame = useStore((s) => s.stopGame);

    // Old game IDs must never leave a stale session on an empty game screen.
    useEffect(() => {
        if (appState === AppState.GAME && currentGame !== 'AI_CHAT') stopGame();
    }, [appState, currentGame, stopGame]);

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
        case AppState.GAME:
            return currentGame === 'AI_CHAT' ? <AiChat /> : null;
        default:
            return null;
    }
};
