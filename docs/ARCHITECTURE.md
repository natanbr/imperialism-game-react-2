# Project Architecture & Best Practices

This document outlines the software architecture for the Imperialism game project and provides best practices to ensure a clean, scalable, and maintainable codebase.

## 1. High-Level Overview

The architecture is designed around a clear separation of concerns between **State**, **Logic**, and **UI**.

-   **State**: The entire game state is managed by **Zustand**. It is broken down into smaller, domain-specific **slices**.
-   **Logic**: Core game logic, especially turn-based updates, is handled by **Systems**. A system is a pure function that takes the current game state, applies logic, and returns the new state.
-   **UI**: The user interface is built with **React** and **Next.js**. Components are responsible for rendering the state and dispatching user actions.

This approach ensures that game logic is decoupled from the UI and that the state is managed in a predictable and organized manner.

---

## 2. State Management (`Zustand`)

We use a "slice" pattern to organize the Zustand store. Each slice represents a specific domain of the game.

### Slices

-   **Location**: `src/app/store/`
-   **Responsibility**: A slice defines a piece of the game state (`interface`) and the function to create it (`create...Slice`).
-   **Example**: `mapSlice.ts` manages the state of the game map, `nationSlice.ts` manages the state of all nations.

#### **Best Practices for Slices:**

1.  **Single Responsibility**: A slice should manage a single, well-defined domain of the game. For example, all state related to diplomacy should be in `diplomacySlice.ts`.
2.  **Simple Actions**: Actions within a slice should be simple state updates (e.g., `setMap`, `setActiveNation`). **Complex game logic does not belong in slice actions.**
3.  **Immutability**: Always treat state as immutable. When updating state, create new objects or arrays instead of mutating existing ones. Use the spread operator (`...`) for this.

### The Root Store

-   **File**: `src/app/store/rootStore.ts`
-   **Responsibility**: This file composes all the individual slices into a single, unified `GameStore`.

#### **Adding a New Slice:**

1.  Create your new slice file (e.g., `src/app/store/myNewSlice.ts`).
2.  Import the slice interface and creator function into `rootStore.ts`.
3.  Add the slice interface to the `GameStore` type definition.
4.  Add the slice creator function to the `create<GameStore>()` call.

---

## 3. Game Logic (`Systems`)

All complex, turn-based game logic is implemented in **Systems**.

### The System Layer

-   **Location**: `src/app/systems/`
-   **Responsibility**: A system is a pure function that encapsulates a piece of game logic (e.g., processing resource development, resolving trade).
-   **Signature**: A system always takes the entire `GameStore` state as input and returns the updated `GameStore` state.
    ```typescript
    export const mySystem = (state: GameStore): GameStore => {
      // ...logic
      return { ...state, /* updated parts */ };
    };
    ```

### Turn Phase Orchestration

-   **File**: `src/app/store/turnSlice.ts` (the `advanceTurn` action)
-   **Responsibility**: The `advanceTurn` action orchestrates the entire turn sequence by calling each system in the correct order. It passes the state from one system to the next, accumulating changes.
-   **The `phases.ts` file**: This file is a temporary holder for the `runTurnPhases` function, which lists the systems to be run in order.

#### **Best Practices for Systems:**

1.  **Purity**: Systems must be pure functions. They should not have side effects and should produce the same output for the same input. This makes them predictable and easy to test.
2.  **Single Focus**: Each system should be responsible for one specific aspect of the turn sequence (e.g., `developmentSystem`, `tradeSystem`).
3.  **Read from State, Return New State**: A system should read any part of the `GameStore` it needs, but it should return a *new* state object with the changes.

---

## 4. UI Components & Data Flow

### Component Responsibilities

-   **Location**: `src/app/components/`
-   **Responsibility**: React components are for rendering the UI and handling user input. They should not contain any game logic.
-   **Data Access**: Components access the game state by using the `useGameStore` hook.
    ```typescript
    const map = useGameStore((s) => s.map);
    const advanceTurn = useGameStore((s) => s.advanceTurn);
    ```
-   **Actions**: User interactions (like clicking a button) should call action functions from the store (e.g., `advanceTurn()`, `startProspecting()`).
-   **Organization**: Use a single top-level React component per file. Do not define multiple top-level components in one file. Keep tiny JSX helpers inline only if they are private to the component.

### Example Data Flow (User Action)

1.  **User**: Clicks the "Prospect" button in the `TileInfoPanel` component.
2.  **Component**: Calls the `startProspecting(tileId, workerId)` action from the `workerSlice`.
3.  **Store (`workerSlice`)**: The `startProspecting` action calls its corresponding helper (`startProspectingHelper`).
4.  **Helper (`workerHelpers.ts`)**: The helper function contains the logic to validate the action and returns the new, updated state.
5.  **Zustand**: Updates the state with the new state object.
6.  **React**: Re-renders the components that subscribe to the changed piece of state.

---

## 5. Example: Adding a "Treasury" Feature

Here is a step-by-step guide to adding a new feature in a way that follows this architecture.

1.  **Define the State (Slice)**:
    -   Create `src/app/store/treasurySlice.ts`.
    -   Define the `TreasurySlice` interface (e.g., `{ treasury: { cash: number } }`).
    -   Define simple actions like `addCash` and `spendCash`.

2.  **Integrate the Slice**:
    -   Open `src/app/store/rootStore.ts`.
    -   Import and add `TreasurySlice` to the `GameStore` type and the `create` function.

3.  **Implement Logic (System)**:
    -   If the treasury needs to be updated each turn (e.g., for interest payments), create `src/app/systems/treasurySystem.ts`.
    -   Write the logic as a pure function: `treasurySystem(state: GameStore): GameStore`.

4.  **Orchestrate the System**:
    -   Open `src/app/store/phases.ts`.
    -   Import your new `treasurySystem`.
    -   Add it to the `runTurnPhases` function in the correct sequence.

5.  **Display in UI (Component)**:
    -   In a React component (e.g., `HUD.tsx`), select the cash from the store:
        ```typescript
        const cash = useGameStore((s) => s.treasury.cash);
        ```
    -   Render the value.
    -   If a button needs to modify the cash, call the action: `useGameStore.getState().addCash(100);` (or select the action if it's used frequently).