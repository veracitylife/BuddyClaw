const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

/**
 * BuddyClaw Configuration Manager
 * Handles OpenClaw skill configuration and credential management
 * Spun Web Technology - Version 0.0.2
 */

class ConfigManager {
  constructor() {
    this.configPath = path.join(process.cwd(), 'config.yaml');
    this.vaultPath = path.join(process.cwd(), '.vault');
    this.config = null;
  }

  /**
   * Initialize configuration from existing files or create new one
   */
  async initialize() {
    // Try to load existing configuration
    if (fs.existsSync(this.configPath)) {
      this.config = this.loadConfig();
      console.log('✅ Loaded existing configuration');
    } else {
      console.log('ℹ️  No existing configuration found');
      this.config = this.createDefaultConfig();
    }

    // Ensure vault directory exists
    if (!fs.existsSync(this.vaultPath)) {
      fs.mkdirSync(this.vaultPath, { recursive: true });
    }

    return this.config;
  }

  /**
   * Create default configuration structure
   */
  createDefaultConfig() {
    return {
      wordpress: {
        url: '',
        login_url: '',
        username: '',
        password: '',
        content_target: 'post',
        status: 'draft',
        api_token: '',
        auth_method: 'app_password'
      },
      content_style: 'informative',
      browser_automation: {
        enabled: false,
        browserURL: 'http://127.0.0.1:9222',
        registration_path: '/register',
        cdp_ws: ''
      },
      multi_agent: {
        enabled: false,
        email: '',
        himalaya_configured: false
      },
      openclaw: {
        vault_path: this.vaultPath,
        auto_setup: true,
        test_connection: true
      }
    };
  }

  /**
   * Load configuration from YAML file
   */
  loadConfig() {
    try {
      const content = fs.readFileSync(this.configPath, 'utf8');
      return yaml.load(content);
    } catch (error) {
      console.error('❌ Failed to load configuration:', error.message);
      return this.createDefaultConfig();
    }
  }

  /**
   * Save configuration to YAML file
   */
  saveConfig(config = this.config) {
    try {
      const yamlContent = yaml.dump(config, {
        indent: 2,
        lineWidth: 120,
        noRefs: true
      });
      fs.writeFileSync(this.configPath, yamlContent, 'utf8');
      console.log(`✅ Configuration saved to: ${this.configPath}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to save configuration:', error.message);
      return false;
    }
  }

  /**
   * Update configuration with onboarding data
   */
  updateFromOnboarding(onboardingData) {
    const config = this.createDefaultConfig();

    // Update WordPress settings
    if (onboardingData.site_base_url) {
      config.wordpress.url = onboardingData.site_base_url;
      config.wordpress.login_url = `${onboardingData.site_base_url}/wp-login.php`;
    }

    if (onboardingData.content_target) {
      config.wordpress.content_target = onboardingData.content_target;
    }

    if (onboardingData.status) {
      config.wordpress.status = onboardingData.status;
    }

    if (onboardingData.content_style) {
      config.content_style = onboardingData.content_style;
    }

    // Update authentication method
    config.wordpress.auth_method = onboardingData.auth_method || 'app_password';

    // Handle different authentication methods
    switch (config.wordpress.auth_method) {
      case 'api_token':
        if (onboardingData.wp_api_token) {
          config.wordpress.api_token = onboardingData.wp_api_token;
          // Store token securely in vault
          this.storeCredential('api_token', onboardingData.wp_api_token);
        }
        break;

      case 'app_password':
        if (onboardingData.wp_username) {
          config.wordpress.username = onboardingData.wp_username;
        }
        if (onboardingData.wp_app_password) {
          // Store password securely in vault
          this.storeCredential('app_password', onboardingData.wp_app_password);
        }
        break;

      case 'basic_auth':
        if (onboardingData.wp_username) {
          config.wordpress.username = onboardingData.wp_username;
        }
        if (onboardingData.wp_password) {
          // Store password securely in vault
          this.storeCredential('password', onboardingData.wp_password);
        }
        break;

      case 'multi_agent':
        if (onboardingData.agent_email) {
          config.multi_agent.enabled = true;
          config.multi_agent.email = onboardingData.agent_email;
          config.multi_agent.himalaya_configured = true;
        }
        break;
    }

    // Browser automation settings
    if (typeof onboardingData.browser_enabled === 'boolean') {
      config.browser_automation.enabled = onboardingData.browser_enabled;
    }
    if (onboardingData.browser_url) {
      config.browser_automation.browserURL = onboardingData.browser_url;
    }
    if (onboardingData.cdp_ws) {
      config.browser_automation.cdp_ws = onboardingData.cdp_ws;
    }
    if (onboardingData.registration_path) {
      config.browser_automation.registration_path = onboardingData.registration_path;
    }

    this.config = config;
    return this.saveConfig();
  }

  /**
   * Get flattened config for convenience
   */
  getConfig() {
    if (!this.config) {
      throw new Error('Configuration not initialized');
    }
    const wp = this.config.wordpress || {};
    const browser = this.config.browser_automation || {};
    return {
      url: wp.url || '',
      login_url: wp.login_url || '',
      auth_method: wp.auth_method || 'app_password',
      content_target: wp.content_target || 'post',
      status: wp.status || 'draft',
      content_style: this.config.content_style || (this.config.content && this.config.content.style) || 'informative',
      browser_enabled: !!browser.enabled,
      browser_url: browser.browserURL || '',
      registration_path: browser.registration_path || '/register',
      cdp_ws: browser.cdp_ws || '',
      multi_agent_email: (this.config.multi_agent && this.config.multi_agent.email) || ''
    };
  }

  /**
   * Store credential securely in vault
   */
  storeCredential(type, value) {
    const credentialFile = path.join(this.vaultPath, `${type}.txt`);
    try {
      fs.writeFileSync(credentialFile, value, 'utf8');
      console.log(`✅ Stored ${type} credential securely`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to store ${type} credential:`, error.message);
      return false;
    }
  }

  /**
   * Retrieve credential from vault
   */
  getCredential(type) {
    const credentialFile = path.join(this.vaultPath, `${type}.txt`);
    try {
      if (fs.existsSync(credentialFile)) {
        return fs.readFileSync(credentialFile, 'utf8').trim();
      }
    } catch (error) {
      console.error(`❌ Failed to retrieve ${type} credential:`, error.message);
    }
    return null;
  }

  /**
   * Get WordPress credentials based on authentication method
   */
  getWordPressCredentials() {
    if (!this.config) {
      throw new Error('Configuration not initialized');
    }

    const wpConfig = this.config.wordpress;
    const credentials = {
      url: wpConfig.url,
      login_url: wpConfig.login_url,
      content_target: wpConfig.content_target,
      status: wpConfig.status,
      auth_method: wpConfig.auth_method
    };

    switch (wpConfig.auth_method) {
      case 'api_token':
        credentials.api_token = this.getCredential('api_token') || wpConfig.api_token;
        break;

      case 'app_password':
        credentials.username = wpConfig.username;
        credentials.app_password = this.getCredential('app_password');
        break;

      case 'basic_auth':
        credentials.username = wpConfig.username;
        credentials.password = this.getCredential('password');
        break;

      case 'multi_agent':
        credentials.multi_agent = this.config.multi_agent;
        break;
    }

    return credentials;
  }

  /**
   * Validate configuration completeness
   */
  validateConfig() {
    if (!this.config) {
      return { valid: false, errors: ['Configuration not initialized'] };
    }

    const errors = [];
    const wpConfig = this.config.wordpress;

    // Validate URL
    if (!wpConfig.url || !wpConfig.url.startsWith('http')) {
      errors.push('WordPress URL is required and must start with http:// or https://');
    }

    // Validate authentication method
    const validAuthMethods = ['api_token', 'app_password', 'basic_auth', 'multi_agent'];
    if (!validAuthMethods.includes(wpConfig.auth_method)) {
      errors.push(`Invalid authentication method: ${wpConfig.auth_method}`);
    }

    // Validate authentication credentials based on method
    switch (wpConfig.auth_method) {
      case 'api_token':
        const apiToken = this.getCredential('api_token') || wpConfig.api_token;
        if (!apiToken) {
          errors.push('API token is required for API token authentication');
        }
        break;

      case 'app_password':
        if (!wpConfig.username) {
          errors.push('Username is required for application password authentication');
        }
        const appPassword = this.getCredential('app_password');
        if (!appPassword) {
          errors.push('Application password is required for application password authentication');
        }
        break;

      case 'basic_auth':
        if (!wpConfig.username) {
          errors.push('Username is required for basic authentication');
        }
        const password = this.getCredential('password');
        if (!password) {
          errors.push('Password is required for basic authentication');
        }
        break;

      case 'multi_agent':
        if (!this.config.multi_agent.email) {
          errors.push('Agent email is required for multi-agent mode');
        }
        break;
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Test connection to WordPress site
   */
  async testConnection() {
    const axios = require('axios');
    
    try {
      const credentials = this.getWordPressCredentials();
      let authHeader = '';
      let testUrl = `${credentials.url}/wp-json/wp/v2/users/me`;

      switch (credentials.auth_method) {
        case 'api_token':
          authHeader = `Bearer ${credentials.api_token}`;
          break;

        case 'app_password':
        case 'basic_auth':
          const password = credentials.auth_method === 'app_password' ? 
            credentials.app_password : credentials.password;
          const basicAuth = Buffer.from(`${credentials.username}:${password}`).toString('base64');
          authHeader = `Basic ${basicAuth}`;
          break;

        case 'multi_agent':
          // For multi-agent, just test if site is accessible
          testUrl = `${credentials.url}/wp-json/`;
          break;
      }

      const response = await axios.get(testUrl, {
        headers: authHeader ? { 'Authorization': authHeader } : {},
        timeout: 10000
      });

      return {
        success: true,
        wordpress_version: response.headers['x-wp-nonce'] ? 'Modern' : 'Legacy',
        user_name: response.data.name || response.data.slug || 'N/A',
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

  /**
   * Get configuration summary (safe for display)
   */
  getConfigSummary() {
    if (!this.config) {
      return 'Configuration not initialized';
    }

    const wpConfig = this.config.wordpress;
    const summary = {
      url: wpConfig.url,
      auth_method: wpConfig.auth_method,
      content_target: wpConfig.content_target,
      status: wpConfig.status,
      browser_automation: {
        enabled: !!this.config.browser_automation?.enabled,
        browserURL: this.config.browser_automation?.browserURL || 'N/A',
        registration_path: this.config.browser_automation?.registration_path || 'N/A'
      }
    };

    // Add masked credentials info
    switch (wpConfig.auth_method) {
      case 'api_token':
        const apiToken = this.getCredential('api_token') || wpConfig.api_token;
        summary.api_token = apiToken ? `${apiToken.substring(0, 4)}...${apiToken.substring(apiToken.length - 4)}` : 'Not set';
        break;

      case 'app_password':
        summary.username = wpConfig.username;
        const appPassword = this.getCredential('app_password');
        summary.app_password = appPassword ? '***' + appPassword.substring(appPassword.length - 2) : 'Not set';
        break;

      case 'basic_auth':
        summary.username = wpConfig.username;
        const password = this.getCredential('password');
        summary.password = password ? '***' + password.substring(password.length - 2) : 'Not set';
        break;

      case 'multi_agent':
        summary.agent_email = this.config.multi_agent.email;
        summary.multi_agent_enabled = this.config.multi_agent.enabled;
        break;
    }

    return summary;
  }

  /**
   * Get browser automation configuration
   */
  getBrowserAutomation() {
    if (!this.config) {
      throw new Error('Configuration not initialized');
    }
    return this.config.browser_automation || this.createDefaultConfig().browser_automation;
  }

  /**
   * Export configuration for use with enhanced-poster.js
   */
  exportForPoster() {
    const credentials = this.getWordPressCredentials();
    
    return {
      site_base_url: credentials.url,
      content_target: credentials.content_target,
      status: credentials.status
    };
  }
}

// Export for use in other modules
module.exports = ConfigManager;

// CLI functionality
if (require.main === module) {
  const configManager = new ConfigManager();
  
  // Handle command line arguments
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log('BuddyClaw Configuration Manager');
    console.log('Usage:');
    console.log('  node config-manager.js --init          Initialize configuration');
    console.log('  node config-manager.js --validate      Validate current configuration');
    console.log('  node config-manager.js --test          Test connection to WordPress');
    console.log('  node config-manager.js --summary       Show configuration summary');
    console.log('  node config-manager.js --export        Export configuration for poster');
    process.exit(0);
  }

  async function main() {
    try {
      await configManager.initialize();

      if (args.includes('--validate')) {
        const validation = configManager.validateConfig();
        console.log('Configuration Validation:');
        console.log('Valid:', validation.valid);
        if (validation.errors.length > 0) {
          console.log('Errors:');
          validation.errors.forEach(error => console.log('  -', error));
        }
      }

      if (args.includes('--test')) {
        console.log('Testing connection to WordPress...');
        const result = await configManager.testConnection();
        console.log('Result:', result);
      }

      if (args.includes('--summary')) {
        console.log('Configuration Summary:');
        console.log(configManager.getConfigSummary());
      }

      if (args.includes('--export')) {
        console.log('Configuration for poster:');
        console.log(JSON.stringify(configManager.exportForPoster(), null, 2));
      }

      if (args.includes('--init')) {
        console.log('Configuration initialized');
        console.log('Run the onboarding wizard: node onboarding.js');
      }

    } catch (error) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  }

  main().catch(console.error);
}
