# Multi-Agent Team Memory

## Team Structure

| Role | Agent Name | Responsibility |
|------|-----------|---------------|
| Coordinator | `coordinator` | Routes all messages between agents, manages task flow |
| Planner | `planner` | Splits specs into independent, testable tasks |
| Checker | `checker` | Reviews code quality, design consistency, files issues locally |
| Developer | `dever-{N}` | Implements tasks, self-reviews with simplify, git commits, fixes own issues |
| Tester | `tester` | Writes E2E tests from spec, runs tests, assigns issues to responsible dever |

## Team Operation Protocol

```
User approves SPEC
    ↓
coordinator → planner: "Split spec into tasks"
coordinator → tester: "Write E2E test cases from spec"
    ↓
[planner + tester run in parallel]
planner → writes → docs/superpowers/tasks/{date}-{feature}-tasklist.md
tester → writes → docs/superpowers/tests/{date}-{feature}-test-cases.md
    ↓
[Task list + Test cases complete]
    ↓
coordinator → dever-1, dever-2, ...: "Implement assigned tasks"
    ↓
dever-N completes Task → checker: "Review code"
    ↓
checker → writes → docs/superpowers/reviews/{date}-{task}-review.md
    ↓
[if issues] checker → dever-N: "Fix issues listed in review file"
[if pass] checker → dever-N: "Approve, commit to git"
    ↓
dever-N commits → tester: "Test Task"
    ↓
tester runs E2E test for Task
    ↓
[if issue] tester → coordinator: "Issue found in Task, assign to responsible dever-N"
coordinator → responsible dever-N: "Fix issue, notify tester when fixed"
dever-N fixes → tester re-tests
    ↓
[all tests pass] tester → coordinator: "Task verified"
    ↓
[all tasks done] tester final comprehensive test
    ↓
tester → coordinator: "All tests passed"
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
6. **One dever per task** — Each task spawns a dedicated `dever-{N}` instance
7. **Tester assigns issues to the responsible dever** — coordinator routes the assignment
8. **The assigned dever fixes until tester closes the issue**