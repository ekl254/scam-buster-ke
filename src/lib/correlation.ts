// Cross-report correlation detection
// Identifies potentially coordinated false reporting

interface ReportMetadata {
  id: string;
  identifier: string;
  reporter_phone_hash?: string | null;
  reporter_ip_hash?: string | null;
  description: string;
  created_at: string;
}

interface CorrelationResult {
  isIndependent: boolean;
  confidence: number; // 0-1, higher = more confident in independence
  flags: string[];
}

// Calculate text similarity using Jaccard index
function calculateTextSimilarity(text1: string, text2: string): number {
  const words1 = new Set(text1.toLowerCase().split(/\s+/).filter(w => w.length > 3));
  const words2 = new Set(text2.toLowerCase().split(/\s+/).filter(w => w.length > 3));

  if (words1.size === 0 || words2.size === 0) return 0;

  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);

  return intersection.size / union.size;
}

// Check if reports were submitted suspiciously close together
function checkTimingCluster(reports: ReportMetadata[], thresholdMinutes: number = 30): boolean {
  if (reports.length < 2) return false;

  const timestamps = reports.map(r => new Date(r.created_at).getTime()).sort((a, b) => a - b);

  for (let i = 1; i < timestamps.length; i++) {
    const diffMinutes = (timestamps[i] - timestamps[i - 1]) / (1000 * 60);
    if (diffMinutes < thresholdMinutes) {
      return true;
    }
  }

  return false;
}

// Detect potentially coordinated reports
export function detectCoordinatedReports(reports: ReportMetadata[]): CorrelationResult {
  const flags: string[] = [];
  let confidence = 1.0;

  if (reports.length < 2) {
    return { isIndependent: true, confidence: 1.0, flags: [] };
  }

  // Check 1: Same reporter phone hash
  const phoneHashes = reports
    .map(r => r.reporter_phone_hash)
    .filter((h): h is string => h !== null && h !== undefined);

  const uniquePhones = new Set(phoneHashes);
  if (phoneHashes.length > 0 && uniquePhones.size < phoneHashes.length) {
    flags.push("same_reporter_phone");
    confidence -= 0.4;
  }

  // Check 2: Same IP address
  const ipHashes = reports
    .map(r => r.reporter_ip_hash)
    .filter((h): h is string => h !== null && h !== undefined);

  const uniqueIPs = new Set(ipHashes);
  if (ipHashes.length > 0 && uniqueIPs.size === 1 && ipHashes.length > 1) {
    flags.push("same_ip_address");
    confidence -= 0.3;
  }

  // Check 3: Reports within short time window
  if (checkTimingCluster(reports, 30)) {
    flags.push("timing_cluster");
    confidence -= 0.2;
  }

  // Check 4: High text similarity between descriptions
  for (let i = 0; i < reports.length; i++) {
    for (let j = i + 1; j < reports.length; j++) {
      const similarity = calculateTextSimilarity(reports[i].description, reports[j].description);
      if (similarity > 0.7) {
        flags.push("similar_descriptions");
        confidence -= 0.3;
        break;
      }
    }
    if (flags.includes("similar_descriptions")) break;
  }

  // Check 5: Pattern of targeting single identifier rapidly
  const targetIdentifier = reports[0].identifier;
  const allSameIdentifier = reports.every(r => r.identifier === targetIdentifier);
  const reportsInLastHour = reports.filter(r => {
    const created = new Date(r.created_at);
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    return created > hourAgo;
  });

  if (allSameIdentifier && reportsInLastHour.length >= 3) {
    flags.push("rapid_targeting");
    confidence -= 0.25;
  }

  return {
    isIndependent: confidence > 0.5 && flags.length <= 1,
    confidence: Math.max(0, confidence),
    flags,
  };
}

// Analyze a new report against existing reports for the same identifier
export function analyzeNewReport(
  newReport: ReportMetadata,
  existingReports: ReportMetadata[]
): {
  isLikelyGenuine: boolean;
  correlationFlags: string[];
  shouldRequireVerification: boolean;
  recommendedTier: 1 | 2;
} {
  // Check correlation with existing reports
  const allReports = [...existingReports, newReport];
  const correlation = detectCoordinatedReports(allReports);

  // Check if this reporter has submitted other reports for different identifiers
  const reporterReportsForOtherIds = existingReports.filter(
    r => r.reporter_phone_hash === newReport.reporter_phone_hash &&
         r.identifier !== newReport.identifier
  );
  const isEstablishedReporter = reporterReportsForOtherIds.length > 0;

  // Determine if likely genuine
  const isLikelyGenuine = correlation.isIndependent || isEstablishedReporter;

  // Recommend tier based on analysis
  let recommendedTier: 1 | 2 = 1;
  if (isLikelyGenuine && existingReports.length >= 1) {
    recommendedTier = 2; // Corroborated
  }

  return {
    isLikelyGenuine,
    correlationFlags: correlation.flags,
    shouldRequireVerification: !correlation.isIndependent || correlation.flags.length > 0,
    recommendedTier,
  };
}

// Count truly independent reports (unique reporters)
export function countIndependentReports(reports: ReportMetadata[]): number {
  const uniqueReporters = new Set<string>();

  for (const report of reports) {
    if (report.reporter_phone_hash) {
      uniqueReporters.add(report.reporter_phone_hash);
    } else if (report.reporter_ip_hash) {
      // Fall back to IP if no phone (less reliable)
      uniqueReporters.add(`ip:${report.reporter_ip_hash}`);
    } else {
      // Completely anonymous - count as separate but with less weight
      uniqueReporters.add(`anon:${report.id}`);
    }
  }

  return uniqueReporters.size;
}

// Generate a summary of report independence for display
export function getIndependenceSummary(reports: ReportMetadata[]): {
  totalReports: number;
  independentReporters: number;
  isHighlyCorrelated: boolean;
  summary: string;
} {
  const totalReports = reports.length;
  const independentReporters = countIndependentReports(reports);
  const correlation = detectCoordinatedReports(reports);

  let summary: string;
  if (totalReports === 0) {
    summary = "No reports found.";
  } else if (totalReports === 1) {
    summary = "Single report, awaiting corroboration from other sources.";
  } else if (correlation.isIndependent) {
    summary = `${independentReporters} independent reporters have submitted concerns.`;
  } else {
    summary = `${totalReports} reports found, but independence could not be fully verified.`;
  }

  return {
    totalReports,
    independentReporters,
    isHighlyCorrelated: !correlation.isIndependent,
    summary,
  };
}
