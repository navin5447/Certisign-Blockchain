import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertTriangle, AlertCircle, CheckCircle, TrendingUp, Eye } from "lucide-react";

interface FraudAnalysisResult {
  certificateId: string;
  riskScore: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  flags: string[];
  details: {
    type: string;
    description: string;
    severity: "low" | "medium" | "high";
    value?: any;
  }[];
}

interface FraudDetectionDashboardProps {
  recentAnalysis: FraudAnalysisResult[];
  onInspect?: (analysis: FraudAnalysisResult) => void;
}

export const FraudDetectionDashboard: React.FC<FraudDetectionDashboardProps> = ({
  recentAnalysis,
  onInspect,
}) => {
  const [selectedAnalysis, setSelectedAnalysis] = useState<FraudAnalysisResult | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const getRiskIcon = (level: string) => {
    switch (level) {
      case "critical":
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      case "high":
        return <AlertCircle className="w-5 h-5 text-orange-600" />;
      case "medium":
        return <TrendingUp className="w-5 h-5 text-yellow-600" />;
      default:
        return <CheckCircle className="w-5 h-5 text-green-600" />;
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case "critical":
        return "bg-red-50 border-red-200";
      case "high":
        return "bg-orange-50 border-orange-200";
      case "medium":
        return "bg-yellow-50 border-yellow-200";
      default:
        return "bg-green-50 border-green-200";
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-red-600";
    if (score >= 60) return "text-orange-600";
    if (score >= 40) return "text-yellow-600";
    return "text-green-600";
  };

  const flagDescriptions: Record<string, string> = {
    suspicious_email: "🚨 Email matches suspicious patterns",
    suspicious_wallet: "🚨 Wallet address is flagged",
    potential_duplicate: "🔄 Potential duplicate certificate",
    unusual_issuance_pattern: "⏰ Unusual timing pattern",
    cgpa_anomaly: "📊 CGPA outside normal range",
    name_similarity_detected: "👥 Similar names detected",
    institution_inconsistency: "🏫 Institution inconsistency",
    unusual_issue_time: "🌙 Issued at unusual hour",
  };

  const criticalCount = recentAnalysis.filter(
    (a) => a.riskLevel === "critical"
  ).length;
  const highCount = recentAnalysis.filter((a) => a.riskLevel === "high").length;
  const averageRisk =
    recentAnalysis.length > 0
      ? (
          recentAnalysis.reduce((sum, a) => sum + a.riskScore, 0) /
          recentAnalysis.length
        ).toFixed(1)
      : "0";

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-red-600">{criticalCount}</p>
              <p className="text-sm text-red-700">Critical Risk</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-orange-600">{highCount}</p>
              <p className="text-sm text-orange-700">High Risk</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="text-center">
              <p className={`text-3xl font-bold ${getScoreColor(parseFloat(averageRisk))}`}>
                {averageRisk}
              </p>
              <p className="text-sm text-blue-700">Average Risk Score</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Fraud Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>🛡️ AI-Powered Fraud Detection</CardTitle>
          <CardDescription>
            Real-time anomaly detection using Isolation Forest algorithm
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentAnalysis.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-600" />
              <p>No suspicious certificates detected</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {recentAnalysis.map((analysis) => (
                <div
                  key={analysis.certificateId}
                  className={`p-4 border rounded-lg ${getRiskColor(analysis.riskLevel)} cursor-pointer hover:shadow-md transition-shadow`}
                  onClick={() => {
                    setSelectedAnalysis(analysis);
                    setShowDetails(true);
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      {getRiskIcon(analysis.riskLevel)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">
                            Certificate #{analysis.certificateId}
                          </span>
                          <Badge
                            className={`capitalize ${
                              analysis.riskLevel === "critical"
                                ? "bg-red-600"
                                : analysis.riskLevel === "high"
                                ? "bg-orange-600"
                                : analysis.riskLevel === "medium"
                                ? "bg-yellow-600"
                                : "bg-green-600"
                            }`}
                          >
                            {analysis.riskLevel}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all ${
                                analysis.riskScore >= 80
                                  ? "bg-red-600"
                                  : analysis.riskScore >= 60
                                  ? "bg-orange-600"
                                  : analysis.riskScore >= 40
                                  ? "bg-yellow-600"
                                  : "bg-green-600"
                              }`}
                              style={{
                                width: `${analysis.riskScore}%`,
                              }}
                            />
                          </div>
                          <span className={`text-sm font-semibold ${getScoreColor(analysis.riskScore)}`}>
                            {analysis.riskScore}/100
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {analysis.flags.slice(0, 3).map((flag) => (
                            <span
                              key={flag}
                              className="text-xs bg-white/60 px-2 py-0.5 rounded"
                            >
                              {flagDescriptions[flag] || flag}
                            </span>
                          ))}
                          {analysis.flags.length > 3 && (
                            <span className="text-xs bg-white/60 px-2 py-0.5 rounded">
                              +{analysis.flags.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedAnalysis(analysis);
                        setShowDetails(true);
                      }}
                      className="ml-2"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>🔍 Fraud Analysis Details</DialogTitle>
            <DialogDescription>
              Certificate #{selectedAnalysis?.certificateId}
            </DialogDescription>
          </DialogHeader>

          {selectedAnalysis && (
            <div className="space-y-4 py-4">
              {/* Risk Score Bar */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Risk Score</span>
                  <span className={`text-2xl font-bold ${getScoreColor(selectedAnalysis.riskScore)}`}>
                    {selectedAnalysis.riskScore}/100
                  </span>
                </div>
                <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      selectedAnalysis.riskScore >= 80
                        ? "bg-red-600"
                        : selectedAnalysis.riskScore >= 60
                        ? "bg-orange-600"
                        : selectedAnalysis.riskScore >= 40
                        ? "bg-yellow-600"
                        : "bg-green-600"
                    }`}
                    style={{
                      width: `${selectedAnalysis.riskScore}%`,
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Risk Level: <Badge className="ml-1">{selectedAnalysis.riskLevel}</Badge>
                </p>
              </div>

              {/* Detected Flags */}
              <div>
                <h3 className="font-semibold mb-2">🚩 Detected Flags ({selectedAnalysis.flags.length})</h3>
                <div className="space-y-2">
                  {selectedAnalysis.flags.map((flag) => (
                    <div key={flag} className="flex items-start gap-2 p-2 bg-red-50 rounded">
                      <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-red-700">
                        {flagDescriptions[flag] || flag}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Detailed Analysis */}
              <div>
                <h3 className="font-semibold mb-2">📊 Detailed Analysis</h3>
                <div className="space-y-3">
                  {selectedAnalysis.details.map((detail, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 rounded border">
                      <div className="flex items-start justify-between mb-1">
                        <span className="font-medium text-sm">{detail.type}</span>
                        <Badge
                          className={`capitalize ${
                            detail.severity === "high"
                              ? "bg-red-600"
                              : detail.severity === "medium"
                              ? "bg-yellow-600"
                              : "bg-blue-600"
                          }`}
                        >
                          {detail.severity}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-600">{detail.description}</p>
                      {detail.value && (
                        <p className="text-xs text-slate-500 mt-1 font-mono">
                          Value: {JSON.stringify(detail.value)}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4 border-t">
                <Button variant="outline" className="flex-1">
                  👁️ Review Certificate
                </Button>
                <Button variant="outline" className="flex-1">
                  ⛔ Block Certificate
                </Button>
                <Button className="flex-1">
                  ✅ Approve
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FraudDetectionDashboard;
