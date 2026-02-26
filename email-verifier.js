const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Email Verifier - Himalaya Mail Client Integration
 * Spun Web Technology - Version 0.0.1
 */

class EmailVerifier {
  constructor(configPath = '~/.config/himalaya/config.toml') {
    this.configPath = configPath.replace('~', process.env.HOME || process.env.USERPROFILE);
    this.defaultWaitTime = 30000; // 30 seconds
    this.checkInterval = 5000; // 5 seconds
  }

  async checkEmailVerification(email, expectedSubject = 'WordPress', timeout = this.defaultWaitTime) {
    console.log(`Checking email verification for ${email}...`);
    
    const startTime = Date.now();
    let attempts = 0;
    
    while (Date.now() - startTime < timeout) {
      attempts++;
      console.log(`Attempt ${attempts}: Checking for verification email...`);
      
      try {
        const result = await this.searchForEmail(email, expectedSubject);
        
        if (result.found) {
          console.log(`Verification email found!`);
          return {
            success: true,
            email: result.email,
            verificationLink: result.verificationLink,
            subject: result.subject,
            foundAt: new Date().toISOString()
          };
        }
        
        console.log(`No verification email found yet, waiting ${this.checkInterval/1000} seconds...`);
        await this.sleep(this.checkInterval);
        
      } catch (error) {
        console.error(`Email check attempt ${attempts} failed:`, error.message);
        // Continue trying even if individual attempts fail
        await this.sleep(this.checkInterval);
      }
    }
    
    console.log(`Email verification check timed out after ${timeout/1000} seconds`);
    return {
      success: false,
      error: `No verification email found within ${timeout/1000} seconds`,
      attempts: attempts
    };
  }

  async searchForEmail(email, subjectKeyword) {
    return new Promise((resolve, reject) => {
      // Search for emails with the subject keyword
      const searchProcess = spawn('himalaya', [
        'search',
        '--to', email,
        '--subject', subjectKeyword,
        '--format', 'json',
        '--limit', '10'
      ]);

      let stdout = '';
      let stderr = '';

      searchProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      searchProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      searchProcess.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Himalaya search failed: ${stderr}`));
          return;
        }

        try {
          const results = JSON.parse(stdout);
          
          if (results && results.length > 0) {
            // Get the most recent email
            const latestEmail = results[0];
            
            // Fetch the full email content
            this.getEmailContent(latestEmail.id).then(emailContent => {
              const verificationLink = this.extractVerificationLink(emailContent);
              
              resolve({
                found: true,
                email: latestEmail,
                verificationLink: verificationLink,
                subject: latestEmail.subject
              });
            }).catch(reject);
            
          } else {
            resolve({ found: false });
          }
          
        } catch (error) {
          reject(new Error(`Failed to parse Himalaya output: ${error.message}`));
        }
      });

      searchProcess.on('error', (error) => {
        reject(new Error(`Failed to spawn Himalaya: ${error.message}`));
      });

      // Timeout after 10 seconds
      setTimeout(() => {
        searchProcess.kill();
        reject(new Error('Himalaya search timed out'));
      }, 10000);
    });
  }

  async getEmailContent(emailId) {
    return new Promise((resolve, reject) => {
      const readProcess = spawn('himalaya', [
        'read',
        emailId.toString(),
        '--format', 'json'
      ]);

      let stdout = '';
      let stderr = '';

      readProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      readProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      readProcess.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Himalaya read failed: ${stderr}`));
          return;
        }

        try {
          const emailData = JSON.parse(stdout);
          resolve(emailData);
        } catch (error) {
          reject(new Error(`Failed to parse email content: ${error.message}`));
        }
      });

      readProcess.on('error', (error) => {
        reject(new Error(`Failed to spawn Himalaya read: ${error.message}`));
      });

      setTimeout(() => {
        readProcess.kill();
        reject(new Error('Himalaya read timed out'));
      }, 5000);
    });
  }

  extractVerificationLink(emailContent) {
    if (!emailContent || !emailContent.body) {
      return null;
    }

    const body = emailContent.body;
    
    // Common WordPress verification link patterns
    const patterns = [
      /https?:\/\/[^\s]+\/wp-login\.php\?action=rp[^\s"']*/gi,
      /https?:\/\/[^\s]+\/wp-activate\.php[^\s"']*/gi,
      /https?:\/\/[^\s]+\/confirm[^\s"']*/gi,
      /https?:\/\/[^\s]+\/verify[^\s"']*/gi
    ];

    for (const pattern of patterns) {
      const matches = body.match(pattern);
      if (matches && matches.length > 0) {
        return matches[0];
      }
    }

    // Fallback: extract any HTTP/HTTPS link
    const genericPattern = /https?:\/\/[^\s"'<>]+/gi;
    const genericMatches = body.match(genericPattern);
    if (genericMatches && genericMatches.length > 0) {
      return genericMatches[0];
    }

    return null;
  }

  async clickVerificationLink(link) {
    console.log(`Clicking verification link: ${link}`);
    
    try {
      // Use curl to visit the verification link
      const curlProcess = spawn('curl', [
        '-L', // Follow redirects
        '-s', // Silent mode
        '-w', 'HTTP_CODE:%{http_code}', // Write out HTTP code
        link
      ]);

      let stdout = '';
      let stderr = '';

      curlProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      curlProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      return new Promise((resolve) => {
        curlProcess.on('close', (code) => {
          const httpCode = this.extractHttpCode(stdout);
          
          if (httpCode >= 200 && httpCode < 400) {
            resolve({
              success: true,
              httpCode: httpCode,
              message: 'Verification link clicked successfully'
            });
          } else {
            resolve({
              success: false,
              httpCode: httpCode,
              error: `HTTP ${httpCode} response`,
              output: stdout
            });
          }
        });

        setTimeout(() => {
          curlProcess.kill();
          resolve({
            success: false,
            error: 'Verification link request timed out'
          });
        }, 15000);
      });
      
    } catch (error) {
      return {
        success: false,
        error: `Failed to click verification link: ${error.message}`
      };
    }
  }

  extractHttpCode(output) {
    const match = output.match(/HTTP_CODE:(\d+)/);
    return match ? parseInt(match[1]) : 0;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // CLI Interface
  static async main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
      console.log(JSON.stringify({
        error: "No command provided",
        usage: "node email-verifier.js --check --email EMAIL [--subject SUBJECT] [--timeout SECONDS]"
      }));
      process.exit(1);
    }

    const command = args[0];
    const verifier = new EmailVerifier();

    switch (command) {
      case '--check':
        const email = args.find(arg => arg.startsWith('--email='))?.split('=')[1];
        const subject = args.find(arg => arg.startsWith('--subject='))?.split('=')[1] || 'WordPress';
        const timeout = parseInt(args.find(arg => arg.startsWith('--timeout='))?.split('=')[1] || '300') * 1000;
        
        if (!email) {
          console.log(JSON.stringify({ error: "Email required" }));
          process.exit(1);
        }
        
        console.log(`Checking email verification for ${email}...`);
        const result = await verifier.checkEmailVerification(email, subject, timeout);
        console.log(JSON.stringify(result));
        process.exit(result.success ? 0 : 1);
        break;
        
      default:
        console.log(JSON.stringify({ error: "Unknown command", command }));
        process.exit(1);
    }
  }
}

// Export for use in other modules
module.exports = EmailVerifier;

// CLI execution
if (require.main === module) {
  EmailVerifier.main();
}