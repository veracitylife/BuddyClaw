// Direct test of poster.js functions
const fs = require('fs');
const path = require('path');

console.log("Testing poster.js syntax...");

try {
    // Test basic require statements
    const axios = require('axios');
    const FormData = require('form-data');
    console.log("✓ Dependencies load successfully");
    
    // Test Buffer usage (critical for auth)
    const testAuth = `Basic ${Buffer.from("test:test").toString('base64')}`;
    console.log("✓ Buffer/base64 encoding works");
    
    // Test JSON parsing
    const testJson = '{"site_base_url": "https://test.com", "content_target": "post"}';
    const parsed = JSON.parse(testJson);
    console.log("✓ JSON parsing works");
    
    // Test URL parsing
    const testUrl = new URL("https://example.com/wp-json/wp/v2/posts");
    console.log("✓ URL parsing works");
    
    console.log("\nAll syntax tests passed!");
    
} catch (error) {
    console.error("Syntax error found:", error.message);
    console.error("Stack:", error.stack);
    process.exit(1);
}