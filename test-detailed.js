// Enhanced test with detailed logging
const fs = require('fs');
const { spawn } = require('child_process');

console.log("Testing BuddyClaw with disruptarian.com credentials...");

const testInput = JSON.stringify({
  "site_base_url": "https://disruptarian.com/community",
  "wp_username": "clovisstar.com@gmail.com",
  "wp_app_password": "*mQ#&G1{4ff2<",
  "content_target": "post",
  "title": "Test Post from BuddyClaw",
  "content": "<p>This is a test post from the BuddyClaw skill to verify authentication and posting functionality.</p>",
  "status": "draft",
  "dry_run": false
});

console.log("Test input:", testInput);

const child = spawn('node', ['poster.js'], {
  stdio: ['pipe', 'pipe', 'pipe'],
  cwd: 'C:\\Users\\disru\\Documents\\clawhub\\wordpress\\buddyclaw\\buddyclaw0.0.1\\buddyclaw'
});

let stdout = '';
let stderr = '';

child.stdout.on('data', (data) => {
  stdout += data.toString();
  console.log("STDOUT:", data.toString());
});

child.stderr.on('data', (data) => {
  stderr += data.toString();
  console.log("STDERR:", data.toString());
});

child.on('close', (code) => {
  console.log(`Process exited with code ${code}`);
  console.log("Full STDOUT:", stdout);
  console.log("Full STDERR:", stderr);
  
  if (code === 0) {
    try {
      const result = JSON.parse(stdout);
      console.log("✅ Success! Response:", JSON.stringify(result, null, 2));
      
      if (result.success && result.data) {
        console.log("Post created successfully!");
        console.log("Post ID:", result.data.id);
        console.log("Post URL:", result.data.link);
      } else {
        console.log("Response received but format unexpected:", result);
      }
    } catch (e) {
      console.log("Raw output:", stdout);
    }
  } else {
    console.log("❌ Failed with exit code", code);
  }
});

// Send input to stdin
child.stdin.write(testInput);
child.stdin.end();