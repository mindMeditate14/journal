/**
 * Manuscript Export Utility
 * Supports PDF, DOC, HTML, and Markdown export
 */
import html2pdf from "html2pdf.js";
import Chart from "chart.js/auto";
import { saveAs } from "file-saver";

interface OutcomeStats {
  outcome: string;
  unit: string;
  baseline: any;
  endpoint: any;
  improvementRate: number;
}

interface ManuscriptExportData {
  title: string;
  abstract?: string;
  sections: {
    introduction?: string;
    methods?: string;
    results?: string;
    discussion?: string;
    conclusion?: string;
    references?: string;
  };
  keywords?: string[];
  condition?: { name: string; description: string };
  intervention?: { name: string; description: string; protocol?: string; duration?: string; frequency?: string };
  population?: { totalCount?: number; ageRange?: { min?: number; max?: number } };
  outcomes?: Array<{ name?: string; type?: string; unit?: string; measurementMethod?: string; isPrimary?: boolean }>;
  statistics?: {
    completionRate?: number;
    outcomesStats?: OutcomeStats[];
  };
  studyType?: string;
  authors?: Array<{ name: string; affiliation?: string; email?: string }>;
  discipline?: string;
  methodology?: string;
}

const generateManuscriptHTML = (data: ManuscriptExportData): string => {
  const sections = data.sections || {};
  const stats = data.statistics || {};

  const sectionDefs = [
    { key: "introduction", label: "Introduction" },
    { key: "methods",      label: "Methods"      },
    { key: "results",     label: "Results"     },
    { key: "discussion",  label: "Discussion"  },
    { key: "conclusion",  label: "Conclusion"  },
    { key: "references",  label: "References"   },
  ];

  const formatText = (text: string) => {
    if (!text) return '<p class="placeholder">[Not yet generated - use Auto-Generate or write manually]</p>';
    return text.split("\n\n").map(p => `<p>${p.replace(/\n/g, "<br>")}</p>`).join("\n");
  };

  const formatRefs = (text: string) => {
    if (!text) return '<p class="placeholder">[References to be added by researcher]</p>';
    return text.split("\n").filter(Boolean).map(line => `<li>${line.replace(/^\d+\.\s*/, "")}</li>`).join("\n");
  };

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Georgia, serif; font-size: 11pt; line-height: 1.8; color: #222; margin: 0; padding: 20px; }
    .container { max-width: 170mm; margin: 0 auto; }
    h1 { font-size: 20pt; margin: 0 0 10px; color: #111; }
    h2 { font-size: 14pt; margin: 20px 0 8px; color: #1a1a1a; border-bottom: 1px solid #1a73e8; padding-bottom: 4px; }
    p { margin: 8px 0; text-align: justify; }
    .placeholder { color: #999; font-style: italic; }
    .keyword-tag { display: inline-block; background: #e8f0fe; color: #1a73e8; padding: 2px 8px; border-radius: 12px; font-size: 9pt; margin: 2px; }
    .stats-table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 10pt; }
    .stats-table th, .stats-table td { border: 1px solid #ddd; padding: 6px 10px; }
    .stats-table th { background: #f0f4ff; font-weight: 600; }
    .stat-highlight { background: #e8f5e9; font-weight: 600; }
    .outcome-table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 10pt; }
    .outcome-table th { background: #e8f0fe; border: 1px solid #cce; padding: 5px 8px; text-align: left; }
    .outcome-table td { border: 1px solid #ddd; padding: 5px 8px; }
    .ref-list { padding-left: 20px; font-size: 10pt; }
    .footer { margin-top: 30px; font-size: 8pt; color: #999; text-align: center; border-top: 1px solid #eee; padding-top: 10px; }
  </style>
</head>
<body>
  <div class="container">
    <div style="text-align:center; margin-bottom:30px; border-bottom:1px solid #ccc; padding-bottom:15px;">
      <h1 style="font-size:22pt; margin:0 0 8px;">${data.title || "Untitled Manuscript"}</h1>
      <p style="font-size:9pt; color:#666;">
        ${(data.authors || []).map((a: any) => a.name).filter(Boolean).join(", ") || "Author Name"}
        ${data.discipline ? ` - ${data.discipline.charAt(0).toUpperCase() + data.discipline.slice(1)}` : ""}
      </p>
    </div>

    ${data.abstract ? `<h2>Abstract</h2>${formatText(data.abstract)}` : ""}

    ${(data.keywords?.length ?? 0) > 0 ? `
    <p><strong>Keywords:</strong> ${data.keywords!.map((k: string) => `<span class="keyword-tag">${k}</span>`).join(" ")}</p>
    ` : ""}

    <hr style="margin:15px 0">

    ${(data.outcomes?.length ?? 0) > 0 ? `
    <h2>Outcome Measures</h2>
    <table class="outcome-table">
      <tr><th>Outcome</th><th>Type</th><th>Unit</th><th>Measurement</th></tr>
      ${data.outcomes!.map((o: any) => `
      <tr>
        <td><strong>${o.name || "N/A"}</strong>${o.isPrimary ? " [Primary]" : ""}</td>
        <td>${o.type || "numeric"}</td>
        <td>${o.unit || "-"}</td>
        <td>${o.measurementMethod || "Clinical assessment"}</td>
      </tr>`).join("")}
    </table>
    ` : ""}

    ${(stats.outcomesStats?.length ?? 0) > 0 ? `
    <h2>Results Summary</h2>
    <p><strong>Completion Rate:</strong> ${stats.completionRate || 0}% | <strong>Patients:</strong> ${data.population?.totalCount || "N/A"}</p>
    <table class="stats-table">
      <tr><th>Outcome</th><th>Baseline</th><th>Endpoint</th><th>Improvement</th></tr>
      ${stats.outcomesStats!.map((o: OutcomeStats) => `
      <tr>
        <td><strong>${o.outcome || "Outcome"}${o.unit ? ` (${o.unit})` : ""}</strong></td>
        <td>${o.baseline?.mean != null ? `${o.baseline.mean}${o.baseline.sd != null ? ` ± ${o.baseline.sd}` : ""}` : "-"}</td>
        <td>${o.endpoint?.mean != null ? `${o.endpoint.mean}${o.endpoint.sd != null ? ` ± ${o.endpoint.sd}` : ""}` : "-"}</td>
        <td class="stat-highlight">${o.improvementRate != null ? `${o.improvementRate}%` : "-"}</td>
      </tr>`).join("")}
    </table>
    ` : ""}

    <hr style="margin:15px 0">

    ${sectionDefs.map(({ key, label }) => `
    <h2>${label}</h2>
    ${key === "references" ? formatRefs(sections[key as keyof typeof sections] || "") : formatText(sections[key as keyof typeof sections] || "")}
    `).join("\n")}

    <div class="footer">
      <p>Generated by NexusJournal - ${new Date().toLocaleDateString()} - Please review all sections before journal submission</p>
    </div>
  </div>
</body>
</html>`;
};

export class ManuscriptExporter {
  static async exportPDF(data: ManuscriptExportData, filename = "manuscript.pdf") {
    const html = generateManuscriptHTML(data);
    const element = document.createElement("div");
    element.innerHTML = html;
    element.style.position = "absolute";
    element.style.left = "-9999px";
    document.body.appendChild(element);
    try {
      await html2pdf().set({
        margin: 10,
        filename,
        image: { type: "jpeg", quality: 0.95 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { orientation: "portrait", unit: "mm", format: "a4" },
      }).from(element).save();
    } finally {
      document.body.removeChild(element);
    }
  }

  static exportDOCX(data: ManuscriptExportData, filename = "manuscript.doc") {
    const wordXML = ManuscriptExporter.generateWordXML(data);
    const blob = new Blob([wordXML], { type: "application/msword" });
    saveAs(blob, filename);
  }

  static generateWordXML(data: ManuscriptExportData): string {
    const sections = data.sections || {};
    const escapeXml = (str: string) => String(str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    const para = (text: string) => {
      const lines = (text || "").split("\n\n").filter(Boolean);
      return lines.map(l => `<w:p><w:pPr><w:jc w:val="both"/></w:pPr><w:r><w:t xml:space="preserve">${escapeXml(l)}</w:t></w:r></w:p>`).join("");
    };

    const heading = (text: string) =>
      `<w:p><w:pPr><w:pStyle w:val="Heading2"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="28"/></w:rPr><w:t>${escapeXml(text)}</w:t></w:r></w:p>`;

    const sectionDefs = [
      { key: "introduction", label: "Introduction" },
      { key: "methods",      label: "Methods"      },
      { key: "results",     label: "Results"     },
      { key: "discussion",  label: "Discussion"  },
      { key: "conclusion",  label: "Conclusion"  },
      { key: "references",  label: "References"   },
    ];

    const bodyContent = `
      ${heading(data.title || "Untitled Manuscript")}
      <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:t>${escapeXml((data.authors || []).map((a: any) => a.name).filter(Boolean).join(", "))}</w:t></w:r></w:p>
      ${data.abstract ? `${heading("Abstract")}${para(data.abstract)}` : ""}
      ${(data.keywords?.length ?? 0) > 0 ? `<w:p><w:r><w:rPr><w:i/></w:rPr><w:t>Keywords: ${escapeXml(data.keywords!.join(", "))}</w:t></w:r></w:p>` : ""}
      ${sectionDefs.map(({ key, label }) => `${heading(label)}${para(sections[key as keyof typeof sections] || "")}`).join("")}
      <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:i/><w:sz w:val="16"/></w:rPr><w:t>Generated by NexusJournal - ${new Date().toLocaleDateString()}</w:t></w:r></w:p>
    `;

    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>${bodyContent}</w:body>
</w:document>`;
  }

  static async exportHTML(data: ManuscriptExportData, filename = "manuscript.html") {
    const html = generateManuscriptHTML(data);
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    saveAs(blob, filename);
  }

  static exportMarkdown(data: ManuscriptExportData, filename = "manuscript.md") {
    const sections = data.sections || {};
    const divider = "-".repeat(70);
    const lines: string[] = [];
    lines.push(divider);
    lines.push(data.title || "Untitled Manuscript");
    lines.push(divider);
    if (data.abstract) lines.push("\n## Abstract\n" + data.abstract);
    if (data.keywords?.length) lines.push(`\nKeywords: ${data.keywords.join(", ")}`);
    const sectionDefs = [
      { key: "introduction", label: "INTRODUCTION" },
      { key: "methods",      label: "METHODS"      },
      { key: "results",     label: "RESULTS"     },
      { key: "discussion",  label: "DISCUSSION"  },
      { key: "conclusion",  label: "CONCLUSION"  },
      { key: "references",  label: "REFERENCES"   },
    ];
    for (const { key, label } of sectionDefs) {
      const content = sections[key as keyof typeof sections] || "";
      lines.push(`\n${divider}`);
      lines.push(label);
      lines.push(divider);
      lines.push(content.split("\n\n").filter(Boolean).join("\n\n"));
    }
    lines.push(`\n${divider}`);
    lines.push(`Generated by NexusJournal - ${new Date().toLocaleDateString()}`);
    const blob = new Blob([lines.join("\n")], { type: "text/markdown;charset=utf-8" });
    saveAs(blob, filename);
  }
}

export default ManuscriptExporter;