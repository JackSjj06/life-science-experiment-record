---
name: life-science-experiment-record
description: Generate or standardize Chinese Word experiment records for life-science competitions from user-provided protocols, raw notes, data, tables, and figures. Use when the user needs a competition-style experimental record with a one-page summary, seven-section full record, fixed Chinese typography, or an evidence and consistency review; do not use to invent missing scientific results.
---

# Life Science Competition Experiment Record

Create a submission-ready Chinese `.docx` only from evidence supplied by the user. Use the installed `docx` skill for document-specific generation, validation, rendering, and visual inspection.

## Required references

Before generating a document:

1. Read [references/format-spec.md](references/format-spec.md) for the fixed structure and typography.
2. Read [references/input-schema.md](references/input-schema.md) before preparing generator input.
3. Read only the relevant parts of [references/domain-checklists.md](references/domain-checklists.md) for the experiment type.

If the user supplies an official competition template, preserve that template and treat it as higher priority than the default format. Otherwise use the bundled generator.

## Workflow

1. Inspect all supplied protocols, notes, data files, tables, figures, and prior records. Distinguish observed facts from interpretation.
2. Build an evidence checklist covering title, competition metadata, dates, samples or data sources, groups and controls, repetitions, materials, exact operating conditions, result evidence, statistics, figures, tables, limitations, and reflection.
3. Stop before producing a final document when a required scientific fact is missing. Ask for the missing fact. Never infer sample size, dose, time, reagent, software parameter, numeric result, statistical significance, or causal conclusion.
4. If the user explicitly requests a draft, set `metadata.documentStatus` to `draft` and use explicit `[待补充：具体内容]` blocks. Never hide uncertainty in fluent prose.
5. Identify the experiment mode and apply its checklist. For mixed experiments, combine only the relevant checklists.
6. Prepare UTF-8 JSON that follows the input schema. Use `{{figure:id}}` and `{{table:id}}` for in-text references; do not type figure or table numbers manually.
7. Run `scripts/generate_experiment_record.js --input <input.json> --output <output.docx>`. The script refuses to overwrite an existing file unless `--force` is passed.
8. Validate the output with the `docx` skill's OOXML validator, render it to PDF/images, and visually inspect every page. Check the header, summary-page break, title hierarchy, table pagination, figure legibility, captions, and absence of clipped or overflowing content.
9. Recheck scientific consistency: dates, group names, sample size, dose, units, repetitions, thresholds, figure/table references, summary-versus-detail results, and strength of claims.

## Generator runtime

Use the Node.js and package directory returned by the workspace dependency loader. If `require("docx")` is not found automatically, set `NODE_PATH` to that package directory. The script also checks `CODEX_NODE_MODULES`, `NODE_PATH`, and the standard bundled Codex runtime under the current user's home directory.

## Evidence rules

- A final record must contain all seven sections and must not contain `待补充`, `TBD`, `TODO`, fabricated values, or unsupported significance language.
- Describe association as association. Use causal language only when the design and evidence support it.
- State exact statistics only when the user provides the underlying values or a trustworthy analysis output.
- Do not insert team number, school, participant, teacher, author, affiliation, or other identifying information when anonymous submission is required.
- Place figures near their first substantive discussion. Put figure captions below figures and table captions above tables.
- Do not copy the source example documents into the generated skill or output unless the user explicitly asks.

## Handoff

Return the generated `.docx`, summarize any unresolved warnings, and identify any explicit draft placeholders. Do not describe a draft as submission-ready.
