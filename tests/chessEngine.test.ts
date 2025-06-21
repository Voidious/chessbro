import { ChessEngine } from '../src/index';
import { Chess, Move, Piece, Square } from 'chess.js';

// Mock chess.js
jest.mock('chess.js', () => {
    const originalChess = jest.requireActual('chess.js');
    return {
        ...originalChess,
        Chess: jest.fn(),
    };
});

const mockedChess = Chess as jest.MockedClass<typeof Chess>;

describe('ChessEngine', () => {
    let engine: ChessEngine;

    beforeEach(() => {
        // Reset the mock before each test
        mockedChess.mockClear();
        engine = new ChessEngine();
    });

    describe('evaluatePosition', () => {
        it('should return 0 for the starting position', () => {
            const mockBoard: ({ type: string; color: string } | null)[][] = Array(8).fill(null).map(() => Array(8).fill(null));
            const mockTurn = 'w';
            const mockIsCheckmate = false;

            // Configure the mock instance
            mockedChess.prototype.board = jest.fn().mockReturnValue(mockBoard);
            mockedChess.prototype.turn = jest.fn().mockReturnValue(mockTurn);
            mockedChess.prototype.isCheckmate = jest.fn().mockReturnValue(mockIsCheckmate);
            
            engine.chess = new Chess();

            // The board is empty, so the score should be 0.
            expect(engine.evaluatePosition()).toBe(0);
        });

        it('should return a positive score for white when white has a material advantage', () => {
            const mockBoard: ({ type: string; color: string } | null)[][] = [
                [{ type: 'r', color: 'w' }], // White rook
                [{ type: 'p', color: 'b' }]  // Black pawn
                // ... rest of the board is empty
            ];
            const mockTurn = 'w';
            const mockIsCheckmate = false;

            mockedChess.prototype.board = jest.fn().mockReturnValue(createFullBoard(mockBoard));
            mockedChess.prototype.turn = jest.fn().mockReturnValue(mockTurn);
            mockedChess.prototype.isCheckmate = jest.fn().mockReturnValue(mockIsCheckmate);
            
            engine.chess = new Chess();
            
            // White has a rook (5) and black has a pawn (1). Score should be 5 - 1 = 4
            expect(engine.evaluatePosition()).toBe(4);
        });

        it('should return a negative score for black when black has a material advantage', () => {
            const mockBoard: ({ type: string; color: string } | null)[][] = [
                [{ type: 'r', color: 'b' }], // Black rook
                [{ type: 'p', color: 'w' }]  // White pawn
            ];
             const mockTurn = 'w';
            const mockIsCheckmate = false;

            mockedChess.prototype.board = jest.fn().mockReturnValue(createFullBoard(mockBoard));
            mockedChess.prototype.turn = jest.fn().mockReturnValue(mockTurn);
            mockedChess.prototype.isCheckmate = jest.fn().mockReturnValue(mockIsCheckmate);

            engine.chess = new Chess();
            
            // Black has a rook (5) and white has a pawn (1). Score should be 1 - 5 = -4.
            expect(engine.evaluatePosition()).toBe(-4);
        });

        it('should return CHECKMATE_VALUE for a checkmate delivered by white', () => {
            mockedChess.prototype.isCheckmate = jest.fn().mockReturnValue(true);
            mockedChess.prototype.turn = jest.fn().mockReturnValue('b'); // Black's turn, so white delivered checkmate
            engine.chess = new Chess();
            expect(engine.evaluatePosition()).toBe(ChessEngine.CHECKMATE_VALUE);
        });

        it('should return -CHECKMATE_VALUE for a checkmate delivered by black', () => {
            mockedChess.prototype.isCheckmate = jest.fn().mockReturnValue(true);
            mockedChess.prototype.turn = jest.fn().mockReturnValue('w'); // White's turn, so black delivered checkmate
            engine.chess = new Chess();
            expect(engine.evaluatePosition()).toBe(-ChessEngine.CHECKMATE_VALUE);
        });
    });

    describe('findBestMove', () => {
        it('should find the only move available', () => {
            const moves = ['e4'];
            mockedChess.prototype.moves = jest.fn().mockReturnValue(moves);
            mockedChess.prototype.move = jest.fn();
            mockedChess.prototype.undo = jest.fn();
            mockedChess.prototype.isCheckmate = jest.fn().mockReturnValue(false);

            engine.chess = new Chess();

            // Mock minimax to return a score
            engine.minimax = jest.fn().mockReturnValue(1);

            const bestMove = engine.findBestMove();
            expect(bestMove).toBe('e4');
        });

        it('should find a checkmating move', () => {
            const moves = ['e4', 'Qh5#'];
            mockedChess.prototype.moves = jest.fn().mockReturnValue(moves);
            mockedChess.prototype.fen = jest.fn().mockReturnValue('some-fen');
            mockedChess.prototype.isGameOver = jest.fn().mockReturnValue(false);

            // Simulate the checkmate
            mockedChess.prototype.move = jest.fn().mockImplementation((move) => {
                if (move === 'Qh5#') {
                    mockedChess.prototype.isCheckmate = jest.fn().mockReturnValue(true);
                }
                return {} as Move;
            });
            mockedChess.prototype.undo = jest.fn().mockImplementation(() => {
                mockedChess.prototype.isCheckmate = jest.fn().mockReturnValue(false);
            });
            mockedChess.prototype.isCheckmate = jest.fn().mockReturnValue(false);
            
            engine.chess = new Chess();
            
            const bestMove = engine.findBestMove();
            expect(bestMove).toBe('Qh5#');
        });
    });

    describe('handleCommand', () => {
        let logSpy: jest.SpyInstance;

        beforeEach(() => {
            logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        });

        afterEach(() => {
            logSpy.mockRestore();
        });

        it('should handle "uci" command', () => {
            engine.handleCommand('uci');
            expect(logSpy).toHaveBeenCalledWith('id name ChessBro');
            expect(logSpy).toHaveBeenCalledWith('id author Your Name');
            expect(logSpy).toHaveBeenCalledWith('uciok');
        });

        it('should handle "isready" command', () => {
            engine.handleCommand('isready');
            expect(logSpy).toHaveBeenCalledWith('readyok');
        });

        it('should handle "ucinewgame" command', () => {
            const clearSpy = jest.spyOn(engine.transpositionTable, 'clear');
            engine.handleCommand('ucinewgame');
            expect(mockedChess).toHaveBeenCalled();
            expect(clearSpy).toHaveBeenCalled();
            clearSpy.mockRestore();
        });

        it('should handle "position startpos" command', () => {
            engine.handleCommand('position startpos');
            expect(mockedChess).toHaveBeenCalledWith();
        });

        it('should handle "position startpos moves" command', () => {
            const moveSpy = jest.fn();
            mockedChess.prototype.move = moveSpy;
            engine.chess = new Chess();
            engine.handleCommand('position startpos moves e2e4 e7e5');
            expect(moveSpy).toHaveBeenCalledWith('e2e4');
            expect(moveSpy).toHaveBeenCalledWith('e7e5');
        });

        it('should handle "position fen" command', () => {
            const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
            engine.handleCommand(`position fen ${fen}`);
            expect(mockedChess).toHaveBeenCalledWith(fen);
        });
        
        it('should handle "position fen moves" command', () => {
            const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
            const moveSpy = jest.fn();
            mockedChess.prototype.move = moveSpy;
            engine.chess = new Chess();
            engine.handleCommand(`position fen ${fen} moves e2e4 e7e5`);
            expect(mockedChess).toHaveBeenCalledWith(fen);
            expect(moveSpy).toHaveBeenCalledWith('e2e4');
            expect(moveSpy).toHaveBeenCalledWith('e7e5');
        });

        it('should handle "go" command', () => {
            const bestMove = 'e4';
            const findBestMoveSpy = jest.spyOn(engine, 'findBestMove').mockReturnValue(bestMove);
            const moveSpy = jest.fn();
            mockedChess.prototype.move = moveSpy;
            engine.chess = new Chess();

            engine.handleCommand('go');
            
            expect(findBestMoveSpy).toHaveBeenCalled();
            expect(moveSpy).toHaveBeenCalledWith(bestMove);
            expect(logSpy).toHaveBeenCalledWith(`bestmove ${bestMove}`);
            
            findBestMoveSpy.mockRestore();
        });

        it('should handle "quit" command', () => {
            engine.handleCommand('quit');
            expect(engine.isRunning).toBe(false);
        });
    });
});

// Helper to create a full 8x8 board from a sparse one for testing
function createFullBoard(sparseBoard: (({ type: string, color: string } | null)[])[]): (Piece | null)[][] {
    const board: (Piece | null)[][] = Array(8).fill(null).map(() => Array(8).fill(null));
    sparseBoard.forEach((row, r) => {
        row.forEach((piece, f) => {
            if (piece) {
                board[r][f] = { ...piece, type: piece.type as any, color: piece.color as 'w' | 'b' };
            }
        });
    });
    return board;
} 