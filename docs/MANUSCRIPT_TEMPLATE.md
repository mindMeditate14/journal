# NexusJournal Manuscript Submission Template

**Instructions**: Fill out the metadata below in the YAML frontmatter (between `---` lines). Then write your article content using Markdown. Save as `.md` and upload to NexusJournal.

---

```yaml
---
# REQUIRED: Basic article information
title: "A Systematic Review of Ashwagandha (Withania somnifera) in Stress Management and Anxiety Reduction"
authors:
  - name: "Dr. Rajesh Kumar"
    email: "rajesh.kumar@ayurvedicuniversity.edu"
    affiliation: "Institute of Ayurvedic Studies, Delhi University, India"
    orcid: "0000-0002-1234-5678"
    correspondence: true  # corresponding author
  - name: "Dr. Priya Sharma"
    email: "priya.sharma@researchlab.org"
    affiliation: "Ayurveda Research Lab, Mumbai, India"
    orcid: "0000-0003-8765-4321"

# Article metadata
keywords:
  - "ashwagandha"
  - "stress management"
  - "anxiety"
  - "adaptogenic herbs"
  - "clinical evidence"

abstract: |
  Stress and anxiety disorders affect millions globally, with growing interest in plant-based 
  therapeutics. Ashwagandha (Withania somnifera), a cornerstone herb in Ayurvedic medicine, 
  has gained research attention for its anxiolytic properties. This systematic review examined 
  45 peer-reviewed studies (2010-2024) to synthesize evidence on ashwagandha's efficacy in 
  stress and anxiety reduction. Meta-analysis of 28 randomized controlled trials (N=1,847) 
  showed significant reduction in cortisol levels (SMD: -0.74, 95% CI: -1.02 to -0.46) and 
  anxiety scores (SMD: -0.62, 95% CI: -0.89 to -0.35). Safety profile was favorable with 
  mild adverse events in <5% of participants. Evidence suggests ashwagandha is an effective 
  and safe adjunct therapy for stress-related disorders. However, heterogeneity in dosing, 
  duration, and outcome measures limits strong recommendations. Future research should 
  standardize protocols and compare ashwagandha to conventional anxiolytics.

# REQUIRED: Discipline and research type
discipline: "Traditional Medicine"  # or: Neuroscience, Psychology, Pharmacology, Medicine, etc.
methodology: "systematic-review"   # options: case-study | qualitative | quantitative | mixed | systematic-review | meta-analysis
studyDesign: "systematic-review with meta-analysis"

# Funding and conflicts
fundingStatement: |
  This research received no specific grant from any funding agency in the public, commercial, 
  or not-for-profit sectors. Dr. Sharma received consulting fees from HerbalTech Industries 
  (unrelated to this study).

conflictOfInterest: |
  Dr. Kumar has no conflicts of interest. Dr. Sharma discloses consulting fees from HerbalTech 
  Industries for unrelated research. Neither author has financial stake in ashwagandha products.

# Data and code availability
dataAvailability: |
  All data used in this systematic review are from published peer-reviewed articles (citations 
  provided). No original data collected. PRISMA checklist and search strategy available at: 
  https://osf.io/abc12/. Raw data (extracted tables) available: https://zenodo.org/record/7654321

codeAvailability: "Not applicable (qualitative synthesis, no custom analysis code)"

# Suggested journal sections (optional)
suggestedJournals:
  - "Complementary Therapies in Medicine"
  - "Journal of Ethnopharmacology"
  - "Phytotherapy Research"

# Ethical considerations (if applicable)
ethicsApproval: "Not required: systematic review of published studies (no human subjects)"
registeredProtocol: "PROSPERO CRD42024012345"

# Publication version
version: "1.0"
submissionDate: "2024-04-28"
---
```

---

## 1. Introduction

### 1.1 Background and Context

Stress and anxiety are among the most prevalent mental health conditions globally, affecting approximately 
301 million people according to the World Health Organization (WHO, 2023). The global burden of anxiety 
disorders is estimated at 4.7% of the adult population, with significant economic and social costs exceeding 
$1 trillion annually in lost productivity (WHO, 2023).

While pharmaceutical interventions remain the standard treatment (selective serotonin reuptake inhibitors, 
benzodiazepines), growing evidence demonstrates that plant-based therapies can provide comparable efficacy 
with fewer adverse effects (Smith et al., 2022). Approximately 80% of the global population relies on 
traditional plant-based medicines for primary healthcare (WHO, 2019).

### 1.2 Ashwagandha as a Candidate Therapy

Ashwagandha (*Withania somnifera* Dunal; family *Solanaceae*) is a perennial woody shrub native to the 
Indian subcontinent and semi-arid regions of the Middle East and northern Africa. In Sanskrit, "ashwagandha" 
means "strength of a horse," reflecting its traditional use as a revitalizing tonic (Mishra et al., 2000).

**Historical use:**
- Over 3,000 years in Ayurvedic medicine
- Classified as a *rasayana* (rejuvenating tonic) and *adaptogens*
- Used for fatigue, sleep disorders, cognitive decline, and inflammation

**Phytochemical composition:**
Ashwagandha root contains over 34 known alkaloids and 5 withanolides (WS), with the following key components:
- **Alkaloids:** Somniferine, withananine, pseudotropine
- **Withanolides:** Withanolide A, withanolide D (WA, WD) — potent bioactives
- **Glycosides:** Sitoindoside I and IX
- **Saponins:** Supporting immune function

### 1.3 Research Questions and Rationale

Despite growing preclinical and clinical evidence, no comprehensive systematic review has synthesized findings 
on ashwagandha's efficacy for stress and anxiety in over 5 years. This review addresses the following questions:

1. **Efficacy:** What is the effect size of ashwagandha on anxiety scores and cortisol levels?
2. **Safety:** What is the incidence of adverse events across clinical trials?
3. **Dose-response:** Is there a relationship between ashwagandha dose/duration and clinical outcomes?
4. **Mechanism:** What proposed neurobiological mechanisms explain ashwagandha's anxiolytic effects?
5. **Generalizability:** How well do results generalize across populations (age, gender, baseline anxiety)?

---

## 2. Methods

### 2.1 Search Strategy and Study Selection

**Databases searched** (January 2010 — April 2024):
- PubMed (via MEDLINE)
- Scopus
- Web of Science
- EMBASE
- Traditional Medicine databases (Ayush, IROM, ATMS)

**Search terms** (combined with Boolean operators):
```
("Withania somnifera" OR "ashwagandha" OR "winter cherry") 
AND 
("anxiety" OR "stress" OR "cortisol" OR "anxiolytic") 
AND 
("clinical trial" OR "RCT" OR "randomized" OR "controlled")
NOT 
("in vitro" OR "animal" OR "preclinical")
```

**Inclusion criteria:**
- ✓ Peer-reviewed journal articles
- ✓ Clinical trials (RCT, quasi-experimental, open-label) in humans
- ✓ Ashwagandha extract or root powder as intervention
- ✓ Outcome: anxiety, stress, cortisol, or mood measures
- ✓ Published in English (with non-English translation available)
- ✓ N ≥ 10 participants

**Exclusion criteria:**
- ✗ In vitro or animal studies
- ✗ Case reports (N < 3)
- ✗ Letters, editorials, opinion pieces
- ✗ Studies combining ashwagandha with 5+ other herbs (confounding)
- ✗ Duplicate publications of same trial

### 2.2 Data Extraction and Quality Assessment

**Extracted variables:**
- Study characteristics: author, year, country, design, funding source, conflict of interest
- Participant demographics: N, age (M±SD), gender, baseline diagnosis
- Intervention details: dosage (mg/day), duration (weeks), extract type, withanolide content
- Outcomes: primary measure, timepoint, effect size (Cohen's *d*), adverse events
- Quality markers: blinding, loss to follow-up, allocation concealment

**Quality assessment tool:**
- Cochrane Risk of Bias 2 (RoB 2) for RCTs
- Newcastle-Ottawa Scale (NOS) for observational studies
- GRADE approach for overall evidence quality

### 2.3 Statistical Analysis

**Primary outcomes:**
1. **Anxiety reduction** (measured via HAMA, DASS-21, STAI, or other validated scales)
2. **Cortisol levels** (salivary or serum, morning or 24-h)

**Meta-analytic methods:**
- Random-effects models (DerSimonian & Laird)
- Standardized mean differences (SMD, Cohen's *d*)
- I² statistic for heterogeneity assessment
- Sensitivity analyses: exclusion of outliers, assessment of publication bias (Egger regression)

**Subgroup analyses:**
- Dosage (low <400 mg/day vs. high ≥400 mg/day)
- Duration (short <8 weeks vs. long ≥8 weeks)
- Population (healthy vs. clinical anxiety disorder)
- Extract type (root extract vs. whole plant)

---

## 3. Results

### 3.1 Study Selection

*[PRISMA Flow Diagram]*

```
Records identified (n = 847)
  ↓
After deduplication (n = 623)
  ↓
Titles/abstracts screened (n = 623)
  ↓ Excluded (n = 445)
Full-text reviewed (n = 178)
  ↓ Excluded (n = 133) — no anxiety measure, no control group, etc.
Studies included in qualitative synthesis (n = 45)
  ↓
Studies included in meta-analysis (n = 28)
```

### 3.2 Study Characteristics

**Summary of included studies (N=45):**
- **Year published:** 2010–2024 (median 2021)
- **Study design:** 28 RCTs, 12 quasi-experimental, 5 open-label
- **Geographic origin:** India (n=22), USA (n=10), Australia (n=4), Europe (n=6), others (n=3)
- **Total participants:** 1,847 (range: 20–198 per study)
- **Participant age:** 18–75 years (mean 42±12)
- **Dosage range:** 150–1,000 mg/day, median 300 mg/day
- **Duration:** 4–24 weeks (median 8 weeks)

**Quality assessment:**
- Low risk of bias: 18 studies (40%)
- Some concerns: 15 studies (33%)
- High risk of bias: 12 studies (27%)

### 3.3 Meta-Analytic Results

**Anxiety reduction (28 RCTs, N=1,158):**
- Overall effect: SMD = –0.62 (95% CI: –0.89 to –0.35), *p* < 0.001
- Heterogeneity: I² = 67% (moderate heterogeneity)
- Interpretation: Small to medium effect size, clinically meaningful

**Cortisol reduction (15 RCTs, N=689):**
- Overall effect: SMD = –0.74 (95% CI: –1.02 to –0.46), *p* < 0.001
- Heterogeneity: I² = 56%

**Dose-response analysis:**
- High-dose (≥400 mg/day): SMD = –0.81 (n=12 RCTs)
- Low-dose (<400 mg/day): SMD = –0.48 (n=16 RCTs)
- *p* for trend = 0.06 (borderline dose-dependent effect)

**Subgroup analyses:**
- Clinical anxiety disorder: SMD = –0.91 (n=8)
- Healthy/subclinical: SMD = –0.47 (n=20)
- Duration ≥8 weeks: SMD = –0.73 (vs. <8 weeks: –0.51)

### 3.4 Adverse Events

**Safety profile (all 45 studies, N=1,847):**
- Adverse events reported: 82 incidents across all groups (4.4%)
- Most common: mild gastrointestinal symptoms (n=34), headache (n=18), dizziness (n=12)
- Serious adverse events: 0 (no hospitalizations, no withdrawals due to toxicity)
- Withdrawal rates: ashwagandha 2.1% vs. placebo 1.9% (not significantly different)

**Common reported side effects:**
- Mild nausea (1–2%)
- Drowsiness (mild, 1%)
- Headache (0.5–1%)
- No hepatotoxicity, renal dysfunction, or hypersensitivity reactions reported

---

## 4. Discussion

### 4.1 Synthesis of Findings

Our systematic review of 45 clinical trials (N=1,847, 28 in meta-analysis) demonstrates that ashwagandha 
is efficacious for anxiety reduction, with an overall effect size (SMD = –0.62) comparable to first-generation 
anxiolytics (e.g., buspirone SMD = –0.53; Sarris et al., 2011) and superior to placebo (SMD = 0.10).

**Key finding:** Ashwagandha reduced cortisol levels (biomarker of chronic stress) with medium effect 
(SMD = –0.74), suggesting a physiological mechanism distinct from placebo.

### 4.2 Proposed Neurobiological Mechanisms

Evidence suggests ashwagandha exerts anxiolytic effects through multiple pathways:

1. **GABA enhancement:** Withanolides promote GABA receptor signaling (similar to benzodiazepines but without 
   dependence liability; Deepa & Sandhya, 2011)

2. **HPA axis modulation:** Reduces cortisol and ACTH via feedback inhibition (Auddy et al., 2008)

3. **Anti-inflammatory:** Inhibits NF-κB, reducing neuroinflammation implicated in anxiety (Baell et al., 2019)

4. **Antioxidant:** Increases SOD and catalase, protecting against oxidative stress (Schloms et al., 2015)

5. **Neurogenesis:** Withanolide D promotes BDNF, supporting hippocampal neuroplasticity (Malik et al., 2017)

### 4.3 Clinical Implications

**Strengths of evidence:**
- Multiple RCTs in diverse populations
- Consistent effect direction (anxiety reduction in 40/45 studies)
- Safety profile superior to conventional anxiolytics (no dependency, minimal side effects)
- Mechanism supported by neurobiological evidence

**Limitations:**
- Heterogeneous outcome measures (HAMA, DASS-21, STAI) limit direct comparison
- Small sample sizes (median N=45, range 20–198)
- Publication bias likely (positive studies more publishable)
- Optimal dosage and duration remain unclear (range 150–1,000 mg, 4–24 weeks)
- Generalizability: 48% of studies from India (potential locale bias)

### 4.4 Future Research Directions

1. **Standardized protocols:** RCTs comparing ashwagandha to SSRIs (paroxetine, escitalopram) head-to-head
2. **Dose optimization:** Dose-finding studies to establish therapeutic range
3. **Long-term safety:** Studies > 6 months to assess dependency and sustained efficacy
4. **Mechanistic investigations:** Neuroimaging (fMRI) to identify brain regions affected
5. **Patient subgroups:** Efficacy in specific populations (elderly, perinatal, adolescents)
6. **Combination therapy:** Ashwagandha + CBT vs. monotherapy

---

## 5. Conclusion

Ashwagandha demonstrates moderate, clinically meaningful efficacy for stress and anxiety reduction in humans, 
supported by meta-analytic evidence and favorable safety profile. Its mechanism of action involves multi-target 
neurobiological pathways (GABA, HPA axis, neuroinflammation, neuroprotection), distinguishing it from 
conventional anxiolytics.

**Recommendation:** Ashwagandha is suitable as an adjunct or first-line therapy for mild-to-moderate anxiety 
and stress-related disorders, particularly in individuals seeking natural alternatives or those experiencing 
adverse effects from SSRIs. However, moderate-to-severe clinical anxiety disorder warrants conventional 
psychiatric evaluation and pharmacotherapy.

Further research standardizing dosage, comparing directly to conventional anxiolytics, and identifying optimal 
patient subgroups is needed to refine clinical recommendations.

---

## 6. References

Auddy, B., Hazra, J., Mitra, A., et al. (2008). A standardized Withania somnifera extract significantly reduces 
stress-related parameters in chronically stressed humans. *Journal of the American Nutraceutical Association*, 11(1), 50–56.

Baell, J. B., Leung, D., Kwok, A., et al. (2019). Structure-based design of novel withanolides as NF-κB 
modulators for anti-inflammatory applications. *Bioorganic & Medicinal Chemistry*, 27(8), 1456–1468.

Deepa, S., & Sandhya, V. (2011). Molecular mechanisms of withanolides on GABA receptors. *International Journal 
of Ayurveda*, 2(3), 145–152.

*[... continue with 40+ references ...]*

---

## 7. Supplementary Materials

### 7.1 PRISMA Checklist
[Attached as supplementary file]

### 7.2 Data Extraction Tables
[Table S1: Study characteristics]
[Table S2: Outcome data and effect sizes]
[Table S3: Risk of bias assessment]

### 7.3 Forest Plots
[Figure S1: Anxiety meta-analysis]
[Figure S2: Cortisol meta-analysis]

### 7.4 Search Strategy (Full)
[Search strategy for each database with date ranges, number of results]

---

## Contact Information

**Corresponding Author:**
Dr. Rajesh Kumar
Institute of Ayurvedic Studies, Delhi University
Email: rajesh.kumar@ayurvedicuniversity.edu
Phone: +91-11-XXXX-XXXX
ORCID: 0000-0002-1234-5678
