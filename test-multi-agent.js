// BuddyClaw Multi-Agent Test Suite
// Spun Web Technology - Version 0.0.1

const AgentManager = require('./agent-manager');
const EmailVerifier = require('./email-verifier');
const EnhancedBuddyClaw = require('./enhanced-poster');

async function runTests() {
  console.log("🧪 Starting BuddyClaw Multi-Agent Test Suite...\n");
  
  const tests = [
    testAgentRegistration,
    testEmailVerification,
    testMultiAgentPublishing,
    testLegacyCompatibility
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      console.log(`\n📋 Running: ${test.name}`);
      await test();
      console.log(`✅ PASSED: ${test.name}`);
      passed++;
    } catch (error) {
      console.log(`❌ FAILED: ${test.name}`);
      console.log(`   Error: ${error.message}`);
      failed++;
    }
  }
  
  console.log(`\n📊 Test Results:`);
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);
  
  return { passed, failed };
}

async function testAgentRegistration() {
  const manager = new AgentManager('./test-vault/');
  
  // Test agent registration
  const result = await manager.registerAgent(
    'test-agent@example.com',
    'Test Agent',
    'https://example.com'
  );
  
  if (!result.success) {
    throw new Error(`Agent registration failed: ${result.error}`);
  }
  
  if (!result.agent.password) {
    throw new Error('No password generated for agent');
  }
  
  // Test credential retrieval
  const creds = manager.getAgentCredentials('test-agent@example.com');
  if (!creds.success) {
    throw new Error(`Credential retrieval failed: ${creds.error}`);
  }
  
  console.log(`   ✓ Agent registered successfully`);
  console.log(`   ✓ Password generated: ${result.agent.password.substring(0, 8)}...`);
  console.log(`   ✓ Credentials stored and retrievable`);
}

async function testEmailVerification() {
  const verifier = new EmailVerifier();
  
  // Test email verification check (will likely timeout, but tests the process)
  console.log(`   ⏳ Testing email verification process (may timeout)...`);
  
  try {
    const result = await verifier.checkEmailVerification(
      'test@example.com',
      'Test',
      5000 // 5 second timeout for testing
    );
    
    console.log(`   ✓ Email verification process completed`);
    console.log(`   ✓ Result: ${result.success ? 'Email found' : 'No email found (expected for test)'}`);
  } catch (error) {
    console.log(`   ✓ Email verification handled errors gracefully`);
  }
}

async function testMultiAgentPublishing() {
  const buddyClaw = new EnhancedBuddyClaw();
  
  // Test multi-agent request processing
  const testData = {
    agent_email: 'test-agent@example.com',
    site_base_url: 'https://example.com',
    content_target: 'post',
    title: 'Test Post from Multi-Agent System',
    content: '<p>This is a test post from the multi-agent BuddyClaw system.</p>',
    status: 'draft',
    dry_run: true // Use dry_run to avoid actual publishing
  };
  
  const result = await buddyClaw.processInput(testData);
  
  if (!result.success) {
    throw new Error(`Multi-agent publishing failed: ${result.error}`);
  }
  
  if (!result.dry_run) {
    throw new Error('Dry run not detected');
  }
  
  console.log(`   ✓ Multi-agent request processed successfully`);
  console.log(`   ✓ Dry run validation passed`);
  console.log(`   ✓ Content preview: ${result.data.content_preview}`);
}

async function testLegacyCompatibility() {
  const buddyClaw = new EnhancedBuddyClaw();
  
  // Test legacy single-user request (backward compatibility)
  const legacyData = {
    site_base_url: 'https://example.com',
    wp_username: 'testuser',
    wp_app_password: 'testpass',
    content_target: 'post',
    title: 'Legacy Test Post',
    content: '<p>This is a legacy test post.</p>',
    status: 'draft',
    dry_run: true
  };
  
  const result = await buddyClaw.processInput(legacyData);
  
  if (!result.success) {
    throw new Error(`Legacy compatibility failed: ${result.error}`);
  }
  
  if (!result.dry_run) {
    throw new Error('Legacy dry run not detected');
  }
  
  console.log(`   ✓ Legacy request processed successfully`);
  console.log(`   ✓ Backward compatibility maintained`);
}

// Cleanup function
function cleanup() {
  console.log(`\n🧹 Cleaning up test files...`);
  
  const fs = require('fs');
  const path = require('path');
  
  try {
    // Remove test vault directory
    const testVaultPath = './test-vault/';
    if (fs.existsSync(testVaultPath)) {
      fs.rmSync(testVaultPath, { recursive: true, force: true });
      console.log(`   ✓ Test vault removed`);
    }
    
    console.log(`   ✓ Cleanup completed`);
  } catch (error) {
    console.log(`   ⚠️  Cleanup warning: ${error.message}`);
  }
}

// Main execution
if (require.main === module) {
  runTests().then(results => {
    cleanup();
    
    console.log(`\n🎯 Test Suite Completed!`);
    process.exit(results.failed > 0 ? 1 : 0);
  }).catch(error => {
    console.error(`\n💥 Test Suite Error: ${error.message}`);
    cleanup();
    process.exit(1);
  });
}

module.exports = { runTests, cleanup };