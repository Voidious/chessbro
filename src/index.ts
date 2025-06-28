import { Chess, Move, Square } from 'chess.js';

export interface TranspositionEntry {
    depth: number;
    score: number;
}

export class ChessEngine {
    private chess: Chess;
    public isRunning: boolean;
    private transpositionTable: Map<string, TranspositionEntry>;

    // Piece values
    private static readonly PIECE_VALUES: { [key: string]: number } = {
        'p': 1,  // pawn
        'n': 3,  // knight
        'b': 3,  // bishop
        'r': 5,  // rook
        'q': 9,  // queen
        'k': 0   // king (not used in evaluation)
    };

    // Very high value to ensure checkmate is chosen over any material advantage
    public static readonly CHECKMATE_VALUE = 10000;

    constructor() {
        this.chess = new Chess();
        this.isRunning = true;
        this.transpositionTable = new Map();
    }

    private evaluatePosition(): number {
        if (this.chess.isCheckmate()) {
            return this.chess.turn() === 'w' ? -ChessEngine.CHECKMATE_VALUE : ChessEngine.CHECKMATE_VALUE;
        }
        let score = 0;
        const board = this.chess.board();
        for (let rank = 0; rank < 8; rank++) {
            for (let file = 0; file < 8; file++) {
                const piece = board[rank][file];
                if (piece) {
                    const value = ChessEngine.PIECE_VALUES[piece.type.toLowerCase()];
                    score += piece.color === 'w' ? value : -value;
                }
            }
        }
        return score;
    }

    private minimax(depth: number, isMaximizing: boolean): number {
        const fen = this.chess.fen();
        const cachedEntry = this.transpositionTable.get(fen);
        if (cachedEntry && cachedEntry.depth >= depth) {
            return cachedEntry.score;
        }
        if (depth === 0 || this.chess.isGameOver()) {
            const score = this.evaluatePosition();
            this.transpositionTable.set(fen, { depth, score });
            return score;
        }
        const moves = this.chess.moves();
        if (isMaximizing) {
            let maxScore = -Infinity;
            for (const move of moves) {
                this.chess.move(move);
                const score = this.minimax(depth - 1, false);
                this.chess.undo();
                maxScore = Math.max(maxScore, score);
            }
            this.transpositionTable.set(fen, { depth, score: maxScore });
            return maxScore;
        } else {
            let minScore = Infinity;
            for (const move of moves) {
                this.chess.move(move);
                const score = this.minimax(depth - 1, true);
                this.chess.undo();
                minScore = Math.min(minScore, score);
            }
            this.transpositionTable.set(fen, { depth, score: minScore });
            return minScore;
        }
    }

    private findBestMove(): string {
        this.transpositionTable.clear();
        const currentMoves = this.chess.moves();
        let bestScore = -Infinity;
        let bestMove = currentMoves[0];
        for (const move of currentMoves) {
            this.chess.move(move);
            if (this.chess.isCheckmate()) {
                this.chess.undo();
                return move;
            }
            const score = this.minimax(2, false);
            this.chess.undo();
            if (score > bestScore) {
                bestScore = score;
                bestMove = move;
            }
        }
        return bestMove;
    }

    public handleCommand(command: string): void {
        const parts = command.trim().split(' ');
        const mainCommand = parts[0].toLowerCase();
        switch (mainCommand) {
            case 'uci':
                console.log('id name ChessBro');
                console.log('id author Your Name');
                console.log('uciok');
                break;
            case 'isready':
                console.log('readyok');
                break;
            case 'ucinewgame':
                this.chess = new Chess();
                this.transpositionTable.clear();
                break;
            case 'position':
                if (parts[1] === 'startpos') {
                    this.chess = new Chess();
                    if (parts.length > 2 && parts[2] === 'moves') {
                        for (let i = 3; i < parts.length; i++) {
                            this.chess.move(parts[i]);
                        }
                    }
                } else if (parts[1] === 'fen') {
                    const fen = parts.slice(2, 8).join(' ');
                    this.chess = new Chess(fen);
                    if (parts.length > 8 && parts[8] === 'moves') {
                        for (let i = 9; i < parts.length; i++) {
                            // Only make move if legal in this position
                            try {
                                this.chess.move(parts[i]);
                            } catch (e) {
                                // Ignore invalid moves
                            }
                        }
                    }
                }
                break;
            case 'go':
                const bestMove = this.findBestMove();
                this.chess.move(bestMove);
                console.log(`bestmove ${bestMove}`);
                break;
            case 'quit':
                this.isRunning = false;
                break;
        }
    }

    public start(): void {
        process.stdin.setEncoding('utf8');
        process.stdin.on('data', (data: string) => {
            const commands = data.toString().split('\n');
            for (const command of commands) {
                if (command.trim()) {
                    this.handleCommand(command);
                }
            }
        });
    }
}

if (require.main === module) {
    const engine = new ChessEngine();
    engine.start();
}
