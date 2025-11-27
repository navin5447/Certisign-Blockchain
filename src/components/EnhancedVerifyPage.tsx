import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, CheckCircle, XCircle, Search, FileText, Clock, Link as LinkIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useParams } from "react-router-dom";
import { ethers } from "ethers";

// Your deployed contract configuration
const CONTRACT_CONFIG = {
  address: '0x221a6195d53c9b0acfedd050d42bcdf88e4b79c9',
  rpcUrl: 'https://polygon-amoy.g.alchemy.com/v2/u1kDbEmLdQXSMGfvIhg_2',
  explorerUrl: 'https://amoy.polygonscan.com',
  chainId: 80002,
  chainName: 'Polygon Amoy'
};

const CERTIFICATE_ABI = [
  {
    "inputs": [{"name": "tokenId", "type": "uint256"}],
    "name": "getCertificate",
    "outputs": [
      {
        "components": [
          {"name": "studentName", "type": "string"},
          {"name": "course", "type": "string"},
          {"name": "institution", "type": "string"},
          {"name": "issueDate", "type": "uint256"},
          {"name": "graduationDate", "type": "uint256"},
          {"name": "ipfsHash", "type": "string"},
          {"name": "isRevoked", "type": "bool"}
        ],
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"name": "tokenId", "type": "uint256"}],
    "name": "tokenURI",
    "outputs": [{"name": "", "type": "string"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"name": "tokenId", "type": "uint256"}],
    "name": "ownerOf",
    "outputs": [{"name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  }
];

interface CertificateData {
  tokenId: string;
  studentName: string;
  course: string;
  institution: string;
  issueDate: string;
  graduationDate: string;
  ipfsHash: string;
  isRevoked: boolean;
  owner: string;
  tokenURI: string;
}

const EnhancedVerifyPage = () => {
  const { tokenId: urlTokenId } = useParams();
  const [tokenId, setTokenId] = useState(urlTokenId || "");
  const [isLoading, setIsLoading] = useState(false);
  const [certificate, setCertificate] = useState<CertificateData | null>(null);
  const [error, setError] = useState("");
  const [contract, setContract] = useState<ethers.Contract | null>(null);

  useEffect(() => {
    initializeContract();
  }, []);

  useEffect(() => {
    if (urlTokenId && contract) {
      setTokenId(urlTokenId);
      handleVerify(urlTokenId);
    }
  }, [urlTokenId, contract]);

  const initializeContract = async () => {
    try {
      const provider = new ethers.JsonRpcProvider(CONTRACT_CONFIG.rpcUrl);
      const contractInstance = new ethers.Contract(CONTRACT_CONFIG.address, CERTIFICATE_ABI, provider);
      setContract(contractInstance);
    } catch (error) {
      console.error('Failed to initialize contract:', error);
      setError('Failed to connect to blockchain');
    }
  };

  const handleVerify = async (id: string = tokenId) => {
    if (!id.trim()) {
      toast.error("Please enter a token ID");
      return;
    }

    if (!contract) {
      toast.error("Contract not initialized");
      return;
    }

    setIsLoading(true);
    setError("");
    setCertificate(null);

    try {
      console.log(`Verifying certificate with token ID: ${id}`);
      
      // Get certificate data from the contract
      const certData = await contract.getCertificate(id);
      const tokenURI = await contract.tokenURI(id);
      const owner = await contract.ownerOf(id);

      const certificateInfo: CertificateData = {
        tokenId: id,
        studentName: certData[0],
        course: certData[1],
        institution: certData[2],
        issueDate: new Date(Number(certData[3]) * 1000).toLocaleDateString(),
        graduationDate: new Date(Number(certData[4]) * 1000).toLocaleDateString(),
        ipfsHash: certData[5],
        isRevoked: certData[6],
        owner: owner,
        tokenURI: tokenURI
      };

      setCertificate(certificateInfo);
      
      if (!certificateInfo.isRevoked) {
        toast.success("Certificate verified successfully!");
      } else {
        toast.error("Certificate has been revoked!");
      }

    } catch (error: any) {
      console.error('Verification failed:', error);
      
      if (error.message?.includes('nonexistent token')) {
        setError("Certificate not found. Please check the token ID.");
      } else if (error.message?.includes('execution reverted')) {
        setError("Certificate does not exist or has been removed.");
      } else {
        setError(`Verification failed: ${error.message}`);
      }
      
      toast.error("Certificate verification failed");
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  const openInExplorer = () => {
    if (certificate) {
      const url = `${CONTRACT_CONFIG.explorerUrl}/token/${CONTRACT_CONFIG.address}?a=${certificate.tokenId}`;
      window.open(url, '_blank');
    }
  };

  const getStatusColor = (isRevoked: boolean) => {
    return isRevoked ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800';
  };

  const getStatusIcon = (isRevoked: boolean) => {
    return isRevoked ? 
      <XCircle className="h-5 w-5 text-red-500" /> : 
      <CheckCircle className="h-5 w-5 text-green-500" />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Shield className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">Certificate Verification</h1>
            </div>
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              {CONTRACT_CONFIG.chainName}
            </Badge>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Search Section */}
          <Card className="mb-8 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
              <CardTitle className="flex items-center">
                <Search className="h-6 w-6 mr-2" />
                Verify Certificate
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex flex-col space-y-2">
                  <Label htmlFor="tokenId" className="text-sm font-medium">
                    Token ID
                  </Label>
                  <div className="flex space-x-2">
                    <Input
                      id="tokenId"
                      type="number"
                      placeholder="Enter certificate token ID (e.g., 1, 2, 3...)"
                      value={tokenId}
                      onChange={(e) => setTokenId(e.target.value)}
                      className="flex-1"
                      disabled={isLoading}
                    />
                    <Button 
                      onClick={() => handleVerify()}
                      disabled={isLoading || !tokenId.trim()}
                      className="px-6"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        <>
                          <Search className="h-4 w-4 mr-2" />
                          Verify
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    Enter the certificate token ID to verify its authenticity on the {CONTRACT_CONFIG.chainName} blockchain.
                    Each certificate has a unique token ID starting from 1.
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>

          {/* Error Display */}
          {error && (
            <Alert className="mb-8 border-red-200 bg-red-50">
              <XCircle className="h-4 w-4 text-red-500" />
              <AlertDescription className="text-red-800">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Verification Result */}
          {certificate && (
            <Card className="shadow-lg">
              <CardHeader className={`${getStatusColor(certificate.isRevoked)} border-b`}>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    {getStatusIcon(certificate.isRevoked)}
                    <span className="ml-2">
                      Certificate {certificate.isRevoked ? 'Revoked' : 'Verified'}
                    </span>
                  </div>
                  <Badge variant="outline" className="bg-white">
                    Token #{certificate.tokenId}
                  </Badge>
                </CardTitle>
              </CardHeader>
              
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Certificate Details */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Certificate Details</h3>
                    
                    <div className="space-y-3">
                      <div>
                        <Label className="text-sm font-medium text-gray-600">Student Name</Label>
                        <p className="text-lg font-semibold text-gray-900">{certificate.studentName}</p>
                      </div>
                      
                      <div>
                        <Label className="text-sm font-medium text-gray-600">Course</Label>
                        <p className="text-gray-900">{certificate.course}</p>
                      </div>
                      
                      <div>
                        <Label className="text-sm font-medium text-gray-600">Institution</Label>
                        <p className="text-gray-900">{certificate.institution}</p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium text-gray-600">Issue Date</Label>
                          <p className="text-gray-900 flex items-center">
                            <Clock className="h-4 w-4 mr-1" />
                            {certificate.issueDate}
                          </p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-600">Graduation Date</Label>
                          <p className="text-gray-900 flex items-center">
                            <Clock className="h-4 w-4 mr-1" />
                            {certificate.graduationDate}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Blockchain Details */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Blockchain Details</h3>
                    
                    <div className="space-y-3">
                      <div>
                        <Label className="text-sm font-medium text-gray-600">Owner Address</Label>
                        <div className="flex items-center space-x-2">
                          <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">
                            {certificate.owner.slice(0, 10)}...{certificate.owner.slice(-8)}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(certificate.owner, 'Owner address')}
                          >
                            Copy
                          </Button>
                        </div>
                      </div>
                      
                      <div>
                        <Label className="text-sm font-medium text-gray-600">IPFS Hash</Label>
                        <div className="flex items-center space-x-2">
                          <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">
                            {certificate.ipfsHash.slice(0, 15)}...
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(certificate.ipfsHash, 'IPFS hash')}
                          >
                            Copy
                          </Button>
                        </div>
                      </div>
                      
                      <div>
                        <Label className="text-sm font-medium text-gray-600">Contract Address</Label>
                        <div className="flex items-center space-x-2">
                          <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">
                            {CONTRACT_CONFIG.address.slice(0, 10)}...{CONTRACT_CONFIG.address.slice(-8)}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(CONTRACT_CONFIG.address, 'Contract address')}
                          >
                            Copy
                          </Button>
                        </div>
                      </div>

                      <div>
                        <Label className="text-sm font-medium text-gray-600">Status</Label>
                        <div className="flex items-center space-x-2">
                          <Badge className={getStatusColor(certificate.isRevoked)}>
                            {certificate.isRevoked ? 'Revoked' : 'Valid'}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col space-y-2 pt-4">
                      <Button
                        variant="outline"
                        onClick={openInExplorer}
                        className="flex items-center justify-center"
                      >
                        <LinkIcon className="h-4 w-4 mr-2" />
                        View on Polygonscan
                      </Button>
                      
                      {certificate.tokenURI && (
                        <Button
                          variant="outline"
                          onClick={() => copyToClipboard(certificate.tokenURI, 'Token URI')}
                          className="flex items-center justify-center"
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          Copy Metadata URI
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Info Section */}
          {!certificate && !isLoading && (
            <Card className="shadow-lg">
              <CardContent className="p-8 text-center">
                <Shield className="h-16 w-16 text-blue-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Blockchain Certificate Verification</h2>
                <p className="text-gray-600 mb-6">
                  Verify the authenticity of certificates issued on the {CONTRACT_CONFIG.chainName} blockchain.
                  Each certificate is secured by cryptographic proof and cannot be forged.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                  <div className="text-center">
                    <Shield className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                    <h3 className="font-semibold">Secure</h3>
                    <p className="text-sm text-gray-600">Cryptographically secured on blockchain</p>
                  </div>
                  <div className="text-center">
                    <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                    <h3 className="font-semibold">Verified</h3>
                    <p className="text-sm text-gray-600">Instantly verifiable by anyone</p>
                  </div>
                  <div className="text-center">
                    <FileText className="h-8 w-8 text-purple-500 mx-auto mb-2" />
                    <h3 className="font-semibold">Permanent</h3>
                    <p className="text-sm text-gray-600">Immutably stored forever</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default EnhancedVerifyPage;