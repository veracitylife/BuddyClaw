#!/usr/bin/env node

/**
 * Test script for interactive Q&A onboarding
 * BuddyClaw v0.0.4
 */

const OpenClawIntegration = require('./openclaw-integration');

async function testInteractiveOnboarding() {
  console.log('🧪 Testing Interactive Q&A Onboarding for BuddyClaw v0.0.4\n');
  
  const integration = new OpenClawIntegration();
  
  // Simulate a user session
  const userId = 'test-user-123';
  
  // Test Step 1: Welcome
  console.log('📍 Step 1: Welcome');
  const welcomeResponse = await integration.handleSetup({
    raw: 'setup',
    context: { userId }
  });
  console.log('Response:', welcomeResponse.message);
  console.log('Next step:', welcomeResponse.data?.next_step);
  console.log('');
  
  // Test Step 2: Continue to vault check
  console.log('📍 Step 2: Continue to vault check');
  const continueResponse = await integration.handleSetup({
    raw: 'continue',
    context: { userId }
  });
  console.log('Response:', continueResponse.message);
  console.log('Next step:', continueResponse.data?.next_step);
  console.log('');
  
  // Test Step 3: Vault response (say no to skip)
  console.log('📍 Step 3: Skip vault check');
  const vaultResponse = await integration.handleSetup({
    raw: 'no',
    context: { userId }
  });
  console.log('Response:', vaultResponse.message);
  console.log('Next step:', vaultResponse.data?.next_step);
  console.log('');
  
  // Test Step 4: Site URL
  console.log('📍 Step 4: Enter site URL');
  const siteUrlResponse = await integration.handleSetup({
    raw: 'https://testsite.com',
    context: { userId }
  });
  console.log('Response:', siteUrlResponse.message);
  console.log('Next step:', siteUrlResponse.data?.next_step);
  console.log('');
  
  // Test Step 5: Auth method (choose 1)
  console.log('📍 Step 5: Choose auth method');
  const authResponse = await integration.handleSetup({
    raw: '1',
    context: { userId }
  });
  console.log('Response:', authResponse.message);
  console.log('Next step:', authResponse.data?.next_step);
  console.log('');
  
  // Test Step 6: Auth credentials
  console.log('📍 Step 6: Enter auth credentials');
  const credsResponse = await integration.handleSetup({
    raw: 'testuser',
    context: { userId }
  });
  console.log('Response:', credsResponse.message);
  console.log('Next step:', credsResponse.data?.next_step);
  console.log('');
  
  // Test Step 7: CAPTCHA config (skip)
  console.log('📍 Step 7: Skip CAPTCHA');
  const captchaResponse = await integration.handleSetup({
    raw: 'skip',
    context: { userId }
  });
  console.log('Response:', captchaResponse.message);
  console.log('Next step:', captchaResponse.data?.next_step);
  console.log('');
  
  // Test Step 8: Content preferences
  console.log('📍 Step 8: Content preferences');
  const prefsResponse = await integration.handleSetup({
    raw: 'yes yes yes no',
    context: { userId }
  });
  console.log('Response:', prefsResponse.message);
  console.log('Next step:', prefsResponse.data?.next_step);
  console.log('Onboarding complete:', prefsResponse.data?.onboarding_complete);
  console.log('');
  
  console.log('✅ Interactive Q&A onboarding test completed!');
  
  // Check if configuration was saved
  try {
    const fs = require('fs');
    const config = JSON.parse(fs.readFileSync('buddyclaw-config.json', 'utf8'));
    console.log('\n📋 Saved configuration:');
    console.log(JSON.stringify(config, null, 2));
  } catch (error) {
    console.log('\n❌ Configuration file not found or invalid');
  }
}

// Run the test
testInteractiveOnboarding().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});