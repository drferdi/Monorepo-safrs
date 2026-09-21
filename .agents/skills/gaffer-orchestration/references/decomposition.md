# Decomposition

The purpose of decomposition is to convert expensive open-ended reasoning into bounded implementation contracts.

Each task should have:
- one explicit objective;
- acceptance criteria;
- owned paths;
- preserved interfaces;
- constraints;
- verification commands;
- required context only;
- dependencies;
- requested worker class or enough evidence for runtime classification.

A task may run only when all mandatory dependencies are `VERIFIED`.

Workers do not redesign architecture. If additional scope or architecture is required, return `BLOCKED` and let Root re-plan.

v0.1 executes DAG-ready tasks serially for deterministic safety. Parallelism is a later optimization.
