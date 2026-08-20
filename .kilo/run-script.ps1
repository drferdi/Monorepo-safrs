$ErrorActionPreference = "Stop"

# Port 0 delegates collision-free allocation atomically to the operating system.
pnpm --filter @sentra/control-center exec next dev -H 127.0.0.1 -p 0
exit $LASTEXITCODE
