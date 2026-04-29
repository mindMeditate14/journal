/**
 * Statistical Analysis Service for Practice Data
 * Performs calculations for basic research metrics
 */

class StatisticsService {
  /**
   * Calculate basic statistics (mean, median, std dev, min, max)
   */
  static calculateBasicStats(values) {
    if (!values || values.length === 0) return null;

    // Remove null/undefined values
    const validValues = values.filter((v) => v !== null && v !== undefined && !isNaN(v)).map(Number);
    if (validValues.length === 0) return null;

    const sorted = [...validValues].sort((a, b) => a - b);
    const n = sorted.length;

    // Mean
    const mean = validValues.reduce((a, b) => a + b, 0) / n;

    // Median
    const median = n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[Math.floor(n / 2)];

    // Standard Deviation
    const variance = validValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
    const sd = Math.sqrt(variance);

    // Min and Max
    const min = Math.min(...validValues);
    const max = Math.max(...validValues);

    return {
      mean: parseFloat(mean.toFixed(2)),
      median: parseFloat(median.toFixed(2)),
      sd: parseFloat(sd.toFixed(2)),
      min: parseFloat(min.toFixed(2)),
      max: parseFloat(max.toFixed(2)),
      n: validValues.length,
    };
  }

  /**
   * Calculate percentage change from baseline to endpoint
   */
  static calculatePercentageChange(baseline, endpoint) {
    if (baseline === 0) return null;
    return parseFloat((((endpoint - baseline) / Math.abs(baseline)) * 100).toFixed(2));
  }

  /**
   * Calculate improvement rate (% of patients with improvement)
   * Improvement = endpoint value > baseline value for positive outcomes
   */
  static calculateImprovementRate(patientData, outcomeName, isPositive = true) {
    if (!patientData || patientData.length === 0) return 0;

    let improved = 0;

    for (const patient of patientData) {
      if (!patient.baselineData || !patient.baselineData[outcomeName]) continue;
      if (!patient.timePointData || patient.timePointData.length === 0) continue;

      const baseline = patient.baselineData[outcomeName];
      const lastTimePoint = patient.timePointData[patient.timePointData.length - 1];
      const endpoint = lastTimePoint.measurements?.[outcomeName];

      if (endpoint === undefined || endpoint === null) continue;

      // For positive outcomes, improvement = endpoint > baseline
      // For negative outcomes, improvement = endpoint < baseline
      const isImproved = isPositive ? endpoint > baseline : endpoint < baseline;
      if (isImproved) improved++;
    }

    const completedCount = patientData.filter((p) => p.completed).length;
    return completedCount > 0 ? parseFloat(((improved / completedCount) * 100).toFixed(2)) : 0;
  }

  /**
   * Perform paired t-test (for before-after comparison)
   * Returns t-statistic and p-value
   */
  static pairedTTest(beforeValues, afterValues) {
    if (beforeValues.length !== afterValues.length || beforeValues.length < 2) {
      return null;
    }

    // Calculate differences
    const differences = beforeValues.map((b, i) => afterValues[i] - b);

    // Calculate mean and SD of differences
    const meanDiff = differences.reduce((a, b) => a + b, 0) / differences.length;
    const sdDiff = Math.sqrt(
      differences.reduce((sum, diff) => sum + Math.pow(diff - meanDiff, 2), 0) / differences.length
    );

    // Calculate t-statistic
    const n = differences.length;
    const tStatistic = (meanDiff / (sdDiff / Math.sqrt(n))).toFixed(3);

    // Approximate p-value (simplified, for full p-value use statistical library)
    // This is a rough estimate using degrees of freedom
    const pValue = this.estimatePValue(Math.abs(parseFloat(tStatistic)), n - 1);

    return {
      tStatistic: parseFloat(tStatistic),
      pValue,
      meanDifference: parseFloat(meanDiff.toFixed(2)),
      sdDifference: parseFloat(sdDiff.toFixed(2)),
      n,
    };
  }

  /**
   * Rough p-value estimation (for demonstration)
   * For production, use a proper statistical library like simple-statistics
   */
  static estimatePValue(tStat, df) {
    // Simplified critical value lookup
    const criticalValues = {
      1: 6.314,
      2: 2.92,
      3: 2.353,
      4: 2.132,
      5: 2.015,
      10: 1.812,
      20: 1.725,
      30: 1.697,
      1000: 1.645,
    };

    let closestDf = 1000;
    for (const key of Object.keys(criticalValues).map(Number).sort((a, b) => a - b)) {
      if (key <= df) closestDf = key;
      else break;
    }

    const critical = criticalValues[closestDf];

    if (tStat < critical) return 0.05;
    if (tStat < critical * 1.5) return 0.01;
    return 0.001;
  }

  /**
   * Calculate confidence interval (95% CI)
   */
  static confidenceInterval95(mean, sd, n) {
    if (n < 2) return null;

    // t-value for 95% CI with n-1 degrees of freedom
    // Simplified: use ~1.96 for large samples, ~2.0 for small
    const tValue = n > 30 ? 1.96 : 2.0;
    const marginOfError = tValue * (sd / Math.sqrt(n));

    return {
      lower: parseFloat((mean - marginOfError).toFixed(2)),
      upper: parseFloat((mean + marginOfError).toFixed(2)),
    };
  }

  /**
   * Analyze all outcomes for a practice dataset
   */
  static analyzeOutcomes(practiceData) {
    const analysis = [];

    for (const outcome of practiceData.outcomes) {
      const outcomeName = outcome.name;

      // Collect baseline and endpoint values
      const baselineValues = [];
      const endpointValues = [];
      const completedPatients = [];

      for (const patient of practiceData.patientData) {
        if (!patient.completed) continue;

        const baseline = patient.baselineData?.[outcomeName];
        if (baseline === undefined || baseline === null) continue;

        baselineValues.push(baseline);
        completedPatients.push(patient);

        // Get endpoint (last measurement)
        if (patient.timePointData && patient.timePointData.length > 0) {
          const lastMeasurement = patient.timePointData[patient.timePointData.length - 1];
          const endpoint = lastMeasurement.measurements?.[outcomeName];
          if (endpoint !== undefined && endpoint !== null) {
            endpointValues.push(endpoint);
          }
        }
      }

      if (baselineValues.length === 0) continue;

      // Calculate statistics
      const baselineStats = this.calculateBasicStats(baselineValues);
      const endpointStats = this.calculateBasicStats(endpointValues);

      let changeStats = null;
      if (endpointValues.length > 0) {
        const changes = baselineValues.map((b, i) => endpointValues[i] - b);
        changeStats = {
          absoluteChange: this.calculateBasicStats(changes),
        };

        // Percentage changes
        const percentChanges = baselineValues.map((b, i) => this.calculatePercentageChange(b, endpointValues[i]));
        changeStats.percentageChange = this.calculateBasicStats(percentChanges);

        // Paired t-test
        if (baselineValues.length >= 2) {
          changeStats.pairedTTest = this.pairedTTest(baselineValues, endpointValues);
        }

        // Confidence interval for mean change
        if (changeStats.absoluteChange && baselineValues.length > 1) {
          changeStats.confidenceInterval = this.confidenceInterval95(
            changeStats.absoluteChange.mean,
            changeStats.absoluteChange.sd,
            baselineValues.length
          );
        }
      }

      // Improvement rate
      const improvementRate = this.calculateImprovementRate(
        completedPatients,
        outcomeName,
        outcome.type !== 'categorical' // Assume higher is better for numeric
      );

      analysis.push({
        outcome: outcomeName,
        unit: outcome.unit,
        baseline: baselineStats,
        endpoint: endpointStats,
        change: changeStats,
        improvementRate,
      });
    }

    return analysis;
  }

  /**
   * Calculate completion rate
   */
  static calculateCompletionRate(patientData) {
    if (patientData.length === 0) return 0;
    const completed = patientData.filter((p) => p.completed).length;
    return parseFloat(((completed / patientData.length) * 100).toFixed(2));
  }

  /**
   * Analyze adverse events
   */
  static analyzeAdverseEvents(practiceData) {
    const analysis = {
      totalEvents: 0,
      eventsPerPatient: 0,
      severityBreakdown: {
        mild: 0,
        moderate: 0,
        severe: 0,
      },
      commonEvents: {},
    };

    let totalCount = 0;
    for (const event of practiceData.adverseEvents || []) {
      totalCount += event.count || 1;
      analysis.severityBreakdown[event.severity]++;

      if (!analysis.commonEvents[event.event]) {
        analysis.commonEvents[event.event] = 0;
      }
      analysis.commonEvents[event.event] += event.count || 1;
    }

    // Also count events from patient records
    for (const patient of practiceData.patientData || []) {
      totalCount += patient.adverseEvents?.length || 0;
    }

    analysis.totalEvents = totalCount;
    const completedCount = (practiceData.patientData || []).filter((p) => p.completed).length;
    analysis.eventsPerPatient = completedCount > 0 ? parseFloat((totalCount / completedCount).toFixed(2)) : 0;

    return analysis;
  }
}

export default StatisticsService;
