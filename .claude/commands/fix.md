You will be fixing a bug in this codebase:

$ARGUMENTS:

IMPORTANT:
- Before you start, if there are any gaps or assumptions, verify with me and ask questions before proceeding with the implementation.
- All code must follow clean code principles and industry-standard React best practices, with an emphasis on:
    - Keeping files and functions small, modular, well-named and DRY to reduce future token usage.
    - Prioritizing readability, maintainability, and testability and separation of concerns.
    - Using functional components, hooks, and TypeScript where appropriate.

## Prevent Code Duplication:
**Before creating helper functions**: Use Grep to check if similar utility exists in `store/helpers/`, `utils/`, or related files. If found, export and reuse. If creating new, place in shared location and export immediately.

## Additional Guidelines:
- While fixing the bug and viewing related files, if you recognize any violations from the list above and that type of refactoring is outside of the scope of this bug (a bug fix scope should be limited only to the fix related files), update the @docs/REFACTORING_PLAN.md with your suggestions:
    - Only add tasks that are not done yet
    - Write a short description using blue color in the terminal output for easy visibility.
    - Include a priority for each suggestion.
    - Only analyze relevant files; do not read unrelated files for this task.
    - In REFACTORING_PLAN.md, clearly mention that these suggestions were identified in the context of this bug fix and have to be properly explored before applying.
- After implementation, ask me if I want to add unit tests and clarify which functionality to cover.
- Take a quick look at @docs\manual.md to verify the fixed behaviour is documented correctly. 

no need to ask for edit files permissions, you have the permissions to edit all files in workspace. 