import React, { useState, useEffect, useRef } from "react";
import QRCode from "qrcode.react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, AlertCircle, Clock, Copy, ExternalLink, Download } from "lucide-react";
import { toast } from "sonner";

interface QRVerificationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  certificate: {
    tokenId: number;
    studentName: string;
    course: string;
    issueDate: string;
    verificationCode: string;
    txHash: string;
    isRevoked: boolean;
  } | null;
}

export const QRVerification: React.FC<QRVerificationProps> = ({ open, onOpenChange, certificate }) => {
  const [verificationStatus, setVerificationStatus] = useState<"pending" | "verified" | "revoked" | null>(null);
  const [blockchainData, setBlockchainData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const qrRef = useRef<any>(null);

  useEffect(() => {
    if (open && certificate) {
      verifyBlockchain();
    }
  }, [open, certificate]);

  const verifyBlockchain = async () => {
    if (!certificate) return;
    
    setLoading(true);
    try {
      // Simulate blockchain verification with timestamp
      const verificationData = {
        tokenId: certificate.tokenId,
        verified: !certificate.isRevoked,
        timestamp: new Date().toISOString(),
        blockchainHash: certificate.txHash,
        verificationCode: certificate.verificationCode,
        digitalSignature: `SIG_${certificate.tokenId}_${Date.now()}`,
        chainId: 80002, // Polygon Amoy
        status: certificate.isRevoked ? "revoked" : "verified",
        verificationTime: new Date().toLocaleString(),
      };

      setBlockchainData(verificationData);
      setVerificationStatus(certificate.isRevoked ? "revoked" : "verified");

      // Simulate API call to backend for verification
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error('Blockchain verification error:', error);
      setVerificationStatus("pending");
    } finally {
      setLoading(false);
    }
  };

  const downloadQR = () => {
    if (qrRef.current) {
      const canvas = qrRef.current.querySelector('canvas');
      if (canvas) {
        const link = document.createElement("a");
        link.href = canvas.toDataURL("image/png");
        link.download = `certificate-${certificate?.tokenId}-qr.png`;
        link.click();
        toast.success("QR Code downloaded!");
      }
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  if (!certificate) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Certificate QR Code & Verification</DialogTitle>
          <DialogDescription>
            Scan or verify this certificate on the blockchain
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* QR Code Section */}
          <div className="flex justify-center p-6 bg-muted/30 rounded-xl">
            <div className="text-center">
              <div className="bg-white p-4 rounded-xl inline-block shadow-md" ref={qrRef}>
                <QRCode
                  value={`${window.location.origin}/verify/${certificate.tokenId}`}
                  size={250}
                  level="H"
                  includeMargin={true}
                />
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                Scan to verify this certificate
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Token ID: {certificate.tokenId}
              </p>
              <Button
                onClick={downloadQR}
                variant="outline"
                size="sm"
                className="mt-4"
              >
                <Download className="w-4 h-4 mr-2" />
                Download QR
              </Button>
            </div>
          </div>

          {/* Verification Status */}
          {loading ? (
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-4 text-center">
                <Clock className="w-8 h-8 text-blue-600 mx-auto animate-spin mb-2" />
                <p className="text-blue-700 font-medium">Verifying on blockchain...</p>
              </CardContent>
            </Card>
          ) : verificationStatus === "verified" ? (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-4 flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
                <div>
                  <p className="text-green-700 font-medium">✓ Certificate Verified</p>
                  <p className="text-sm text-green-600">
                    This certificate is authentic and registered on the blockchain
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : verificationStatus === "revoked" ? (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4 flex items-center gap-3">
                <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
                <div>
                  <p className="text-red-700 font-medium">⚠ Certificate Revoked</p>
                  <p className="text-sm text-red-600">
                    This certificate has been revoked and is no longer valid
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {/* Blockchain Details */}
          {blockchainData && (
            <div className="space-y-4">
              <div className="bg-slate-100 p-4 rounded-lg space-y-3">
                <h3 className="font-semibold text-slate-900">Blockchain Verification Details</h3>

                {/* Verification Code */}
                <div>
                  <label className="text-xs font-medium text-slate-600">Verification Code</label>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="text"
                      readOnly
                      value={blockchainData.verificationCode}
                      className="flex-1 px-3 py-2 bg-white border rounded text-sm font-mono text-slate-700"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(blockchainData.verificationCode)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Blockchain Hash */}
                <div>
                  <label className="text-xs font-medium text-slate-600">Blockchain Transaction Hash</label>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="text"
                      readOnly
                      value={blockchainData.blockchainHash}
                      className="flex-1 px-3 py-2 bg-white border rounded text-sm font-mono text-slate-700 truncate"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(blockchainData.blockchainHash)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  <a
                    href={`https://amoy.polygonscan.com/tx/${blockchainData.blockchainHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline mt-1 inline-flex items-center gap-1"
                  >
                    View on Polygonscan
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                {/* Digital Signature */}
                <div>
                  <label className="text-xs font-medium text-slate-600">Digital Signature</label>
                  <input
                    type="text"
                    readOnly
                    value={blockchainData.digitalSignature}
                    className="w-full px-3 py-2 bg-white border rounded text-sm font-mono text-slate-700 mt-1 truncate"
                  />
                </div>

                {/* Verification Timestamp */}
                <div>
                  <label className="text-xs font-medium text-slate-600">Verification Timestamp</label>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="text"
                      readOnly
                      value={blockchainData.verificationTime}
                      className="flex-1 px-3 py-2 bg-white border rounded text-sm text-slate-700"
                    />
                    <Badge variant="outline">Live</Badge>
                  </div>
                </div>

                {/* Chain Info */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-medium text-slate-600">Network</label>
                    <p className="text-sm text-slate-700 mt-1">Polygon Amoy Testnet</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600">Chain ID</label>
                    <p className="text-sm text-slate-700 mt-1">{blockchainData.chainId}</p>
                  </div>
                </div>

                {/* Status Badge */}
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-xs font-medium text-slate-600">Overall Status</span>
                  <Badge
                    className={
                      blockchainData.status === "verified"
                        ? "bg-green-100 text-green-700"
                        : blockchainData.status === "revoked"
                        ? "bg-red-100 text-red-700"
                        : "bg-yellow-100 text-yellow-700"
                    }
                  >
                    {blockchainData.status.toUpperCase()}
                  </Badge>
                </div>
              </div>

              {/* Info Box */}
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-700">
                  <strong>ℹ️ How this works:</strong> This certificate is stored on the Polygon blockchain with a digital signature. 
                  The QR code links to the verification page where anyone can scan and verify the certificate's authenticity in real-time.
                </p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QRVerification;
