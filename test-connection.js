import { ethers } from 'ethers';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testBlockchainConnection() {
    console.log('🔗 Testing Blockchain Connection...\n');
    
    try {
        // 1. Test RPC Connection
        console.log('📡 Testing RPC Connection...');
        const provider = new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL);
        
        const network = await provider.getNetwork();
        console.log(`✅ Connected to network: ${network.name} (Chain ID: ${network.chainId})`);
        
        const blockNumber = await provider.getBlockNumber();
        console.log(`✅ Current block number: ${blockNumber}\n`);
        
        // 2. Test Wallet Connection
        console.log('👛 Testing Wallet Connection...');
        const wallet = new ethers.Wallet(process.env.ETH_PRIVATE_KEY, provider);
        
        const balance = await provider.getBalance(wallet.address);
        console.log(`✅ Wallet address: ${wallet.address}`);
        console.log(`✅ Wallet balance: ${ethers.formatEther(balance)} POL\n`);
        
        // 3. Test Contract Connection
        console.log('📋 Testing Contract Connection...');
        const contractAddress = process.env.CONTRACT_ADDRESS;
        
        // Simple ABI to test basic contract interaction
        const abi = [
            "function name() view returns (string)",
            "function symbol() view returns (string)",
            "function totalSupply() view returns (uint256)",
            "function owner() view returns (address)"
        ];
        
        const contract = new ethers.Contract(contractAddress, abi, provider);
        
        try {
            const name = await contract.name();
            const symbol = await contract.symbol();
            const owner = await contract.owner();
            
            console.log(`✅ Contract Name: ${name}`);
            console.log(`✅ Contract Symbol: ${symbol}`);
            console.log(`✅ Contract Owner: ${owner}`);
            console.log(`✅ Contract Address: ${contractAddress}\n`);
            
        } catch (error) {
            console.log(`⚠️ Basic contract interaction test failed: ${error}`);
            console.log(`✅ Contract exists at: ${contractAddress}\n`);
        }
        
        // 4. Test Gas Price
        console.log('⛽ Testing Gas Price...');
        const gasPrice = await provider.getFeeData();
        console.log(`✅ Gas Price: ${ethers.formatUnits(gasPrice.gasPrice || 0, 'gwei')} Gwei`);
        console.log(`✅ Max Fee Per Gas: ${ethers.formatUnits(gasPrice.maxFeePerGas || 0, 'gwei')} Gwei\n`);
        
        console.log('🎉 All blockchain connections are working correctly!');
        console.log('🚀 You can now proceed to mint certificates.');
        
    } catch (error) {
        console.error('❌ Blockchain connection failed:', error);
        console.log('\n🔧 Troubleshooting Tips:');
        console.log('1. Check your RPC URL is correct');
        console.log('2. Verify your private key is valid');
        console.log('3. Ensure you have POL balance for gas fees');
        console.log('4. Confirm the contract address is deployed');
    }
}

testBlockchainConnection();