const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Email Verifier - Himalaya Mail Client Integration
 * Spun Web Technology - Version 0.0.1
 */

class EmailVerifier {
  constructor(options = '~/.config/himalaya/config.toml') {
    const configPath =
      typeof options === 'string' ? options : (options.configPath || '~/.config/himalaya/config.toml');
    this.configPath = configPath.replace('~', process.env.HOME || process.env.USERPROFILE);
    this.account = typeof options === 'object' && options.account ? String(options.account) : '';
    this.folder = typeof options === 'object' && options.folder ? String(options.folder) : 'INBOX';
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

  getGlobalArgs() {
    const args = ['--config', this.configPath];
    if (this.account) args.push('--account', this.account);
    return args;
  }

  runHimalaya(args, timeoutMs) {
    return new Promise((resolve, reject) => {
      const p = spawn('himalaya', args);
      let stdout = '';
      let stderr = '';

      const timeout = setTimeout(() => {
        try {
          p.kill();
        } catch (_) {}
        reject(new Error('Himalaya command timed out'));
      }, timeoutMs);

      p.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      p.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      p.on('error', (error) => {
        clearTimeout(timeout);
        reject(new Error(`Failed to spawn Himalaya: ${error.message}`));
      });

      p.on('close', (code) => {
        clearTimeout(timeout);
        if (code !== 0) {
          reject(new Error(stderr || stdout || `Himalaya exited with code ${code}`));
          return;
        }
        resolve(stdout);
      });
    });
  }

  async runHimalayaJson(args, timeoutMs) {
    const stdout = await this.runHimalaya(args, timeoutMs);
    return JSON.parse(stdout);
  }

  normalizeEnvelopeResults(results) {
    const list = Array.isArray(results)
      ? results
      : (results?.data || results?.envelopes || results?.items || []);
    return Array.isArray(list) ? list : [];
  }

  async searchForEmail(email, subjectKeyword) {
    const query = `to:${email} subject:${subjectKeyword}`;
    const globalArgs = this.getGlobalArgs();

    let envelopes;
    try {
      const results = await this.runHimalayaJson(
        [
          ...globalArgs,
          'envelope',
          'list',
          '--output',
          'json',
          '--folder',
          this.folder,
          '--query',
          query
        ],
        10000
      );
      envelopes = this.normalizeEnvelopeResults(results);
    } catch (_) {
      const results = await this.runHimalayaJson(
        [
          ...globalArgs,
          'search',
          '--to',
          email,
          '--subject',
          subjectKeyword,
          '--format',
          'json',
          '--limit',
          '10'
        ],
        10000
      );
      envelopes = this.normalizeEnvelopeResults(results);
    }

    if (!envelopes.length) return { found: false };

    const latestEmail = envelopes[0];
    const emailId = latestEmail.id || latestEmail.message_id || latestEmail.messageId;
    const emailContent = await this.getEmailContent(emailId);
    const verificationLink = this.extractVerificationLink(emailContent);

    return {
      found: true,
      email: latestEmail,
      verificationLink: verificationLink,
      subject: latestEmail.subject
    };
  }

  async getEmailContent(emailId) {
    const globalArgs = this.getGlobalArgs();
    try {
      return await this.runHimalayaJson(
        [
          ...globalArgs,
          'message',
          'read',
          emailId.toString(),
          '--output',
          'json'
        ],
        5000
      );
    } catch (_) {
      return await this.runHimalayaJson(
        [
          ...globalArgs,
          'read',
          emailId.toString(),
          '--format',
          'json'
        ],
        5000
      );
    }
  }

  extractBodyText(emailContent) {
    if (!emailContent) return '';
    if (typeof emailContent === 'string') return emailContent;

    const candidates = [
      emailContent.body,
      emailContent.text,
      emailContent.plain,
      emailContent.content,
      emailContent.raw
    ];

    for (const c of candidates) {
      if (!c) continue;
      if (typeof c === 'string') return c;
      if (Array.isArray(c)) {
        return c
          .map((p) => {
            if (!p) return '';
            if (typeof p === 'string') return p;
            if (typeof p.text === 'string') return p.text;
            if (typeof p.plain === 'string') return p.plain;
            if (typeof p.raw === 'string') return p.raw;
            return JSON.stringify(p);
          })
          .join('\n');
      }
      if (typeof c === 'object') {
        if (typeof c.text === 'string') return c.text;
        if (typeof c.plain === 'string') return c.plain;
        if (typeof c.raw === 'string') return c.raw;
        return JSON.stringify(c);
      }
    }

    try {
      return JSON.stringify(emailContent);
    } catch (_) {
      return String(emailContent);
    }
  }

  extractVerificationLink(emailContent) {
    const body = this.extractBodyText(emailContent);
    if (!body) return null;
    
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
