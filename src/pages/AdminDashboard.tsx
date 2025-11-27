import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import { Shield, FileText, CheckCircle, Clock, Users, TrendingUp, Settings, LogOut, Plus, Upload, RefreshCw, QrCode, Copy, ExternalLink, Download, Eye, EyeOff, Mail, Chrome, User, AlertTriangle, BarChart3, Wallet, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import QRCode from "qrcode.react";
import FraudDetectionDashboard from "@/components/FraudDetectionDashboard";
import AnalyticsDashboard from "@/components/AnalyticsDashboard";
import NFTGallery from "@/components/NFTGallery";
import BatchCertificateUpload from "@/components/BatchCertificateUpload";
import { fraudDetectionService } from "@/services/fraudDetection";

// Admin Dashboard Main Component
const AdminDashboardPage = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, logout, signIn, signUp, signInWithGoogle } = useAuth();
  
  // Local auth state for login form
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    displayName: ""
  });
  
  const [stats, setStats] = useState({
    totalCertificates: 0,
    verifiedToday: 0,
    pendingVerification: 0,
    activeUsers: 0,
    percentages: {
      certificates: 0,
      verifications: 0,
      users: 0
    }
  });
  const [recentCertificates, setRecentCertificates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [institutions, setInstitutions] = useState<any[]>([]);
  const [showIssueDialog, setShowIssueDialog] = useState(false);
  const [isIssuing, setIsIssuing] = useState(false);
  const [certificateForm, setCertificateForm] = useState({
    studentName: '',
    studentEmail: '',
    studentWalletAddress: '',
    rollNumber: '',
    course: '',
    specialization: '',
    grade: '',
    cgpa: '',
    issueDate: new Date().toISOString().split('T')[0],
    graduationDate: new Date().toISOString().split('T')[0],
    institutionId: '',
  });
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [emailError, setEmailError] = useState('');
  const [selectedCertificate, setSelectedCertificate] = useState<any>(null);
  const [showCertificateDetails, setShowCertificateDetails] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [fraudResults, setFraudResults] = useState<any[]>([]);
  const [walletAddress, setWalletAddress] = useState('');

  // Load dashboard data when user is authenticated
  useEffect(() => {
    if (user && !authLoading) {
      loadDashboardData();
      loadInstitutions();
    }
  }, [user, authLoading]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    
    // Validate admin email
    if (!formData.email.includes('admin')) {
      setAuthError('Please use an admin email address (must contain "admin")');
      toast.error('Admin email required');
      return;
    }

    setIsAuthLoading(true);

    try {
      if (isSignUp) {
        await signUp(formData.email, formData.password, formData.displayName);
      } else {
        await signIn(formData.email, formData.password);
      }
      // Clear form on success
      setFormData({ email: "", password: "", displayName: "" });
    } catch (error: any) {
      setAuthError(error.message || 'Authentication failed');
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthError('');
    setIsAuthLoading(true);
    try {
      await signInWithGoogle();
    } catch (error: any) {
      setAuthError(error.message || 'Google sign in failed');
    } finally {
      setIsAuthLoading(false);
    }
  };

  // Show loading spinner while Firebase checks authentication
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-primary p-3 animate-pulse shadow-lg">
            <Shield className="w-full h-full text-primary-foreground" />
          </div>
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login if not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-xl bg-primary p-3 mx-auto shadow-lg">
              <Shield className="w-full h-full text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Admin Portal</h1>
              <p className="text-muted-foreground mt-2">
                BlockVerify Administration Dashboard
              </p>
            </div>
          </div>

          {/* Login/Signup Card */}
          <Card className="corporate-card shadow-lg">
            <CardHeader className="text-center">
              <CardTitle>{isSignUp ? "Create Admin Account" : "Admin Sign In"}</CardTitle>
              <CardDescription>
                {isSignUp 
                  ? "Create an admin account to manage certificates"
                  : "Sign in to access the admin dashboard"}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {authError && (
                <div className="p-3 bg-red-100 border border-red-300 text-red-700 rounded-lg text-sm">
                  {authError}
                </div>
              )}
              <form onSubmit={handleEmailAuth} className="space-y-4">
                {isSignUp && (
                  <div className="space-y-2">
                    <Label htmlFor="displayName">Admin Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="displayName"
                        placeholder="Enter your name"
                        value={formData.displayName}
                        onChange={(e) => setFormData({...formData, displayName: e.target.value})}
                        className="corporate-input pl-10"
                        required={isSignUp}
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Admin Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="admin@certisign.com"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="corporate-input pl-10"
                      required
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Email must contain 'admin' for access
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder={isSignUp ? "Create a secure password (min 6 characters)" : "Enter your password"}
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                      className="corporate-input pr-10"
                      required
                      minLength={6}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isAuthLoading}
                  className="corporate-button-primary w-full"
                  size="lg"
                >
                  {isAuthLoading ? "Please wait..." : (isSignUp ? "Create Admin Account" : "Sign In")}
                </Button>
              </form>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
                </div>
              </div>

              <Button
                onClick={handleGoogleSignIn}
                disabled={isAuthLoading}
                variant="outline"
                className="w-full"
                size="lg"
              >
                <Chrome className="mr-2 w-5 h-5" />
                Google
              </Button>

              <div className="text-center text-sm">
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setAuthError('');
                  }}
                  className="text-primary hover:underline"
                >
                  {isSignUp 
                    ? "Already have an admin account? Sign in"
                    : "Need to create an admin account? Sign up"}
                </button>
              </div>

              <div className="pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => navigate('/')}
                  className="corporate-button-secondary w-full"
                >
                  ← Back to Home
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="text-center text-xs text-muted-foreground">
            <p>Authorized personnel only • All activities are logged</p>
          </div>
        </div>
      </div>
    );
  }

  const loadInstitutions = async () => {
    try {
      const response = await fetch('http://localhost:4001/api/institutions', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setInstitutions(data.data || []);
        }
      }
    } catch (error) {
      console.error('Failed to load institutions:', error);
    }
  };

  const loadDashboardData = async () => {
      setIsLoading(true);
      try {
        const token = localStorage.getItem('auth_token');
        
        // Get dashboard stats
        const statsResponse = await fetch('http://localhost:4001/api/dashboard/stats', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
          },
          cache: 'no-store',
        });
        
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          if (statsData.success) {
            // Calculate percentage changes (mock for now, can be enhanced later)
            const newStats = {
              ...statsData.data,
              percentages: {
                certificates: statsData.data.totalCertificates > 0 ? 12 : 0,
                verifications: statsData.data.verifiedToday > 0 ? 8 : 0,
                users: statsData.data.activeUsers > 0 ? 15 : 0
              }
            };
            setStats(newStats);
          }
        }

        // Get recent certificates with timestamp to prevent caching
        const timestamp = new Date().getTime();
        const certsResponse = await fetch(`http://localhost:4001/api/certificates?limit=5&t=${timestamp}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
          },
          cache: 'no-store',
        });
        
        if (certsResponse.ok) {
          const certsData = await certsResponse.json();
          if (certsData.success && certsData.data.certificates) {
            setRecentCertificates(certsData.data.certificates);
          }
        }
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
        setStats({
          totalCertificates: 0,
          verifiedToday: 0,
          pendingVerification: 0,
          activeUsers: 1,
          percentages: {
            certificates: 0,
            verifications: 0,
            users: 0
          }
        });
      } finally {
        setIsLoading(false);
      }
    };

  const handleIssueCertificate = async () => {
    if (!pdfFile) {
      toast.error('Please select a PDF file');
      return;
    }

    if (!certificateForm.institutionId) {
      toast.error('Please select an institution');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(certificateForm.studentEmail)) {
      toast.error('Please enter a valid email address (e.g., student@example.com)');
      return;
    }

    // Validate wallet address format
    const walletRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!walletRegex.test(certificateForm.studentWalletAddress)) {
      toast.error('Please enter a valid Ethereum wallet address (0x... 42 characters)');
      return;
    }

    // Validate required fields
    if (!certificateForm.studentName.trim()) {
      toast.error('Please enter student name');
      return;
    }

    if (!certificateForm.rollNumber.trim()) {
      toast.error('Please enter roll number');
      return;
    }

    if (!certificateForm.course.trim()) {
      toast.error('Please enter course name');
      return;
    }

    // Run fraud detection before issuing
    const fraudAnalysis = await fraudDetectionService.analyzeCertificate({
      id: `temp-${Date.now()}`,
      studentName: certificateForm.studentName,
      studentEmail: certificateForm.studentEmail,
      studentWalletAddress: certificateForm.studentWalletAddress,
      course: certificateForm.course,
      institution: institutions.find(i => i.id === certificateForm.institutionId)?.name || '',
      issueDate: certificateForm.issueDate,
      cgpa: parseFloat(certificateForm.cgpa) || undefined,
      grade: certificateForm.grade || undefined,
    });

    // Add to fraud results
    setFraudResults(prev => [...prev, fraudAnalysis]);

    // Check if fraud risk is too high
    if (fraudAnalysis.riskLevel === 'critical') {
      toast.error(`🚨 CRITICAL FRAUD RISK DETECTED! Score: ${fraudAnalysis.riskScore}/100. Certificate issuance blocked.`);
      setActiveTab('fraud'); // Switch to fraud tab
      return;
    }

    if (fraudAnalysis.riskLevel === 'high') {
      const confirmed = window.confirm(
        `⚠️ HIGH FRAUD RISK DETECTED!\n\nRisk Score: ${fraudAnalysis.riskScore}/100\n\nFlags:\n${fraudAnalysis.flags.join('\n')}\n\nDo you still want to issue this certificate?`
      );
      if (!confirmed) {
        setActiveTab('fraud'); // Switch to fraud tab
        return;
      }
    }

    setIsIssuing(true);
    try {
      const formData = new FormData();
      formData.append('certificatePdf', pdfFile);
      Object.keys(certificateForm).forEach(key => {
        formData.append(key, (certificateForm as any)[key]);
      });

      const response = await fetch('http://localhost:4001/api/issue', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Certificate issued successfully!');
        setShowIssueDialog(false);
        setEmailError('');
        
        // Show the newly issued certificate details
        setSelectedCertificate(data.data.certificate);
        setShowCertificateDetails(true);
        
        // Reset form
        setCertificateForm({
          studentName: '',
          studentEmail: '',
          studentWalletAddress: '',
          rollNumber: '',
          course: '',
          specialization: '',
          grade: '',
          cgpa: '',
          issueDate: new Date().toISOString().split('T')[0],
          graduationDate: new Date().toISOString().split('T')[0],
          institutionId: '',
        });
        setPdfFile(null);
        // Reload dashboard data
        loadDashboardData();
      } else {
        // Show detailed validation errors if available
        if (data.details && Array.isArray(data.details)) {
          const errorMessages = data.details.map((err: any) => `${err.path}: ${err.msg}`).join(', ');
          toast.error(`Validation Error: ${errorMessages}`);
        } else {
          toast.error(data.error || 'Failed to issue certificate');
        }
      }
    } catch (error: any) {
      console.error('Issue certificate error:', error);
      toast.error('Failed to issue certificate. Please check your connection.');
    } finally {
      setIsIssuing(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      // Reset all states
      setFormData({ email: "", password: "", displayName: "" });
      setAuthError('');
      setCertificateForm({
        studentName: '',
        studentEmail: '',
        studentWalletAddress: '',
        rollNumber: '',
        course: '',
        specialization: '',
        grade: '',
        cgpa: '',
        issueDate: new Date().toISOString().split('T')[0],
        graduationDate: new Date().toISOString().split('T')[0],
        institutionId: '',
      });
      setPdfFile(null);
      setRecentCertificates([]);
      toast.success("Logged out successfully");
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Logout failed');
    }
  };

  return (
    <div className="min-h-screen bg-muted/20">
      {/* Header */}
      <header className="corporate-topbar px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary p-2 shadow-md">
              <Shield className="w-full h-full text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">BlockVerify Admin</h1>
              <p className="text-sm text-muted-foreground">Welcome back, {user.displayName || user.email}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost"
              onClick={() => navigate('/')}
              className="hover:bg-muted"
            >
              <Shield className="w-4 h-4 mr-2" />
              Main Page
            </Button>
            <Button 
              onClick={() => setShowIssueDialog(true)}
              className="corporate-button-primary"
            >
              <Plus className="w-4 h-4 mr-2" />
              Issue Certificate
            </Button>
            <Button variant="ghost" className="hover:bg-muted">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
            <Button variant="ghost" onClick={handleLogout} className="hover:bg-muted text-red-600 hover:text-red-700">
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6 pt-20">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 lg:w-auto">
            <TabsTrigger value="overview" className="gap-2">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="fraud" className="gap-2">
              <AlertTriangle className="w-4 h-4" />
              <span className="hidden sm:inline">Fraud Detection</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Analytics</span>
            </TabsTrigger>
            <TabsTrigger value="nfts" className="gap-2">
              <Wallet className="w-4 h-4" />
              <span className="hidden sm:inline">NFT Gallery</span>
            </TabsTrigger>
            <TabsTrigger value="batch" className="gap-2">
              <UploadCloud className="w-4 h-4" />
              <span className="hidden sm:inline">Batch Upload</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in">
          <Card className="corporate-card">
            <CardContent className="p-6">
              {isLoading ? (
                <div className="animate-pulse">
                  <div className="h-4 bg-muted rounded w-24 mb-2"></div>
                  <div className="h-8 bg-muted rounded w-16"></div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Certificates</p>
                      <p className="text-3xl font-bold text-foreground">{stats.totalCertificates.toLocaleString()}</p>
                    </div>
                    <FileText className="w-8 h-8 text-primary" />
                  </div>
                  <div className="flex items-center mt-2">
                    <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
                    <span className="text-sm text-green-600">
                      {stats.percentages.certificates > 0 ? `+${stats.percentages.certificates}% from last month` : 'No change'}
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="corporate-card">
            <CardContent className="p-6">
              {isLoading ? (
                <div className="animate-pulse">
                  <div className="h-4 bg-muted rounded w-24 mb-2"></div>
                  <div className="h-8 bg-muted rounded w-16"></div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Verified Today</p>
                      <p className="text-3xl font-bold text-foreground">{stats.verifiedToday}</p>
                    </div>
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <div className="flex items-center mt-2">
                    <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
                    <span className="text-sm text-green-600">
                      {stats.percentages.verifications > 0 ? `+${stats.percentages.verifications}% from yesterday` : 'No change'}
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="corporate-card">
            <CardContent className="p-6">
              {isLoading ? (
                <div className="animate-pulse">
                  <div className="h-4 bg-muted rounded w-24 mb-2"></div>
                  <div className="h-8 bg-muted rounded w-16"></div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Pending Verification</p>
                      <p className="text-3xl font-bold text-foreground">{stats.pendingVerification}</p>
                    </div>
                    <Clock className="w-8 h-8 text-yellow-600" />
                  </div>
                  <div className="flex items-center mt-2">
                    <span className="text-sm text-yellow-600">Requires attention</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="corporate-card">
            <CardContent className="p-6">
              {isLoading ? (
                <div className="animate-pulse">
                  <div className="h-4 bg-muted rounded w-24 mb-2"></div>
                  <div className="h-8 bg-muted rounded w-16"></div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Active Users</p>
                      <p className="text-3xl font-bold text-foreground">{stats.activeUsers}</p>
                    </div>
                    <Users className="w-8 h-8 text-blue-600" />
                  </div>
                  <div className="flex items-center mt-2">
                    <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
                    <span className="text-sm text-green-600">
                      {stats.percentages.users > 0 ? `+${stats.percentages.users}% from last week` : 'No change'}
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Certificates */}
        <Card className="corporate-card animate-slide-up">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-foreground">Recent Certificates</CardTitle>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => loadDashboardData()}
              disabled={isLoading}
              className="hover:bg-muted"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse flex items-center gap-4 p-4">
                    <div className="w-10 h-10 bg-muted rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-muted rounded w-32 mb-2"></div>
                      <div className="h-3 bg-muted rounded w-48"></div>
                    </div>
                    <div className="h-6 bg-muted rounded w-16"></div>
                  </div>
                ))}
              </div>
            ) : recentCertificates.length > 0 ? (
              <div className="space-y-4">
                {recentCertificates.map((cert: any) => (
                  <div 
                    key={cert.id} 
                    className="flex items-center justify-between p-4 border border-border rounded-xl hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => {
                      setSelectedCertificate(cert);
                      setShowCertificateDetails(true);
                    }}
                  >
                    <div className="flex items-center gap-4">
                      <Avatar>
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {cert.studentName?.split(' ').map((n: string) => n[0]).join('') || 'NA'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-foreground">{cert.course || 'Certificate'}</p>
                        <p className="text-sm text-muted-foreground">Issued to {cert.studentName || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground mt-1">Token ID: {cert.tokenId || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge 
                        className={cert.status === 'issued' ? 'status-success' : cert.status === 'pending' ? 'status-warning' : 'status-info'}
                      >
                        {cert.status}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(cert.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No certificates issued yet</p>
                <p className="text-sm mt-1">Start by issuing your first certificate</p>
              </div>
            )}
          </CardContent>
        </Card>
          </TabsContent>

          {/* Fraud Detection Tab */}
          <TabsContent value="fraud" className="space-y-6">
            <FraudDetectionDashboard 
              recentAnalysis={fraudResults}
              onInspect={(cert) => {
                console.log('Inspecting certificate:', cert);
                toast.info('Certificate inspection feature coming soon');
              }}
            />
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <AnalyticsDashboard 
              certificates={recentCertificates}
              verifications={[]}
              fraudResults={fraudResults}
            />
          </TabsContent>

          {/* NFT Gallery Tab */}
          <TabsContent value="nfts" className="space-y-6">
            <div className="mb-4">
              <Label htmlFor="walletAddress">Enter Wallet Address to View NFTs</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  id="walletAddress"
                  placeholder="0x..."
                  value={walletAddress}
                  onChange={(e) => setWalletAddress(e.target.value)}
                  className="corporate-input"
                />
                <Button onClick={() => {
                  if (walletAddress) {
                    toast.success('Loading NFTs...');
                  } else {
                    toast.error('Please enter a wallet address');
                  }
                }}>
                  Load NFTs
                </Button>
              </div>
            </div>
            <NFTGallery walletAddress={walletAddress} />
          </TabsContent>

          {/* Batch Upload Tab */}
          <TabsContent value="batch" className="space-y-6">
            <BatchCertificateUpload />
          </TabsContent>
        </Tabs>
      </main>

      {/* Issue Certificate Dialog */}
      <Dialog open={showIssueDialog} onOpenChange={(open) => {
        setShowIssueDialog(open);
        if (!open) {
          setEmailError('');
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Issue New Certificate</DialogTitle>
            <DialogDescription>
              Fill in the certificate details and upload the PDF document
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="studentName">Student Name *</Label>
                <Input
                  id="studentName"
                  value={certificateForm.studentName}
                  onChange={(e) => setCertificateForm({...certificateForm, studentName: e.target.value})}
                  placeholder="John Doe"
                  className="corporate-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="studentEmail">Student Email *</Label>
                <Input
                  id="studentEmail"
                  type="email"
                  value={certificateForm.studentEmail}
                  onChange={(e) => {
                    setCertificateForm({...certificateForm, studentEmail: e.target.value});
                    // Validate email on change
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (e.target.value && !emailRegex.test(e.target.value)) {
                      setEmailError('Please enter a valid email address');
                    } else {
                      setEmailError('');
                    }
                  }}
                  placeholder="student@example.com"
                  className={`corporate-input ${emailError ? 'border-red-500' : ''}`}
                />
                {emailError && (
                  <p className="text-xs text-red-600">{emailError}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="studentWalletAddress">Student Wallet Address *</Label>
                <Input
                  id="studentWalletAddress"
                  value={certificateForm.studentWalletAddress}
                  onChange={(e) => setCertificateForm({...certificateForm, studentWalletAddress: e.target.value})}
                  placeholder="0x..."
                  className="corporate-input"
                />
                <p className="text-xs text-muted-foreground">Ethereum wallet address for NFT certificate</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rollNumber">Roll Number *</Label>
                <Input
                  id="rollNumber"
                  value={certificateForm.rollNumber}
                  onChange={(e) => setCertificateForm({...certificateForm, rollNumber: e.target.value})}
                  placeholder="CS2021001"
                  className="corporate-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="course">Course *</Label>
                <Input
                  id="course"
                  value={certificateForm.course}
                  onChange={(e) => setCertificateForm({...certificateForm, course: e.target.value})}
                  placeholder="Bachelor of Science"
                  className="corporate-input"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="specialization">Specialization</Label>
                <Input
                  id="specialization"
                  value={certificateForm.specialization}
                  onChange={(e) => setCertificateForm({...certificateForm, specialization: e.target.value})}
                  placeholder="Computer Science"
                  className="corporate-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="grade">Grade</Label>
                <Input
                  id="grade"
                  value={certificateForm.grade}
                  onChange={(e) => setCertificateForm({...certificateForm, grade: e.target.value})}
                  placeholder="A+"
                  className="corporate-input"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cgpa">CGPA</Label>
                <Input
                  id="cgpa"
                  type="number"
                  step="0.01"
                  value={certificateForm.cgpa}
                  onChange={(e) => setCertificateForm({...certificateForm, cgpa: e.target.value})}
                  placeholder="9.5"
                  className="corporate-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="institutionId">Institution *</Label>
                <Select
                  value={certificateForm.institutionId}
                  onValueChange={(value) => setCertificateForm({...certificateForm, institutionId: value})}
                >
                  <SelectTrigger className="corporate-input">
                    <SelectValue placeholder="Select institution" />
                  </SelectTrigger>
                  <SelectContent>
                    {institutions.map((inst) => (
                      <SelectItem key={inst.id} value={inst.id}>
                        {inst.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="issueDate">Issue Date *</Label>
                <Input
                  id="issueDate"
                  type="date"
                  value={certificateForm.issueDate}
                  onChange={(e) => setCertificateForm({...certificateForm, issueDate: e.target.value})}
                  className="corporate-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="graduationDate">Graduation Date *</Label>
                <Input
                  id="graduationDate"
                  type="date"
                  value={certificateForm.graduationDate}
                  onChange={(e) => setCertificateForm({...certificateForm, graduationDate: e.target.value})}
                  className="corporate-input"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pdfFile">Certificate PDF *</Label>
              <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary transition-colors cursor-pointer">
                <Input
                  id="pdfFile"
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
                <label htmlFor="pdfFile" className="cursor-pointer">
                  <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm font-medium">
                    {pdfFile ? pdfFile.name : 'Click to upload PDF'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PDF file up to 10MB
                  </p>
                </label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowIssueDialog(false);
                setEmailError('');
              }}
              disabled={isIssuing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleIssueCertificate}
              disabled={isIssuing}
              className="corporate-button-primary"
            >
              {isIssuing ? 'Issuing...' : 'Issue Certificate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Certificate Details Dialog */}
      <Dialog open={showCertificateDetails} onOpenChange={setShowCertificateDetails}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Certificate Details</DialogTitle>
            <DialogDescription>
              View complete certificate information and verification details
            </DialogDescription>
          </DialogHeader>

          {selectedCertificate && (
            <div className="space-y-6 py-4">
              {/* QR Code Section */}
              <div className="flex justify-center p-6 bg-muted/30 rounded-xl">
                <div className="text-center">
                  <div className="bg-white p-4 rounded-xl inline-block shadow-md">
                    <QRCode
                      value={`${window.location.origin}/verify/${selectedCertificate.tokenId}`}
                      size={200}
                      level="H"
                      includeMargin={true}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground mt-3">
                    Scan to verify certificate
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Token ID: {selectedCertificate.tokenId}
                  </p>
                </div>
              </div>

              {/* Certificate Information */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Token ID</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      value={selectedCertificate.tokenId || 'N/A'}
                      readOnly
                      className="corporate-input"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(selectedCertificate.tokenId);
                        toast.success('Token ID copied!');
                      }}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-muted-foreground">Verification Code</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      value={selectedCertificate.verificationCode || 'N/A'}
                      readOnly
                      className="corporate-input"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(selectedCertificate.verificationCode);
                        toast.success('Code copied!');
                      }}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-muted-foreground">Student Name</Label>
                  <Input
                    value={selectedCertificate.studentName}
                    readOnly
                    className="corporate-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-muted-foreground">Student Email</Label>
                  <Input
                    value={selectedCertificate.studentEmail}
                    readOnly
                    className="corporate-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-muted-foreground">Roll Number</Label>
                  <Input
                    value={selectedCertificate.rollNumber}
                    readOnly
                    className="corporate-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-muted-foreground">Course</Label>
                  <Input
                    value={selectedCertificate.course}
                    readOnly
                    className="corporate-input"
                  />
                </div>

                {selectedCertificate.specialization && (
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Specialization</Label>
                    <Input
                      value={selectedCertificate.specialization}
                      readOnly
                      className="corporate-input"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-muted-foreground">Status</Label>
                  <div>
                    <Badge className={selectedCertificate.status === 'issued' ? 'status-success' : selectedCertificate.status === 'pending' ? 'status-warning' : 'status-info'}>
                      {selectedCertificate.status}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-muted-foreground">Issue Date</Label>
                  <Input
                    value={new Date(selectedCertificate.issueDate).toLocaleDateString()}
                    readOnly
                    className="corporate-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-muted-foreground">Created At</Label>
                  <Input
                    value={new Date(selectedCertificate.createdAt).toLocaleString()}
                    readOnly
                    className="corporate-input"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t">
                <Button
                  onClick={() => window.open(`/verify/${selectedCertificate.tokenId}`, '_blank')}
                  className="flex-1"
                  variant="outline"
                >
                  <ExternalLink className="mr-2 w-4 h-4" />
                  Verify on Portal
                </Button>
                {selectedCertificate.pdfIpfsCid && (
                  <Button
                    onClick={() => window.open(`https://gateway.pinata.cloud/ipfs/${selectedCertificate.pdfIpfsCid}`, '_blank')}
                    className="flex-1"
                    variant="outline"
                  >
                    <Download className="mr-2 w-4 h-4" />
                    Download PDF
                  </Button>
                )}
                <Button
                  onClick={() => {
                    const verifyUrl = `${window.location.origin}/verify/${selectedCertificate.tokenId}`;
                    navigator.clipboard.writeText(verifyUrl);
                    toast.success('Verification link copied!');
                  }}
                  className="flex-1"
                >
                  <QrCode className="mr-2 w-4 h-4" />
                  Copy Link
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboardPage;
