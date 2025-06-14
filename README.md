# ChessBro

A simple UCI-compatible chess engine written in TypeScript.

## Installation

1. Make sure you have Node.js installed
2. Clone this repository
3. Install dependencies:
```bash
npm install
```

## Building

To build the engine:
```bash
npm run build
```

## Running with Cutechess

1. Build the engine first
2. In Cutechess, add a new engine with these settings:
   - Command: `node`
   - Arguments: `dist/index.js`
   - Protocol: UCI
   - Working Directory: (path to your engine directory)

## Features

- Implements the UCI protocol
- Currently makes random valid moves
- Ready for custom move evaluation implementation

## Development

The engine is written in TypeScript and uses the chess.js library for move validation and board representation. The main logic is in `src/index.ts`.

To add your own move evaluation:
1. Modify the `go` command handler in `src/index.ts`
2. Implement your evaluation function
3. Choose the best move based on your evaluation instead of random selection
