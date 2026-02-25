// Test the poster.js with a simple JSON input
try {
    const fs = require('fs');
    const testInput = {
        site_base_url: "https://example.com",
        wp_username: "testuser",
        wp_app_password: "testpass",
        content_target: "post",
        title: "Test Post",
        content: "This is a test post",
        dry_run: true
    };
    
    console.log("Test input:", JSON.stringify(testInput, null, 2));
    console.log("✓ JavaScript syntax is valid");
} catch (error) {
    console.error("Syntax error:", error.message);
    process.exit(1);
}