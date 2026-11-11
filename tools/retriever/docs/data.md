# Data & State Management: Sentra Web Harvester

## Output Directories
- `./data/scrapes/<domain>/`: Root hasil crawl HTML, CSS, assets, serta local index (`hts-cache`, `index.html`).
- `./data/scrapes/<domain>/markdown_corpus/`: File Markdown bersih per halaman yang siap disuapkan ke LLM, RAG, atau local vector store.

## State Contracts
- `project.contract.json`: Kontrak eksekusi formal SAFRS v1.1.
- `TelemetryEvent`: Kontrak streaming log progress dan kecepatan scraping.
