import { ChessEngine } from '../src/index';
import { Readable, createMockedReadStream } from 'stream';
import { Chess } from 'chess.js';
import { beforeEach, describe, expect, it } from '@jest/globals';

describe('ChessEngine', () => {
  let engine: ChessEngine;

  beforeEach(() => {
    engine = new ChessEngine();
  });

  describe('evaluatePosition', () => {
    it('returns checkmate score when in checkmate', () => {
      const chess = new Chess();
      chess.load('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1');
      chess.move('e4');
      chess.move('e5');
      chess.move('Qh5');
      chess.move('Qxh7#');

      engine.chess = chess;

      const score = engine.evaluatePosition();
      expect(score).toBe(-ChessEngine.CHECKMATE_VALUE);
    });

    it('returns material score for a normal position', () => {
      const chess = new Chess();
      chess.load('rnbqkbnr/pppppppp/8/8/3/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1');

      engine.chess = chess;

      const score = engine.evaluatePosition();
      expect(score).toBe(0);
    });
  });

  describe('minimax', () => {
    it('returns evaluation when depth is 0', () => {
      const chess = new Chess();
      chess.load('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1');

      engine.chess = chess;

      const score = engine.minimax(0, true);
      expect(score).toBe(engine.evaluatePosition());
    });

    it('returns cached score when depth is sufficient', () => {
      const chess = new Chess();
      chess.load('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1');

      engine.chess = chess;
      engine.transpositionTable = new Map();
      engine.transpositionTable.set(chess.fen(), { depth: 3, score: 10 });

      const score = engine.minimax(2, true);
      expect(score).toBe(10);
    });
  });

  describe('findBestMove', () => {
    it('returns checkmate move immediately', () => {
      const chess = new Chess();
      chess.load('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1');
      chess.move('e4');
      chess.move('e5');
      chess.move('Qh5');
      chess.move('Qxh7#');

      engine.chess = chess;

      const bestMove = engine.findBestMove();
      expect(bestMove).toBe('Qxh7#');
    });

    it('selects best move based on minimax score', () => {
      const chess = new Chess();
      chess.load('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1');

      engine.chess = chess;

      engine.minimax = jest.fn().mockReturnValue(10);

      const bestMove = engine.findBestMove();
      expect(bestMove).toBe('e4');
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
      const stdin: NodeJS.ReadStream = {
        setEncoding: jest.fn(),
        on: jest.fn(),
        isRaw: false,
        setRawMode: jest.fn(),
        isTTY: false,
        destroySoon: jest.fn(),
        write: jest.fn(),
        connect: jest.fn(),
        pause: jest.fn(),
        resetAndDestroy: jest.fn(),
        // Remove invalid 'fd' property
      };
      const mockStdin = jest.createMockedReadStream(['test input']);
      jest.mock('process', () => ({
          stdin: mockStdin
      }));
      engine.start();
      expect(process.stdin.setEncoding).toHaveBeenCalledWith('utf8');
      expect(stdin.on).toHaveBeenCalledWith('data', expect.any(Function));
    });
  });
});
