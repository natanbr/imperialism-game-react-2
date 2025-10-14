Your goal is to perform refactoring. Before executing the refactoring instructions:

1. **Assess Impact**: Review how the refactoring will affect the codebase
2. **Check Alignment**: Ensure there are no architectural conflicts with existing patterns
3. **Plan Changes**: Identify which files and systems will be modified

## Refactoring Instructions

$ARGUMENTS

## Required Reviews

### Architecture Review
- **[Architecture Guide](docs/ARCHITECTURE.md)** - Code structure, patterns, workflows
- If this refactoring introduces architectural changes, update this document

### Game Logic Review (if applicable)
- **[Game Manual](docs/manual.md)** - Complete game rules and mechanics
- If game rules or logic are modified, review and update this document

## Post-Refactoring Checklist

- [ ] Run tests: `npm run test`
- [ ] Run linter: `npm run lint`
- [ ] Update documentation if patterns changed
- [ ] Verify no regressions in game behavior