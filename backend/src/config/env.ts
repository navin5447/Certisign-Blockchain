import dotenv from 'dotenv';

// Load environment variables as early as possible
dotenv.config({ path: './.env' });

// Debug environment variables
console.log('🔍 Environment Variables Loaded:');
console.log('NEON_DB_URL:', process.env.NEON_DB_URL ? 'SET' : 'NOT SET');
console.log('ETHEREUM_RPC_URL:', process.env.ETHEREUM_RPC_URL ? 'SET' : 'NOT SET');
console.log('ETH_PRIVATE_KEY:', process.env.ETH_PRIVATE_KEY ? 'SET' : 'NOT SET');
console.log('CONTRACT_ADDRESS:', process.env.CONTRACT_ADDRESS ? 'SET' : 'NOT SET');

export default process.env;