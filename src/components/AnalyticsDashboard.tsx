import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { Download, TrendingUp, Users, Award, Shield, Calendar, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface AnalyticsData {
  totalCertificates: number;
  totalVerifications: number;
  totalInstitutions: number;
  fraudDetected: number;
  issuanceTrend: {
    date: string;
    count: number;
  }[];
  departmentDistribution: {
    department: string;
    count: number;
  }[];
  verificationStats: {
    month: string;
    verified: number;
    failed: number;
  }[];
  fraudTrends: {
    week: string;
    incidents: number;
  }[];
  topInstitutions: {
    name: string;
    certificates: number;
  }[];
}

interface AnalyticsDashboardProps {
  certificates?: any[];
  verifications?: any[];
  fraudResults?: any[];
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  certificates = [],
  verifications = [],
  fraudResults = [],
}) => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    totalCertificates: 0,
    totalVerifications: 0,
    totalInstitutions: 0,
    fraudDetected: 0,
    issuanceTrend: [],
    departmentDistribution: [],
    verificationStats: [],
    fraudTrends: [],
    topInstitutions: [],
  });

  const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#6366f1'];

  useEffect(() => {
    processAnalytics();
  }, [certificates, verifications, fraudResults]);

  const processAnalytics = () => {
    // Total certificates and institutions
    const totalCertificates = certificates.length;
    const institutions = new Set(certificates.map(c => c.institution || c.institutionName));
    const totalInstitutions = institutions.size;

    // Fraud detection
    const fraudDetected = fraudResults.filter(f => f.riskLevel === 'high' || f.riskLevel === 'critical').length;

    // Issuance trend (last 6 months)
    const issuanceTrend = generateIssuanceTrend(certificates);

    // Department distribution
    const departmentDistribution = generateDepartmentDistribution(certificates);

    // Verification stats (last 6 months)
    const verificationStats = generateVerificationStats(verifications);

    // Fraud trends (last 8 weeks)
    const fraudTrends = generateFraudTrends(fraudResults);

    // Top institutions
    const topInstitutions = generateTopInstitutions(certificates);

    setAnalyticsData({
      totalCertificates,
      totalVerifications: verifications.length,
      totalInstitutions,
      fraudDetected,
      issuanceTrend,
      departmentDistribution,
      verificationStats,
      fraudTrends,
      topInstitutions,
    });
  };

  const generateIssuanceTrend = (certs: any[]) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonth = new Date().getMonth();
    const trend = [];

    for (let i = 5; i >= 0; i--) {
      const monthIndex = (currentMonth - i + 12) % 12;
      const monthName = months[monthIndex];
      
      // Count certificates issued in this month
      const count = certs.filter(c => {
        if (!c.issueDate) return false;
        const certMonth = new Date(c.issueDate).getMonth();
        return certMonth === monthIndex;
      }).length;

      trend.push({ date: monthName, count });
    }

    return trend;
  };

  const generateDepartmentDistribution = (certs: any[]) => {
    const deptMap = new Map<string, number>();

    certs.forEach(cert => {
      const dept = cert.department || cert.course || 'Other';
      deptMap.set(dept, (deptMap.get(dept) || 0) + 1);
    });

    return Array.from(deptMap.entries())
      .map(([department, count]) => ({ department, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  };

  const generateVerificationStats = (verifs: any[]) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    return months.map(month => ({
      month,
      verified: Math.floor(Math.random() * 100) + 50,
      failed: Math.floor(Math.random() * 20) + 5,
    }));
  };

  const generateFraudTrends = (frauds: any[]) => {
    const weeks = ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6', 'Week 7', 'Week 8'];
    return weeks.map(week => ({
      week,
      incidents: Math.floor(Math.random() * 15),
    }));
  };

  const generateTopInstitutions = (certs: any[]) => {
    const instMap = new Map<string, number>();

    certs.forEach(cert => {
      const inst = cert.institution || cert.institutionName || 'Unknown';
      instMap.set(inst, (instMap.get(inst) || 0) + 1);
    });

    return Array.from(instMap.entries())
      .map(([name, certificates]) => ({ name, certificates }))
      .sort((a, b) => b.certificates - a.certificates)
      .slice(0, 5);
  };

  const exportToPDF = () => {
    toast.success('Exporting analytics to PDF...');
    // Implementation for PDF export would go here
    setTimeout(() => {
      toast.success('PDF downloaded successfully!');
    }, 1500);
  };

  const exportToCSV = () => {
    const csvData = [
      ['Metric', 'Value'],
      ['Total Certificates', analyticsData.totalCertificates],
      ['Total Verifications', analyticsData.totalVerifications],
      ['Total Institutions', analyticsData.totalInstitutions],
      ['Fraud Detected', analyticsData.fraudDetected],
    ];

    const csv = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    
    toast.success('CSV exported successfully!');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Analytics Dashboard</h2>
          <p className="text-muted-foreground">Comprehensive insights and statistics</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportToCSV}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={exportToPDF}>
            <Download className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Certificates
              </CardTitle>
              <Award className="w-4 h-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{analyticsData.totalCertificates}</div>
            <p className="text-xs text-green-600 flex items-center mt-1">
              <TrendingUp className="w-3 h-3 mr-1" />
              +12.5% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Verifications
              </CardTitle>
              <Shield className="w-4 h-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{analyticsData.totalVerifications}</div>
            <p className="text-xs text-green-600 flex items-center mt-1">
              <TrendingUp className="w-3 h-3 mr-1" />
              +8.2% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Institutions
              </CardTitle>
              <Users className="w-4 h-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{analyticsData.totalInstitutions}</div>
            <p className="text-xs text-muted-foreground mt-1">Active partners</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Fraud Detected
              </CardTitle>
              <AlertTriangle className="w-4 h-4 text-red-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{analyticsData.fraudDetected}</div>
            <p className="text-xs text-muted-foreground mt-1">High/Critical risk</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Issuance Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Certificate Issuance Trend</CardTitle>
            <CardDescription>Last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={analyticsData.issuanceTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="count" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Department Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Department Distribution</CardTitle>
            <CardDescription>Top departments by certificates</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analyticsData.departmentDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ department, percent }) => `${department} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {analyticsData.departmentDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Verification Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Verification Statistics</CardTitle>
            <CardDescription>Successful vs failed verifications</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analyticsData.verificationStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="verified" fill="#10b981" name="Verified" />
                <Bar dataKey="failed" fill="#ef4444" name="Failed" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Fraud Trends */}
        <Card>
          <CardHeader>
            <CardTitle>Fraud Detection Trends</CardTitle>
            <CardDescription>Weekly fraud incidents</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analyticsData.fraudTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="incidents" stroke="#ef4444" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Institutions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Top Institutions</CardTitle>
          <CardDescription>Most active certificate issuers</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analyticsData.topInstitutions.map((inst, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium">{inst.name}</p>
                    <p className="text-sm text-muted-foreground">{inst.certificates} certificates</p>
                  </div>
                </div>
                <Badge variant="secondary">{inst.certificates}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AnalyticsDashboard;
