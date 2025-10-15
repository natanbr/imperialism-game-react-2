Your goal is to perform refactoring. Before executing the refactoring instructions:

1. **Assess Impact**: Review how the refactoring will affect the codebase
2. **Check Alignment**: Ensure there are no architectural conflicts with existing patterns
3. **Plan Changes**: Identify which files and systems will be modified

## Refactoring Instructions

$ARGUMENTS

## Required Reviews

### Architecture Review
- **[Architecture Guide](docs/ARCHITECTURE.md)** - Code structure, patterns, and workflows
- If this refactoring introduces architectural changes, update this document accordingly

### Tech Debt Tracking
- **[Tech Debt](docs/TECH_DEBT.md)** - Refactoring priorities and completed work
- Check if this refactoring addresses existing tech debt items
- Document any new technical debt discovered during refactoring

### Game Logic Review (if applicable)
- **[Game Manual](docs/manual.md)** - Complete game rules and mechanics
- If game rules or logic are modified, review and update this document

## Post-Refactoring Checklist

- [ ] Run tests: `npm run test`
- [ ] Run linter: `npm run lint`
- [ ] Update [ARCHITECTURE.md](docs/ARCHITECTURE.md) if patterns changed
- [ ] Update [TECH_DEBT.md](docs/TECH_DEBT.md) with completed tasks and any new items discovered
- [ ] Verify no regressions in game behavior
- [ ] Ask if I would like to commit changes. If yes, add descriptive message explaining the refactoring