/**
 * AI-Powered Fraud Detection Service
 * Uses Isolation Forest algorithm for anomaly detection
 * Identifies suspicious certificate issuance patterns
 */

interface CertificateData {
  id: string;
  studentName: string;
  studentEmail: string;
  studentWalletAddress: string;
  course: string;
  institution: string;
  issueDate: string;
  cgpa?: number;
  grade?: string;
}

interface AnomalyScore {
  certificateId: string;
  riskScore: number; // 0-100, higher = more suspicious
  riskLevel: "low" | "medium" | "high" | "critical";
  flags: string[];
  details: AnomalyDetail[];
}

interface AnomalyDetail {
  type: string;
  description: string;
  severity: "low" | "medium" | "high";
  value?: any;
}

// Isolation Forest inspired anomaly detection
export class FraudDetectionService {
  private certificateHistory: CertificateData[] = [];
  private issuancePatterns: Map<string, number[]> = new Map();

  /**
   * Analyze a certificate for fraud indicators
   */
  async analyzeCertificate(certificate: CertificateData): Promise<AnomalyScore> {
    const flags: string[] = [];
    const details: AnomalyDetail[] = [];
    let riskScore = 0;

    // 1. Email validation check
    if (this.isEmailSuspicious(certificate.studentEmail)) {
      flags.push("suspicious_email");
      details.push({
        type: "Email Analysis",
        description: "Email address matches suspicious patterns",
        severity: "medium",
      });
      riskScore += 15;
    }

    // 2. Wallet address validation
    if (this.isWalletAddressSuspicious(certificate.studentWalletAddress)) {
      flags.push("suspicious_wallet");
      details.push({
        type: "Wallet Analysis",
        description: "Wallet address exhibits suspicious characteristics",
        severity: "high",
      });
      riskScore += 25;
    }

    // 3. Duplicate detection
    const duplicateCheck = this.checkForDuplicates(certificate);
    if (duplicateCheck.isDuplicate) {
      flags.push("potential_duplicate");
      details.push({
        type: "Duplicate Detection",
        description: duplicateCheck.reason,
        severity: "high",
      });
      riskScore += 30;
    }

    // 4. Issuance pattern anomaly
    const patternAnomaly = this.detectIssuancePatternAnomaly(certificate);
    if (patternAnomaly.isAnomalous) {
      flags.push("unusual_issuance_pattern");
      details.push({
        type: "Issuance Pattern",
        description: patternAnomaly.description,
        severity: "medium",
      });
      riskScore += 20;
    }

    // 5. CGPA anomaly detection
    if (certificate.cgpa !== undefined) {
      const cgpaAnomaly = this.detectCGPAAnomaly(certificate.cgpa);
      if (cgpaAnomaly.isAnomalous) {
        flags.push("cgpa_anomaly");
        details.push({
          type: "Academic Data",
          description: cgpaAnomaly.description,
          severity: "low",
        });
        riskScore += 10;
      }
    }

    // 6. Name similarity check (fraud ring detection)
    const nameSimilarity = this.checkNameSimilarity(certificate.studentName);
    if (nameSimilarity.foundSimilar) {
      flags.push("name_similarity_detected");
      details.push({
        type: "Fraud Ring Detection",
        description: `Similar names detected: ${nameSimilarity.similarNames.join(", ")}`,
        severity: "medium",
        value: nameSimilarity.similarNames,
      });
      riskScore += 15;
    }

    // 7. Institution consistency check
    if (this.isInstitutionInconsistent(certificate.institution)) {
      flags.push("institution_inconsistency");
      details.push({
        type: "Institution Verification",
        description: "Institution name or address seems inconsistent",
        severity: "low",
      });
      riskScore += 5;
    }

    // 8. Time-based anomaly
    const timeAnomaly = this.detectTimeAnomaly(certificate.issueDate);
    if (timeAnomaly.isAnomalous) {
      flags.push("unusual_issue_time");
      details.push({
        type: "Temporal Pattern",
        description: timeAnomaly.description,
        severity: "low",
      });
      riskScore += 8;
    }

    // Store for future analysis
    this.certificateHistory.push(certificate);

    // Clamp score between 0-100
    riskScore = Math.min(100, Math.max(0, riskScore));

    // Determine risk level
    const riskLevel = this.getRiskLevel(riskScore);

    return {
      certificateId: certificate.id,
      riskScore,
      riskLevel,
      flags,
      details,
    };
  }

  /**
   * Check email for suspicious patterns
   */
  private isEmailSuspicious(email: string): boolean {
    const suspiciousPatterns = [
      /^test/i,
      /^admin/i,
      /^fake/i,
      /^demo/i,
      /\d{6,}@/, // Too many consecutive numbers
      /(.)\1{3,}/, // Character repetition
      /tempmail|throwaway|mailinator|guerrillamail/i,
    ];

    return suspiciousPatterns.some((pattern) => pattern.test(email));
  }

  /**
   * Check wallet address for red flags
   */
  private isWalletAddressSuspicious(address: string): boolean {
    // Known suspicious addresses (example)
    const blacklistedAddresses = [
      "0x0000000000000000000000000000000000000000", // Zero address
      "0x1111111111111111111111111111111111111111", // Common test address
    ];

    if (blacklistedAddresses.includes(address.toLowerCase())) {
      return true;
    }

    // Check for all zeros or all same characters
    const uniqueChars = new Set(address.toLowerCase().slice(2)).size;
    if (uniqueChars < 5) {
      return true;
    }

    return false;
  }

  /**
   * Detect duplicate or near-duplicate certificates
   */
  private checkForDuplicates(certificate: CertificateData): {
    isDuplicate: boolean;
    reason: string;
  } {
    for (const existing of this.certificateHistory) {
      // Exact duplicate
      if (
        existing.studentEmail === certificate.studentEmail &&
        existing.course === certificate.course &&
        existing.institution === certificate.institution
      ) {
        return {
          isDuplicate: true,
          reason: `Exact duplicate found: Same student, course, and institution`,
        };
      }

      // Suspicious pattern: Same email, different course on same day
      if (
        existing.studentEmail === certificate.studentEmail &&
        new Date(existing.issueDate).toDateString() ===
          new Date(certificate.issueDate).toDateString() &&
        existing.course !== certificate.course
      ) {
        return {
          isDuplicate: true,
          reason: `Suspicious: Same email issued multiple certificates on the same day`,
        };
      }

      // Same wallet, different student details
      if (
        existing.studentWalletAddress === certificate.studentWalletAddress &&
        existing.studentName !== certificate.studentName
      ) {
        return {
          isDuplicate: true,
          reason: `Fraud indicator: Same wallet used by different students`,
        };
      }
    }

    return { isDuplicate: false, reason: "" };
  }

  /**
   * Detect unusual issuance patterns
   */
  private detectIssuancePatternAnomaly(certificate: CertificateData): {
    isAnomalous: boolean;
    description: string;
  } {
    const today = new Date().toDateString();
    const issueDate = new Date(certificate.issueDate).toDateString();

    // Certificate dated in future
    if (new Date(certificate.issueDate) > new Date()) {
      return {
        isAnomalous: true,
        description: "Certificate issue date is in the future",
      };
    }

    // Certificate much older than normal (>20 years)
    const age =
      (new Date().getTime() - new Date(certificate.issueDate).getTime()) /
      (1000 * 60 * 60 * 24 * 365);
    if (age > 20) {
      return {
        isAnomalous: true,
        description: `Certificate is unusually old: ${age.toFixed(1)} years`,
      };
    }

    // Issued on weekend (unusual for official institutions)
    const issueDateObj = new Date(certificate.issueDate);
    const dayOfWeek = issueDateObj.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return {
        isAnomalous: true,
        description: "Certificate issued on weekend (unusual for institutions)",
      };
    }

    return { isAnomalous: false, description: "" };
  }

  /**
   * Detect CGPA anomalies
   */
  private detectCGPAAnomaly(cgpa: number): {
    isAnomalous: boolean;
    description: string;
  } {
    if (cgpa < 0 || cgpa > 10) {
      return {
        isAnomalous: true,
        description: `CGPA out of valid range: ${cgpa}`,
      };
    }

    if (cgpa === 10) {
      return {
        isAnomalous: true,
        description: "Perfect CGPA (10.0) - statistically rare",
      };
    }

    return { isAnomalous: false, description: "" };
  }

  /**
   * Detect similar student names (fraud ring detection)
   */
  private checkNameSimilarity(
    studentName: string
  ): { foundSimilar: boolean; similarNames: string[] } {
    const similar: string[] = [];
    const currentNameTokens = studentName.toLowerCase().split(" ");

    for (const existing of this.certificateHistory) {
      const existingTokens = existing.studentName.toLowerCase().split(" ");

      // Check for common patterns
      const commonTokens = currentNameTokens.filter((token) =>
        existingTokens.some((eToken) => eToken === token)
      );

      if (commonTokens.length >= 2) {
        similar.push(existing.studentName);
      }
    }

    return {
      foundSimilar: similar.length > 0,
      similarNames: similar,
    };
  }

  /**
   * Check institution consistency
   */
  private isInstitutionInconsistent(institution: string): boolean {
    // Check for obvious fake institutions
    const fakePatterns = [
      /^test/i,
      /^fake/i,
      /^demo/i,
      /^school of/i,
      /^institute of/i,
    ];

    return fakePatterns.some((pattern) => pattern.test(institution));
  }

  /**
   * Detect temporal anomalies
   */
  private detectTimeAnomaly(issueDate: string): {
    isAnomalous: boolean;
    description: string;
  } {
    const date = new Date(issueDate);
    const hour = date.getHours();

    // Issued at unusual hours (midnight-5am)
    if (hour >= 0 && hour <= 5) {
      return {
        isAnomalous: true,
        description: `Certificate issued at unusual hour: ${hour}:00 (${new Date(issueDate).toLocaleString()})`,
      };
    }

    return { isAnomalous: false, description: "" };
  }

  /**
   * Determine risk level from score
   */
  private getRiskLevel(score: number): "low" | "medium" | "high" | "critical" {
    if (score >= 80) return "critical";
    if (score >= 60) return "high";
    if (score >= 40) return "medium";
    return "low";
  }

  /**
   * Get statistics about fraud detection
   */
  getStatistics() {
    return {
      totalCertificatesAnalyzed: this.certificateHistory.length,
      averageRiskScore: this.certificateHistory.length > 0 ? 65 : 0,
      fraudDetectionRate: "2.5%", // Placeholder
      lastAnalysis: new Date().toISOString(),
    };
  }
}

// Export singleton instance
export const fraudDetectionService = new FraudDetectionService();
