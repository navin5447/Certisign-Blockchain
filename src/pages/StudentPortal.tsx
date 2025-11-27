import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Shield, FileText, Download, Eye, Search, Award, QrCode, XCircle, Clock, Link as LinkIcon, LogOut, User, Mail, Chrome } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useWeb3, SUPPORTED_CHAINS } from "@/contexts/Web3Context";
import apiService from "@/services/api";
import { QRVerification } from "@/components/QRVerification";

interface Certificate {
  id: string;
  tokenId: number;
  studentName: string;
  course: string;
  institution: string;
  issueDate: string;
  isRevoked: boolean;
  txHash: string;
  ipfsCid: string;
  verificationCode: string;
  grade?: string;
}

const StudentPortal = () => {
  const navigate = useNavigate();
  const { user, loading, logout, signIn, signUp, signInWithGoogle } = useAuth();
  const { account, currentChainId, connectWallet } = useWeb3();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCertificateForQR, setSelectedCertificateForQR] = useState<Certificate | null>(null);
  const [showQRVerification, setShowQRVerification] = useState(false);
  
  // Login form state
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    displayName: ""
  });

  useEffect(() => {
    if (user && account) {
      loadStudentCertificates();
    }
  }, [user, account]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isSignUp) {
        await signUp(formData.email, formData.password, formData.displayName);
      } else {
        await signIn(formData.email, formData.password);
      }
    } catch (error) {
      // Error handling is done in AuthContext
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      // Error handling is done in AuthContext
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/student');
  };

  const loadStudentCertificates = async () => {
    if (!account) return;

    try {
      setIsLoading(true);
      const response = await apiService.getStudentCertificates(account);
      
      if (response.success) {
        setCertificates(response.data);
      }
    } catch (error: any) {
      console.error('Error loading certificates:', error);
      toast.error('Failed to load certificates');
    } finally {
      setIsLoading(false);
    }
  };

  const downloadCertificate = async (certificate: Certificate) => {
    try {
      const gateway = import.meta.env.VITE_IPFS_GATEWAY || 'https://gateway.pinata.cloud/ipfs/';
      const url = `${gateway}${certificate.ipfsCid}`;
      window.open(url, '_blank');
      toast.success('Certificate opened in new tab');
    } catch (error) {
      toast.error('Failed to download certificate');
    }
  };

  const verifyCertificate = (tokenId: number) => {
    navigate(`/verify/${tokenId}`);
  };

  const openInExplorer = (hash: string) => {
    const chainConfig = SUPPORTED_CHAINS[currentChainId as keyof typeof SUPPORTED_CHAINS];
    if (chainConfig) {
      window.open(`${chainConfig.blockExplorer}/tx/${hash}`, '_blank');
    }
  };

  // Show loading spinner while Firebase checks authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary to-secondary p-3 animate-pulse neon-glow-cyan">
            <Shield className="w-full h-full text-background" />
          </div>
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login screen if not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary to-secondary p-3 mx-auto neon-glow-cyan">
              <Shield className="w-full h-full text-background" />
            </div>
            <div>
              <h1 className="text-3xl font-bold gradient-text-primary">Student Portal</h1>
              <p className="text-muted-foreground mt-2">
                Access your blockchain-verified certificates
              </p>
            </div>
          </div>

          {/* Login/Signup Card */}
          <Card className="glass-panel">
            <CardHeader className="text-center">
              <CardTitle>{isSignUp ? "Create Account" : "Sign In"}</CardTitle>
              <CardDescription>
                {isSignUp 
                  ? "Create your student account to get started"
                  : "Sign in to access your certificates"}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <form onSubmit={handleEmailAuth} className="space-y-4">
                {isSignUp && (
                  <div className="space-y-2">
                    <Label htmlFor="displayName">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="displayName"
                        placeholder="Enter your full name"
                        value={formData.displayName}
                        onChange={(e) => setFormData({...formData, displayName: e.target.value})}
                        className="pl-10"
                        required={isSignUp}
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="student@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder={isSignUp ? "Create a password (min 6 characters)" : "Enter your password"}
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    required
                    minLength={6}
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full"
                  size="lg"
                >
                  {isLoading ? "Please wait..." : (isSignUp ? "Create Account" : "Sign In")}
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
                disabled={isLoading}
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
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="text-primary hover:underline"
                >
                  {isSignUp 
                    ? "Already have an account? Sign in"
                    : "Don't have an account? Sign up"}
                </button>
              </div>

              <div className="pt-4 border-t space-y-2">
                <Button
                  variant="outline"
                  onClick={() => navigate('/')}
                  className="w-full"
                >
                  ← Back to Home
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate('/verify')}
                  className="w-full"
                >
                  Verify Certificate
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Safe certificate filtering - ensure certificates is always an array
  const certsArray = Array.isArray(certificates) ? certificates : [];
  const filteredCertificates = certsArray.filter(cert =>
    cert.course.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cert.institution.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cert.studentName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const validCertificates = certsArray.filter(cert => !cert.isRevoked);
  const revokedCertificates = certsArray.filter(cert => cert.isRevoked);

  // Main dashboard view for authenticated users
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="glass-panel border-b border-white/10 py-6 sticky top-0 z-50">
        <div className="container px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary p-2 neon-glow-cyan">
                <Shield className="w-full h-full text-background" />
              </div>
              <div>
                <span className="text-xl font-bold gradient-text-primary">BlockVerify</span>
                <p className="text-xs text-muted-foreground">Student Portal</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right hidden md:block">
                <p className="font-medium text-sm">{user.displayName || user.email}</p>
                <p className="text-xs text-muted-foreground">
                  {account ? `${account.slice(0, 6)}...${account.slice(-4)}` : 'No wallet connected'}
                </p>
              </div>
              {!account && (
                <Button variant="outline" size="sm" onClick={connectWallet}>
                  Connect Wallet
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => navigate('/verify')}>
                Verify Certificate
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate('/')}>
                Home
              </Button>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Dashboard Header */}
          <div className="text-center space-y-4 animate-fade-in">
            <h1 className="text-3xl md:text-4xl font-bold">
              My <span className="gradient-text-primary">Certificates</span>
            </h1>
            <p className="text-xl text-muted-foreground">
              View and manage your blockchain-verified certificates
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-slide-up">
            <Card className="glass-panel p-6 hover:scale-105 transition-transform">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <Award className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{validCertificates.length}</p>
                  <p className="text-sm text-muted-foreground">Valid Certificates</p>
                </div>
              </div>
            </Card>
            <Card className="glass-panel p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-red-500/20 flex items-center justify-center">
                  <XCircle className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{revokedCertificates.length}</p>
                  <p className="text-sm text-muted-foreground">Revoked</p>
                </div>
              </div>
            </Card>
            <Card className="glass-panel p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{certificates.length}</p>
                  <p className="text-sm text-muted-foreground">Total Certificates</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Search */}
          <Card className="glass-panel p-6">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search certificates by course, institution, or name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button onClick={loadStudentCertificates} disabled={isLoading || !account}>
                {isLoading ? "Loading..." : "Refresh"}
              </Button>
            </div>
          </Card>

          {/* Certificates List */}
          {!account ? (
            <Card className="glass-panel p-12">
              <div className="text-center space-y-4">
                <Shield className="w-16 h-16 text-muted-foreground mx-auto" />
                <h3 className="text-xl font-semibold">Connect Your Wallet</h3>
                <p className="text-muted-foreground">
                  Connect your Web3 wallet to view your certificates
                </p>
                <Button onClick={connectWallet} size="lg">
                  Connect Wallet
                </Button>
              </div>
            </Card>
          ) : isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading certificates...</p>
            </div>
          ) : filteredCertificates.length === 0 ? (
            <Card className="glass-panel p-12">
              <div className="text-center space-y-4">
                <FileText className="w-16 h-16 text-muted-foreground mx-auto" />
                <h3 className="text-xl font-semibold">No Certificates Found</h3>
                <p className="text-muted-foreground">
                  {searchTerm ? 'No certificates match your search.' : 'You haven\'t received any certificates yet.'}
                </p>
              </div>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredCertificates.map((certificate) => (
                <Card key={certificate.id} className="glass-panel">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-4">
                        <div className="flex items-center gap-3">
                          <h3 className="text-xl font-semibold">{certificate.course}</h3>
                          <Badge variant={certificate.isRevoked ? "destructive" : "default"}>
                            {certificate.isRevoked ? "Revoked" : "Valid"}
                          </Badge>
                          {certificate.grade && (
                            <Badge variant="secondary">Grade: {certificate.grade}</Badge>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <Label className="text-muted-foreground">Institution</Label>
                            <p className="font-medium">{certificate.institution}</p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">Issue Date</Label>
                            <p className="font-medium">{new Date(certificate.issueDate).toLocaleDateString()}</p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">Token ID</Label>
                            <p className="font-mono text-sm">{certificate.tokenId}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          <span>Verified on blockchain</span>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-4 p-0"
                            onClick={() => openInExplorer(certificate.txHash)}
                          >
                            <LinkIcon className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 ml-4">
                        <Button
                          size="sm"
                          onClick={() => verifyCertificate(certificate.tokenId)}
                          className="min-w-[100px]"
                        >
                          <Eye className="mr-2 w-4 h-4" />
                          Verify
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => downloadCertificate(certificate)}
                          className="min-w-[100px]"
                        >
                          <Download className="mr-2 w-4 h-4" />
                          Download
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedCertificateForQR(certificate);
                            setShowQRVerification(true);
                          }}
                          className="min-w-[100px] bg-blue-50 hover:bg-blue-100"
                        >
                          <QrCode className="mr-2 w-4 h-4" />
                          QR Code
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            navigator.clipboard.writeText(certificate.verificationCode);
                            toast.success('Verification code copied!');
                          }}
                          className="min-w-[100px]"
                        >
                          <QrCode className="mr-2 w-4 h-4" />
                          Copy Code
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* QR Verification Modal */}
      <QRVerification
        open={showQRVerification}
        onOpenChange={setShowQRVerification}
        certificate={selectedCertificateForQR}
      />
    </div>
  );
};

export default StudentPortal;