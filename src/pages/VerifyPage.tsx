import React, { useState, useEffect, useRef } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, CheckCircle, XCircle, Search, QrCode, FileText, Clock, Link as LinkIcon, Loader2, AlertTriangle, Camera, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { useParams, useNavigate } from "react-router-dom";
import { useWeb3, CONTRACT_CONFIG, SUPPORTED_CHAINS } from "@/contexts/Web3Context";
import apiService from "@/services/api";
import * as confetti from 'canvas-confetti';
import { Html5Qrcode } from "html5-qrcode";

interface VerificationResult {
  certificate: {
    id: string;
    tokenId: string;
    studentName: string;
    studentEmail: string;
    rollNumber: string;
    course: string;
    specialization?: string;
    grade?: string;
    cgpa?: string;
    issueDate: string;
    graduationDate: string;
    verificationCode: string;
    status: string;
    isRevoked: boolean;
    revokedAt?: string;
    revokedReason?: string;
    institution: {
      id: string;
      name: string;
      code: string;
      email?: string;
      website?: string;
    } | null;
    ipfs: {
      metadataCid?: string;
      pdfCid?: string;
      metadataUrl?: string;
      pdfUrl?: string;
      metadata?: any;
    };
    blockchain: {
      exists: boolean;
      owner?: string;
      isRevoked: boolean;
      metadataURI?: string;
    } | null;
  };
  verification: {
    isValid: boolean;
    verifiedAt: string;
    verificationMethod: string;
    blockchainVerified: boolean;
    ipfsVerified: boolean;
  };
}

const VerifyPage = () => {
  const { tokenId: urlTokenId } = useParams();
  const navigate = useNavigate();
  const { provider, currentChainId } = useWeb3();
  
  const [tokenId, setTokenId] = useState(urlTokenId || "");
  const [verificationCode, setVerificationCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [verificationMethod, setVerificationMethod] = useState<'token' | 'code'>('token');
  const [showAIScan, setShowAIScan] = useState(false);
  const [aiScanResult, setAiScanResult] = useState<any>(null);
  const [showQrScanner, setShowQrScanner] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const qrScannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (urlTokenId) {
      handleVerify();
    }
  }, [urlTokenId]);

  const handleVerify = async () => {
    if (!tokenId && !verificationCode) {
      toast.error('Please enter a Token ID or Verification Code');
      return;
    }

    setIsLoading(true);
    setVerificationResult(null);

    try {
      let response;
      
      if (verificationMethod === 'token' && tokenId) {
        response = await apiService.verifyCertificate(parseInt(tokenId));
      } else if (verificationMethod === 'code' && verificationCode) {
        response = await apiService.verifyCertificateByCode(verificationCode);
      } else {
        throw new Error('Invalid verification method');
      }

      if (response.success) {
        setVerificationResult(response.data);
        
        // Trigger confetti if certificate is valid and not revoked
        if (response.data.verification?.isValid && !response.data.certificate.isRevoked) {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
          });
        }
        
        toast.success('Verification completed');
      }
    } catch (error: any) {
      console.error('Verification error:', error);
      toast.error(error.response?.data?.error || 'Verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  // QR Scanner Functions
  const startCameraScanner = async () => {
    try {
      setIsScanning(true);
      setShowQrScanner(true);
      
      const html5QrCode = new Html5Qrcode("qr-reader");
      qrScannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
        (decodedText) => {
          // QR code detected
          handleQrCodeScan(decodedText);
          stopScanner();
        },
        (errorMessage) => {
          // Scan error (not always an error, just no QR code detected)
        }
      );
    } catch (error: any) {
      console.error('Camera scanner error:', error);
      toast.error('Failed to start camera scanner');
      setShowQrScanner(false);
      setIsScanning(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsLoading(true);
      const html5QrCode = new Html5Qrcode("qr-reader-file");
      
      const decodedText = await html5QrCode.scanFile(file, true);
      handleQrCodeScan(decodedText);
    } catch (error: any) {
      console.error('File scan error:', error);
      toast.error('No QR code found in image');
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleQrCodeScan = (decodedText: string) => {
    // Extract token ID from URL or use directly
    let extractedTokenId = decodedText;
    
    // If it's a URL, extract the token ID
    if (decodedText.includes('/verify/')) {
      const parts = decodedText.split('/verify/');
      extractedTokenId = parts[1] || decodedText;
    }
    
    // If it's a verification code
    if (extractedTokenId.startsWith('BV-')) {
      setVerificationMethod('code');
      setVerificationCode(extractedTokenId);
    } else {
      setVerificationMethod('token');
      setTokenId(extractedTokenId);
    }
    
    toast.success('QR Code scanned successfully!');
    
    // Auto-verify after scanning
    setTimeout(() => {
      handleVerify();
    }, 500);
  };

  const stopScanner = async () => {
    if (qrScannerRef.current) {
      try {
        await qrScannerRef.current.stop();
        qrScannerRef.current.clear();
      } catch (error) {
        console.error('Error stopping scanner:', error);
      }
    }
    setShowQrScanner(false);
    setIsScanning(false);
  };

  useEffect(() => {
    return () => {
      // Cleanup scanner on component unmount
      if (qrScannerRef.current) {
        qrScannerRef.current.stop().catch(console.error);
      }
    };
  }, []);

  const handleAIScan = async () => {
    setIsLoading(true);
    try {
      const response = await apiService.scanCertificate(
        verificationResult?.certificate,
        null // image data would go here
      );
      
      if (response.success) {
        setAiScanResult(response.data);
        toast.success('AI scan completed');
      }
    } catch (error: any) {
      console.error('AI scan error:', error);
      toast.error(error.response?.data?.error || 'AI scan failed');
    } finally {
      setIsLoading(false);
    }
  };

  const openInExplorer = (hash: string) => {
    const chainConfig = SUPPORTED_CHAINS[currentChainId as keyof typeof SUPPORTED_CHAINS];
    if (chainConfig) {
      window.open(`${chainConfig.blockExplorer}/tx/${hash}`, '_blank');
    }
  };

  const openIpfsLink = (cid: string) => {
    const gateway = import.meta.env.VITE_IPFS_GATEWAY || 'https://gateway.pinata.cloud/ipfs/';
    window.open(`${gateway}${cid}`, '_blank');
  };

  const renderVerificationStatus = () => {
    if (!verificationResult) return null;

    const { certificate, verification } = verificationResult;
    
    if (!verification.isValid || certificate.isRevoked) {
      return (
        <Alert className="border-red-500 bg-red-50 dark:bg-red-950">
          <XCircle className="h-4 w-4 text-red-500" />
          <AlertDescription className="text-red-700 dark:text-red-300">
            <strong>Invalid Certificate</strong>
            <br />
            {certificate.isRevoked ? 
              `This certificate has been revoked${certificate.revokedReason ? `: ${certificate.revokedReason}` : ''}.` :
              'This certificate could not be verified. It may be fake or tampered with.'
            }
          </AlertDescription>
        </Alert>
      );
    }

    return (
      <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
        <CheckCircle className="h-4 w-4 text-green-500" />
        <AlertDescription className="text-green-700 dark:text-green-300">
          <strong>✅ Valid Certificate</strong>
          <br />
          This certificate is authentic and verified {verification.blockchainVerified ? 'on the blockchain' : 'in the system'}.
        </AlertDescription>
      </Alert>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="glass-panel border-b border-white/10 py-6">
        <div className="container px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary p-2 neon-glow-cyan">
                <Shield className="w-full h-full text-background" />
              </div>
              <span className="text-xl font-bold gradient-text-primary">BlockVerify</span>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => navigate('/')}>
                Main Page
              </Button>
              <Button variant="outline" onClick={() => navigate('/student')}>
                Student Portal
              </Button>
              <Button variant="outline" onClick={() => navigate('/admin')}>
                Admin Dashboard
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container px-4 py-12">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Title */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold">
              Verify <span className="gradient-text-primary">Certificate</span>
            </h1>
            <p className="text-xl text-muted-foreground">
              Instant blockchain verification — enter token ID or verification code
            </p>
          </div>

          {/* Verification Method Selection */}
          <Card className="glass-panel p-6">
            <div className="flex gap-4 mb-6">
              <Button 
                variant={verificationMethod === 'token' ? 'default' : 'outline'}
                onClick={() => setVerificationMethod('token')}
                className="flex-1"
              >
                <Shield className="mr-2 w-4 h-4" />
                Token ID
              </Button>
              <Button 
                variant={verificationMethod === 'code' ? 'default' : 'outline'}
                onClick={() => setVerificationMethod('code')}
                className="flex-1"
              >
                <QrCode className="mr-2 w-4 h-4" />
                Verification Code
              </Button>
            </div>

            {/* QR Scanner Buttons */}
            <div className="flex gap-4 mb-6">
              <Button
                variant="outline"
                onClick={startCameraScanner}
                disabled={isScanning}
                className="flex-1"
              >
                <Camera className="mr-2 w-4 h-4" />
                Scan with Camera
              </Button>
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                className="flex-1"
              >
                <Upload className="mr-2 w-4 h-4" />
                Upload QR Image
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            {/* QR Scanner View */}
            {showQrScanner && (
              <div className="mb-6 relative">
                <div className="flex justify-between items-center mb-2">
                  <Label>Camera Scanner</Label>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={stopScanner}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <div id="qr-reader" className="w-full rounded-lg overflow-hidden border-2 border-primary"></div>
              </div>
            )}
            
            {/* Hidden div for file scanning */}
            <div id="qr-reader-file" className="hidden"></div>

            <div className="space-y-4">
              {verificationMethod === 'token' ? (
                <div className="space-y-2">
                  <Label htmlFor="tokenId">Token ID</Label>
                  <div className="flex gap-4">
                    <Input
                      id="tokenId"
                      placeholder="Enter Token ID (e.g., 123)"
                      value={tokenId}
                      onChange={(e) => setTokenId(e.target.value)}
                      className="flex-1"
                      type="number"
                    />
                    <Button onClick={handleVerify} disabled={isLoading || !tokenId}>
                      {isLoading ? (
                        <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                      ) : (
                        <Search className="mr-2 w-4 h-4" />
                      )}
                      Verify
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="verificationCode">Verification Code</Label>
                  <div className="flex gap-4">
                    <Input
                      id="verificationCode"
                      placeholder="Enter verification code"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      className="flex-1"
                    />
                    <Button onClick={handleVerify} disabled={isLoading || !verificationCode}>
                      {isLoading ? (
                        <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                      ) : (
                        <Search className="mr-2 w-4 h-4" />
                      )}
                      Verify
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Verification Result */}
          {verificationResult && (
            <div className="space-y-6">
              {renderVerificationStatus()}

              {/* Certificate Details */}
              <Card className="glass-panel">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Certificate Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Student Name</Label>
                      <p className="text-lg font-semibold">{verificationResult.certificate.studentName}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Course</Label>
                      <p className="text-lg">{verificationResult.certificate.course}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Institution</Label>
                      <p className="text-lg">{verificationResult.certificate.institution?.name || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Issue Date</Label>
                      <p className="text-lg">{new Date(verificationResult.certificate.issueDate).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Token ID</Label>
                      <p className="text-lg font-mono">{verificationResult.certificate.tokenId}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                      <Badge variant={verificationResult.certificate.isRevoked ? "destructive" : "default"}>
                        {verificationResult.certificate.isRevoked ? "Revoked" : verificationResult.certificate.status}
                      </Badge>
                    </div>
                    {verificationResult.certificate.rollNumber && (
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Roll Number</Label>
                        <p className="text-lg">{verificationResult.certificate.rollNumber}</p>
                      </div>
                    )}
                    {verificationResult.certificate.specialization && (
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Specialization</Label>
                        <p className="text-lg">{verificationResult.certificate.specialization}</p>
                      </div>
                    )}
                    {verificationResult.certificate.grade && (
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Grade</Label>
                        <p className="text-lg">{verificationResult.certificate.grade}</p>
                      </div>
                    )}
                    {verificationResult.certificate.cgpa && (
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">CGPA</Label>
                        <p className="text-lg">{verificationResult.certificate.cgpa}</p>
                      </div>
                    )}
                  </div>

                  {/* Download PDF Button */}
                  {verificationResult.certificate.ipfs.pdfUrl && (
                    <div className="pt-4 border-t">
                      <Button
                        onClick={() => window.open(verificationResult.certificate.ipfs.pdfUrl, '_blank')}
                        className="w-full"
                        variant="outline"
                      >
                        <FileText className="mr-2 w-4 h-4" />
                        Download Certificate PDF
                      </Button>
                    </div>
                  )}

                  {/* Blockchain Info */}
                  {verificationResult.certificate.blockchain && (
                    <div className="border-t pt-4">
                      <h3 className="text-lg font-semibold mb-3">Blockchain Verification</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Blockchain Status</Label>
                          <Badge variant={verificationResult.certificate.blockchain.exists ? "default" : "secondary"}>
                            {verificationResult.certificate.blockchain.exists ? "✅ Verified" : "⏳ Pending"}
                          </Badge>
                        </div>
                        {verificationResult.certificate.blockchain.owner && (
                          <div>
                            <Label className="text-sm font-medium text-muted-foreground">Owner Address</Label>
                            <p className="text-sm font-mono truncate">{verificationResult.certificate.blockchain.owner}</p>
                          </div>
                        )}
                        {verificationResult.certificate.ipfs.metadataCid && (
                          <div>
                            <Label className="text-sm font-medium text-muted-foreground">IPFS Metadata</Label>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-mono truncate">{verificationResult.certificate.ipfs.metadataCid}</p>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => window.open(verificationResult.certificate.ipfs.metadataUrl, '_blank')}
                              >
                                <LinkIcon className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        )}
                        {verificationResult.certificate.ipfs.pdfCid && (
                          <div>
                            <Label className="text-sm font-medium text-muted-foreground">IPFS Document</Label>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-mono truncate">{verificationResult.certificate.ipfs.pdfCid}</p>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => window.open(verificationResult.certificate.ipfs.pdfUrl, '_blank')}
                              >
                                <LinkIcon className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* AI Scan Section */}
                  {import.meta.env.VITE_ENABLE_AI_SCAN === 'true' && (
                    <div className="border-t pt-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-semibold">AI Fraud Detection</h3>
                        <Button onClick={handleAIScan} disabled={isLoading} size="sm">
                          {isLoading ? (
                            <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                          ) : (
                            <Shield className="mr-2 w-4 h-4" />
                          )}
                          Run AI Scan
                        </Button>
                      </div>

                      {aiScanResult && (
                        <Alert className={aiScanResult.fraudDetected ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-950" : "border-green-500 bg-green-50 dark:bg-green-950"}>
                          {aiScanResult.fraudDetected ? (
                            <AlertTriangle className="h-4 w-4 text-yellow-500" />
                          ) : (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          )}
                          <AlertDescription>
                            <strong>AI Analysis Result</strong>
                            <br />
                            Fraud Score: {aiScanResult.analysisResults.fraudScore}% ({aiScanResult.analysisResults.riskLevel} risk)
                            <br />
                            Confidence: {aiScanResult.analysisResults.confidence}%
                            <br />
                            {aiScanResult.recommendation}
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Instructions */}
          <Card className="glass-panel p-6">
            <h2 className="text-xl font-semibold mb-4">How to Verify</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
              <div className="space-y-2">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-primary font-bold">1</span>
                </div>
                <h3 className="font-semibold">Get Token ID</h3>
                <p className="text-muted-foreground">
                  Find the Token ID or verification code on your certificate document.
                </p>
              </div>
              <div className="space-y-2">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-primary font-bold">2</span>
                </div>
                <h3 className="font-semibold">Enter & Verify</h3>
                <p className="text-muted-foreground">
                  Input the ID above and click verify for instant blockchain validation.
                </p>
              </div>
              <div className="space-y-2">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-primary font-bold">3</span>
                </div>
                <h3 className="font-semibold">View Results</h3>
                <p className="text-muted-foreground">
                  Get instant verification results with full certificate details.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default VerifyPage;