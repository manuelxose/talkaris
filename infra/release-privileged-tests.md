# Privileged release test harness

Run `pwsh -NoProfile -File infra/release-privileged-tests.ps1` with the pinned Node image already available locally. The harness creates a disposable container, checks that it has no host mounts or host network, PID, IPC, UTS or cgroup namespaces, copies the required test files into it, runs both tests and removes the container. The scripts refuse direct execution without the harness marker. The marker and in-container checks are a guard against accidental host execution; the independently created Docker boundary provides isolation.

These tests use a fake `gh` verifier and fake `systemctl`; the process check inspects synthetic Node processes. They cover sealing and process-check behavior, but do not establish real GitHub attestation verification, a real systemd service lifecycle, production artifact identity, activation or rollback readiness.
