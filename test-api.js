import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:4001';

async function testAPI() {
    console.log('🧪 Testing Certificate API...\n');
    
    try {
        // Test 1: Health Check
        console.log('1️⃣ Testing Health Check...');
        const healthResponse = await fetch(`${BASE_URL}/api/health`);
        const healthData = await healthResponse.json();
        
        if (healthData.success) {
            console.log('✅ Health check passed');
            console.log(`   Network: ${healthData.network.name} (Chain ID: ${healthData.network.chainId})`);
            console.log(`   Wallet: ${healthData.wallet.address}`);
            console.log(`   Balance: ${healthData.wallet.balance}`);
            console.log(`   Total Supply: ${healthData.contract.totalSupply} certificates\n`);
        } else {
            console.log('❌ Health check failed:', healthData.error);
            return;
        }
        
        // Test 2: Issue a Certificate
        console.log('2️⃣ Testing Certificate Issuance...');
        const certificateData = {
            recipientAddress: '0x4914Be0a6c91B7291A1fb1d006b45b2AA1ee4be1', // Your wallet address
            studentName: 'John Doe',
            course: 'Computer Science',
            institution: 'BlockChain University',
            issueDate: Math.floor(Date.now() / 1000),
            graduationDate: Math.floor(Date.now() / 1000)
        };
        
        const issueResponse = await fetch(`${BASE_URL}/api/issue-certificate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(certificateData)
        });
        
        const issueData = await issueResponse.json();
        
        if (issueData.success) {
            console.log('✅ Certificate issued successfully!');
            console.log(`   Token ID: ${issueData.data.tokenId}`);
            console.log(`   Transaction: ${issueData.data.transactionHash}`);
            console.log(`   Block: ${issueData.data.blockNumber}`);
            console.log(`   Gas Used: ${issueData.data.gasUsed}`);
            console.log(`   Explorer: ${issueData.data.explorerUrl}\n`);
            
            // Test 3: Verify the Certificate
            console.log('3️⃣ Testing Certificate Verification...');
            const tokenId = issueData.data.tokenId;
            
            const verifyResponse = await fetch(`${BASE_URL}/api/verify/${tokenId}`);
            const verifyData = await verifyResponse.json();
            
            if (verifyData.success) {
                console.log('✅ Certificate verification successful!');
                console.log(`   Student: ${verifyData.data.certificate.studentName}`);
                console.log(`   Course: ${verifyData.data.certificate.course}`);
                console.log(`   Institution: ${verifyData.data.certificate.institution}`);
                console.log(`   Issue Date: ${verifyData.data.certificate.issueDate}`);
                console.log(`   Is Revoked: ${verifyData.data.certificate.isRevoked}`);
                console.log(`   Token URI: ${verifyData.data.tokenURI}\n`);
            } else {
                console.log('❌ Certificate verification failed:', verifyData.error);
            }
            
        } else {
            console.log('❌ Certificate issuance failed:', issueData.error);
            console.log('Details:', issueData.details);
        }
        
        // Test 4: List All Certificates
        console.log('4️⃣ Testing List All Certificates...');
        const listResponse = await fetch(`${BASE_URL}/api/certificates`);
        const listData = await listResponse.json();
        
        if (listData.success) {
            console.log('✅ Certificate listing successful!');
            console.log(`   Total Certificates: ${listData.data.totalSupply}`);
            console.log('   Certificates:');
            listData.data.certificates.forEach(cert => {
                console.log(`     - Token ${cert.tokenId}: ${cert.studentName} - ${cert.course}`);
            });
        } else {
            console.log('❌ Certificate listing failed:', listData.error);
        }
        
        console.log('\n🎉 All tests completed!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testAPI();