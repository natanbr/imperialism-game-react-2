# Imperialism Game (React Implementation)

A Next.js-based recreation of the classic strategy game *Imperialism*, featuring turn-based gameplay with resource development, transportation networks, diplomacy, trade, and military systems.

## Tech Stack

- **Framework**: Next.js 15 (App Router) + Turbopack
- **UI**: React 19, CSS Modules with design tokens
- **State**: Zustand with sliced store pattern
- **Testing**: Vitest with V8 coverage
- **Language**: TypeScript 5 (strict mode)

## Commands

### Development
```bash
npm install           # Install dependencies
npm run dev          # Start dev server (http://localhost:3000)
npm run build        # Build for production
npm run start        # Start production server
```

### Testing
```bash
npm run test         # Run all tests once
npm run test:watch   # Run tests in watch mode
npm run lint         # Run ESLint

# Run specific test file
npx vitest run tests/systems/developmentSystem.test.ts

# Run tests matching pattern
npx vitest run tests/systems/ -t "test name pattern"

# Generate coverage report
npx vitest run --coverage
```

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to play.

## Project Status

**Current Phase**: Trade & Diplomacy (Phase 5)

**Completed**:
- ✅ Map rendering & tile interactions
- ✅ Worker system (8 worker types)
- ✅ Transport network (railroads, depots, ports)
- ✅ Industry & production systems
- ✅ Component refactoring (Phase 2)

**In Progress**:
- 🚧 Trade & Diplomacy systems

See [docs/ROADMAP.md](docs/ROADMAP.md) for full development plan.

## Documentation

- **[Architecture Guide](docs/ARCHITECTURE.md)** - Code structure, patterns, workflows
- **[Game Manual](docs/manual.md)** - Complete game rules and mechanics
- **[Development Roadmap](docs/ROADMAP.md)** - Feature implementation plan
- **[Technical Debt](docs/TECH_DEBT.md)** - Refactoring priorities
- **[Claude Guide](CLAUDE.md)** - Detailed guide for AI assistants

## Architecture Overview

**State Management**: Zustand with sliced store pattern - each slice handles a specific domain (game, map, nations, workers, transport, etc.)

**Turn System**: Pure function pipeline that processes game phases in deterministic order using seeded RNG

**Component Pattern**: Modular components with logic extracted to hooks, styled with CSS modules and design tokens

**Worker System**: 8 worker types (Prospector, Engineer, Miner, Farmer, etc.) that develop resources and build infrastructure

**Transport System**: Railroad networks with depots/ports that move resources to national warehouses

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for complete code structure and patterns.

## Contributing

1. Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for code patterns and workflows
2. Check [docs/TECH_DEBT.md](docs/TECH_DEBT.md) for refactoring priorities
3. Follow established patterns (hooks, CSS modules, pure functions)
4. Write tests for new features
5. Keep components <150 lines

## License

This is a fan recreation for educational purposes. *Imperialism* is a trademark of its respective owners.

## Resources

- **Original Game**: Imperialism (1997) by Frog City Software
- **Game Manual**: [docs/manual.md](docs/manual.md) - Based on original documentation
