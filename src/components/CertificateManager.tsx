import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';

// Your Certificate Contract ABI
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
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
];

const CONTRACT_ADDRESS = '0x221a6195d53c9b0acfedd050d42bcdf88e4b79c9';
const RPC_URL = 'https://polygon-amoy.g.alchemy.com/v2/u1kDbEmLdQXSMGfvIhg_2';

const CertificateManager = () => {
  const [provider, setProvider] = useState(null);
  const [contract, setContract] = useState(null);
  const [account, setAccount] = useState('');
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [issuingCert, setIssuingCert] = useState(false);
  const [verifying, setVerifying] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    recipientAddress: '',
    studentName: '',
    course: '',
    institution: '',
  });

  const [verifyTokenId, setVerifyTokenId] = useState('');
  const [verificationResult, setVerificationResult] = useState(null);

  useEffect(() => {
    initializeProvider();
  }, []);

  const initializeProvider = async () => {
    try {
      // Initialize read-only provider
      const readProvider = new ethers.JsonRpcProvider(RPC_URL);
      const readContract = new ethers.Contract(CONTRACT_ADDRESS, CERTIFICATE_ABI, readProvider);
      
      setProvider(readProvider);
      setContract(readContract);

      // Check if MetaMask is available
      if (typeof window.ethereum !== 'undefined') {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          setAccount(accounts[0]);
        }
      }

      // Load existing certificates
      await loadCertificates(readContract);
    } catch (error) {
      console.error('Failed to initialize provider:', error);
    }
  };

  const connectWallet = async () => {
    if (typeof window.ethereum === 'undefined') {
      alert('Please install MetaMask!');
      return;
    }

    try {
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });
      
      // Switch to Polygon Amoy if not already connected
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x13882' }], // 80002 in hex
        });
      } catch (switchError) {
        // If the chain doesn't exist, add it
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0x13882',
              chainName: 'Polygon Amoy Testnet',
              nativeCurrency: {
                name: 'POL',
                symbol: 'POL',
                decimals: 18
              },
              rpcUrls: [RPC_URL],
              blockExplorerUrls: ['https://amoy.polygonscan.com/']
            }]
          });
        }
      }

      setAccount(accounts[0]);
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    }
  };

  const loadCertificates = async (contractInstance = contract) => {
    if (!contractInstance) return;

    try {
      setLoading(true);
      const totalSupply = await contractInstance.totalSupply();
      const certs = [];

      for (let i = 1; i <= totalSupply; i++) {
        try {
          const cert = await contractInstance.getCertificate(i);
          certs.push({
            tokenId: i,
            studentName: cert[0],
            course: cert[1],
            institution: cert[2],
            issueDate: new Date(Number(cert[3]) * 1000).toLocaleDateString(),
            graduationDate: new Date(Number(cert[4]) * 1000).toLocaleDateString(),
            ipfsHash: cert[5],
            isRevoked: cert[6]
          });
        } catch (error) {
          console.log(`Token ${i} doesn't exist:`, error.message);
        }
      }

      setCertificates(certs);
    } catch (error) {
      console.error('Failed to load certificates:', error);
    } finally {
      setLoading(false);
    }
  };

  const issueCertificate = async () => {
    if (!account) {
      alert('Please connect your wallet first!');
      return;
    }

    if (!formData.recipientAddress || !formData.studentName || !formData.course || !formData.institution) {
      alert('Please fill in all required fields!');
      return;
    }

    try {
      setIssuingCert(true);
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contractWithSigner = new ethers.Contract(CONTRACT_ADDRESS, CERTIFICATE_ABI, signer);

      const issueDate = Math.floor(Date.now() / 1000);
      const graduationDate = Math.floor(Date.now() / 1000);
      const metadataURI = `ipfs://QmTest${Date.now()}`;
      const ipfsHash = `QmHash${Date.now()}`;

      console.log('Issuing certificate...');
      
      const tx = await contractWithSigner.mintCertificate(
        formData.recipientAddress,
        formData.studentName,
        formData.course,
        formData.institution,
        issueDate,
        graduationDate,
        metadataURI,
        ipfsHash
      );

      console.log('Transaction sent:', tx.hash);
      
      const receipt = await tx.wait();
      console.log('Transaction confirmed:', receipt);

      alert(`Certificate issued successfully! Transaction: ${tx.hash}`);
      
      // Reset form
      setFormData({
        recipientAddress: '',
        studentName: '',
        course: '',
        institution: ''
      });

      // Reload certificates
      await loadCertificates();

    } catch (error) {
      console.error('Failed to issue certificate:', error);
      alert(`Failed to issue certificate: ${error.message}`);
    } finally {
      setIssuingCert(false);
    }
  };

  const verifyCertificate = async () => {
    if (!verifyTokenId) {
      alert('Please enter a token ID!');
      return;
    }

    try {
      setVerifying(true);
      const cert = await contract.getCertificate(verifyTokenId);
      
      setVerificationResult({
        tokenId: verifyTokenId,
        studentName: cert[0],
        course: cert[1],
        institution: cert[2],
        issueDate: new Date(Number(cert[3]) * 1000).toLocaleDateString(),
        graduationDate: new Date(Number(cert[4]) * 1000).toLocaleDateString(),
        ipfsHash: cert[5],
        isRevoked: cert[6]
      });
    } catch (error) {
      console.error('Failed to verify certificate:', error);
      alert(`Failed to verify certificate: ${error.message}`);
      setVerificationResult(null);
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">Certificate Management System</h1>
        
        {/* Wallet Connection */}
        <div className="mb-6">
          {account ? (
            <div className="bg-green-100 p-3 rounded-lg">
              <p className="text-green-800">
                <strong>Connected:</strong> {account}
              </p>
            </div>
          ) : (
            <button
              onClick={connectWallet}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Connect Wallet
            </button>
          )}
        </div>

        {/* Issue Certificate Form */}
        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <h2 className="text-xl font-semibold mb-4">Issue New Certificate</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <input
              type="text"
              placeholder="Recipient Address"
              value={formData.recipientAddress}
              onChange={(e) => setFormData({...formData, recipientAddress: e.target.value})}
              className="border p-2 rounded"
            />
            <input
              type="text"
              placeholder="Student Name"
              value={formData.studentName}
              onChange={(e) => setFormData({...formData, studentName: e.target.value})}
              className="border p-2 rounded"
            />
            <input
              type="text"
              placeholder="Course"
              value={formData.course}
              onChange={(e) => setFormData({...formData, course: e.target.value})}
              className="border p-2 rounded"
            />
            <input
              type="text"
              placeholder="Institution"
              value={formData.institution}
              onChange={(e) => setFormData({...formData, institution: e.target.value})}
              className="border p-2 rounded"
            />
          </div>
          
          <button
            onClick={issueCertificate}
            disabled={issuingCert || !account}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:bg-gray-400"
          >
            {issuingCert ? 'Issuing...' : 'Issue Certificate'}
          </button>
        </div>

        {/* Verify Certificate */}
        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <h2 className="text-xl font-semibold mb-4">Verify Certificate</h2>
          
          <div className="flex gap-4 mb-4">
            <input
              type="number"
              placeholder="Token ID"
              value={verifyTokenId}
              onChange={(e) => setVerifyTokenId(e.target.value)}
              className="border p-2 rounded flex-1"
            />
            <button
              onClick={verifyCertificate}
              disabled={verifying}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
            >
              {verifying ? 'Verifying...' : 'Verify'}
            </button>
          </div>

          {verificationResult && (
            <div className="bg-white p-4 rounded border">
              <h3 className="font-semibold text-lg mb-2">Verification Result</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><strong>Token ID:</strong> {verificationResult.tokenId}</div>
                <div><strong>Student:</strong> {verificationResult.studentName}</div>
                <div><strong>Course:</strong> {verificationResult.course}</div>
                <div><strong>Institution:</strong> {verificationResult.institution}</div>
                <div><strong>Issue Date:</strong> {verificationResult.issueDate}</div>
                <div><strong>Status:</strong> 
                  <span className={verificationResult.isRevoked ? 'text-red-600' : 'text-green-600'}>
                    {verificationResult.isRevoked ? ' REVOKED' : ' VALID'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Certificates List */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">All Certificates ({certificates.length})</h2>
            <button
              onClick={() => loadCertificates()}
              disabled={loading}
              className="bg-gray-500 text-white px-3 py-1 rounded text-sm hover:bg-gray-600 disabled:bg-gray-400"
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>

          {certificates.length > 0 ? (
            <div className="grid gap-3">
              {certificates.map((cert) => (
                <div key={cert.tokenId} className="bg-white p-3 rounded border">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold">Token #{cert.tokenId}: {cert.studentName}</div>
                      <div className="text-sm text-gray-600">{cert.course} - {cert.institution}</div>
                      <div className="text-xs text-gray-500">Issued: {cert.issueDate}</div>
                    </div>
                    <div className={`text-xs px-2 py-1 rounded ${cert.isRevoked ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                      {cert.isRevoked ? 'REVOKED' : 'VALID'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No certificates found.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default CertificateManager;