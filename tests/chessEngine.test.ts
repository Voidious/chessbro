import { Chess, Move, Square } from 'chess.js';
import { ChessEngine } from '../src/index';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

// Mock the Chess.js library to avoid real game state changes
const mockChess = jest.fn(() => ({
  isCheckmate: jest.fn(),
  isGameOver: jest.fn(),
  moves: jest.fn(),
  board: jest.fn(),
  fen: jest.fn(),
  move: jest.fn(),
  undo: jest.fn(),
  toString: jest.fn(),
  turn: jest.fn(), // Add this line to include the 'turn' method
}));

jest.mock('chess.js', () => ({
  Chess: mockChess,
}));

describe('ChessEngine', () => {
  let engine: ChessEngine;

  beforeEach(() => {
    jest.clearAllMocks();
    engine = new ChessEngine();
  });

  describe('evaluatePosition', () => {
    it('returns checkmate score when in checkmate', () => {
      const chess = mockChess.mockReturnValueOnce({
        isCheckmate: jest.fn().mockReturnValue(true),
        turn: jest.fn().mockReturnValue('w'),
      });

      const score = engine.evaluatePosition();
      expect(score).toBe(-ChessEngine.CHECKMATE_VALUE);
    });

    it('returns material score for a normal position', () => {
      const chess = mockChess.mockReturnValueOnce({
        isCheckmate: jest.fn().mockReturnValue(false),
        board: jest.fn().mockReturnValue([
          ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
          ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
          ['', '', '', '', '', '', '', ''],
          ['', '', '', '', '', '', '', ''],
          ['', '', '', '', '', '', '', ''],
          ['', '', '', '', '', '', '', ''],
          ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
          ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'],
        ]),
      });

      const score = engine.evaluatePosition();
      expect(score).toBe(0);
    });
  });

  describe('minimax', () => {
    it('returns cached score when depth is sufficient', () => {
      const chess = mockChess.mockReturnValueOnce({
        fen: jest.fn().mockReturnValue('testfen'),
        isGameOver: jest.fn().mockReturnValue(true),
      });

      const transpositionTable = new Map();
      transpositionTable.set('testfen', { depth: 3, score: 10 });

      engine.transpositionTable = transpositionTable;

      const score = engine.minimax(2, true);
      expect(score).toBe(10);
    });

    it('returns evaluation when depth is 0', () => {
      const chess = mockChess.mockReturnValueOnce({
        isGameOver: jest.fn().mockReturnValue(true),
        fen: jest.fn().mockReturnValue('testfen'),
      });

      engine.transpositionTable = new Map();

      const score = engine.minimax(0, true);
      expect(score).toBe(engine.evaluatePosition());
    });
  });

  describe('findBestMove', () => {
    it('returns checkmate move immediately', () => {
      const chess = mockChess.mockReturnValueOnce({
        isCheckmate: jest.fn().mockReturnValue(true),
        move: jest.fn().mockReturnValue(true),
      });

      const move = 'e2e4';
      engine.chess = chess;

      const bestMove = engine.findBestMove();
      expect(bestMove).toBe(move);
    });

    it('selects best move based on minimax score', () => {
      const chess = mockChess.mockReturnValueOnce({
        moves: jest.fn().mockReturnValue(['e2e4', 'e2e5']),
        move: jest.fn().mockReturnValue(true),
        undo: jest.fn().mockReturnValue(true),
      });

      engine.minimax = jest.fn().mockReturnValue(10);

      const bestMove = engine.findBestMove();
      expect(bestMove).toBe('e2e4');
    });
  });

  describe('handleCommand', () => {
    it('responds to uci command', () => {
      const engine = new ChessEngine();
      engine.handleCommand('uci');
      expect(console.log).toHaveBeenCalledWith('id name ChessBro');
      expect(console.log).toHaveBeenCalledWith('id author Your Name');
      expect(console.log).toHaveBeenCalledWith('uciok');
    });

    it('responds to isready command', () => {
      const engine = new ChessEngine();
      engine.handleCommand('isready');
      expect(console.log).toHaveBeenCalledWith('readyok');
    });

    it('resets game on ucinewgame', () => {
      const engine = new ChessEngine();
      engine.handleCommand('ucinewgame');
      expect(engine.chess.isGameOver()).toBe(false);
      expect(engine.transpositionTable.size).toBe(0);
    });

    it('handles position command with startpos', () => {
      const engine = new ChessEngine();
      engine.handleCommand('position startpos moves e2e4 d2d4');
      expect(engine.chess.move).toHaveBeenCalledWith('e2e4');
      expect(engine.chess.move).toHaveBeenCalledWith('d2d4');
    });

    it('handles position command with fen', () => {
      const engine = new ChessEngine();
      engine.handleCommand('position fen rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1 moves e2e4');
      expect(engine.chess.fen()).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
      expect(engine.chess.move).toHaveBeenCalledWith('e2e4');
    });

    it('handles go command and returns bestmove', () => {
      const engine = new ChessEngine();
      engine.findBestMove = jest.fn().mockReturnValue('e2e4');
      engine.handleCommand('go');
      expect(console.log).toHaveBeenCalledWith(`bestmove e2e4`);
    });
  });

  describe('start', () => {
    it('registers stdin input handler', () => {
      const engine = new ChessEngine();
      const stdin = {
        setEncoding: jest.fn(),
        on: jest.fn(),
      };
      jest.spyOn(process, 'stdin').mockReturnValue(stdin);
      engine.start();
      expect(process.stdin.setEncoding).toHaveBeenCalledWith('utf8');
      expect(stdin.on).toHaveBeenCalledWith('data', expect.any(Function));
    });
  });
});
