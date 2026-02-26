const fs = require('fs');
const path = require('path');
const readline = require('readline');

/**
 * BuddyClaw Interactive Onboarding
 * Guides users through WordPress configuration setup
 * Spun Web Technology - Version 0.0.2
 */

class BuddyClawOnboarding {
  constructor() {
    this.config = {};
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async start() {
    console.log('📝 BuddyClaw WordPress Configuration Onboarding');
    console.log('='.repeat(50));
    console.log('This wizard will help you configure BuddyClaw for your WordPress site.');
    console.log('You can choose from multiple authentication methods:');
    console.log('1. REST API Token (Recommended)');
    console.log('2. Application Password');
    console.log('3. Basic Authentication');
    console.log('4. Multi-Agent Mode (Email-based)');
    console.log('');

    try {
      await this.selectAuthenticationMethod();
      await this.gatherSiteInformation();
      await this.configureAuthentication();
      await this.testConnection();
      await this.saveConfiguration();
      
      console.log('\n✅ Onboarding completed successfully!');
      console.log('You can now use BuddyClaw to publish content to your WordPress site.');
      console.log('Run: node enhanced-poster.js');
      
    } catch (error) {
      console.error('\n❌ Onboarding failed:', error.message);
      process.exit(1);
    } finally {
      this.rl.close();
    }
  }

  async selectAuthenticationMethod() {
    const method = await this.askQuestion(
      'Select authentication method (1-4): ',
      (answer) => {
        const num = parseInt(answer);
        if (num >= 1 && num <= 4) return num;
        throw new Error('Please enter a number between 1 and 4');
      }
    );

    const methods = {
      1: 'api_token',
      2: 'app_password', 
      3: 'basic_auth',
      4: 'multi_agent'
    };

    this.config.auth_method = methods[method];
    console.log(`Selected: ${this.getAuthMethodName(this.config.auth_method)}`);
  }

  async gatherSiteInformation() {
    console.log('\n🔧 Site Configuration');
    console.log('-'.repeat(30));

    this.config.site_base_url = await this.askQuestion(
      'WordPress site URL (e.g., https://example.com): ',
      (url) => {
        if (!url.startsWith('http')) {
          throw new Error('URL must start with http:// or https://');
        }
        return url.replace(/\/$/, ''); // Remove trailing slash
      }
    );

    this.config.content_target = await this.askQuestion(
      'Default content type (post/page/activity) [post]: ',
      (answer) => answer || 'post'
    );

    this.config.status = await this.askQuestion(
      'Default status (publish/draft/private) [draft]: ',
      (answer) => {
        const status = answer || 'draft';
        if (!['publish', 'draft', 'private'].includes(status)) {
          throw new Error('Status must be publish, draft, or private');
        }
        return status;
      }
    );
  }

  async configureAuthentication() {
    console.log('\n🔐 Authentication Configuration');
    console.log('-'.repeat(30));

    switch (this.config.auth_method) {
      case 'api_token':
        await this.configureApiToken();
        break;
      case 'app_password':
        await this.configureAppPassword();
        break;
      case 'basic_auth':
        await this.configureBasicAuth();
        break;
      case 'multi_agent':
        await this.configureMultiAgent();
        break;
    }
  }

  async configureApiToken() {
    console.log('REST API Token Setup:');
    console.log('1. Install JWT Authentication plugin on your WordPress site');
    console.log('2. Generate a token via POST to /wp-json/jwt-auth/v1/token');
    console.log('3. Copy the token below:');
    
    this.config.wp_api_token = await this.askQuestion(
      'Enter your REST API token: ',
      (token) => {
        if (!token || token.length < 10) {
          throw new Error('Token appears to be invalid');
        }
        return token;
      }
    );
  }

  async configureAppPassword() {
    console.log('Application Password Setup:');
    console.log('1. Go to WordPress Admin → Users → Your Profile');
    console.log('2. Scroll to "Application Passwords" section');
    console.log('3. Create a new application password');
    console.log('4. Copy the generated password (it won\'t be shown again)');
    
    this.config.wp_username = await this.askQuestion('WordPress username: ');
    this.config.wp_app_password = await this.askQuestion(
      'Application password: ',
      (password) => {
        if (!password || password.length < 12) {
          throw new Error('Application password appears to be invalid');
        }
        return password;
      }
    );
  }

  async configureBasicAuth() {
    console.log('Basic Authentication Setup:');
    console.log('⚠️  Warning: This method is less secure. Consider using Application Passwords instead.');
    
    this.config.wp_username = await this.askQuestion('WordPress username: ');
    this.config.wp_password = await this.askQuestion('WordPress password: ');
  }

  async configureMultiAgent() {
    console.log('Multi-Agent Mode Setup:');
    console.log('This mode will automatically create WordPress accounts for agents.');
    console.log('Requires Himalaya email client for verification.');
    
    this.config.agent_email = await this.askQuestion(
      'Agent email address: ',
      (email) => {
        if (!email.includes('@')) {
          throw new Error('Invalid email address');
        }
        return email;
      }
    );

    const hasHimalaya = await this.askQuestion(
      'Is Himalaya email client installed? (y/n) [n]: ',
      (answer) => answer.toLowerCase() === 'y'
    );

    if (!hasHimalaya) {
      console.log('Please install Himalaya first:');
      console.log('cargo install himalaya');
      console.log('Then configure it with: himalaya configure');
      throw new Error('Himalaya is required for multi-agent mode');
    }
  }

  async testConnection() {
    console.log('\n🧪 Testing Connection');
    console.log('-'.repeat(30));

    try {
      const testResult = await this.performConnectionTest();
      if (testResult.success) {
        console.log('✅ Connection test passed!');
        console.log('WordPress Version:', testResult.wordpress_version);
        console.log('User:', testResult.user_name);
        console.log('Permissions:', testResult.permissions.join(', '));
      } else {
        console.log('❌ Connection test failed:', testResult.error);
        const retry = await this.askQuestion(
          'Do you want to retry configuration? (y/n) [y]: ',
          (answer) => (answer || 'y').toLowerCase() === 'y'
        );
        if (retry) {
          throw new Error('Please reconfigure your settings');
        }
      }
    } catch (error) {
      console.log('❌ Connection test error:', error.message);
      throw error;
    }
  }

  async performConnectionTest() {
    // Simple test to verify WordPress REST API access
    const axios = require('axios');
    
    try {
      let authHeader = '';
      let testUrl = `${this.config.site_base_url}/wp-json/wp/v2/users/me`;

      switch (this.config.auth_method) {
        case 'api_token':
          authHeader = `Bearer ${this.config.wp_api_token}`;
          break;
        case 'app_password':
        case 'basic_auth':
          const credentials = Buffer.from(
            `${this.config.wp_username}:${this.config.auth_method === 'app_password' ? this.config.wp_app_password : this.config.wp_password}`
          ).toString('base64');
          authHeader = `Basic ${credentials}`;
          break;
        case 'multi_agent':
          // For multi-agent, we'll test the site URL only
          testUrl = `${this.config.site_base_url}/wp-json/`;
          break;
      }

      const response = await axios.get(testUrl, {
        headers: authHeader ? { 'Authorization': authHeader } : {},
        timeout: 10000
      });

      if (this.config.auth_method === 'multi_agent') {
        return {
          success: true,
          wordpress_version: 'N/A (Multi-Agent Mode)',
          user_name: 'Agent Mode',
          permissions: ['registration', 'publishing']
        };
      }

      return {
        success: true,
        wordpress_version: response.headers['x-wp-nonce'] ? 'Modern' : 'Legacy',
        user_name: response.data.name || response.data.slug,
        permissions: this.extractPermissions(response.data)
      };

    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  extractPermissions(userData) {
    const permissions = [];
    if (userData.capabilities) {
      if (userData.capabilities.publish_posts) permissions.push('publish_posts');
      if (userData.capabilities.edit_posts) permissions.push('edit_posts');
      if (userData.capabilities.upload_files) permissions.push('upload_files');
    }
    return permissions.length > 0 ? permissions : ['basic_access'];
  }

  async saveConfiguration() {
    console.log('\n💾 Saving Configuration');
    console.log('-'.repeat(30));

    const configPath = path.join(process.cwd(), 'buddyclaw-config.json');
    
    try {
      // Remove sensitive data from saved config
      const safeConfig = { ...this.config };
      if (safeConfig.wp_api_token) {
        safeConfig.wp_api_token_masked = this.maskToken(safeConfig.wp_api_token);
        delete safeConfig.wp_api_token;
      }
      if (safeConfig.wp_app_password) {
        safeConfig.wp_app_password_masked = this.maskPassword(safeConfig.wp_app_password);
        delete safeConfig.wp_app_password;
      }
      if (safeConfig.wp_password) {
        safeConfig.wp_password_masked = this.maskPassword(safeConfig.wp_password);
        delete safeConfig.wp_password;
      }

      fs.writeFileSync(configPath, JSON.stringify(safeConfig, null, 2));
      console.log(`✅ Configuration saved to: ${configPath}`);
      
      // Also create environment file for OpenClaw
      await this.createEnvironmentFile();
      
    } catch (error) {
      throw new Error(`Failed to save configuration: ${error.message}`);
    }
  }

  async createEnvironmentFile() {
    const envPath = path.join(process.cwd(), '.env.buddyclaw');
    let envContent = '# BuddyClaw Environment Variables\n';
    envContent += '# Generated by onboarding wizard\n\n';

    if (this.config.wp_username) {
      envContent += `WP_USERNAME=${this.config.wp_username}\n`;
    }
    if (this.config.wp_app_password) {
      envContent += `WP_APP_PASSWORD=${this.config.wp_app_password}\n`;
    }
    if (this.config.wp_api_token) {
      envContent += `WP_API_TOKEN=${this.config.wp_api_token}\n`;
    }

    try {
      fs.writeFileSync(envPath, envContent);
      console.log(`✅ Environment file created: ${envPath}`);
    } catch (error) {
      console.log(`⚠️  Could not create environment file: ${error.message}`);
    }
  }

  maskToken(token) {
    if (token.length <= 10) return '***';
    return token.substring(0, 4) + '...' + token.substring(token.length - 4);
  }

  maskPassword(password) {
    if (password.length <= 4) return '***';
    return '***' + password.substring(password.length - 2);
  }

  getAuthMethodName(method) {
    const names = {
      'api_token': 'REST API Token',
      'app_password': 'Application Password', 
      'basic_auth': 'Basic Authentication',
      'multi_agent': 'Multi-Agent Mode'
    };
    return names[method] || method;
  }

  askQuestion(prompt, validator) {
    return new Promise((resolve, reject) => {
      this.rl.question(prompt, (answer) => {
        try {
          if (validator) {
            resolve(validator(answer));
          } else {
            resolve(answer);
          }
        } catch (error) {
          console.log(`❌ ${error.message}`);
          // Ask again
          this.askQuestion(prompt, validator).then(resolve).catch(reject);
        }
      });
    });
  }
}

// Run onboarding if called directly
if (require.main === module) {
  const onboarding = new BuddyClawOnboarding();
  onboarding.start().catch(console.error);
}

module.exports = BuddyClawOnboarding;