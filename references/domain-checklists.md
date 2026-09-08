# Domain checklists

Read only the sections relevant to the current record. These are evidence prompts, not permission to invent missing details.

## Animal or cell experiments

- Species/strain or cell line, sex when relevant, age/passage, source, housing/culture conditions, acclimation, randomization, blinding, inclusion/exclusion, group size, controls, treatment route, dose/concentration, frequency, duration, and humane endpoints.
- Ethics approval information only when the user supplies it and anonymous-submission rules permit it.
- Separate planned procedures from what was actually performed and from deviations.

## Behavioral experiments

- Apparatus dimensions, lighting/noise, acclimation, test order, cleaning method, fixed test period, operator blinding, scoring software, measured variables, and exclusion rules.
- Distinguish locomotor-control measures from depression-related or other behavioral endpoints.

## Immunofluorescence and imaging

- Tissue region, section thickness, fixation, antigen retrieval when used, permeabilization, blocking, primary/secondary antibody identity and dilution, incubation, nuclear stain, mounting, microscope/objective, exposure or acquisition settings, ROI, scale bar, image-processing rules, blinding, and quantification method.
- Keep acquisition settings comparable across groups. Do not describe representative images as quantitative proof without quantified data.

## Western blot

- Tissue/cell source, lysis buffer and inhibitors, protein assay, loading amount, gel percentage, transfer membrane and conditions, blocking, antibody identity/dilution, incubation, detection, exposure handling, normalization target, biological replicates, densitometry method, and statistics.
- Distinguish total protein from phosphorylated protein and state the normalization calculation actually used.

## Bioinformatics or database analysis

- Database names, access dates/versions when available, organism, query terms, inclusion/exclusion, identifier normalization, deduplication, thresholds, software/package versions, confidence settings, and exported intermediate files.
- Treat database predictions as predictions; do not present them as wet-lab validation.

## Omics

- Sample groups and biological replicates, extraction and quality criteria, library/preparation platform, preprocessing, reference genome or database, normalization, batch handling, differential-analysis method, effect-size threshold, adjusted-P threshold, enrichment background, multiple-testing correction, and data accession when supplied.
- PCA separation, enrichment, and differential expression require cautious interpretation and later validation where appropriate.

## Molecular docking

- Receptor and ligand sources, structure IDs, preprocessing, protonation/charge choices, binding-site or grid definition, software/version, search parameters, scoring function, pose-selection rule, controls or reference ligands, and visualization method.
- Docking scores indicate modeled compatibility, not binding, exposure, efficacy, or mechanism proof.

## Result and reflection quality

- Report observable outcomes before interpretation.
- Include exact values, variability, sample size, and statistical method only when provided.
- State limitations tied to the actual design and name a realistic next validation step.
- Keep reflection specific to technique, quality control, troubleshooting, or research reasoning; avoid generic motivational filler.
