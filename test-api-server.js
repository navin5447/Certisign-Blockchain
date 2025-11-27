import express from 'express';
import { ethers } from 'ethers';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();

// Enable CORS for all routes
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use(express.json());

// Certificate Contract ABI (from your contract)
const CERTIFICATE_ABI = [
  {
    "inputs": [
      {"name": "to", "type": "address"},
      {"name": "studentName", "type": "string"},
      {"name": "course", "type": "string"},
      {"name": "institution", "type": "string"},
      {"name": "issueDate", "type": "uint256"},
      {"name": "graduationDate", "type": "uint256"},
      {"name": "metadataURI", "type": "string"},
      {"name": "ipfsHash", "type": "string"}
    ],
    "name": "mintCertificate",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
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
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
];

// Initialize blockchain connection
const provider = new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL);
const wallet = new ethers.Wallet(process.env.ETH_PRIVATE_KEY, provider);
const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, CERTIFICATE_ABI, wallet);

// Test Route - Health Check
app.get('/api/health', async (req, res) => {
  try {
    const network = await provider.getNetwork();
    const balance = await provider.getBalance(wallet.address);
    const totalSupply = await contract.totalSupply();
    
    res.json({
      success: true,
      status: 'healthy',
      network: {
        name: network.name,
        chainId: network.chainId.toString()
      },
      wallet: {
        address: wallet.address,
        balance: ethers.formatEther(balance) + ' POL'
      },
      contract: {
        address: process.env.CONTRACT_ADDRESS,
        totalSupply: totalSupply.toString()
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Test Route - Issue Certificate
app.post('/api/issue-certificate', async (req, res) => {
  try {
    const {
      recipientAddress,
      studentName,
      course,
      institution,
      issueDate,
      graduationDate
    } = req.body;

    // Validate required fields
    if (!recipientAddress || !studentName || !course || !institution) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: recipientAddress, studentName, course, institution'
      });
    }

    // Create metadata
    const metadata = {
      studentName,
      course,
      institution,
      issueDate: issueDate || Math.floor(Date.now() / 1000),
      graduationDate: graduationDate || Math.floor(Date.now() / 1000),
      timestamp: new Date().toISOString()
    };

    // For this test, we'll use a simple IPFS hash simulation
    // In production, you'd upload to IPFS and get the real hash
    const metadataURI = `ipfs://QmTest${Date.now()}`;
    const ipfsHash = `QmTest${Date.now()}Hash`;

    console.log('🚀 Minting certificate...');
    console.log('📋 Details:', {
      to: recipientAddress,
      studentName,
      course,
      institution,
      metadataURI,
      ipfsHash
    });

    // Estimate gas
    const gasEstimate = await contract.mintCertificate.estimateGas(
      recipientAddress,
      studentName,
      course,
      institution,
      metadata.issueDate,
      metadata.graduationDate,
      metadataURI,
      ipfsHash
    );

    console.log(`⛽ Estimated gas: ${gasEstimate.toString()}`);

    // Send transaction
    const tx = await contract.mintCertificate(
      recipientAddress,
      studentName,
      course,
      institution,
      metadata.issueDate,
      metadata.graduationDate,
      metadataURI,
      ipfsHash,
      {
        gasLimit: gasEstimate + BigInt(50000) // Add buffer
      }
    );

    console.log(`📤 Transaction sent: ${tx.hash}`);
    console.log('⏳ Waiting for confirmation...');

    // Wait for transaction confirmation
    const receipt = await tx.wait();
    
    console.log('✅ Transaction confirmed!');
    console.log(`📦 Block number: ${receipt.blockNumber}`);

    // Get the token ID from the transaction logs
    const tokenId = receipt.logs[0]?.topics[3] ? 
      parseInt(receipt.logs[0].topics[3], 16) : 
      await contract.totalSupply() - 1n;

    res.json({
      success: true,
      data: {
        tokenId: tokenId.toString(),
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        contractAddress: process.env.CONTRACT_ADDRESS,
        recipient: recipientAddress,
        metadata,
        metadataURI,
        explorerUrl: `https://amoy.polygonscan.com/tx/${tx.hash}`
      }
    });

  } catch (error) {
    console.error('❌ Minting failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: error
    });
  }
});

// Test Route - Verify Certificate
app.get('/api/verify/:tokenId', async (req, res) => {
  try {
    const { tokenId } = req.params;
    
    console.log(`🔍 Verifying certificate with token ID: ${tokenId}`);
    
    // Get certificate data from contract
    const certificate = await contract.getCertificate(tokenId);
    const tokenURI = await contract.tokenURI(tokenId);
    
    res.json({
      success: true,
      data: {
        tokenId,
        certificate: {
          studentName: certificate[0],
          course: certificate[1],
          institution: certificate[2],
          issueDate: new Date(Number(certificate[3]) * 1000).toISOString(),
          graduationDate: new Date(Number(certificate[4]) * 1000).toISOString(),
          ipfsHash: certificate[5],
          isRevoked: certificate[6]
        },
        tokenURI,
        contractAddress: process.env.CONTRACT_ADDRESS,
        explorerUrl: `https://amoy.polygonscan.com/token/${process.env.CONTRACT_ADDRESS}?a=${tokenId}`
      }
    });
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Test Route - Get All Certificates
app.get('/api/certificates', async (req, res) => {
  try {
    const totalSupply = await contract.totalSupply();
    const certificates = [];
    
    for (let i = 1; i <= totalSupply; i++) {
      try {
        const certificate = await contract.getCertificate(i);
        certificates.push({
          tokenId: i,
          studentName: certificate[0],
          course: certificate[1],
          institution: certificate[2],
          issueDate: new Date(Number(certificate[3]) * 1000).toISOString(),
          graduationDate: new Date(Number(certificate[4]) * 1000).toISOString(),
          isRevoked: certificate[6]
        });
      } catch (error) {
        console.log(`Token ${i} doesn't exist or error fetching:`, error.message);
      }
    }
    
    res.json({
      success: true,
      data: {
        totalSupply: totalSupply.toString(),
        certificates
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

const PORT = process.env.PORT || 3001;
const HOST = '0.0.0.0'; // Bind to all interfaces

app.listen(PORT, HOST, () => {
  console.log(`🚀 Certificate API Server running on http://localhost:${PORT}`);
  console.log(`🌐 Also accessible at http://127.0.0.1:${PORT}`);
  console.log(`📋 Contract Address: ${process.env.CONTRACT_ADDRESS}`);
  console.log(`🌐 Network: Polygon Amoy Testnet`);
  console.log(`👛 Wallet: ${wallet.address}`);
  console.log('\n📖 Available endpoints:');
  console.log(`   GET  http://localhost:${PORT}/api/health`);
  console.log(`   POST http://localhost:${PORT}/api/issue-certificate`);
  console.log(`   GET  http://localhost:${PORT}/api/verify/:tokenId`);
  console.log(`   GET  http://localhost:${PORT}/api/certificates`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use. Please kill any existing processes or use a different port.`);
  } else {
    console.error(`❌ Server error:`, err);
  }
});