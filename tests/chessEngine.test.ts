import { ChessEngine } from "../src/index";
import { Chess } from "chess.js";

describe("ChessEngine", () => {
  let engine: any;

  beforeEach(() => {
    engine = new (ChessEngine as any)();
  });

  describe("evaluatePosition", () => {
    it("should return 0 for starting position", () => {
      engine.chess = new Chess();
      expect(engine["evaluatePosition"]()).toBe(0);
    });

    it("should return positive for white material advantage", () => {
      engine.chess = new Chess("8/8/8/8/8/8/4K3/4Q2k w - - 0 1");
      expect(engine["evaluatePosition"]()).toBeGreaterThan(0);
    });

    it("should return negative for black material advantage", () => {
      engine.chess = new Chess("8/8/8/8/8/8/4k3/4q2K w - - 0 1");
      expect(engine["evaluatePosition"]()).toBeLessThan(0);
    });

    it("should return CHECKMATE_VALUE for checkmate delivered", () => {
      engine.chess = new Chess("6k1/5Q2/7K/8/8/8/8/8 w - - 0 1");
      engine.chess.move("Qg7#");
      expect(engine["evaluatePosition"]()).toBe(
        (ChessEngine as any).CHECKMATE_VALUE,
      );
    });

    it("should return -CHECKMATE_VALUE for being checkmated", () => {
      engine.chess = new Chess("6K1/5q2/7k/8/8/8/8/8 b - - 0 1");
      engine.chess.move("Qg7#");
      expect(engine["evaluatePosition"]()).toBe(
        -(ChessEngine as any).CHECKMATE_VALUE,
      );
    });
  });

  describe("minimax", () => {
    it("should return 0 for depth 0", () => {
      engine.chess = new Chess();
      expect(engine["minimax"](0, true)).toBe(0);
    });

    it("should return a number for depth > 0", () => {
      engine.chess = new Chess();
      expect(typeof engine["minimax"](1, true)).toBe("number");
    });
  });

  describe("findBestMove", () => {
    it("should return a legal move", () => {
      engine.chess = new Chess();
      const move = engine["findBestMove"]();
      expect(engine.chess.moves()).toContain(move);
    });
  });
});

describe("UCI Interface", () => {
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

  it("should respond to uci command", () => {
    engine["handleCommand"]("uci");
    expect(output).toContain("id name ChessBro");
    expect(output).toContain("id author Your Name");
    expect(output).toContain("uciok");
  });

  it("should respond to isready command", () => {
    engine["handleCommand"]("isready");
    expect(output).toContain("readyok");
  });

  it("should reset on ucinewgame", () => {
    engine.chess.move("e4");
    engine["handleCommand"]("ucinewgame");
    expect(engine.chess.fen()).toBe(new Chess().fen());
  });

  it("should set position from startpos", () => {
    engine["handleCommand"]("position startpos moves e2e4 e7e5");
    // Use UCI notation for moves
    const history = engine.chess.history({ verbose: true });
    expect(history.map((m: any) => m.from + m.to)).toEqual(["e2e4", "e7e5"]);
  });

  it("should set position from fen", () => {
    engine["handleCommand"](
      "position fen 8/8/8/8/8/8/4K3/4Q2k w - - 0 1 moves e2e4",
    );
    expect(engine.chess.fen().startsWith("8/8/8/8/8/8/4K3/4Q2k")).toBe(true);
    // The move e2e4 is not legal in this position, so history should be empty
    expect(engine.chess.history().length).toBe(0);
  });

  it("should output bestmove on go", () => {
    engine["handleCommand"]("position startpos");
    engine["handleCommand"]("go");
    expect(output.some((line) => line.startsWith("bestmove "))).toBe(true);
  });

  it("should set isRunning to false on quit", () => {
    engine["handleCommand"]("quit");
    expect(engine.isRunning).toBe(false);
  });
});

describe("Alpha-Beta Pruning", () => {
  let engine: TestableChessEngine;
  let nodeCount: number;
  let originalMinimax: any;

  beforeEach(() => {
    engine = new TestableChessEngine();
    nodeCount = 0;
    // Patch minimax to count nodes
    originalMinimax = engine["minimax"].bind(engine);
    engine["minimax"] = function (
      depth: number,
      isMax: boolean,
      alpha: number,
      beta: number,
    ) {
      nodeCount++;
      return originalMinimax(depth, isMax, alpha, beta);
    };
  });

  it("should return correct value for mate in 1 (white)", () => {
    engine.setChess(new Chess("6k1/5Q2/7K/8/8/8/8/8 w - - 0 1"));
    // White to move, Qg7# is mate
    const plies = 2; // 1 full move
    const score = engine["minimax"](plies, true, -Infinity, Infinity);
    expect(score).toBe((ChessEngine as any).CHECKMATE_VALUE);
  });

  it("should return correct value for mate in 1 (black)", () => {
    engine.setChess(new Chess("6K1/5q2/7k/8/8/8/8/8 b - - 0 1"));
    // Black to move, Qg7# is mate
    const plies = 2; // 1 full move
    const score = engine["minimax"](plies, false, -Infinity, Infinity);
    expect(score).toBe(-(ChessEngine as any).CHECKMATE_VALUE);
  });

  it("should return 0 for stalemate", () => {
    engine.setChess(new Chess("7k/5Q2/6K1/8/8/8/8/8 b - - 0 1"));
    // Black to move, stalemate
    const plies = 2;
    const score = engine["minimax"](plies, false, -Infinity, Infinity);
    expect(score).toBe(0);
  });

  it("should visit fewer nodes with pruning on a simple position", () => {
    // Use a simple position: White king and queen vs black king, mate in 1
    engine.setChess(new Chess("6k1/5Q2/7K/8/8/8/8/8 w - - 0 1"));
    nodeCount = 0;
    const plies = 2; // Use 2 plies for meaningful pruning
    engine.clearTranspositionTable();
    engine["minimax"](plies, true, -Infinity, Infinity);
    const prunedNodes = nodeCount;
    // Now, patch minimax to remove pruning for comparison
    const unprunedMinimax = (
      depth: number,
      isMax: boolean,
      alpha: number,
      beta: number,
    ) => {
      nodeCount++;
      const self = engine as TestableChessEngine;
      // Use a fresh transposition table for the unpruned run
      if (!self._unprunedTable) self._unprunedTable = new Map();
      const table = self._unprunedTable;
      const fen = self.getChess().fen();
      const cachedEntry = table.get(fen);
      if (cachedEntry && cachedEntry.depth >= depth) {
        return cachedEntry.score;
      }
      if (depth === 0 || self.getChess().isGameOver()) {
        const score = self.evaluatePositionPublic();
        table.set(fen, { depth, score });
        return score;
      }
      const moves = self.getChess().moves();
      if (isMax) {
        let maxScore = -Infinity;
        for (const move of moves) {
          self.getChess().move(move);
          const score = unprunedMinimax(depth - 1, false, alpha, beta);
          self.getChess().undo();
          maxScore = Math.max(maxScore, score);
        }
        table.set(fen, { depth, score: maxScore });
        return maxScore;
      } else {
        let minScore = Infinity;
        for (const move of moves) {
          self.getChess().move(move);
          const score = unprunedMinimax(depth - 1, true, alpha, beta);
          self.getChess().undo();
          minScore = Math.min(minScore, score);
        }
        table.set(fen, { depth, score: minScore });
        return minScore;
      }
    };
    nodeCount = 0;
    // Use a fresh transposition table for the unpruned run
    (engine as any)._unprunedTable = new Map();
    unprunedMinimax(plies, true, -Infinity, Infinity);
    const unprunedNodes = nodeCount;
    expect(prunedNodes).toBeLessThan(unprunedNodes);
  });

  it("should respect configurable search depth", () => {
    // Subclass to override minimax for node counting
    let nodeCount = 0;
    class CountingEngine extends TestableChessEngine {
      minimax(depth: number, isMax: boolean, alpha: number, beta: number) {
        nodeCount++;
        // @ts-ignore
        return super.minimax(depth, isMax, alpha, beta);
      }
    }
    const countingEngine = new CountingEngine();
    countingEngine.setChess(new Chess("8/8/8/8/8/8/4K3/4Q2k w - - 0 1"));
    countingEngine["handleCommand"]("setoption name SearchDepth value 1");
    expect(countingEngine.getSearchDepth()).toBe(1);
    nodeCount = 0;
    countingEngine["findBestMove"]();
    expect(nodeCount).toBeGreaterThan(0);
    countingEngine["handleCommand"]("setoption name SearchDepth value 2");
    expect(countingEngine.getSearchDepth()).toBe(2);
    nodeCount = 0;
    countingEngine["findBestMove"]();
    expect(nodeCount).toBeGreaterThan(0);
  });

  it("should handle depth 0 and 1 without error", () => {
    engine.setChess(new Chess());
    expect(() => engine["minimax"](0, true, -Infinity, Infinity)).not.toThrow();
    expect(() => engine["minimax"](1, true, -Infinity, Infinity)).not.toThrow();
  });
});

// Subclass to expose protected members for testing
class TestableChessEngine extends ChessEngine {
  public _unprunedTable?: Map<string, any>;
  public getChess() {
    return this.chess;
  }
  public setChess(chess: Chess) {
    this.chess = chess;
  }
  public getTranspositionTable() {
    return this.transpositionTable;
  }
  public clearTranspositionTable() {
    this.transpositionTable.clear();
  }
  public getSearchDepth() {
    return this.searchDepth;
  }
  public setSearchDepth(depth: number) {
    this.searchDepth = depth;
  }
  public evaluatePositionPublic() {
    return this.evaluatePosition();
  }
}
