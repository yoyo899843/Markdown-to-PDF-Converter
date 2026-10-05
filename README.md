# Markdown to PDF Converter

Was made for AIS3 Junior 2026

## Features

* Support LaTeX symbols
* Upload file or paste your Markdown
* Customize the exported PDF filename (including Chinese names)
* Batch export up to 50 Markdown files as a ZIP archive
* Batch filenames support numeric or alphabetic sequences, starting numbers, zero padding, and custom templates

## Export filenames

For a single PDF, enter the filename below the editor. The `.pdf` extension is added automatically.

For batch exports, select multiple Markdown files and set a common name. Files are numbered in the order shown in the preview. Use `{name}` for the common name and `{index}` for the sequence in the filename format.

Examples:

* `{name}_{index}` with name `report` and 3-digit numbers: `report_001.pdf`, `report_002.pdf`
* `{name}-{index}` with uppercase letters: `report-A.pdf`, `report-B.pdf`
* `第{index}份_{name}` with name `報告`: `第01份_報告.pdf`

Alphabetic sequences continue from Z to AA (or z to aa). The starting number 1 means A; 27 means AA. Batch downloads include all PDFs in one ZIP. The total request size is limited to 10 MB.

Run export naming and ZIP checks with `npm test`.

## Install

Just do this.

```
docker compose up -d
```

## Demo

[Website]("https://md-to-pdf.yoyo899843.com")

![alt text](image.png)
## Project structure

* `server.js`: starts the HTTP server.
* `src/app.js`: configures Express and serves the frontend.
* `src/routes/convert.js`: single and batch export endpoints and request validation.
* `src/services/`: Markdown-to-PDF rendering and ZIP packaging.
* `public/index.html` / `public/styles.css`: page markup and styling.
* `public/js/`: frontend initialization, single and batch export interactions, shared downloads, and filename rules (also reused by the backend).
* `test/`: filename and ZIP validation tests.
