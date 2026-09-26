# Data

Sentraverse has no database and stores no persistent data. Content is static TypeScript data
under `app/` and `components/`; details are in [`data-model.md`](./data-model.md) and the privacy
notes in [`privacy.md`](./privacy.md).

- No patient data is collected or stored.
- `/api/medical-knowledge` forwards a question to the Gemini API when `GEMINI_API_KEY` is set;
  nothing is persisted.
