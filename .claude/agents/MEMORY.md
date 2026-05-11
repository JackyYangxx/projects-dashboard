# Multi-Agent Team Memory

## Team Structure

| Role | Agent Name | Responsibility |
|------|-----------|---------------|
| Coordinator | `coordinator` | Routes all messages between agents, manages task flow |
| Planner | `planner` | Splits specs into independent, testable tasks |
| Checker | `checker` | Reviews code quality, design consistency, files issues locally |
| Developer | `dever` | Implements tasks, self-reviews with simplify, git commits |
| Tester | `tester` | Writes E2E tests, runs Chrome DevTools MCP validation |

## Team Operation Protocol

```
User approves SPEC
    ↓
coordinator → planner: "Split spec into tasks"
    ↓
planner → writes → docs/superpowers/tasks/{date}-{feature}-tasklist.md
    ↓
coordinator → tester: "Write E2E test cases"
coordinator → dever: "Implement tasks from tasklist"
    ↓
dever completes Task N → checker: "Review code"
    ↓
checker → writes → docs/superpowers/reviews/{date}-{task}-review.md
    ↓
[if issues] checker → dever: "Fix issues listed in review file"
[if pass] checker → dever: "Approve, commit to git"
    ↓
tester → executes E2E test for Task N
    ↓
[if issue] tester → writes → docs/superpowers/issues/{date}-{issue}-issue.md
    ↓
[all pass] tester → coordinator: "All tests passed"
    ↓
coordinator → user: "Ready for acceptance"
```

## File Naming Conventions

| File Type | Path Pattern |
|-----------|--------------|
| Spec | `docs/superpowers/specs/{date}-{feature}-design.md` |
| Task List | `docs/superpowers/tasks/{date}-{feature}-tasklist.md` |
| Code Review | `docs/superpowers/reviews/{date}-{task}-review.md` |
| Test Issue | `docs/superpowers/issues/{date}-{issue}-issue.md` |
| Agent Log | `docs/superpowers/logs/{agent}/{date}-{agent}-log.md` |

## Coordination Rules

1. **No agent talks to another without coordinator routing**
2. **All inter-agent communication via SendMessage to coordinator**
3. **Coordinator NEVER implements code or tests**
4. **Checker NEVER modifies code directly**
5. **Dever commits ONLY after checker approval**
6. **Tester files issues, Dever fixes them**