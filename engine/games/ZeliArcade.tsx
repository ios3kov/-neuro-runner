import React from 'react';
import { useStore } from '../../store';
import Asteroids from './zeli/arcade/Asteroids.jsx';
import Bomberman from './zeli/arcade/Bomberman.jsx';
import Breakout from './zeli/arcade/Breakout.jsx';
import DigDug from './zeli/arcade/DigDug.jsx';
import DonkeyKong from './zeli/arcade/DonkeyKong.jsx';
import FlappyJelly from './zeli/arcade/FlappyJelly.jsx';
import Frogger from './zeli/arcade/Frogger.jsx';
import Galaga from './zeli/arcade/Galaga.jsx';
import JumpMan from './zeli/arcade/JumpMan.jsx';
import JumpRunner from './zeli/arcade/JumpRunner.jsx';
import MiniPacman from './zeli/arcade/MiniPacman.jsx';
import MiniTetris from './zeli/arcade/MiniTetris.jsx';
import PingPong from './zeli/arcade/PingPong.jsx';
import Snake from './zeli/arcade/Snake.jsx';
import SpaceInvader from './zeli/arcade/SpaceInvader.jsx';

type ZeliComponent = React.ComponentType<any>;

const wrap = (Component: ZeliComponent, title: string): React.FC => {
  const Wrapped: React.FC = () => {
    const stopGame = useStore((state) => state.stopGame);
    return (
      <div className="absolute inset-0 z-30 bg-black overflow-hidden">
        <div className="absolute inset-x-0 top-0 z-50 h-12 border-b border-cyan-400/30 bg-black/95 flex items-center justify-between px-3 font-mono">
          <div className="text-[11px] tracking-[0.22em] text-cyan-300">{title} // ZELI ARCADE</div>
          <button type="button" onClick={stopGame} className="min-h-11 px-4 border border-cyan-400/50 text-cyan-200 text-xs tracking-widest active:bg-cyan-300/15">EXIT</button>
        </div>
        <div className="absolute inset-x-0 bottom-0 top-12 overflow-auto bg-black">
          <Component onComplete={() => undefined} />
        </div>
      </div>
    );
  };
  Wrapped.displayName = `Zeli${title.replace(/[^A-Z0-9]/gi, '')}`;
  return Wrapped;
};

export const ZeliAsteroidsGame = wrap(Asteroids, 'ASTEROIDS');
export const ZeliBombermanGame = wrap(Bomberman, 'BOMBERMAN');
export const ZeliBreakoutGame = wrap(Breakout, 'BREAKOUT');
export const ZeliDigDugGame = wrap(DigDug, 'DIG DUG');
export const ZeliDonkeyKongGame = wrap(DonkeyKong, 'DONKEY KONG');
export const ZeliFlappyJellyGame = wrap(FlappyJelly, 'FLAPPY JELLY');
export const ZeliFroggerGame = wrap(Frogger, 'FROGGER');
export const ZeliGalagaGame = wrap(Galaga, 'GALAGA');
export const ZeliJumpManGame = wrap(JumpMan, 'JUMP MAN');
export const ZeliJumpRunnerGame = wrap(JumpRunner, 'JUMP RUNNER');
export const ZeliMiniPacmanGame = wrap(MiniPacman, 'MINI PACMAN');
export const ZeliMiniTetrisGame = wrap(MiniTetris, 'MINI TETRIS');
export const ZeliPingPongGame = wrap(PingPong, 'PING PONG');
export const ZeliSnakeGame = wrap(Snake, 'SNAKE');
export const ZeliSpaceInvaderGame = wrap(SpaceInvader, 'SPACE INVADER');
