# Generator input schema

Save the input as UTF-8 JSON. Run `generate_experiment_record.js --check --input record.json` before writing the `.docx` when iterating.

## Top-level object

```json
{
  "metadata": {},
  "summary": {},
  "sections": {},
  "figures": [],
  "tables": []
}
```

## Metadata

Required fields:

```json
{
  "competitionName": "第十一届全国大学生生命科学竞赛（科学探究类）实验记录",
  "recordNumber": "15",
  "startDate": "2026-04-01",
  "endDate": "2026-04-20",
  "title": "实验十五 示例实验标题",
  "documentStatus": "final",
  "materialsHeading": "实验材料与试剂"
}
```

- Dates must use `YYYY-MM-DD`.
- `documentStatus` is `final` or `draft`.
- `materialsHeading` is either `实验材料与试剂` or `研究对象、数据来源与分析工具`.

## Summary

Each field accepts one string or an array of non-empty strings:

```json
{
  "purpose": "说明本实验要解决的问题。",
  "content": "概述实际完成的主要操作和分析。",
  "result": "概述有数据支持的主要结果。"
}
```

## Seven sections

All seven keys are required and each must contain at least one block:

```json
{
  "purpose": [],
  "principle": [],
  "materials": [],
  "procedure": [],
  "precautions": [],
  "results": [],
  "reflection": []
}
```

Supported blocks:

```json
{"type":"paragraph","text":"正文；引用见{{figure:workflow}}和{{table:groups}}。"}
{"type":"heading","level":2,"text":"3.1 实验材料"}
{"type":"heading","level":3,"text":"4.1.1 样品预处理"}
{"type":"list","ordered":true,"items":["第一项","第二项"]}
{"type":"figure","ref":"workflow"}
{"type":"table","ref":"groups"}
{"type":"formula","text":"蔗糖偏好率（%）= 蔗糖水摄入量 / 总液体摄入量 × 100%"}
{"type":"note","text":"注：数据以均值 ± 标准差表示。"}
{"type":"placeholder","text":"补充实际样本量和统计方法"}
```

- A string inside a section is shorthand for a paragraph block.
- Heading `level` must be 2 or 3. Include the subsection number in `text`.
- Placeholder blocks are allowed only when `documentStatus` is `draft`.
- Do not type `图 1` or `表 1` in prose or captions. Use reference tokens.

## Figures

```json
{
  "id": "workflow",
  "path": "C:/absolute/path/workflow.png",
  "caption": "实验操作流程图",
  "note": "图片来源：本实验绘制。"
}
```

- IDs must be unique and use letters, digits, `_`, or `-`.
- Use absolute paths. Supported formats are PNG, JPG/JPEG, GIF, BMP, and SVG; convert TIFF/AI/PDF to PNG or JPEG first.
- Each defined figure must appear exactly once as a figure block.
- The generator fits images to the body area while preserving aspect ratio.

## Tables

```json
{
  "id": "groups",
  "caption": "实验分组与处理方案",
  "headers": ["组别", "处理", "剂量"],
  "rows": [
    ["对照组", "等体积溶剂", "—"],
    ["处理组", "示例处理", "以原始记录为准"]
  ],
  "columnWeights": [1, 2, 1],
  "note": "注：不得用示例值替代真实实验条件。"
}
```

- Headers must be non-empty. Every row must have the same number of cells as the header.
- `columnWeights` is optional; when omitted, columns are equal width.
- Each defined table must appear exactly once as a table block.

## CLI

```text
node scripts/generate_experiment_record.js --check --input record.json
node scripts/generate_experiment_record.js --input record.json --output 实验记录.docx
node scripts/generate_experiment_record.js --input record.json --output 实验记录.docx --force
```

The last form overwrites an existing output and should be used only when the user has requested replacement.
