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
- Selects moves using a basic evaluation function and minimax search
- Ready for custom move evaluation implementation

## Development

The engine is written in TypeScript and uses the chess.js library for move validation and board representation. The main logic is in `src/index.ts`.

To add your own move evaluation:

1. Modify the evaluation logic in `src/index.ts` (see `evaluatePosition` and `minimax`)
2. Implement your own evaluation function or search logic
3. The engine will use your evaluation to choose the best move

## Contributing

**Note for Windows users:**

Husky pre-commit hooks require a POSIX shell (like Git Bash, included with Git for Windows). If you use PowerShell or CMD, pre-commit hooks may not run. To ensure hooks work, run `git commit` from a Git Bash terminal or configure your editor to use Git Bash as the default terminal.
