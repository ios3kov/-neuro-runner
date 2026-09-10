/**
 * 🎮 Game 34: 테트리스 — 블록 광택 + 라인 카운트 바 + 게임오버
 */
import { useCallback, useEffect, useRef, useState } from "react";

const COLS = 10, ROWS = 18, CELL = 20;
const SHAPES = [
    [[1, 1, 1, 1]], [[1, 1], [1, 1]], [[0, 1, 0], [1, 1, 1]], [[1, 0], [1, 0], [1, 1]],
    [[0, 1], [0, 1], [1, 1]], [[0, 1, 1], [1, 1, 0]], [[1, 1, 0], [0, 1, 1]],
];
const SHAPE_COLORS = ["#0cbfff", "#FFD700", "#A855F7", "#F97316", "#3B82F6", "#22c55e", "#EF4444"];

const emptyBoard = () => Array.from({ length: ROWS }, () => Array(COLS).fill(0));

const MiniTetris = ({ onComplete }) => {
    const [board, setBoard] = useState(emptyBoard);
    const [piece, setPiece] = useState(null);
    const [pos, setPos] = useState({ r: 0, c: 3 });
    const [lines, setLines] = useState(0);
    const [gameActive, setGameActive] = useState(true);
    const [shapeIdx, setShapeIdx] = useState(0);
    const linesRef = useRef(0);

    const newPiece = useCallback(() => {
        const idx = Math.floor(Math.random() * SHAPES.length);
        setShapeIdx(idx); setPiece(SHAPES[idx]);
        setPos({ r: 0, c: Math.floor((COLS - SHAPES[idx][0].length) / 2) });
    }, []);

    useEffect(() => { newPiece(); }, [newPiece]);

    const collides = useCallback((b, p, r, c) => {
        if (!p) return false;
        for (let pr = 0; pr < p.length; pr++) for (let pc = 0; pc < p[pr].length; pc++)
            if (p[pr][pc]) { const nr = r + pr, nc = c + pc; if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS || b[nr][nc]) return true; }
        return false;
    }, []);

    const merge = useCallback((b, p, r, c, color) => {
        const nb = b.map((row) => [...row]);
        for (let pr = 0; pr < p.length; pr++) for (let pc = 0; pc < p[pr].length; pc++) if (p[pr][pc]) nb[r + pr][c + pc] = color;
        return nb;
    }, []);

    const clearLines = useCallback((b) => {
        const nb = b.filter((row) => row.some((c) => !c));
        const cleared = ROWS - nb.length;
        while (nb.length < ROWS) nb.unshift(Array(COLS).fill(0));
        return { board: nb, cleared };
    }, []);

    const rotate = useCallback((p) => {
        const rows = p.length, cols = p[0].length;
        return Array.from({ length: cols }, (_, c) => Array.from({ length: rows }, (_, rr) => p[rows - 1 - rr][c]));
    }, []);

    const drop = useCallback(() => {
        if (!piece || !gameActive) return;
        const nr = pos.r + 1;
        if (collides(board, piece, nr, pos.c)) {
            const nb = merge(board, piece, pos.r, pos.c, shapeIdx + 1);
            const { board: cb, cleared } = clearLines(nb);
            linesRef.current += cleared; setLines(linesRef.current); setBoard(cb);
            const idx = Math.floor(Math.random() * SHAPES.length);
            const np = SHAPES[idx]; const nc = Math.floor((COLS - np[0].length) / 2);
            if (collides(cb, np, 0, nc)) { setGameActive(false); setTimeout(() => onComplete(Math.min(100, linesRef.current * 10)), 500); return; }
            setShapeIdx(idx); setPiece(np); setPos({ r: 0, c: nc });
        } else { setPos({ r: nr, c: pos.c }); }
    }, [piece, pos, board, shapeIdx, gameActive, collides, merge, clearLines, onComplete]);

    useEffect(() => { if (!gameActive) return; const t = setInterval(drop, 500); return () => clearInterval(t); }, [gameActive, drop]);

    useEffect(() => {
        const kd = (e) => {
            if (!piece || !gameActive) return; e.preventDefault();
            if (e.key === "ArrowLeft" && !collides(board, piece, pos.r, pos.c - 1)) setPos((p) => ({ ...p, c: p.c - 1 }));
            if (e.key === "ArrowRight" && !collides(board, piece, pos.r, pos.c + 1)) setPos((p) => ({ ...p, c: p.c + 1 }));
            if (e.key === "ArrowDown") drop();
            if (e.key === "ArrowUp") { const rp = rotate(piece); if (!collides(board, rp, pos.r, pos.c)) setPiece(rp); }
        };
        window.addEventListener("keydown", kd); return () => window.removeEventListener("keydown", kd);
    }, [piece, pos, board, gameActive, collides, rotate, drop]);

    const display = board.map((row) => [...row]);
    if (piece) for (let pr = 0; pr < piece.length; pr++) for (let pc = 0; pc < piece[pr].length; pc++)
        if (piece[pr][pc] && pos.r + pr >= 0) display[pos.r + pr][pos.c + pc] = shapeIdx + 1;

    return (
        <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "6px", color: "white" }}>
            <div style={{ fontSize: "13px" }}>
                라인: <span style={{ color: "#FFD700", fontWeight: "bold" }}>{lines}</span>
                {lines >= 5 && <span style={{ color: "#A855F7", marginLeft: 8 }}>🔥 달인!</span>}
            </div>
            <div style={{
                display: "grid", gridTemplateColumns: `repeat(${COLS}, ${CELL}px)`,
                background: "linear-gradient(180deg, #0a0a1a, #050510)", borderRadius: "6px",
                border: !gameActive ? "2px solid #FF6B6B" : "2px solid rgba(255,255,255,0.08)", padding: "1px",
            }}>
                {display.flat().map((c, i) => (
                    <div key={i} style={{
                        width: CELL, height: CELL,
                        background: c ? `linear-gradient(135deg, ${SHAPE_COLORS[c - 1]}, ${SHAPE_COLORS[c - 1]}cc)` : "transparent",
                        border: c ? "1px solid rgba(255,255,255,0.15)" : "1px solid rgba(255,255,255,0.02)",
                        borderRadius: "2px",
                        boxShadow: c ? `0 0 4px ${SHAPE_COLORS[c - 1]}33, inset 0 1px 2px rgba(255,255,255,0.2)` : "none",
                    }} />
                ))}
            </div>
            {!gameActive && (
                <div style={{ fontSize: "14px", fontWeight: "bold", color: "#FF6B6B" }}>💀 게임 오버! {lines} 라인</div>
            )}
            <div style={{ display: "flex", gap: "4px" }}>
                <button onClick={() => !collides(board, piece, pos.r, pos.c - 1) && setPos((p) => ({ ...p, c: p.c - 1 }))} style={ctrlBtn}>◀</button>
                <button onClick={() => { const rp = rotate(piece); if (!collides(board, rp, pos.r, pos.c)) setPiece(rp); }} style={ctrlBtn}>🔄</button>
                <button onClick={drop} style={ctrlBtn}>▼</button>
                <button onClick={() => !collides(board, piece, pos.r, pos.c + 1) && setPos((p) => ({ ...p, c: p.c + 1 }))} style={ctrlBtn}>▶</button>
            </div>
        </div>
    );
};

const ctrlBtn = { width: 42, height: 34, fontSize: "14px", background: "rgba(255,255,255,0.06)", color: "white", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px", cursor: "pointer" };

export default MiniTetris;
