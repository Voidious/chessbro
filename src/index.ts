import { Chess } from 'chess.js';

class ChessEngine {
    private chess: Chess;
    private isRunning: boolean;

    constructor() {
        this.chess = new Chess();
        this.isRunning = true;
    }

    private handleCommand(command: string): void {
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
                // For now, we'll just make a random move
                const moves = this.chess.moves();
                if (moves.length > 0) {
                    const randomMove = moves[Math.floor(Math.random() * moves.length)];
                    this.chess.move(randomMove);
                    console.log(`bestmove ${randomMove}`);
                }
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

const engine = new ChessEngine();
engine.start(); 