# Format specification

Use this default only when the user has not supplied an official template. The official template takes precedence.

## Document structure

1. Header on every page: competition name, record number, experiment date range, and anonymity notice.
2. Summary page: experiment title, `一、实验目的`, `二、实验内容`, and `三、实验结果`.
3. Forced page break.
4. Full record title followed by exactly seven primary sections:
   - `一、实验目的`
   - `二、实验原理`
   - `三、实验材料与试剂`, or for computational work `三、研究对象、数据来源与分析工具`
   - `四、实验步骤`
   - `五、注意事项`
   - `六、实验结果与分析`
   - `七、实验总结与反思`

## Page settings

- A4 portrait: 210 × 297 mm (`11906 × 16838` DXA).
- Margins: 20 mm on all sides (`1134` DXA).
- Header distance: 10 mm (`567` DXA).
- Footer distance: 17.5 mm (`992` DXA).
- Body Chinese font: SimSun/宋体. Latin letters, digits, and units: Times New Roman.
- Text color: black. No table of contents, page numbers, decorative rules, or colored fills by default.

## Fixed typography

| Element | Chinese font | Latin font | Size | Weight | Line spacing | Alignment and indent | Before/after |
|---|---|---|---:|---|---|---|---|
| Header competition name | 黑体 | Times New Roman | 15 pt | regular | single | left | 0/0 pt |
| Header record number and dates | 黑体 | Times New Roman | 10.5 pt | bold | single | left; right tab allowed for number | 0/0 pt |
| Header anonymity notice | 黑体 | Times New Roman | 10.5 pt | bold | single | justified | 0/0 pt |
| Summary-page title | 黑体 | Times New Roman | 16 pt | bold | 1.5 lines | centered, no indent | 12/6 pt |
| Summary primary headings | 黑体 | Times New Roman | 14 pt | bold | 1.5 lines | left, no first-line indent | 6/0 pt |
| Summary body | 宋体 | Times New Roman | 12 pt | regular | 1.5 lines | justified, first-line indent 2 characters | 0/0 pt |
| Full-record title | 黑体 | Times New Roman | 16 pt | bold | 1.5 lines | centered, no indent | 12/6 pt |
| Seven primary section headings | 黑体 | Times New Roman | 14 pt | bold | 1.5 lines | left, no first-line indent | 6/0 pt |
| Secondary heading such as `3.1` | 宋体 | Times New Roman | 12 pt | bold | 1.5 lines | left, no first-line indent | 6/0 pt |
| Tertiary heading such as `4.1.1` | 宋体 | Times New Roman | 12 pt | bold | 1.5 lines | left, no first-line indent | 3/0 pt |
| Body paragraph | 宋体 | Times New Roman | 12 pt | regular | 1.5 lines | justified, first-line indent 2 characters | 0/0 pt |
| Numbered or bulleted item | 宋体 | Times New Roman | 12 pt | regular | 1.5 lines | left, hanging indent 2 characters | 0/0 pt |
| Figure caption | 宋体 | Times New Roman | 10.5 pt | regular | single | centered, below figure | 3/6 pt |
| Table caption | 宋体 | Times New Roman | 10.5 pt | regular | single | centered, above table | 6/3 pt |
| Table header | 宋体 | Times New Roman | 10.5 pt | bold | single | horizontally and vertically centered | 0/0 pt |
| Table body | 宋体 | Times New Roman | 10.5 pt | regular | single | numbers centered, long text left | 0/0 pt |
| Figure/table note or source | 宋体 | Times New Roman | 9 pt | regular | single | left | 0/3 pt |
| Formula/statistic/unit | 宋体 | Times New Roman | 12 pt | regular; variables italic when appropriate | 1.5 lines | inline or centered formula | 0/0 pt |
| Explicit draft placeholder | 宋体 | Times New Roman | 12 pt | bold | 1.5 lines | follows containing paragraph | 0/0 pt |

The generator uses half-point sizes: 32, 30, 28, 24, 21, and 18. It uses OOXML line values `360` for 1.5-line spacing and `240` for single spacing.

## Figures and tables

- Number figures and tables independently by first display order. Never accept duplicate IDs or skipped/manual numbering.
- Use `{{figure:id}}` and `{{table:id}}` for in-text references; the generator resolves the number.
- Center images and preserve aspect ratio. Fit them within the body area without stretching.
- Use a black 0.5 pt grid for tables, repeat the header row on later pages, and apply cell padding.
- Put a figure note below the caption. Put a table note below the table.
- Captions supplied in JSON contain only descriptive text; the generator adds `图 N` or `表 N`.

## Consistency gate

Before handoff, verify:

- Start date is not later than end date.
- Title and record number agree across header, summary, and full record.
- Groups, controls, doses, units, sample sizes, time points, and repetitions agree everywhere.
- Every figure/table is displayed exactly once, referenced tokens point to existing IDs, and captions describe the correct artifact.
- Summary results do not add claims absent from the detailed results.
- Statistical wording matches the provided analysis and distinguishes descriptive trends from statistical significance.
