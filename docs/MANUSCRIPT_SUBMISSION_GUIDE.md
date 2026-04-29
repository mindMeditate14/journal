# NexusJournal Manuscript Submission Guide

## 🎯 Overview

NexusJournal provides a **structured manuscript submission system** with two submission paths designed to accommodate different researcher workflows:

1. **Guided Form Entry** - Step-by-step wizard for researchers writing directly in the system
2. **PDF Upload** (Coming Soon) - For researchers with pre-written papers

---

## 📋 Essential Journal Structure (Best Practices)

Every manuscript submitted to NexusJournal should follow this structure:

### **1. METADATA / FRONTMATTER**
```yaml
Title: 10-300 characters
  → Your research question or key finding in one sentence
  → Examples:
     ✓ "Machine Learning Improves Diagnosis of Rare Ayurvedic Disorders"
     ✓ "A Systematic Review of Traditional Medicine in Modern Healthcare"

Abstract: 50-1000 characters
  → Executive summary of your entire paper
  → Must include: Objective, Methods, Results, Conclusion
  → Written for non-specialists

Keywords: 5-7 relevant terms
  → Helps readers find your work
  → Examples: "machine learning", "Ayurveda", "clinical trials"

Discipline: Pick one
  → Medicine, Physics, Chemistry, Biology, Computer Science, etc.

Methodology: Research approach
  → Experimental, Theoretical, Review, Case Study, Meta-Analysis, 
    Survey, Qualitative, Quantitative, Mixed Methods, Systematic Review

Authors:
  → Name, email, affiliation, ORCID (optional)
  → At least one author required (correspondence email)
  → All co-authors must be listed
```

### **2. MAIN CONTENT - 6 Core Sections**

#### **A. Introduction (300-500 words)**
- **Purpose**: Set the context and establish why this research matters
- **Key elements**:
  - Hook: Start with a compelling question or statement
  - Background: Describe the current state of knowledge
  - Problem: Clearly state what problem your research solves
  - Significance: Explain why this matters
  - Research question/hypothesis: End with what you're investigating
- **Tip**: Write for someone in your field, not specialists in your sub-field

#### **B. Literature Review (400-800 words)**
- **Purpose**: Show what others have discovered; position your work in context
- **Key elements**:
  - Chronological or thematic organization
  - Synthesis (compare/contrast) not just summary
  - Identify gaps your research will fill
  - Mention conflicting viewpoints if relevant
- **Tip**: Cite 10-30 sources depending on field

#### **C. Methodology (400-600 words)**
- **Purpose**: Enable other researchers to replicate or build on your work
- **Key elements**:
  - Research design (experiment, survey, analysis, etc.)
  - Study population or data source
  - Materials and equipment used
  - Procedures and protocols followed step-by-step
  - Statistical or analytical methods
  - Any ethical approvals/compliance
- **Tip**: Be detailed enough that someone could replicate your work

#### **D. Results/Findings (300-800 words + figures/tables)**
- **Purpose**: Present factual data without interpretation
- **Key elements**:
  - Organized results (by research question or hypothesis)
  - Use tables for complex data, figures for trends
  - Report statistics with significance levels
  - Describe patterns without explaining them
- **Tip**: Let the data speak; save interpretation for Discussion

#### **E. Discussion (500-800 words)**
- **Purpose**: Interpret results and explain what they mean
- **Key elements**:
  - Restate key findings
  - Compare with prior research: Do your findings align or contradict?
  - Explain WHY: What mechanisms explain your results?
  - Limitations: What are the constraints of your research?
  - Implications: What can practitioners/researchers do with this?
  - Future research: What questions remain?
- **Tip**: This is where you show critical thinking

#### **F. Conclusion (150-300 words)**
- **Purpose**: Summarize contribution and significance
- **Key elements**:
  - Main findings (1-2 sentences)
  - Key contributions (how does this advance the field?)
  - Practical applications
  - Call to action for future research
  - Final statement on significance
- **Tip**: Some readers skip straight to the conclusion—make it count

### **3. REFERENCES**
- **Format**: Use consistent citation style (APA, Harvard, Chicago, etc.)
- **Examples**:
  ```
  APA:
  Smith, J., & Johnson, K. (2025). Title of paper. Journal Name, 45(3), 234-245.

  Harvard:
  Smith, J. and Johnson, K. (2025) 'Title of paper', Journal Name, 45(3), pp. 234-245.
  ```
- **Tools**: Mendeley, Zotero, RefWorks make this easier

### **4. SUPPLEMENTARY DISCLOSURES**

#### **Funding Statement**
```
Examples:
✓ "No funding received for this research"
✓ "Supported by Grant XYZ from the National Science Foundation"
✓ "Funded by the authors' institutions"
```

#### **Conflict of Interest Declaration**
```
Examples:
✓ "No conflicts of interest to declare"
✓ "Dr. Smith received consulting fees from Company XYZ unrelated to this work"
✓ "The authors own stock in the company producing the device tested"
```

#### **Data Availability**
```
Examples:
✓ "Data and materials are available upon request from the corresponding author"
✓ "Code and data are available at GitHub: [URL]"
✓ "Public dataset available at [Database name]: [DOI or URL]"
✓ "Data is proprietary and cannot be shared due to confidentiality agreements"
```

---

## 🚀 HOW RESEARCHERS SUBMIT: Two Paths

### **PATH 1: GUIDED FORM ENTRY (Recommended for new writers)**

**Who should use this:**
- First-time authors
- Researchers writing directly in English
- Those who want real-time guidance

**5-Step Process:**

**Step 1: Metadata** (5 min)
- Enter title, abstract, keywords
- Select discipline & methodology
- ✅ Form validates character counts & structure

**Step 2: Authors** (3 min)
- Add all co-authors
- Provide affiliation & ORCID
- Mark corresponding author email
- ✅ Can add/remove authors dynamically

**Step 3: Main Content** (30-60 min)
- Fill 5 text boxes: Introduction → Literature Review → Results → Discussion → Conclusion
- **💡 Writing Tips Panel**: Context-sensitive guidance for each section
- **Auto-Save**: Progress saved automatically every 30 seconds
- ✅ Real-time validation shows missing sections

**Step 4: References & Disclosures** (10 min)
- Paste full reference list
- Funding statement
- Conflict of interest declaration
- Data availability statement
- ✅ Can copy-paste from reference management tools

**Step 5: Review & Submit** (2 min)
- See formatted preview of manuscript
- Confirm all required fields complete
- One-click submit
- ✅ Automatic DOI generation via Zenodo
- ✅ Confirmation email sent immediately

### **PATH 2: PDF UPLOAD (Coming Soon - for pre-written papers)**

**Who this is for:**
- Researchers with existing Word/PDF documents
- Fast transition from traditional submission
- Minimal retyping needed

**4-Step Process:**

1. **Upload PDF** 
   - Drag & drop or select file
   - Supported: PDF, DOCX, ODT
   
2. **AI Extraction**
   - System reads PDF using OCR
   - Automatically detects sections
   - Extracts metadata (title, authors, abstract)
   
3. **Review & Edit**
   - Verify extracted sections
   - Correct OCR errors
   - Fill missing metadata
   - Same form as guided entry
   
4. **Submit**
   - All validations same as Path 1
   - Submit for review

---

## 💡 WRITING ASSISTANCE FEATURES

### **Built into Form Entry:**

1. **Section Guidelines** - Hover over field labels for guidance
2. **Character Counters** - Real-time feedback on length requirements
3. **Writing Tips Sidebar** - Context-specific suggestions
4. **Examples** - Sample text for each section
5. **Reference Formatter** - Paste messy references → auto-formatted
6. **Spell Check** - Browser-based spell checking

### **Recommended External Tools:**
- **Writing**: Grammarly, ProWritingAid
- **References**: Zotero, Mendeley, EndNote
- **Formatting**: Overleaf (if using LaTeX), Google Docs
- **Visualization**: Figma, Canva (for figures)

---

## 🔄 Post-Submission Workflow

### **What Happens After Researcher Submits:**

1. **Immediate** (< 1 second)
   - Unique submission ID assigned
   - Manuscript stored in database
   - Confirmation email sent

2. **Within 24 hours**
   - Editorial team receives notification
   - Manuscript assigned Zenodo DOI
   - Plagiarism check initiated

3. **Week 1**
   - Editorial screening (desk review)
   - Check for fit, quality, completeness
   - Status: **Desk Rejected** OR **Sent to Review**

4. **Weeks 2-6**
   - Peer review (2-4 reviewers assigned)
   - Reviewer feedback collected
   - Status: **Under Review**

5. **Week 7**
   - Editor makes decision
   - Possible statuses:
     - **Accept** (rare on first submission)
     - **Major Revisions** (resubmit with changes)
     - **Minor Revisions** (small changes)
     - **Reject** (with feedback for improvement)

6. **If Revisions Needed**
   - Researcher revises and resubmits
   - Reviewers reassess revisions
   - Process repeats until acceptance

7. **Final**
   - **Accepted** → Copyediting → **Published**
   - Manuscript appears in journal
   - DOI is live for citing

---

## ✅ CHECKLIST: Before You Submit

- [ ] Title (10-300 chars, clear & descriptive)
- [ ] Abstract (50-1000 chars, includes objective/methods/results/conclusion)
- [ ] Introduction (establishes context and problem)
- [ ] Literature Review (shows how this fits with existing knowledge)
- [ ] Methodology (detailed enough to replicate)
- [ ] Results (objective data presentation)
- [ ] Discussion (interpretation and implications)
- [ ] Conclusion (why this matters)
- [ ] References (complete citations, consistent format)
- [ ] All authors listed (with emails)
- [ ] Funding statement filled in
- [ ] Conflict of interest declared
- [ ] Data availability statement provided
- [ ] Discipline selected
- [ ] Methodology type selected
- [ ] Keywords added (5-7 terms)
- [ ] Spell-checked and grammar reviewed
- [ ] Images/tables have captions
- [ ] No plagiarism (use Grammarly/Turnitin check)

---

## 🎓 Common Mistakes to Avoid

| ❌ Mistake | ✅ Solution |
|-----------|-----------|
| Abstract longer than 1000 chars | Edit ruthlessly; every word must earn its space |
| Results without interpretation | Save interpretation for Discussion section |
| Methodology too vague to replicate | Include step-by-step procedures, equipment specs, software versions |
| References missing or incomplete | Use reference manager; double-check all citations |
| Conflict of interest hidden | Always disclose potential biases |
| Data sharing statement missing | Even if unavailable, explain why in Data Availability |
| Introduction has no research question | End Introduction with clear "This study investigates..." |
| Discussion only lists findings | Compare with others' work; explain WHY your results matter |
| Too many authors, no clear roles | Limit to 5-7; in Discussion, clarify who did what |
| Submitting before proofreading | Read aloud; have colleague review; use spell check |

---

## 🆘 Getting Help

**Need writing assistance?**
- Use the form's built-in **Writing Tips** sidebar
- Check **AYUSH Entry** section for discipline-specific guidance
- Reach out to editorial team: journal@mind-meditate.com

**PDF extraction not working?**
- Use **Guided Form Entry** instead
- Or email PDF to team for manual extraction

**Technical issues?**
- Clear browser cache (Ctrl+Shift+R)
- Try different browser
- Check internet connection

---

## 📚 Example: Well-Structured Manuscript

**[See attached template or generated example]**

---

**Last updated:** April 2026  
**Version:** 1.0
