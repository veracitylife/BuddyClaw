// BuddyClaw API Token Authentication Test
// Spun Web Technology - Version 0.0.2

const EnhancedBuddyClaw = require('./enhanced-poster');

async function testApiTokenAuthentication() {
  console.log("🧪 Testing BuddyClaw API Token Authentication...\n");
  
  const tests = [
    testApiTokenAuth,
    testAppPasswordAuth,
    testBasicAuth,
    testMultiAgentAuth,
    testAuthMethodDetection
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

async function testApiTokenAuth() {
  const buddyClaw = new EnhancedBuddyClaw();
  
  // Test API token authentication (dry run)
  const testData = {
    site_base_url: 'https://example.com',
    wp_api_token: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.test_token',
    content_target: 'post',
    title: 'API Token Test Post',
    content: '<p>This is a test post using API token authentication.</p>',
    status: 'draft',
    dry_run: true
  };
  
  const result = await buddyClaw.processInput(testData);
  
  if (!result.success) {
    throw new Error(`API token authentication failed: ${result.error}`);
  }
  
  if (!result.dry_run) {
    throw new Error('Dry run not detected for API token test');
  }
  
  if (result.auth_method !== 'api_token') {
    throw new Error(`Expected auth_method 'api_token', got '${result.auth_method}'`);
  }
  
  console.log(`   ✓ API token authentication successful`);
  console.log(`   ✓ Auth method detected: ${result.auth_method}`);
  console.log(`   ✓ Content preview: ${result.data.content_preview}`);
}

async function testAppPasswordAuth() {
  const buddyClaw = new EnhancedBuddyClaw();
  
  // Test Application Password authentication (dry run)
  const testData = {
    site_base_url: 'https://example.com',
    wp_username: 'testuser',
    wp_app_password: 'test_app_password_1234',
    content_target: 'post',
    title: 'App Password Test Post',
    content: '<p>This is a test post using app password authentication.</p>',
    status: 'draft',
    dry_run: true
  };
  
  const result = await buddyClaw.processInput(testData);
  
  if (!result.success) {
    throw new Error(`App password authentication failed: ${result.error}`);
  }
  
  if (!result.dry_run) {
    throw new Error('Dry run not detected for app password test');
  }
  
  if (result.auth_method !== 'app_password') {
    throw new Error(`Expected auth_method 'app_password', got '${result.auth_method}'`);
  }
  
  console.log(`   ✓ App password authentication successful`);
  console.log(`   ✓ Auth method detected: ${result.auth_method}`);
}

async function testBasicAuth() {
  const buddyClaw = new EnhancedBuddyClaw();
  
  // Test Basic authentication (dry run)
  const testData = {
    site_base_url: 'https://example.com',
    wp_username: 'testuser',
    wp_password: 'test_password',
    content_target: 'post',
    title: 'Basic Auth Test Post',
    content: '<p>This is a test post using basic authentication.</p>',
    status: 'draft',
    dry_run: true
  };
  
  const result = await buddyClaw.processInput(testData);
  
  if (!result.success) {
    throw new Error(`Basic auth failed: ${result.error}`);
  }
  
  if (!result.dry_run) {
    throw new Error('Dry run not detected for basic auth test');
  }
  
  if (result.auth_method !== 'basic_auth') {
    throw new Error(`Expected auth_method 'basic_auth', got '${result.auth_method}'`);
  }
  
  console.log(`   ✓ Basic authentication successful`);
  console.log(`   ✓ Auth method detected: ${result.auth_method}`);
}

async function testMultiAgentAuth() {
  const buddyClaw = new EnhancedBuddyClaw();
  
  // Test Multi-Agent authentication (dry run)
  const testData = {
    agent_email: 'test-agent@example.com',
    site_base_url: 'https://example.com',
    content_target: 'post',
    title: 'Multi-Agent Test Post',
    content: '<p>This is a test post using multi-agent authentication.</p>',
    status: 'draft',
    dry_run: true
  };
  
  const result = await buddyClaw.processInput(testData);
  
  if (!result.success) {
    throw new Error(`Multi-agent auth failed: ${result.error}`);
  }
  
  if (!result.dry_run) {
    throw new Error('Dry run not detected for multi-agent test');
  }
  
  console.log(`   ✓ Multi-agent authentication successful`);
  console.log(`   ✓ Agent registration process initiated`);
}

async function testAuthMethodDetection() {
  const buddyClaw = new EnhancedBuddyClaw();
  
  // Test authentication method priority detection
  console.log(`   ⏳ Testing auth method priority detection...`);
  
  // Priority: API Token > App Password > Basic Auth
  
  // Test 1: API Token should take priority
  const tokenData = {
    site_base_url: 'https://example.com',
    wp_api_token: 'test_token',
    wp_username: 'testuser',
    wp_app_password: 'test_app_pass',
    content_target: 'post',
    title: 'Priority Test',
    content: '<p>Test</p>',
    dry_run: true
  };
  
  const tokenResult = await buddyClaw.processInput(tokenData);
  if (tokenResult.auth_method !== 'api_token') {
    throw new Error(`API token should have priority, got '${tokenResult.auth_method}'`);
  }
  
  // Test 2: App Password should be second priority
  const appPassData = {
    site_base_url: 'https://example.com',
    wp_username: 'testuser',
    wp_app_password: 'test_app_pass',
    wp_password: 'test_password',
    content_target: 'post',
    title: 'Priority Test',
    content: '<p>Test</p>',
    dry_run: true
  };
  
  const appPassResult = await buddyClaw.processInput(appPassData);
  if (appPassResult.auth_method !== 'app_password') {
    throw new Error(`App password should have second priority, got '${appPassResult.auth_method}'`);
  }
  
  // Test 3: Basic Auth should be last priority
  const basicAuthData = {
    site_base_url: 'https://example.com',
    wp_username: 'testuser',
    wp_password: 'test_password',
    content_target: 'post',
    title: 'Priority Test',
    content: '<p>Test</p>',
    dry_run: true
  };
  
  const basicAuthResult = await buddyClaw.processInput(basicAuthData);
  if (basicAuthResult.auth_method !== 'basic_auth') {
    throw new Error(`Basic auth should be last priority, got '${basicAuthResult.auth_method}'`);
  }
  
  console.log(`   ✓ Auth method priority detection working correctly`);
  console.log(`   ✓ Priority order: API Token > App Password > Basic Auth`);
}

// Main execution
if (require.main === module) {
  testApiTokenAuthentication().then(results => {
    console.log(`\n🎯 API Token Authentication Test Suite Completed!`);
    process.exit(results.failed > 0 ? 1 : 0);
  }).catch(error => {
    console.error(`\n💥 Test Suite Error: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { testApiTokenAuthentication };