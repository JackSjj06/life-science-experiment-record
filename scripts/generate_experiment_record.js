#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto");

function loadPackage(name) {
  try {
    return require(name);
  } catch (firstError) {
    const roots = [];
    if (process.env.CODEX_NODE_MODULES) roots.push(process.env.CODEX_NODE_MODULES);
    if (process.env.NODE_PATH) roots.push(...process.env.NODE_PATH.split(path.delimiter));
    roots.push(path.join(os.homedir(), ".cache", "codex-runtimes", "codex-primary-runtime", "dependencies", "node", "node_modules"));
    for (const root of roots.filter(Boolean)) {
      try {
        return require(path.join(root, name));
      } catch (_) {
        // Try the next known module root.
      }
    }
    const error = new Error(`Cannot load '${name}'. Run with the bundled Codex Node.js and set NODE_PATH to the package directory returned by load_workspace_dependencies.`);
    error.cause = firstError;
    throw error;
  }
}

const docx = loadPackage("docx");
const imageSizePackage = loadPackage("image-size");
const imageSize = imageSizePackage.imageSize || imageSizePackage.default || imageSizePackage;

const {
  AlignmentType,
  BorderStyle,
  Document,
  Header,
  ImageRun,
  LevelFormat,
  PageBreak,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TabStopType,
  TextRun,
  UnderlineType,
  VerticalAlign,
  WidthType,
} = docx;

const A4 = Object.freeze({ width: 11906, height: 16838 });
const MARGINS = Object.freeze({ top: 1134, right: 1134, bottom: 1134, left: 1134, header: 568, footer: 992, gutter: 0 });
const CONTENT_WIDTH = A4.width - MARGINS.left - MARGINS.right;
const LINE = Object.freeze({ single: 240, oneAndHalf: 360 });
const SIZE = Object.freeze({ title: 32, headerTitle: 30, primary: 28, body: 24, small: 21, note: 18 });
const BLACK = "000000";
const BODY_FONTS = Object.freeze({ ascii: "Times New Roman", hAnsi: "Times New Roman", eastAsia: "宋体", cs: "Times New Roman" });
const HEADING_FONTS = Object.freeze({ ascii: "Times New Roman", hAnsi: "Times New Roman", eastAsia: "黑体", cs: "Times New Roman" });
const OFFICIAL_HEADER_FONTS = Object.freeze({ ascii: "黑体", hAnsi: "黑体", eastAsia: "黑体", cs: "Times New Roman" });
const OFFICIAL_COMPETITION_NAME = "第十二届全国大学生生命科学竞赛（科学探究类）实验记录";
const OFFICIAL_TEMPLATE_PATH = path.resolve(__dirname, "..", "assets", "实验记录模板.docx");
const OFFICIAL_TEMPLATE_SHA256 = "cbe1cb37c7bad04aadc1df42a0aab80b9f3236ece4589f68cdc730e6a39cfec8";
const VALID_SECTION_KEYS = Object.freeze(["purpose", "principle", "materials", "procedure", "precautions", "results", "reflection"]);
const SECTION_LABELS = Object.freeze({
  purpose: ["一", "实验目的"],
  principle: ["二", "实验原理"],
  materials: ["三", null],
  procedure: ["四", "实验步骤"],
  precautions: ["五", "注意事项"],
  results: ["六", "实验结果与分析"],
  reflection: ["七", "实验总结与反思"],
});
const VALID_IMAGE_TYPES = new Set(["png", "jpg", "jpeg", "gif", "bmp", "svg"]);
const ID_PATTERN = /^[A-Za-z0-9_-]+$/;
const TOKEN_PATTERN = /\{\{(figure|table):([A-Za-z0-9_-]+)\}\}/g;
const MANUAL_NUMBER_PATTERN = /(?:图|表)\s*\d+/u;
const PLACEHOLDER_PATTERN = /(?:待补充|TBD|TODO)/iu;

function fail(message) {
  throw new Error(message);
}

function verifyOfficialTemplateAsset() {
  if (!fs.existsSync(OFFICIAL_TEMPLATE_PATH)) fail(`Bundled official template is missing: ${OFFICIAL_TEMPLATE_PATH}`);
  const buffer = fs.readFileSync(OFFICIAL_TEMPLATE_PATH);
  const hash = crypto.createHash("sha256").update(buffer).digest("hex");
  if (hash !== OFFICIAL_TEMPLATE_SHA256) {
    fail("Bundled official template does not match the verified competition template. Restore assets/实验记录模板.docx before generating records.");
  }
}

function parseArgs(argv) {
  const args = { check: false, force: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--input") args.input = argv[++i];
    else if (arg === "--output") args.output = argv[++i];
    else if (arg === "--check") args.check = true;
    else if (arg === "--force") args.force = true;
    else if (arg === "--help" || arg === "-h") args.help = true;
    else fail(`Unknown argument: ${arg}`);
  }
  return args;
}

function printHelp() {
  process.stdout.write([
    "Generate a fixed-format Chinese life-science competition experiment record.",
    "",
    "Usage:",
    "  node generate_experiment_record.js --check --input record.json",
    "  node generate_experiment_record.js --input record.json --output record.docx [--force]",
    "",
  ].join("\n"));
}

function readJson(filePath) {
  const absolute = path.resolve(filePath);
  if (!fs.existsSync(absolute)) fail(`Input JSON does not exist: ${absolute}`);
  let text = fs.readFileSync(absolute, "utf8");
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  try {
    return { data: JSON.parse(text), inputDir: path.dirname(absolute) };
  } catch (error) {
    fail(`Input JSON is invalid: ${error.message}`);
  }
}

function nonEmptyString(value, label) {
  if (typeof value !== "string" || !value.trim()) fail(`${label} must be a non-empty string.`);
  return value.trim();
}

function dateValue(value, label) {
  const date = nonEmptyString(value, label);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) fail(`${label} must use YYYY-MM-DD.`);
  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== date) fail(`${label} is not a valid calendar date.`);
  return date;
}

function asParagraphs(value, label) {
  const items = typeof value === "string" ? [value] : value;
  if (!Array.isArray(items) || items.length === 0) fail(`${label} must be a non-empty string or array of strings.`);
  return items.map((item, index) => nonEmptyString(item, `${label}[${index}]`));
}

function normalizeId(value, label) {
  const id = nonEmptyString(value, label);
  if (!ID_PATTERN.test(id)) fail(`${label} must contain only letters, digits, '_' or '-'.`);
  return id;
}

function normalizeBlock(block, label) {
  if (typeof block === "string") return { type: "paragraph", text: nonEmptyString(block, label) };
  if (!block || typeof block !== "object" || Array.isArray(block)) fail(`${label} must be a string or block object.`);
  const type = nonEmptyString(block.type, `${label}.type`);
  if (["paragraph", "formula", "note", "placeholder"].includes(type)) {
    return { type, text: nonEmptyString(block.text, `${label}.text`) };
  }
  if (type === "heading") {
    if (block.level !== 2 && block.level !== 3) fail(`${label}.level must be 2 or 3.`);
    return { type, level: block.level, text: nonEmptyString(block.text, `${label}.text`) };
  }
  if (type === "list") {
    if (!Array.isArray(block.items) || block.items.length === 0) fail(`${label}.items must be a non-empty array.`);
    return { type, ordered: block.ordered !== false, items: block.items.map((item, index) => nonEmptyString(item, `${label}.items[${index}]`)) };
  }
  if (type === "figure" || type === "table") return { type, ref: normalizeId(block.ref, `${label}.ref`) };
  fail(`${label}.type '${type}' is not supported.`);
}

function normalizeDefinitions(items, kind, inputDir) {
  if (items === undefined) return [];
  if (!Array.isArray(items)) fail(`${kind}s must be an array.`);
  const seen = new Set();
  return items.map((item, index) => {
    const label = `${kind}s[${index}]`;
    if (!item || typeof item !== "object" || Array.isArray(item)) fail(`${label} must be an object.`);
    const id = normalizeId(item.id, `${label}.id`);
    if (seen.has(id)) fail(`Duplicate ${kind} id: ${id}`);
    seen.add(id);
    const caption = nonEmptyString(item.caption, `${label}.caption`);
    if (MANUAL_NUMBER_PATTERN.test(` ${caption}`)) fail(`${label}.caption must not contain a manual figure/table number.`);
    const note = item.note === undefined ? "" : nonEmptyString(item.note, `${label}.note`);
    if (kind === "figure") {
      const suppliedPath = nonEmptyString(item.path, `${label}.path`);
      const absolutePath = path.isAbsolute(suppliedPath) ? suppliedPath : path.resolve(inputDir, suppliedPath);
      if (!fs.existsSync(absolutePath)) fail(`${label}.path does not exist: ${absolutePath}`);
      const ext = path.extname(absolutePath).slice(1).toLowerCase();
      if (!VALID_IMAGE_TYPES.has(ext)) fail(`${label}.path has unsupported image type '.${ext}'. Convert it to PNG or JPEG first.`);
      return { id, caption, note, path: absolutePath, type: ext };
    }
    if (!Array.isArray(item.headers) || item.headers.length === 0) fail(`${label}.headers must be a non-empty array.`);
    const headers = item.headers.map((cell, cellIndex) => nonEmptyString(String(cell), `${label}.headers[${cellIndex}]`));
    if (!Array.isArray(item.rows) || item.rows.length === 0) fail(`${label}.rows must be a non-empty array.`);
    const rows = item.rows.map((row, rowIndex) => {
      if (!Array.isArray(row) || row.length !== headers.length) fail(`${label}.rows[${rowIndex}] must have ${headers.length} cells.`);
      return row.map((cell) => cell === null || cell === undefined ? "" : String(cell));
    });
    let columnWeights;
    if (item.columnWeights !== undefined) {
      if (!Array.isArray(item.columnWeights) || item.columnWeights.length !== headers.length) fail(`${label}.columnWeights must have ${headers.length} positive values.`);
      columnWeights = item.columnWeights.map((weight) => Number(weight));
      if (columnWeights.some((weight) => !Number.isFinite(weight) || weight <= 0)) fail(`${label}.columnWeights must contain positive numbers.`);
    }
    return { id, caption, note, headers, rows, columnWeights };
  });
}

function collectText(value, output = []) {
  if (typeof value === "string") output.push(value);
  else if (Array.isArray(value)) value.forEach((item) => collectText(item, output));
  else if (value && typeof value === "object") Object.values(value).forEach((item) => collectText(item, output));
  return output;
}

function validateAndNormalize(raw, inputDir) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) fail("Top-level JSON must be an object.");
  const metadata = raw.metadata;
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) fail("metadata must be an object.");
  const normalizedMetadata = {
    competitionName: nonEmptyString(metadata.competitionName, "metadata.competitionName"),
    recordNumber: nonEmptyString(String(metadata.recordNumber ?? ""), "metadata.recordNumber"),
    startDate: dateValue(metadata.startDate, "metadata.startDate"),
    endDate: dateValue(metadata.endDate, "metadata.endDate"),
    title: nonEmptyString(metadata.title, "metadata.title"),
    documentStatus: metadata.documentStatus || "final",
    materialsHeading: metadata.materialsHeading || "实验材料与试剂",
  };
  if (normalizedMetadata.competitionName !== OFFICIAL_COMPETITION_NAME) {
    fail(`metadata.competitionName must be '${OFFICIAL_COMPETITION_NAME}' when using the bundled official template.`);
  }
  if (!new Set(["final", "draft"]).has(normalizedMetadata.documentStatus)) fail("metadata.documentStatus must be 'final' or 'draft'.");
  if (!new Set(["实验材料与试剂", "研究对象、数据来源与分析工具"]).has(normalizedMetadata.materialsHeading)) {
    fail("metadata.materialsHeading must be '实验材料与试剂' or '研究对象、数据来源与分析工具'.");
  }
  if (normalizedMetadata.startDate > normalizedMetadata.endDate) fail("metadata.startDate must not be later than metadata.endDate.");

  const summary = raw.summary;
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) fail("summary must be an object.");
  const normalizedSummary = {
    purpose: asParagraphs(summary.purpose, "summary.purpose"),
    content: asParagraphs(summary.content, "summary.content"),
    result: asParagraphs(summary.result, "summary.result"),
  };

  const sections = raw.sections;
  if (!sections || typeof sections !== "object" || Array.isArray(sections)) fail("sections must be an object.");
  const unknownSectionKeys = Object.keys(sections).filter((key) => !VALID_SECTION_KEYS.includes(key));
  if (unknownSectionKeys.length) fail(`Unknown section keys: ${unknownSectionKeys.join(", ")}`);
  const normalizedSections = {};
  for (const key of VALID_SECTION_KEYS) {
    if (!Array.isArray(sections[key]) || sections[key].length === 0) fail(`sections.${key} must be a non-empty array.`);
    normalizedSections[key] = sections[key].map((block, index) => normalizeBlock(block, `sections.${key}[${index}]`));
  }

  const figures = normalizeDefinitions(raw.figures, "figure", inputDir);
  const tables = normalizeDefinitions(raw.tables, "table", inputDir);
  const figureMap = new Map(figures.map((item) => [item.id, item]));
  const tableMap = new Map(tables.map((item) => [item.id, item]));
  const figureOrder = [];
  const tableOrder = [];
  for (const key of VALID_SECTION_KEYS) {
    for (const block of normalizedSections[key]) {
      if (block.type === "figure") {
        if (!figureMap.has(block.ref)) fail(`Figure block references unknown id '${block.ref}'.`);
        if (figureOrder.includes(block.ref)) fail(`Figure '${block.ref}' is displayed more than once.`);
        figureOrder.push(block.ref);
      } else if (block.type === "table") {
        if (!tableMap.has(block.ref)) fail(`Table block references unknown id '${block.ref}'.`);
        if (tableOrder.includes(block.ref)) fail(`Table '${block.ref}' is displayed more than once.`);
        tableOrder.push(block.ref);
      }
    }
  }
  const missingFigures = figures.map((item) => item.id).filter((id) => !figureOrder.includes(id));
  const missingTables = tables.map((item) => item.id).filter((id) => !tableOrder.includes(id));
  if (missingFigures.length) fail(`Defined figures are not displayed: ${missingFigures.join(", ")}`);
  if (missingTables.length) fail(`Defined tables are not displayed: ${missingTables.join(", ")}`);

  const figureNumbers = new Map(figureOrder.map((id, index) => [id, index + 1]));
  const tableNumbers = new Map(tableOrder.map((id, index) => [id, index + 1]));
  const allText = collectText({ metadata: normalizedMetadata, summary: normalizedSummary, sections: normalizedSections, figures, tables });
  for (const text of allText) {
    if (MANUAL_NUMBER_PATTERN.test(` ${text}`)) fail(`Manual figure/table number found in text: '${text}'. Use {{figure:id}} or {{table:id}}.`);
    for (const match of text.matchAll(TOKEN_PATTERN)) {
      const [, kind, id] = match;
      const exists = kind === "figure" ? figureNumbers.has(id) : tableNumbers.has(id);
      if (!exists) fail(`Unknown ${kind} token id '${id}'.`);
    }
    if (text.replace(TOKEN_PATTERN, "").match(/\{\{(?:figure|table):/)) fail(`Malformed figure/table token found in text: '${text}'.`);
  }
  if (normalizedMetadata.documentStatus === "final" && allText.some((text) => PLACEHOLDER_PATTERN.test(text))) {
    fail("A final document must not contain 待补充, TBD, or TODO.");
  }
  if (normalizedMetadata.documentStatus === "final") {
    for (const key of VALID_SECTION_KEYS) {
      if (normalizedSections[key].some((block) => block.type === "placeholder")) fail(`sections.${key} contains a placeholder in a final document.`);
    }
  }

  return { metadata: normalizedMetadata, summary: normalizedSummary, sections: normalizedSections, figures, tables, figureMap, tableMap, figureNumbers, tableNumbers };
}

function replaceTokens(text, record) {
  return text.replace(TOKEN_PATTERN, (_, kind, id) => kind === "figure" ? `图 ${record.figureNumbers.get(id)}` : `表 ${record.tableNumbers.get(id)}`);
}

function underlinedHeaderRun(text, { bold = false, font = HEADING_FONTS, padding = 2 } = {}) {
  const pad = "\u00a0".repeat(padding);
  return new TextRun({
    text: `${pad}${text}${pad}`,
    font,
    size: SIZE.small,
    bold,
    color: BLACK,
    underline: { type: UnderlineType.SINGLE, color: BLACK },
  });
}

function dateHeaderRuns(date) {
  const [year, month, day] = date.split("-").map(Number);
  return [
    underlinedHeaderRun(String(year), { bold: true }),
    new TextRun({ text: "年", font: HEADING_FONTS, size: SIZE.small, bold: true, color: BLACK }),
    underlinedHeaderRun(String(month), { bold: true }),
    new TextRun({ text: "月", font: HEADING_FONTS, size: SIZE.small, bold: true, color: BLACK }),
    underlinedHeaderRun(String(day), { bold: true }),
    new TextRun({ text: "日", font: HEADING_FONTS, size: SIZE.small, bold: true, color: BLACK }),
    underlinedHeaderRun("", { bold: true }),
  ];
}

function titleParagraph(text) {
  return new Paragraph({
    style: "ExperimentTitle",
    children: [new TextRun({ text, font: HEADING_FONTS, size: SIZE.title, bold: true, color: BLACK })],
  });
}

function primaryHeading(text) {
  return new Paragraph({
    style: "SectionHeading",
    children: [new TextRun({ text, font: HEADING_FONTS, size: SIZE.primary, bold: true, color: BLACK })],
  });
}

function bodyParagraph(text, record) {
  return new Paragraph({
    style: "BodyText",
    children: [new TextRun({ text: replaceTokens(text, record), font: BODY_FONTS, size: SIZE.body, color: BLACK })],
  });
}

function subsectionParagraph(text, level) {
  return new Paragraph({
    style: level === 2 ? "SubsectionHeading" : "TertiaryHeading",
    children: [new TextRun({ text, font: BODY_FONTS, size: SIZE.body, bold: true, color: BLACK })],
  });
}

function noteParagraph(text, record) {
  return new Paragraph({
    style: "ArtifactNote",
    children: [new TextRun({ text: replaceTokens(text, record), font: BODY_FONTS, size: SIZE.note, color: BLACK })],
  });
}

function formulaParagraph(text, record) {
  return new Paragraph({
    style: "Formula",
    children: [new TextRun({ text: replaceTokens(text, record), font: BODY_FONTS, size: SIZE.body, color: BLACK })],
  });
}

function placeholderParagraph(text) {
  const value = text.startsWith("[待补充") ? text : `[待补充：${text}]`;
  return new Paragraph({
    style: "DraftPlaceholder",
    children: [new TextRun({ text: value, font: BODY_FONTS, size: SIZE.body, bold: true, color: BLACK })],
  });
}

function fitImage(buffer) {
  const dimensions = imageSize(buffer);
  if (!dimensions || !dimensions.width || !dimensions.height) fail("Cannot determine image dimensions.");
  const maxWidth = 620;
  const maxHeight = 690;
  const scale = Math.min(maxWidth / dimensions.width, maxHeight / dimensions.height, 1);
  return { width: Math.max(1, Math.round(dimensions.width * scale)), height: Math.max(1, Math.round(dimensions.height * scale)) };
}

function renderFigure(id, record) {
  const figure = record.figureMap.get(id);
  const number = record.figureNumbers.get(id);
  const buffer = fs.readFileSync(figure.path);
  const transformation = fitImage(buffer);
  const type = figure.type === "jpeg" ? "jpg" : figure.type;
  const result = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      keepNext: true,
      spacing: { before: 60, after: 0, line: LINE.single, lineRule: "auto" },
      children: [new ImageRun({
        data: buffer,
        type,
        transformation,
        altText: { title: `图 ${number}`, description: figure.caption, name: figure.id },
      })],
    }),
    new Paragraph({
      style: "FigureCaption",
      keepNext: Boolean(figure.note),
      children: [new TextRun({ text: `图 ${number} ${figure.caption}`, font: BODY_FONTS, size: SIZE.small, color: BLACK })],
    }),
  ];
  if (figure.note) result.push(noteParagraph(figure.note, record));
  return result;
}

function distributeWidths(count, weights) {
  const actualWeights = weights || new Array(count).fill(1);
  const totalWeight = actualWeights.reduce((sum, value) => sum + value, 0);
  const widths = [];
  let used = 0;
  for (let i = 0; i < count; i += 1) {
    const width = i === count - 1 ? CONTENT_WIDTH - used : Math.round(CONTENT_WIDTH * actualWeights[i] / totalWeight);
    widths.push(width);
    used += width;
  }
  return widths;
}

function numericLike(text) {
  const value = String(text).trim();
  return value === "" || value === "—" || /^[<>≤≥≈~+\-]?\d[\d.,]*(?:\s*(?:%|mg|g|kg|mL|μL|µL|L|mm|cm|μm|µm|nm|h|min|s|℃|°C|mol\/L|mg\/kg))?$/i.test(value);
}

function cellParagraph(text, header) {
  return new Paragraph({
    alignment: header || numericLike(text) ? AlignmentType.CENTER : AlignmentType.LEFT,
    spacing: { before: 0, after: 0, line: LINE.single, lineRule: "auto" },
    children: [new TextRun({ text: String(text), font: BODY_FONTS, size: SIZE.small, bold: header, color: BLACK })],
  });
}

function renderTable(id, record) {
  const definition = record.tableMap.get(id);
  const number = record.tableNumbers.get(id);
  const widths = distributeWidths(definition.headers.length, definition.columnWeights);
  const border = { style: BorderStyle.SINGLE, size: 4, color: BLACK };
  const borders = { top: border, bottom: border, left: border, right: border, insideHorizontal: border, insideVertical: border };
  const makeCell = (text, columnIndex, header) => new TableCell({
    borders,
    width: { size: widths[columnIndex], type: WidthType.DXA },
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    verticalAlign: VerticalAlign.CENTER,
    shading: { fill: "FFFFFF", type: ShadingType.CLEAR },
    children: [cellParagraph(text, header)],
  });
  const rows = [
    new TableRow({
      tableHeader: true,
      cantSplit: true,
      children: definition.headers.map((header, index) => makeCell(header, index, true)),
    }),
    ...definition.rows.map((row) => new TableRow({
      cantSplit: true,
      children: row.map((cell, index) => makeCell(cell, index, false)),
    })),
  ];
  const result = [
    new Paragraph({
      style: "TableCaption",
      children: [new TextRun({ text: `表 ${number} ${definition.caption}`, font: BODY_FONTS, size: SIZE.small, color: BLACK })],
    }),
    new Table({
      width: { size: CONTENT_WIDTH, type: WidthType.DXA },
      columnWidths: widths,
      rows,
    }),
  ];
  if (definition.note) result.push(noteParagraph(definition.note, record));
  return result;
}

function renderBlock(block, record, listRefs) {
  if (block.type === "paragraph") return [bodyParagraph(block.text, record)];
  if (block.type === "heading") return [subsectionParagraph(replaceTokens(block.text, record), block.level)];
  if (block.type === "formula") return [formulaParagraph(block.text, record)];
  if (block.type === "note") return [noteParagraph(block.text, record)];
  if (block.type === "placeholder") return [placeholderParagraph(block.text)];
  if (block.type === "figure") return renderFigure(block.ref, record);
  if (block.type === "table") return renderTable(block.ref, record);
  if (block.type === "list") {
    const reference = block.ordered ? listRefs.ordered : listRefs.bullet;
    return block.items.map((item) => new Paragraph({
      style: "ListText",
      numbering: { reference, level: 0 },
      children: [new TextRun({ text: replaceTokens(item, record), font: BODY_FONTS, size: SIZE.body, color: BLACK })],
    }));
  }
  fail(`Cannot render unsupported block type '${block.type}'.`);
}

function createHeader(metadata) {
  const officialBorder = { bottom: { style: BorderStyle.SINGLE, size: 6, color: BLACK, space: 1 } };
  return new Header({
    children: [
      new Paragraph({
        alignment: AlignmentType.LEFT,
        border: officialBorder,
        spacing: { before: 0, after: 0, line: LINE.oneAndHalf, lineRule: "auto" },
        tabStops: [{ type: TabStopType.RIGHT, position: CONTENT_WIDTH }],
        children: [
          new TextRun({ text: metadata.competitionName, font: OFFICIAL_HEADER_FONTS, size: SIZE.headerTitle, color: BLACK }),
          new TextRun({ text: "\t序号：", font: OFFICIAL_HEADER_FONTS, size: SIZE.small, color: BLACK }),
          underlinedHeaderRun(metadata.recordNumber, { font: OFFICIAL_HEADER_FONTS, padding: 1 }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        border: officialBorder,
        spacing: { before: 0, after: 0, line: LINE.oneAndHalf, lineRule: "auto" },
        children: [
          new TextRun({ text: "实验时间：", font: HEADING_FONTS, size: SIZE.small, bold: true, color: BLACK }),
          ...dateHeaderRuns(metadata.startDate),
          new TextRun({ text: "－", font: HEADING_FONTS, size: SIZE.small, bold: true, color: BLACK }),
          ...dateHeaderRuns(metadata.endDate),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        border: officialBorder,
        spacing: { before: 0, after: 0, line: LINE.oneAndHalf, lineRule: "auto" },
        children: [new TextRun({
          text: "请勿出现团队编号、学校、参赛师生信息",
          font: HEADING_FONTS,
          size: SIZE.small,
          bold: true,
          color: BLACK,
        })],
      }),
    ],
  });
}

function buildDocument(record) {
  const listRefs = { ordered: "experiment-ordered", bullet: "experiment-bullets" };
  const children = [titleParagraph(record.metadata.title)];
  const summarySections = [
    ["一、实验目的", record.summary.purpose],
    ["二、实验内容", record.summary.content],
    ["三、实验结果", record.summary.result],
  ];
  for (const [heading, paragraphs] of summarySections) {
    children.push(primaryHeading(heading));
    paragraphs.forEach((text) => children.push(bodyParagraph(text, record)));
  }
  children.push(new Paragraph({ children: [new PageBreak()] }));
  children.push(titleParagraph(record.metadata.title));
  for (const key of VALID_SECTION_KEYS) {
    const [number, defaultTitle] = SECTION_LABELS[key];
    const title = key === "materials" ? record.metadata.materialsHeading : defaultTitle;
    children.push(primaryHeading(`${number}、${title}`));
    for (const block of record.sections[key]) children.push(...renderBlock(block, record, listRefs));
  }

  return new Document({
    styles: {
      default: { document: { run: { font: BODY_FONTS, size: SIZE.body, color: BLACK } } },
      paragraphStyles: [
        {
          id: "ExperimentTitle", name: "Experiment Title", basedOn: "Normal", next: "BodyText", quickFormat: true,
          run: { font: HEADING_FONTS, size: SIZE.title, bold: true, color: BLACK },
          paragraph: { alignment: AlignmentType.CENTER, spacing: { before: 240, after: 120, line: LINE.oneAndHalf, lineRule: "auto" }, outlineLevel: 0 },
        },
        {
          id: "SectionHeading", name: "Section Heading", basedOn: "Normal", next: "BodyText", quickFormat: true,
          run: { font: HEADING_FONTS, size: SIZE.primary, bold: true, color: BLACK },
          paragraph: { alignment: AlignmentType.LEFT, keepNext: true, spacing: { before: 120, after: 0, line: LINE.oneAndHalf, lineRule: "auto" }, outlineLevel: 1 },
        },
        {
          id: "SubsectionHeading", name: "Subsection Heading", basedOn: "Normal", next: "BodyText", quickFormat: true,
          run: { font: BODY_FONTS, size: SIZE.body, bold: true, color: BLACK },
          paragraph: { alignment: AlignmentType.LEFT, keepNext: true, spacing: { before: 120, after: 0, line: LINE.oneAndHalf, lineRule: "auto" }, outlineLevel: 2 },
        },
        {
          id: "TertiaryHeading", name: "Tertiary Heading", basedOn: "Normal", next: "BodyText", quickFormat: true,
          run: { font: BODY_FONTS, size: SIZE.body, bold: true, color: BLACK },
          paragraph: { alignment: AlignmentType.LEFT, keepNext: true, spacing: { before: 60, after: 0, line: LINE.oneAndHalf, lineRule: "auto" }, outlineLevel: 3 },
        },
        {
          id: "BodyText", name: "Body Text", basedOn: "Normal", next: "BodyText", quickFormat: true,
          run: { font: BODY_FONTS, size: SIZE.body, color: BLACK },
          paragraph: { alignment: AlignmentType.JUSTIFIED, spacing: { before: 0, after: 0, line: LINE.oneAndHalf, lineRule: "auto" }, indent: { firstLine: 480 } },
        },
        {
          id: "ListText", name: "List Text", basedOn: "Normal", next: "ListText", quickFormat: true,
          run: { font: BODY_FONTS, size: SIZE.body, color: BLACK },
          paragraph: { alignment: AlignmentType.LEFT, spacing: { before: 0, after: 0, line: LINE.oneAndHalf, lineRule: "auto" } },
        },
        {
          id: "FigureCaption", name: "Figure Caption", basedOn: "Normal", next: "BodyText", quickFormat: true,
          run: { font: BODY_FONTS, size: SIZE.small, color: BLACK },
          paragraph: { alignment: AlignmentType.CENTER, spacing: { before: 60, after: 120, line: LINE.single, lineRule: "auto" } },
        },
        {
          id: "TableCaption", name: "Table Caption", basedOn: "Normal", next: "BodyText", quickFormat: true,
          run: { font: BODY_FONTS, size: SIZE.small, color: BLACK },
          paragraph: { alignment: AlignmentType.CENTER, keepNext: true, spacing: { before: 120, after: 60, line: LINE.single, lineRule: "auto" } },
        },
        {
          id: "ArtifactNote", name: "Artifact Note", basedOn: "Normal", next: "BodyText", quickFormat: true,
          run: { font: BODY_FONTS, size: SIZE.note, color: BLACK },
          paragraph: { alignment: AlignmentType.LEFT, spacing: { before: 0, after: 60, line: LINE.single, lineRule: "auto" } },
        },
        {
          id: "Formula", name: "Formula", basedOn: "Normal", next: "BodyText", quickFormat: true,
          run: { font: BODY_FONTS, size: SIZE.body, color: BLACK },
          paragraph: { alignment: AlignmentType.CENTER, spacing: { before: 0, after: 0, line: LINE.oneAndHalf, lineRule: "auto" } },
        },
        {
          id: "DraftPlaceholder", name: "Draft Placeholder", basedOn: "BodyText", next: "BodyText", quickFormat: true,
          run: { font: BODY_FONTS, size: SIZE.body, bold: true, color: BLACK },
          paragraph: { alignment: AlignmentType.JUSTIFIED, spacing: { before: 0, after: 0, line: LINE.oneAndHalf, lineRule: "auto" }, indent: { firstLine: 480 } },
        },
      ],
    },
    numbering: {
      config: [
        {
          reference: listRefs.ordered,
          levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 480, hanging: 480 } } } }],
        },
        {
          reference: listRefs.bullet,
          levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 480, hanging: 480 } } } }],
        },
      ],
    },
    sections: [{
      properties: { page: { size: A4, margin: MARGINS } },
      headers: { default: createHeader(record.metadata) },
      children,
    }],
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }
  if (!args.input) fail("--input is required.");
  if (!args.check && !args.output) fail("--output is required unless --check is used.");
  verifyOfficialTemplateAsset();
  const { data, inputDir } = readJson(args.input);
  const record = validateAndNormalize(data, inputDir);
  if (args.check) {
    process.stdout.write("Input is valid.\n");
    return;
  }
  const outputPath = path.resolve(args.output);
  if (fs.existsSync(outputPath) && !args.force) fail(`Output already exists: ${outputPath}. Use --force only when replacement is intended.`);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  const document = buildDocument(record);
  const buffer = await Packer.toBuffer(document);
  fs.writeFileSync(outputPath, buffer);
  process.stdout.write(`Generated ${outputPath}\n`);
}

main().catch((error) => {
  process.stderr.write(`ERROR: ${error.message}\n`);
  process.exitCode = 1;
});
