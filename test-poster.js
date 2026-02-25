// Test script to run poster.js with test input
const fs = require('fs');
const { spawn } = require('child_process');

console.log("Testing poster.js with test input...");

try {
    const testInput = JSON.stringify({
        site_base_url: "https://example.com",
        wp_username: "testuser",
        wp_app_password: "testpass",
        content_target: "post",
        title: "Test Post",
        content: "This is a test post",
        dry_run: true
    });

    console.log("Input:", testInput);

    // Write test input to file
    fs.writeFileSync('test-input.json', testInput);

    // Run poster.js with the test input
    const child = spawn('node', ['poster.js', 'test-input.json'], {
        stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
        stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
        stderr += data.toString();
    });

    child.on('close', (code) => {
        console.log(`Process exited with code ${code}`);
        console.log("STDOUT:", stdout);
        console.log("STDERR:", stderr);
        
        if (code === 0) {
            console.log("✅ poster.js executed successfully!");
        } else {
            console.log("❌ poster.js failed with exit code", code);
        }
        
        // Cleanup
        if (fs.existsSync('test-input.json')) {
            fs.unlinkSync('test-input.json');
        }
    });

} catch (error) {
    console.error("Test failed:", error.message);
    console.error("Stack:", error.stack);
}