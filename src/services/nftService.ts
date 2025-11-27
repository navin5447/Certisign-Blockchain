import { ethers } from 'ethers';

// NFT Metadata structure following OpenSea standards
export interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  attributes: {
    trait_type: string;
    value: string | number;
  }[];
  external_url?: string;
}

// NFT Certificate data
export interface NFTCertificate {
  tokenId: number;
  studentName: string;
  course: string;
  institution: string;
  issueDate: string;
  grade?: string;
  txHash: string;
  metadataUri: string;
  ownerAddress: string;
  mintedAt: string;
  openseaUrl?: string;
}

class NFTService {
  private contractAddress: string = import.meta.env.VITE_NFT_CONTRACT_ADDRESS || '';
  private ipfsGateway: string = 'https://gateway.pinata.cloud/ipfs/';

  /**
   * Generate OpenSea-compatible metadata for a certificate
   */
  generateMetadata(certificate: {
    studentName: string;
    course: string;
    institution: string;
    issueDate: string;
    grade?: string;
    cgpa?: string;
    verificationCode: string;
  }): NFTMetadata {
    return {
      name: `${certificate.course} Certificate - ${certificate.studentName}`,
      description: `Official academic certificate issued by ${certificate.institution} to ${certificate.studentName} for completing ${certificate.course}.`,
      image: `${this.ipfsGateway}QmYourCertificateImageHash`, // Replace with actual IPFS hash
      attributes: [
        {
          trait_type: 'Student Name',
          value: certificate.studentName,
        },
        {
          trait_type: 'Course',
          value: certificate.course,
        },
        {
          trait_type: 'Institution',
          value: certificate.institution,
        },
        {
          trait_type: 'Issue Date',
          value: certificate.issueDate,
        },
        {
          trait_type: 'Grade',
          value: certificate.grade || 'N/A',
        },
        {
          trait_type: 'CGPA',
          value: certificate.cgpa || 'N/A',
        },
        {
          trait_type: 'Verification Code',
          value: certificate.verificationCode,
        },
        {
          trait_type: 'Certificate Type',
          value: 'Academic',
        },
      ],
      external_url: `${window.location.origin}/verify/${certificate.verificationCode}`,
    };
  }

  /**
   * Upload metadata to IPFS via Pinata
   */
  async uploadMetadataToIPFS(metadata: NFTMetadata): Promise<string> {
    try {
      const pinataApiKey = import.meta.env.VITE_PINATA_API_KEY;
      const pinataSecretKey = import.meta.env.VITE_PINATA_SECRET_KEY;

      if (!pinataApiKey || !pinataSecretKey) {
        throw new Error('Pinata API keys not configured');
      }

      const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          pinata_api_key: pinataApiKey,
          pinata_secret_api_key: pinataSecretKey,
        },
        body: JSON.stringify({
          pinataContent: metadata,
          pinataMetadata: {
            name: `${metadata.name}-metadata.json`,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to upload metadata to IPFS');
      }

      const data = await response.json();
      return `ipfs://${data.IpfsHash}`;
    } catch (error) {
      console.error('IPFS upload error:', error);
      throw error;
    }
  }

  /**
   * Mint NFT certificate on Polygon blockchain
   */
  async mintCertificateNFT(
    certificate: {
      studentName: string;
      course: string;
      institution: string;
      issueDate: string;
      grade?: string;
      cgpa?: string;
      verificationCode: string;
    },
    recipientAddress: string
  ): Promise<{ tokenId: number; txHash: string; metadataUri: string }> {
    try {
      // Check if MetaMask is installed
      if (!window.ethereum) {
        throw new Error('MetaMask is not installed');
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // Generate and upload metadata
      const metadata = this.generateMetadata(certificate);
      const metadataUri = await this.uploadMetadataToIPFS(metadata);

      // NFT Contract ABI (ERC-721 with minting function)
      const contractABI = [
        'function mintCertificate(address to, string memory tokenURI) public returns (uint256)',
        'function tokenCounter() public view returns (uint256)',
        'event CertificateMinted(address indexed to, uint256 indexed tokenId, string tokenURI)',
      ];

      const contract = new ethers.Contract(this.contractAddress, contractABI, signer);

      // Get next token ID
      const tokenId = await contract.tokenCounter();

      // Mint NFT
      const tx = await contract.mintCertificate(recipientAddress, metadataUri);
      const receipt = await tx.wait();

      console.log('NFT minted successfully:', receipt);

      return {
        tokenId: Number(tokenId),
        txHash: receipt.hash,
        metadataUri,
      };
    } catch (error) {
      console.error('NFT minting error:', error);
      throw error;
    }
  }

  /**
   * Get NFT certificates owned by an address
   */
  async getNFTsByOwner(ownerAddress: string): Promise<NFTCertificate[]> {
    try {
      if (!window.ethereum) {
        throw new Error('MetaMask is not installed');
      }

      const provider = new ethers.BrowserProvider(window.ethereum);

      const contractABI = [
        'function balanceOf(address owner) public view returns (uint256)',
        'function tokenOfOwnerByIndex(address owner, uint256 index) public view returns (uint256)',
        'function tokenURI(uint256 tokenId) public view returns (string)',
        'function ownerOf(uint256 tokenId) public view returns (address)',
      ];

      const contract = new ethers.Contract(this.contractAddress, contractABI, provider);

      // Get number of NFTs owned
      const balance = await contract.balanceOf(ownerAddress);
      const nfts: NFTCertificate[] = [];

      // Fetch each NFT
      for (let i = 0; i < Number(balance); i++) {
        const tokenId = await contract.tokenOfOwnerByIndex(ownerAddress, i);
        const tokenURI = await contract.tokenURI(tokenId);

        // Fetch metadata from IPFS
        const metadataUrl = tokenURI.replace('ipfs://', this.ipfsGateway);
        const metadataResponse = await fetch(metadataUrl);
        const metadata: NFTMetadata = await metadataResponse.json();

        // Parse attributes
        const attributes = metadata.attributes.reduce((acc, attr) => {
          acc[attr.trait_type] = attr.value;
          return acc;
        }, {} as Record<string, string | number>);

        nfts.push({
          tokenId: Number(tokenId),
          studentName: String(attributes['Student Name'] || ''),
          course: String(attributes['Course'] || ''),
          institution: String(attributes['Institution'] || ''),
          issueDate: String(attributes['Issue Date'] || ''),
          grade: String(attributes['Grade'] || ''),
          txHash: '', // Not stored in metadata
          metadataUri: tokenURI,
          ownerAddress,
          mintedAt: String(attributes['Issue Date'] || ''),
          openseaUrl: `https://testnets.opensea.io/assets/amoy/${this.contractAddress}/${tokenId}`,
        });
      }

      return nfts;
    } catch (error) {
      console.error('Error fetching NFTs:', error);
      throw error;
    }
  }

  /**
   * Transfer NFT to another address
   */
  async transferNFT(tokenId: number, toAddress: string): Promise<string> {
    try {
      if (!window.ethereum) {
        throw new Error('MetaMask is not installed');
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const fromAddress = await signer.getAddress();

      const contractABI = [
        'function safeTransferFrom(address from, address to, uint256 tokenId) public',
      ];

      const contract = new ethers.Contract(this.contractAddress, contractABI, signer);

      const tx = await contract.safeTransferFrom(fromAddress, toAddress, tokenId);
      const receipt = await tx.wait();

      return receipt.hash;
    } catch (error) {
      console.error('NFT transfer error:', error);
      throw error;
    }
  }

  /**
   * Share NFT on social media
   */
  shareOnSocial(nft: NFTCertificate, platform: 'twitter' | 'linkedin' | 'facebook'): void {
    const text = `I just received my ${nft.course} certificate as an NFT! 🎓✨`;
    const url = nft.openseaUrl || `${window.location.origin}/verify/${nft.tokenId}`;

    const shareUrls = {
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    };

    window.open(shareUrls[platform], '_blank', 'width=600,height=400');
  }

  /**
   * Get OpenSea URL for NFT
   */
  getOpenSeaUrl(tokenId: number): string {
    return `https://testnets.opensea.io/assets/amoy/${this.contractAddress}/${tokenId}`;
  }
}

export const nftService = new NFTService();
export default nftService;
