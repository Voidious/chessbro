import { ChessEngine } from '../src/index';
import { Chess } from 'chess.js';

describe('ChessEngine', () => {
  let engine: any;

  beforeEach(() => {
    engine = new (ChessEngine as any)();
  });

  describe('evaluatePosition', () => {
    it('should return 0 for starting position', () => {
      engine.chess = new Chess();
      expect(engine['evaluatePosition']()).toBe(0);
    });

    it('should return positive for white material advantage', () => {
      engine.chess = new Chess('8/8/8/8/8/8/4K3/4Q2k w - - 0 1');
      expect(engine['evaluatePosition']()).toBeGreaterThan(0);
    });

    it('should return negative for black material advantage', () => {
      engine.chess = new Chess('8/8/8/8/8/8/4k3/4q2K w - - 0 1');
      expect(engine['evaluatePosition']()).toBeLessThan(0);
    });

    it('should return CHECKMATE_VALUE for checkmate delivered', () => {
      engine.chess = new Chess('6k1/5Q2/7K/8/8/8/8/8 w - - 0 1');
      engine.chess.move('Qg7#');
      expect(engine['evaluatePosition']()).toBe((ChessEngine as any).CHECKMATE_VALUE);
    });

    it('should return -CHECKMATE_VALUE for being checkmated', () => {
      engine.chess = new Chess('6K1/5q2/7k/8/8/8/8/8 b - - 0 1');
      engine.chess.move('Qg7#');
      expect(engine['evaluatePosition']()).toBe(-(ChessEngine as any).CHECKMATE_VALUE);
    });
  });

  describe('minimax', () => {
    it('should return 0 for depth 0', () => {
      engine.chess = new Chess();
      expect(engine['minimax'](0, true)).toBe(0);
    });

    it('should return a number for depth > 0', () => {
      engine.chess = new Chess();
      expect(typeof engine['minimax'](1, true)).toBe('number');
    });
  });

  describe('findBestMove', () => {
    it('should return a legal move', () => {
      engine.chess = new Chess();
      const move = engine['findBestMove']();
      expect(engine.chess.moves()).toContain(move);
    });
  });
});

describe('UCI Interface', () => {
  let engine: any;
  let output: string[];
  let originalLog: any;

  beforeEach(() => {
    engine = new (ChessEngine as any)();
    output = [];
    originalLog = console.log;
    console.log = (msg: string) => output.push(msg);
  });

  afterEach(() => {
    console.log = originalLog;
  });

  it('should respond to uci command', () => {
    engine['handleCommand']('uci');
    expect(output).toContain('id name ChessBro');
    expect(output).toContain('id author Your Name');
    expect(output).toContain('uciok');
  });

  it('should respond to isready command', () => {
    engine['handleCommand']('isready');
    expect(output).toContain('readyok');
  });

  it('should reset on ucinewgame', () => {
    engine.chess.move('e4');
    engine['handleCommand']('ucinewgame');
    expect(engine.chess.fen()).toBe(new Chess().fen());
  });

  it('should set position from startpos', () => {
    engine['handleCommand']('position startpos moves e2e4 e7e5');
    // Use UCI notation for moves
    const history = engine.chess.history({ verbose: true });
    expect(history.map((m: any) => m.from + m.to)).toEqual(['e2e4', 'e7e5']);
  });

  it('should set position from fen', () => {
    engine['handleCommand']('position fen 8/8/8/8/8/8/4K3/4Q2k w - - 0 1 moves e2e4');
    expect(engine.chess.fen().startsWith('8/8/8/8/8/8/4K3/4Q2k')).toBe(true);
    // The move e2e4 is not legal in this position, so history should be empty
    expect(engine.chess.history().length).toBe(0);
  });

  it('should output bestmove on go', () => {
    engine['handleCommand']('position startpos');
    engine['handleCommand']('go');
    expect(output.some(line => line.startsWith('bestmove '))).toBe(true);
  });

  it('should set isRunning to false on quit', () => {
    engine['handleCommand']('quit');
    expect(engine.isRunning).toBe(false);
  });
});
