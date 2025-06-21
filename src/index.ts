import { Chess, Move, Square } from 'chess.js';

interface TranspositionEntry {
    depth: number;
    score: number;
}

export class ChessEngine {
    public chess: Chess;
    public isRunning: boolean;
    public transpositionTable: Map<string, TranspositionEntry>;

    // Piece values
    public static readonly PIECE_VALUES: { [key: string]: number } = {
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

    public evaluatePosition(): number {
        // Check for checkmate first
        if (this.chess.isCheckmate()) {
            // If it's checkmate, return a very high negative value if we're the one getting mated
            // or a very high positive value if we're the one delivering mate
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

    public minimax(depth: number, isMaximizing: boolean): number {
        // Check transposition table first
        const fen = this.chess.fen();
        const cachedEntry = this.transpositionTable.get(fen);
        if (cachedEntry && cachedEntry.depth >= depth) {
            return cachedEntry.score;
        }

        // Base case: if we've reached maximum depth or the game is over
        if (depth === 0 || this.chess.isGameOver()) {
            const score = this.evaluatePosition();
            // Cache the evaluation
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
            // Cache the result
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
            // Cache the result
            this.transpositionTable.set(fen, { depth, score: minScore });
            return minScore;
        }
    }

    public findBestMove(): string {
        // Clear transposition table for new search
        this.transpositionTable.clear();
        
        const currentMoves = this.chess.moves();
        let bestScore = -Infinity;
        let bestMove = currentMoves[0];

        for (const move of currentMoves) {
            // Make the move
            this.chess.move(move);
            
            // Check if this move leads to checkmate
            if (this.chess.isCheckmate()) {
                this.chess.undo();
                return move; // Immediately return the checkmate move
            }
            
            // Evaluate the position after 2 plies (our move + opponent's best response + our best response)
            const score = this.minimax(2, false);
            
            // Undo our move
            this.chess.undo();
            
            // If this move leads to a better position, choose it
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
                this.transpositionTable.clear(); // Clear cache for new game
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
                            this.chess.move(parts[i]);
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
