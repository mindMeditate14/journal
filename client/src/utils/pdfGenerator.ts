/**
 * PDF Export Utility with Graphs
 * Converts practice data + statistics into a formatted PDF manuscript
 * with embedded charts and graphs
 */

import html2pdf from 'html2pdf.js';
import Chart from 'chart.js/auto';

interface OutcomeStats {
  outcome: string;
  unit: string;
  baseline: any;
  endpoint: any;
  change: any;
  improvementRate: number;
}

interface ManuscriptData {
  title: string;
  condition: { name: string; description: string };
  intervention: { name: string; description: string };
  population: any;
  outcomes: any[];
  statistics: {
    completionRate: number;
    outcomesStats: OutcomeStats[];
  };
  studyType: string;
}

export class PDFGenerator {
  /**
   * Create a chart and return as base64 image
   */
  static async createChart(
    type: 'line' | 'bar' | 'radar',
    data: any,
    options?: any
  ): Promise<string> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 250;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve('');
        return;
      }

      const chart = new Chart(ctx, {
        type,
        data,
        options: {
          responsive: false,
          maintainAspectRatio: false,
          ...options,
        },
      });

      setTimeout(() => {
        const imageData = canvas.toDataURL('image/png');
        chart.destroy();
        resolve(imageData);
      }, 500);
    });
  }

  /**
   * Generate baseline vs endpoint comparison chart
   */
  static async createOutcomeComparisonChart(
    outcomeName: string,
    baseline: number,
    endpoint: number,
    unit: string
  ): Promise<string> {
    const data = {
      labels: ['Baseline', 'End Point'],
      datasets: [
        {
          label: outcomeName,
          data: [baseline, endpoint],
          backgroundColor: ['rgba(255, 193, 7, 0.5)', 'rgba(76, 175, 80, 0.5)'],
          borderColor: ['rgba(255, 193, 7, 1)', 'rgba(76, 175, 80, 1)'],
          borderWidth: 2,
        },
      ],
    };

    return this.createChart('bar', data, {
      scales: {
        y: {
          title: { display: true, text: unit },
        },
      },
    });
  }

  /**
   * Generate improvement rate pie chart
   */
  static async createImprovementChart(improvementRate: number): Promise<string> {
    const data = {
      labels: ['Improved', 'No Improvement'],
      datasets: [
        {
          data: [improvementRate, 100 - improvementRate],
          backgroundColor: ['rgba(76, 175, 80, 0.6)', 'rgba(244, 67, 54, 0.6)'],
          borderColor: ['rgba(76, 175, 80, 1)', 'rgba(244, 67, 54, 1)'],
          borderWidth: 2,
        },
      ],
    };

    return this.createChart('doughnut' as any, data);
  }

  /**
   * Generate full manuscript HTML with embedded graphs
   */
  static async generateManuscriptHTML(data: ManuscriptData): Promise<string> {
    let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 20px;
        }
        .container { max-width: 8.5in; margin: 0 auto; }
        h1 { font-size: 24px; margin-top: 20px; margin-bottom: 10px; color: #1a73e8; }
        h2 { font-size: 18px; margin-top: 15px; margin-bottom: 8px; color: #1a73e8; border-bottom: 2px solid #1a73e8; padding-bottom: 5px; }
        h3 { font-size: 14px; margin-top: 12px; color: #333; font-weight: 600; }
        p { margin: 8px 0; }
        .section { margin-bottom: 20px; page-break-inside: avoid; }
        .table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        .table th, .table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        .table th { background-color: #f0f0f0; font-weight: bold; }
        .chart-container { text-align: center; margin: 15px 0; page-break-inside: avoid; }
        .chart-container img { max-width: 100%; height: auto; }
        .stats-box { background-color: #f9f9f9; padding: 10px; border-left: 4px solid #1a73e8; margin: 10px 0; }
        .page-break { page-break-after: always; }
        .footer { margin-top: 30px; font-size: 10px; color: #999; border-top: 1px solid #ddd; padding-top: 10px; }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- Title Page -->
        <div style="text-align: center; padding: 40px 0;">
          <h1 style="font-size: 32px; margin: 0;">${data.title}</h1>
          <p style="font-size: 14px; color: #666; margin-top: 10px;">Research Manuscript Generated from Practice Data</p>
          <p style="font-size: 12px; color: #999; margin-top: 20px;">Generated on ${new Date().toLocaleDateString()}</p>
        </div>

        <div class="page-break"></div>

        <!-- 1. ABSTRACT -->
        <div class="section">
          <h2>Abstract</h2>
          <p><strong>Background:</strong> ${data.condition.description}</p>
          <p><strong>Objective:</strong> To evaluate the effectiveness of ${data.intervention.name} in treating ${data.condition.name}.</p>
          <p><strong>Study Design:</strong> ${data.studyType.replace(/-/g, ' ')} with ${data.population.totalCount} patients.</p>
          <p><strong>Duration:</strong> [Study duration from baseline to final follow-up]</p>
          <p><strong>Main Results:</strong> The study showed an average improvement rate of [calculate from data]. [Key findings from outcomes].</p>
          <p><strong>Conclusion:</strong> This case series provides evidence that ${data.intervention.name} may be effective for ${data.condition.name}. Further controlled studies are recommended.</p>
        </div>

        <div class="page-break"></div>

        <!-- 2. INTRODUCTION -->
        <div class="section">
          <h2>1. Introduction</h2>
          <h3>Background</h3>
          <p>${data.condition.name} is a common condition that requires effective management strategies. Traditional and complementary approaches have shown promise in clinical practice.</p>

          <h3>Current Knowledge Gap</h3>
          <p>While clinical experience suggests the benefit of ${data.intervention.name}, there is limited published evidence documenting its effectiveness. This case series aims to bridge that gap by presenting structured data from real-world practice.</p>

          <h3>Study Objectives</h3>
          <p>The primary objective of this study is to evaluate the effectiveness of ${data.intervention.name} in ${data.population.totalCount} patients with ${data.condition.name}.</p>
        </div>

        <!-- 3. METHODS -->
        <div class="section">
          <h2>2. Methods</h2>

          <h3>Study Design</h3>
          <p>This was a ${data.studyType.replace(/-/g, ' ')} conducted in a clinical practice setting.</p>

          <h3>Patient Population</h3>
          <table class="table">
            <tr>
              <td>Total Patients</td>
              <td>${data.population.totalCount}</td>
            </tr>
            <tr>
              <td>Age Range</td>
              <td>${data.population.ageRange?.min || 'N/A'} - ${data.population.ageRange?.max || 'N/A'} years</td>
            </tr>
            <tr>
              <td>Inclusion Criteria</td>
              <td>${data.population.inclusionCriteria || 'Patients with confirmed ' + data.condition.name}</td>
            </tr>
          </table>

          <h3>Intervention</h3>
          <p><strong>Treatment:</strong> ${data.intervention.name}</p>
          <p><strong>Description:</strong> ${data.intervention.description}</p>
          <p><strong>Protocol:</strong> ${data.intervention.protocol || 'As per clinical judgment and patient response'}</p>
          <p><strong>Duration:</strong> ${data.intervention.duration || 'Ongoing until improvement or maximum 12 months'}</p>
          <p><strong>Frequency:</strong> ${data.intervention.frequency || 'As needed'}</p>

          <h3>Outcome Measures</h3>
          <table class="table">
            <tr>
              <th>Outcome</th>
              <th>Unit</th>
              <th>Measurement Method</th>
              <th>Type</th>
            </tr>
            ${data.outcomes
              .map(
                (o) => `
              <tr>
                <td>${o.name}</td>
                <td>${o.unit || 'N/A'}</td>
                <td>${o.measurementMethod || 'Clinical assessment'}</td>
                <td>${o.type}</td>
              </tr>
            `
              )
              .join('')}
          </table>

          <h3>Data Collection</h3>
          <p>Data were collected at baseline (before treatment) and at follow-up time points. All measurements were performed in a standardized manner.</p>

          <h3>Statistical Analysis</h3>
          <p>Descriptive statistics were calculated for all outcomes. Baseline and endpoint values are presented as mean ± standard deviation. Completion rate and improvement rate are reported as percentages.</p>
        </div>

        <!-- 4. RESULTS -->
        <div class="section">
          <h2>3. Results</h2>

          <h3>Study Cohort</h3>
          <p>A total of ${data.population.totalCount} patients were enrolled in this study. The completion rate was ${data.statistics.completionRate}%.</p>

          <h3>Baseline Characteristics</h3>
          <p>[Baseline demographic summary from patient data]</p>
    `;

    // Add outcome results and charts
    for (const outcome of data.statistics.outcomesStats) {
      html += `
        <h3>${outcome.outcome}</h3>
        <p><strong>Unit of Measurement:</strong> ${outcome.unit || 'N/A'}</p>

        <table class="table">
          <tr>
            <th>Metric</th>
            <th>Baseline</th>
            <th>End Point</th>
          </tr>
          <tr>
            <td>Mean ± SD</td>
            <td>${outcome.baseline?.mean || 'N/A'} ± ${outcome.baseline?.sd || 'N/A'}</td>
            <td>${outcome.endpoint?.mean || 'N/A'} ± ${outcome.endpoint?.sd || 'N/A'}</td>
          </tr>
          <tr>
            <td>n</td>
            <td>${outcome.baseline?.n || 'N/A'}</td>
            <td>${outcome.endpoint?.n || 'N/A'}</td>
          </tr>
        </table>

        <div class="stats-box">
          <p><strong>Improvement Rate:</strong> ${outcome.improvementRate}% of patients showed improvement</p>
          ${outcome.change?.absoluteChange ? `<p><strong>Mean Change:</strong> ${outcome.change.absoluteChange.mean} (${outcome.change.percentageChange?.mean || 0}%)</p>` : ''}
        </div>

        <div class="chart-container">
          <h4>Baseline vs Endpoint Comparison</h4>
          <img src="data:image/png;base64,[CHART_${outcome.outcome.replace(/\s+/g, '_')}]" style="max-width: 500px; height: auto;">
        </div>

        <div class="chart-container">
          <h4>Improvement Rate</h4>
          <img src="data:image/png;base64,[IMPROVEMENT_${outcome.outcome.replace(/\s+/g, '_')}]" style="max-width: 400px; height: auto;">
        </div>
      `;
    }

    html += `
        </div>

        <!-- 5. DISCUSSION -->
        <div class="section">
          <h2>4. Discussion</h2>

          <h3>Main Findings</h3>
          <p>This case series documents the clinical outcomes of ${data.population.totalCount} patients treated with ${data.intervention.name} for ${data.condition.name}. The results show meaningful improvements in the measured outcomes.</p>

          <h3>Clinical Significance</h3>
          <p>The observed improvement rates and magnitude of change suggest that ${data.intervention.name} may be an effective treatment approach for ${data.condition.name}.</p>

          <h3>Comparison with Literature</h3>
          <p>These findings are consistent with emerging evidence for the use of ${data.intervention.name} in treating similar conditions.</p>

          <h3>Limitations</h3>
          <ul>
            <li>This is a case series without a control group, limiting the ability to attribute outcomes solely to the intervention</li>
            <li>Patient selection may have introduced bias</li>
            <li>Follow-up duration was limited to the collection period</li>
            <li>Outcome measures were primarily subjective</li>
          </ul>

          <h3>Safety Considerations</h3>
          <p>Overall, ${data.intervention.name} was well-tolerated in this patient cohort. [Describe any adverse events if present]</p>
        </div>

        <!-- 6. CONCLUSION -->
        <div class="section">
          <h2>5. Conclusion</h2>
          <p>This case series provides descriptive evidence that ${data.intervention.name} may be effective for ${data.condition.name}. The reported improvement rates and outcome changes support further investigation through controlled clinical trials.</p>

          <h3>Recommendations for Future Research</h3>
          <ul>
            <li>Conduct a randomized controlled trial to confirm efficacy</li>
            <li>Standardize outcome measurement methods</li>
            <li>Increase sample size for statistical power</li>
            <li>Extend follow-up period</li>
            <li>Assess long-term safety and sustainability</li>
          </ul>
        </div>

        <!-- 7. REFERENCES -->
        <div class="section">
          <h2>References</h2>
          <ol>
            <li>[Literature references will be added from knowledge base]</li>
            <li>[Curated references relevant to condition and intervention]</li>
            <li>[Best practices and evidence base]</li>
          </ol>
        </div>

        <div class="footer">
          <p>This manuscript was automatically generated from practice data using NexusJournal on ${new Date().toLocaleDateString()}.</p>
          <p>Please review and edit all sections before final submission to a journal.</p>
        </div>
      </div>
    </body>
    </html>
    `;

    return html;
  }

  /**
   * Generate charts and insert into HTML
   */
  static async generateChartsAndInsert(
    html: string,
    statistics: { outcomesStats: OutcomeStats[] }
  ): Promise<string> {
    let finalHTML = html;

    for (const outcome of statistics.outcomesStats) {
      const comparisonChart = await this.createOutcomeComparisonChart(
        outcome.outcome,
        outcome.baseline?.mean || 0,
        outcome.endpoint?.mean || 0,
        outcome.unit
      );

      const improvementChart = await this.createImprovementChart(outcome.improvementRate);

      finalHTML = finalHTML.replace(
        `[CHART_${outcome.outcome.replace(/\s+/g, '_')}]`,
        comparisonChart.replace('data:image/png;base64,', '')
      );

      finalHTML = finalHTML.replace(
        `[IMPROVEMENT_${outcome.outcome.replace(/\s+/g, '_')}]`,
        improvementChart.replace('data:image/png;base64,', '')
      );
    }

    return finalHTML;
  }

  /**
   * Export to PDF
   */
  static async exportToPDF(data: ManuscriptData, filename: string) {
    try {
      // Generate HTML
      let html = await this.generateManuscriptHTML(data);

      // Add charts to HTML
      html = await this.generateChartsAndInsert(html, data.statistics);

      // Convert to PDF
      const element = document.createElement('div');
      element.innerHTML = html;

      const opt = {
        margin: 10,
        filename: filename || 'manuscript.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' },
      };

      html2pdf().set(opt).from(element).save();
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw error;
    }
  }
}

export default PDFGenerator;
