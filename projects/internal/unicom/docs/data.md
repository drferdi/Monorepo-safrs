# Data and environment

The migrated baseline has no database, schema, migration, queue, or persistent filesystem state. Chat state is process-local memory and is discarded on restart.

No environment variable is read by the migrated source. Credentials for a future model provider or platform adapter are operator-managed external configuration and are explicitly out of scope for this migration. No legacy `.env` file was read or copied.
