/**
 * Test script for chat onboarding integration
 * Tests the OpenClaw integration with chat-based onboarding
 */

const OpenClawIntegration = require('./openclaw-integration');

async function testChatIntegration() {
    console.log('🧪 Testing BuddyClaw Chat Integration\n');
    
    const integration = new OpenClawIntegration();
    
    // Test 1: Setup command
    console.log('📋 Test 1: Setup Command');
    console.log('=========================');
    try {
        const setupResult = await integration.processChatCommand('setup');
        console.log('✅ Setup command result:');
        console.log(JSON.stringify(setupResult, null, 2));
        console.log('');
    } catch (error) {
        console.log('❌ Setup command failed:', error.message);
        console.log('');
    }
    
    // Test 2: Help command
    console.log('📋 Test 2: Help Command');
    console.log('========================');
    try {
        const helpResult = await integration.processChatCommand('help');
        console.log('✅ Help command result:');
        console.log(JSON.stringify(helpResult, null, 2));
        console.log('');
    } catch (error) {
        console.log('❌ Help command failed:', error.message);
        console.log('');
    }
    
    // Test 3: Post command (should fail without config)
    console.log('📋 Test 3: Post Command (No Config)');
    console.log('=====================================');
    try {
        const postResult = await integration.processChatCommand('post "Hello World!"');
        console.log('✅ Post command result:');
        console.log(JSON.stringify(postResult, null, 2));
        console.log('');
    } catch (error) {
        console.log('❌ Post command failed:', error.message);
        console.log('');
    }
    
    // Test 4: Bulk command parsing
    console.log('📋 Test 4: Bulk Command Parsing');
    console.log('===============================');
    try {
        const bulkResult = await integration.processChatCommand('bulk post from RSS https://techcrunch.com/feed/ count:5');
        console.log('✅ Bulk command result:');
        console.log(JSON.stringify(bulkResult, null, 2));
        console.log('');
    } catch (error) {
        console.log('❌ Bulk command failed:', error.message);
        console.log('');
    }
    
    // Test 5: Command parsing
    console.log('📋 Test 5: Command Parsing');
    console.log('==========================');
    try {
        const parsedCommand = integration.parseChatCommand('bulk post from file ./content.json status:published delay:3');
        console.log('✅ Parsed command:');
        console.log(JSON.stringify(parsedCommand, null, 2));
        console.log('');
    } catch (error) {
        console.log('❌ Command parsing failed:', error.message);
        console.log('');
    }
    
    console.log('🎉 Chat Integration Tests Completed!');
    console.log('\n💡 To run the interactive onboarding:');
    console.log('   npm run configure');
    console.log('   or');
    console.log('   node chat-onboarding.js');
    console.log('');
    console.log('💬 To test with OpenClaw:');
    console.log('   setup    - Start interactive configuration');
    console.log('   help     - Show available commands');
    console.log('   post     - Create a single post');
    console.log('   bulk     - Process bulk content');
    console.log('   status   - Show current configuration');
}

// Run tests if this file is executed directly
if (require.main === module) {
    testChatIntegration().catch(console.error);
}

module.exports = { testChatIntegration };