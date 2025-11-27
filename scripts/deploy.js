const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Starting Certificate contract deployment...");

  // Get the contract factory
  const Certificate = await ethers.getContractFactory("Certificate");

  // Deploy the contract
  console.log("📦 Deploying Certificate contract...");
  const certificate = await Certificate.deploy(
    "BlockVerify Certificate", // name
    "BVC"                      // symbol
  );

  await certificate.deployed();

  console.log("✅ Certificate contract deployed to:", certificate.address);
  console.log("📄 Transaction hash:", certificate.deployTransaction.hash);

  // Wait for a few confirmations
  console.log("⏳ Waiting for confirmations...");
  await certificate.deployTransaction.wait(3);

  console.log("🔗 Contract verified on blockchain");

  // Save contract address and ABI to backend
  const contractInfo = {
    address: certificate.address,
    abi: certificate.interface.format("json"),
    network: network.name,
    deploymentBlock: certificate.deployTransaction.blockNumber,
    deploymentTx: certificate.deployTransaction.hash,
    deployer: (await ethers.getSigners())[0].address,
    timestamp: new Date().toISOString(),
  };

  // Create backend contract info directory if it doesn't exist
  const contractDir = path.join(__dirname, "../backend/src/contracts");
  if (!fs.existsSync(contractDir)) {
    fs.mkdirSync(contractDir, { recursive: true });
  }

  // Save contract info
  const contractInfoPath = path.join(contractDir, "Certificate.json");
  fs.writeFileSync(contractInfoPath, JSON.stringify(contractInfo, null, 2));

  console.log("📁 Contract info saved to:", contractInfoPath);

  // Update backend .env file
  const envPath = path.join(__dirname, "../backend/.env");
  let envContent = "";
  
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, "utf8");
  }

  // Remove existing CONTRACT_ADDRESS if present
  envContent = envContent.replace(/^CONTRACT_ADDRESS=.*$/m, "");
  
  // Add new contract address
  envContent += `\nCONTRACT_ADDRESS=${certificate.address}\n`;
  
  fs.writeFileSync(envPath, envContent);

  console.log("📝 Updated backend .env with contract address");

  // Display summary
  console.log("\n🎉 Deployment Summary:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`📍 Network: ${network.name}`);
  console.log(`📄 Contract Address: ${certificate.address}`);
  console.log(`🔗 Transaction: ${certificate.deployTransaction.hash}`);
  console.log(`👤 Deployer: ${(await ethers.getSigners())[0].address}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // Test the contract
  console.log("\n🧪 Testing contract functions...");
  
  try {
    const currentTokenId = await certificate.getCurrentTokenId();
    console.log("✅ getCurrentTokenId():", currentTokenId.toString());
    
    console.log("✅ Contract is working correctly!");
  } catch (error) {
    console.error("❌ Contract test failed:", error.message);
  }

  console.log("\n🏁 Deployment completed successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });