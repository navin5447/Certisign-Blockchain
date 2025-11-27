# 🎓 CertiSign - Blockchain Certificate Verification System

[![React](https://img.shields.io/badge/React-18.3.1-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.3-blue.svg)](https://www.typescriptlang.org/)
[![Polygon](https://img.shields.io/badge/Polygon-Amoy-8247e5.svg)](https://polygon.technology/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**CertiSign** is a next-generation blockchain-based certificate verification and management system that combines AI-powered fraud detection, NFT certificate minting, advanced analytics, and batch processing capabilities. Built on the Polygon blockchain, it ensures tamper-proof, transparent, and instantly verifiable academic credentials.

![CertiSign Banner](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)

---

## 🌟 Key Features

### 🔐 Core Functionality
- **Blockchain Certificate Issuance** - Issue tamper-proof certificates on Polygon Amoy testnet
- **QR Code Verification** - Generate and verify certificates via QR codes with blockchain validation
- **Student Portal** - Self-service portal for students to view and download certificates
- **Admin Dashboard** - Comprehensive management interface with 5 specialized tabs

### 🤖 Advanced Features

#### 1. **AI-Powered Fraud Detection**
- 8 sophisticated fraud detection patterns
- Real-time risk scoring (0-100)
- Automated certificate analysis with CRITICAL/HIGH/MEDIUM/LOW risk levels
- Blocks high-risk certificate issuance automatically
- Duplicate detection, anomaly analysis, and temporal validation

#### 2. **NFT Certificate Wallet**
- ERC-721 NFT minting for certificates
- OpenSea marketplace integration
- IPFS metadata storage via Pinata
- NFT transfer functionality
- Social sharing (Twitter, LinkedIn, Facebook)
- Wallet-based certificate gallery

#### 3. **Advanced Analytics Dashboard**
- **5 Interactive Charts**: Area, Pie, Bar, Line, and Data Tables
- Certificate issuance trends (6-month view)
- Department/course distribution analysis
- Verification success metrics
- Fraud detection trend analysis (8-week view)
- Institution performance ranking
- Export to CSV/PDF

#### 4. **Batch Certificate Issuing**
- CSV bulk upload with template download
- **8-Point Validation System**: Required fields, email format, wallet address, date validation, CGPA range, duplicate detection, file format, row limits
- Real-time validation results
- Progress tracking with percentage display
- Batch processing simulation (1-100 certificates)
- Results export functionality

#### 5. **QR Code Verification**
- Dynamic QR code generation
- Blockchain verification link
- Download QR as PNG image
- Copy verification code to clipboard

---

## 🛠️ Technology Stack

### Frontend
- **React 18.3.1** - Modern UI framework
- **TypeScript 5.8.3** - Type-safe development
- **Vite 5.4.19** - Lightning-fast build tool
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - Premium component library
- **Recharts** - Data visualization
- **ethers.js 6.15.0** - Blockchain interactions

### Backend
- **Node.js + Express** - RESTful API server
- **PostgreSQL** - Relational database
- **Drizzle ORM** - Type-safe database queries
- **Firebase Authentication** - Email/password + Google OAuth

### Blockchain & Web3
- **Polygon Amoy Testnet** (Chain ID: 80002)
- **OpenZeppelin Contracts** - ERC-721 NFT standard
- **IPFS via Pinata** - Decentralized storage
- **Hardhat** - Smart contract development

### Additional Libraries
- **qrcode.react** - QR code generation
- **papaparse** - CSV parsing
- **date-fns** - Date utilities
- **React Hook Form** - Form management
- **Zod** - Schema validation

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** 16.x or higher ([Install via nvm](https://github.com/nvm-sh/nvm#installing-and-updating))
- **npm** or **yarn** package manager
- **Git** for version control
- **MetaMask** or compatible Web3 wallet
- **Polygon Amoy Testnet** tokens (from [faucet](https://faucet.polygon.technology/))

### Installation

```bash
# Clone the repository
git clone https://github.com/navin5447/certisign-blockchain.git
cd certisign-blockchain

# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..
```

### Environment Setup

Create a `.env` file in the root directory:

```env
# Blockchain Configuration
VITE_POLYGON_RPC_URL=https://rpc-amoy.polygon.technology
VITE_CHAIN_ID=80002
VITE_CONTRACT_ADDRESS=your_deployed_contract_address

# IPFS Configuration
VITE_PINATA_API_KEY=your_pinata_api_key
VITE_PINATA_SECRET_KEY=your_pinata_secret_key
VITE_IPFS_GATEWAY=https://gateway.pinata.cloud/ipfs/

# Firebase Configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_firebase_sender_id
VITE_FIREBASE_APP_ID=your_firebase_app_id

# Backend API
VITE_API_URL=http://localhost:3001
```

Create `backend/.env`:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/certisign
JWT_SECRET=your_jwt_secret_key
PORT=3001
```

### Smart Contract Deployment

```bash
# Compile contracts
npx hardhat compile

# Deploy to Polygon Amoy
npx hardhat run scripts/deploy.js --network polygonAmoy

# Update .env with deployed contract address
```

### Database Setup

```bash
cd backend

# Run migrations
npm run db:migrate

# Create admin user
node create-admin.js

cd ..
```

### Development Server

```bash
# Terminal 1: Start frontend
npm run dev

# Terminal 2: Start backend
cd backend
npm start
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 📁 Project Structure

```
certisign-blockchain/
├── src/
│   ├── components/          # React components
│   │   ├── admin/          # Admin-specific components
│   │   ├── ui/             # shadcn/ui components
│   │   ├── QRVerification.tsx
│   │   ├── FraudDetectionDashboard.tsx
│   │   ├── NFTGallery.tsx
│   │   ├── AnalyticsDashboard.tsx
│   │   └── BatchCertificateUpload.tsx
│   ├── pages/              # Page components
│   │   ├── AdminDashboard.tsx
│   │   ├── StudentPortal.tsx
│   │   └── VerifyPage.tsx
│   ├── services/           # Business logic
│   │   ├── fraudDetection.ts
│   │   ├── nftService.ts
│   │   └── api.ts
│   ├── contexts/           # React contexts
│   └── hooks/              # Custom React hooks
├── backend/
│   ├── src/
│   │   ├── routes/         # API endpoints
│   │   ├── services/       # Backend services
│   │   ├── middleware/     # Auth & security
│   │   └── db/             # Database schema
│   └── drizzle/            # Database migrations
├── contracts/              # Smart contracts
│   ├── Certificate.sol     # Certificate NFT contract
│   └── TokenContract.sol   # Token management
├── scripts/                # Deployment scripts
└── public/                 # Static assets
```

---

## 🎯 Usage Guide

### For Institutions (Admin)

1. **Login to Admin Dashboard**
   - Navigate to `/admin`
   - Use admin credentials or register

2. **Issue Single Certificate**
   - Go to "Overview" tab
   - Fill in student details (name, email, wallet, course, CGPA)
   - System automatically runs fraud detection
   - Certificate minted on blockchain if validation passes

3. **Batch Upload Certificates**
   - Go to "Batch Upload" tab
   - Download CSV template
   - Fill in student data
   - Upload CSV (max 100 certificates)
   - Review validation results
   - Process batch

4. **View Analytics**
   - Go to "Analytics" tab
   - View issuance trends, department stats, verification metrics
   - Export data to CSV/PDF

5. **Fraud Monitoring**
   - Go to "Fraud Detection" tab
   - Review flagged certificates
   - View risk scores and detection reasons

6. **NFT Management**
   - Go to "NFT Gallery" tab
   - Enter wallet address
   - View all minted NFT certificates
   - Transfer or share NFTs

### For Students

1. **Access Student Portal**
   - Navigate to `/student`
   - Login with student credentials

2. **View Certificates**
   - See all issued certificates
   - Download certificate PDF
   - Generate QR code for verification

3. **NFT Certificate Wallet**
   - Connect MetaMask wallet
   - View NFT certificates
   - Share on social media
   - Transfer to another wallet

### For Verifiers

1. **Verify Certificate**
   - Navigate to `/verify`
   - Enter certificate ID or scan QR code
   - View blockchain verification status
   - See certificate details (student, institution, issue date)

---

## 🔧 Configuration

### Smart Contract Configuration

Edit `hardhat.config.js`:

```javascript
module.exports = {
  solidity: "0.8.20",
  networks: {
    polygonAmoy: {
      url: "https://rpc-amoy.polygon.technology",
      accounts: [process.env.PRIVATE_KEY],
      chainId: 80002
    }
  }
};
```

### IPFS Configuration

Sign up at [Pinata](https://pinata.cloud/) and get API keys. Update `.env` with your credentials.

### Firebase Setup

1. Create project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Authentication (Email/Password + Google)
3. Copy configuration to `.env`

---

## 🧪 Testing

```bash
# Run unit tests
npm test

# Run smart contract tests
npx hardhat test

# Run backend tests
cd backend
npm test
```

---

## 📦 Build & Deployment

### Frontend Build

```bash
# Production build
npm run build

# Preview production build
npm run preview
```

Output: `dist/` folder (1.79 MB, 529 KB gzipped)

### Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### Deploy Backend to Railway

1. Push code to GitHub
2. Connect repository to [Railway](https://railway.app/)
3. Add environment variables
4. Deploy

### Deploy Smart Contracts

```bash
# Deploy to Polygon mainnet
npx hardhat run scripts/deploy.js --network polygon
```

---

## 🔒 Security Features

- **Blockchain Immutability** - Certificates stored on-chain, tamper-proof
- **AI Fraud Detection** - 8 detection patterns with real-time analysis
- **JWT Authentication** - Secure API access
- **Input Validation** - Zod schema validation on all inputs
- **SQL Injection Protection** - Parameterized queries via Drizzle ORM
- **CORS Configuration** - Restricted API access
- **Rate Limiting** - DDoS protection
- **Wallet Signature Verification** - MetaMask signature validation

---

## 📊 System Architecture

```
┌─────────────────┐
│   React App     │
│  (Frontend)     │
└────────┬────────┘
         │
         ├─────────────┐
         │             │
    ┌────▼─────┐  ┌────▼─────────┐
    │ Express  │  │   Polygon    │
    │  Backend │  │  Blockchain  │
    └────┬─────┘  └──────────────┘
         │
    ┌────▼──────┐
    │PostgreSQL │
    │ Database  │
    └───────────┘
```

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author

**Navin Kumar**
- GitHub: [@navin5447](https://github.com/navin5447)
- Repository: [certisign-blockchain](https://github.com/navin5447/certisign-blockchain)

---

## 🙏 Acknowledgments

- **OpenZeppelin** - Smart contract libraries
- **Polygon** - Blockchain infrastructure
- **shadcn/ui** - UI component system
- **Recharts** - Data visualization
- **Pinata** - IPFS storage

---

## 📞 Support

For issues and questions:
- Open an issue on [GitHub Issues](https://github.com/navin5447/certisign-blockchain/issues)
- Check [Documentation](./docs/)

---

## 🗺️ Roadmap

- [ ] Mobile app (React Native)
- [ ] Multi-chain support (Ethereum, BSC)
- [ ] Advanced ML fraud detection models
- [ ] Email notification system
- [ ] Multi-language support
- [ ] Certificate templates customization
- [ ] Integration with university APIs
- [ ] Decentralized storage migration (Arweave)

---

**Made with ❤️ for transparent and verifiable education credentials**
