import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ExternalLink, Share2, Send, Award, Calendar, GraduationCap, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { nftService, NFTCertificate } from '@/services/nftService';

interface NFTGalleryProps {
  walletAddress?: string;
}

export const NFTGallery: React.FC<NFTGalleryProps> = ({ walletAddress }) => {
  const [nfts, setNfts] = useState<NFTCertificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNFT, setSelectedNFT] = useState<NFTCertificate | null>(null);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [transferAddress, setTransferAddress] = useState('');
  const [transferring, setTransferring] = useState(false);

  useEffect(() => {
    if (walletAddress) {
      loadNFTs();
    }
  }, [walletAddress]);

  const loadNFTs = async () => {
    if (!walletAddress) return;

    setLoading(true);
    try {
      const userNFTs = await nftService.getNFTsByOwner(walletAddress);
      setNfts(userNFTs);
    } catch (error) {
      console.error('Error loading NFTs:', error);
      toast.error('Failed to load NFT certificates');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = (nft: NFTCertificate, platform: 'twitter' | 'linkedin' | 'facebook') => {
    nftService.shareOnSocial(nft, platform);
    toast.success(`Sharing on ${platform}!`);
  };

  const handleTransfer = async () => {
    if (!selectedNFT || !transferAddress) return;

    // Validate Ethereum address
    if (!/^0x[a-fA-F0-9]{40}$/.test(transferAddress)) {
      toast.error('Invalid Ethereum address');
      return;
    }

    setTransferring(true);
    try {
      const txHash = await nftService.transferNFT(selectedNFT.tokenId, transferAddress);
      toast.success('NFT transferred successfully!');
      console.log('Transfer tx:', txHash);
      
      // Refresh NFTs
      await loadNFTs();
      
      setShowTransferDialog(false);
      setTransferAddress('');
      setSelectedNFT(null);
    } catch (error) {
      console.error('Transfer error:', error);
      toast.error('Failed to transfer NFT');
    } finally {
      setTransferring(false);
    }
  };

  if (!walletAddress) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Please connect your wallet to view your NFT certificates
        </AlertDescription>
      </Alert>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your NFT certificates...</p>
        </div>
      </div>
    );
  }

  if (nfts.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Award className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No NFT Certificates Yet</h3>
          <p className="text-muted-foreground mb-4">
            Your minted certificate NFTs will appear here
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">My NFT Certificates</h2>
          <p className="text-muted-foreground">
            {nfts.length} certificate{nfts.length !== 1 ? 's' : ''} in your wallet
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {nfts.map((nft) => (
          <Card key={nft.tokenId} className="overflow-hidden hover:shadow-lg transition-shadow">
            <CardHeader className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950">
              <div className="flex items-start justify-between">
                <Badge variant="secondary" className="mb-2">
                  Token #{nft.tokenId}
                </Badge>
                <Award className="w-8 h-8 text-blue-600" />
              </div>
              <CardTitle className="text-lg">{nft.course}</CardTitle>
              <CardDescription>{nft.institution}</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <GraduationCap className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">{nft.studentName}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>{nft.issueDate}</span>
                </div>
                {nft.grade && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Grade: </span>
                    <span className="font-semibold">{nft.grade}</span>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t space-y-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    if (nft.openseaUrl) {
                      window.open(nft.openseaUrl, '_blank');
                    }
                  }}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View on OpenSea
                </Button>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setSelectedNFT(nft);
                      setShowTransferDialog(true);
                    }}
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Transfer
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedNFT(nft)}
                  >
                    <Share2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Share Dialog */}
      <Dialog open={selectedNFT !== null && !showTransferDialog} onOpenChange={(open) => !open && setSelectedNFT(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Your Certificate NFT</DialogTitle>
            <DialogDescription>
              Show off your achievement on social media
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-semibold mb-2">{selectedNFT?.course}</h4>
              <p className="text-sm text-muted-foreground">{selectedNFT?.institution}</p>
            </div>

            <div className="space-y-2">
              <Button
                className="w-full"
                variant="outline"
                onClick={() => selectedNFT && handleShare(selectedNFT, 'twitter')}
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share on Twitter
              </Button>
              <Button
                className="w-full"
                variant="outline"
                onClick={() => selectedNFT && handleShare(selectedNFT, 'linkedin')}
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share on LinkedIn
              </Button>
              <Button
                className="w-full"
                variant="outline"
                onClick={() => selectedNFT && handleShare(selectedNFT, 'facebook')}
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share on Facebook
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Transfer Dialog */}
      <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer NFT Certificate</DialogTitle>
            <DialogDescription>
              Send this certificate NFT to another wallet address
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This action cannot be undone. Make sure you trust the recipient.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <label className="text-sm font-medium">Recipient Address</label>
              <input
                type="text"
                placeholder="0x..."
                value={transferAddress}
                onChange={(e) => setTransferAddress(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-semibold mb-1">Certificate Details</h4>
              <p className="text-sm text-muted-foreground">
                {selectedNFT?.course} - Token #{selectedNFT?.tokenId}
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                className="flex-1"
                variant="outline"
                onClick={() => {
                  setShowTransferDialog(false);
                  setTransferAddress('');
                }}
                disabled={transferring}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleTransfer}
                disabled={!transferAddress || transferring}
              >
                {transferring ? 'Transferring...' : 'Transfer'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NFTGallery;
