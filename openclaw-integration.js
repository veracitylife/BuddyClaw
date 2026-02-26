const fs = require('fs');
const path = require('path');
const AutonomousBuddyClaw = require('./autonomous-poster');
const ConfigManager = require('./config-manager');
const ContentSourceManager = require('./content-source-manager');
const GroupJoiner = require('./group-joiner');
const AutonomousRecovery = require('./autonomous-recovery');

/**
 * BuddyClaw OpenClaw Chat Integration
 * Processes chat commands and automates WordPress posting
 * Spun Web Technology - Version 0.0.5
 */

class OpenClawIntegration {
  constructor() {
    this.autonomous = new AutonomousBuddyClaw();
    this.configManager = new ConfigManager();
    this.contentManager = new ContentSourceManager();
    this.groupJoiner = new GroupJoiner();
    this.recovery = new AutonomousRecovery();
    this.commandHistory = [];
    this.maxHistory = 50;
    this.sessions = new Map(); // Track user sessions for multi-step processes
    this._sessionsFile = path.join(process.cwd(), '.buddyclaw-sessions.json');
    this._loadSessionsFromDisk();
  }

  /**
   * Main entry point for OpenClaw chat processing
   * @param {string} chatInput - Raw chat input from OpenClaw
   * @param {object} context - OpenClaw context (user, session, etc.)
   * @returns {object} Response object for OpenClaw
   */
  async processChatCommand(chatInput, context = {}) {
    try {
      console.log('🤖 BuddyClaw OpenClaw Integration Activated');
      console.log('Chat Input:', chatInput);
      console.log('Context:', context);

    // Parse chat command
    const command = this.parseChatCommand(chatInput);
    command.context = context;
      console.log('Parsed Command:', command);

      // Add to history
      this.addToHistory(command);

      // Process based on command type
      let result;
      switch (command.type) {
        case 'setup':
          result = await this.handleSetup(command);
          break;
        case 'post':
          result = await this.handlePost(command);
          break;
        case 'bulk':
          result = await this.handleBulk(command);
          break;
        case 'join':
          result = await this.handleJoin(command);
          break;
        case 'status':
          result = await this.handleStatus(command);
          break;
        case 'help':
          result = await this.handleHelp(command);
          break;
        case 'config':
          result = await this.handleConfig(command);
          break;
        case 'test':
          result = await this.handleTest(command);
          break;
        default:
          result = await this.handleUnknown(command);
      }

      return {
        success: true,
        response: result.message,
        data: result.data || null,
        command: command.type,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ OpenClaw Integration Error:', error.message);
      
      // Attempt autonomous recovery
      const recoveryResult = await this.recovery.attemptRecovery(error, context);
      
      return {
        success: false,
        error: error.message,
        recovery: recoveryResult,
        suggestion: 'Try "help" for available commands',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Parse chat input to determine command type and parameters
   */
  parseChatCommand(chatInput) {
    const input = chatInput.toLowerCase().trim();
    
    // Command patterns
    const patterns = {
      setup: /^(setup|configure|onboard|buddyclaw onboarding)/i,
      post: /^(post|publish|create|write)/i,
      bulk: /^(bulk|batch|multiple)/i,
      join: /^(join|group)/i,
      status: /^(status|stats|info)/i,
      help: /^(help|commands|\?)/i,
      config: /^(config|settings)/i,
      test: /^(test|verify|check)/i
    };

    // Determine command type
    let commandType = 'unknown';
    for (const [type, pattern] of Object.entries(patterns)) {
      if (pattern.test(input)) {
        commandType = type;
        break;
      }
    }

    // Extract parameters
    const params = this.extractParameters(chatInput);

    return {
      type: commandType,
      raw: chatInput,
      params: params,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Extract parameters from chat input
   */
  extractParameters(chatInput) {
    const params = {
      topic: null,
      tone: 'informative',
      status: 'draft',
      length: 'medium',
      generate_image: true,
      content_target: 'post',
      source: 'text',
      count: 0,
      rss_url: null,
      file_path: null,
      content: null,
      delay: 0,
      group_id: null,
      forum_id: null
    };

    // Extract topic/content
    const topicMatch = chatInput.match(/["']([^"']+)["']|(\w[\w\s]*\w)/);
    if (topicMatch) {
      params.topic = topicMatch[1] || topicMatch[2];
    }

    // Extract tone
    const toneMatch = chatInput.match(/--tone\s+(\w+)/i);
    if (toneMatch) {
      params.tone = toneMatch[1].toLowerCase();
    }

    // Extract status
    const statusMatch = chatInput.match(/--status\s+(\w+)/i);
    if (statusMatch) {
      params.status = statusMatch[1].toLowerCase();
    }

    // Extract length
    const lengthMatch = chatInput.match(/--length\s+(\w+)/i);
    if (lengthMatch) {
      params.length = lengthMatch[1].toLowerCase();
    }

    // Extract content target
    const targetMatch = chatInput.match(/--target\s+(\w+)/i);
    if (targetMatch) {
      params.content_target = targetMatch[1].toLowerCase();
    }

    // Extract group/forum IDs
    const groupMatch = chatInput.match(/--group\s+(\w+)/i);
    if (groupMatch) {
      params.group_id = groupMatch[1];
    }

    const forumMatch = chatInput.match(/--forum\s+(\w+)/i);
    if (forumMatch) {
      params.forum_id = forumMatch[1];
    }

    // Extract source for bulk operations
    const sourceMatch = chatInput.match(/bulk\s+(\w+)/i);
    if (sourceMatch) {
      params.source = sourceMatch[1].toLowerCase();
    }

    // Extract RSS URL
    const rssMatch = chatInput.match(/--rss-url\s+(\S+)/i);
    if (rssMatch) {
      params.rss_url = rssMatch[1];
    }

    // Extract file path
    const fileMatch = chatInput.match(/--file\s+(\S+)/i);
    if (fileMatch) {
      params.file_path = fileMatch[1];
    }

    // Extract count
    const countMatch = chatInput.match(/--count\s+(\d+)/i);
    if (countMatch) {
      params.count = parseInt(countMatch[1]);
    }

    // Extract delay
    const delayMatch = chatInput.match(/--delay\s+(\d+)/i);
    if (delayMatch) {
      params.delay = parseInt(delayMatch[1]);
    }

    // Check for no-image flag
    params.generate_image = !chatInput.includes('--no-image');

    return params;
  }

  /**
   * Handle setup/onboarding commands
   */
  async handleSetup(command) {
    console.log('🔧 Handling setup command');
    
    try {
      // Import ChatOnboarding dynamically to avoid circular dependencies
      const ChatOnboarding = require('./chat-onboarding');
      
      // Check if already configured
      const isConfigured = await ChatOnboarding.isOnboardingCompleted();
      if (isConfigured) {
        const config = await ChatOnboarding.getConfiguration();
        return {
          message: '✅ BuddyClaw is already configured! Use "status" to see current settings or "config" to modify them.',
          data: {
            siteUrl: config?.wordpress?.siteUrl,
            authMethod: config?.wordpress?.authMethod,
            captchaEnabled: config?.captcha?.enabled
          }
        };
      }

      // Get or create session for this user
      const userId = command.context?.userId || 'default';
      let session = this._getSession(userId) || {
        onboardingStep: 'welcome',
        config: {}
      };
      
      console.log(`📍 Current onboarding step: ${session.onboardingStep}`);
      
      // Handle interactive onboarding step by step
      const response = await this.handleInteractiveOnboarding(session.onboardingStep, command, session);
      
      // Update session state with user's answer and next step
      if (response.data?.next_step) {
        session.onboardingStep = response.data.next_step;
        
        // Store user's answer in session
        if (response.data?.store_answer) {
          if (response.data?.parsed_prefs) {
            Object.assign(session.config, response.data.parsed_prefs);
          } else if (response.data?.store_handler) {
            response.data.store_handler(session, command.raw.trim());
          } else {
            session.config[response.data.store_answer] = command.raw.trim();
          }
        }
        
        this._setSession(userId, session);
      }
      
      // Clean up completed sessions
      if (response.data?.onboarding_complete) {
        await this.saveOnboardingConfig(session.config);
        this._deleteSession(userId);
      }
      
      return response;

    } catch (error) {
      throw new Error(`Setup failed: ${error.message}`);
    }
  }

  /**
   * Handle interactive onboarding step by step with proper Q&A flow
   */
  async handleInteractiveOnboarding(step, command, session = {}) {
    const ChatOnboarding = require('./chat-onboarding');
    
    switch (step) {
      case 'welcome':
        return {
          message: '🤖 Welcome to BuddyClaw Interactive Onboarding!\n\n' +
                  'I\'ll guide you through setting up your WordPress posting assistant.\n\n' +
                  '📋 We\'ll configure:\n' +
                  '• WordPress site URL and authentication\n' +
                  '• VAULT credentials (optional)\n' +
                  '• CAPTCHA solving (optional)\n\n' +
                  '💡 Reply with "continue" to start, or "help" for assistance.',
          data: {
            next_step: 'vault_check',
            instructions: 'Type "continue" to proceed or "help" for more info'
          }
        };
        
      case 'vault_check':
        if (command.raw.toLowerCase().includes('continue')) {
          return {
            message: '🔐 Step 1: Vault Credential Check\n\n' +
                    'We can check your VAULT for WordPress credentials.\n' +
                    'This makes setup easier if you have credentials stored.\n\n' +
                    'Would you like me to check your vault? (yes/no)\n' +
                    'You can also type "skip" to configure manually.',
            data: {
              next_step: 'vault_response',
              vault_path: '~/.openclaw/workspace/VAULTS/superuser-credentials/super-user.md'
            }
          };
        }
        break;
        
      case 'vault_response':
        const userResponse = command.raw.toLowerCase();
        
        if (userResponse.includes('yes') || userResponse.includes('y')) {
          // Check vault and respond
          const vaultExists = await this.checkVaultExists();
          if (vaultExists) {
            return {
              message: '✅ Vault found! I found your credentials.\n\n' +
                      'Would you like to use these saved credentials? (yes/no)',
              data: { next_step: 'use_vault_creds' }
            };
          } else {
            return {
              message: '❌ Vault not found at the expected location.\n\n' +
                      'No problem! Let\'s configure WordPress manually.\n\n' +
                      '🌐 What\'s your WordPress site URL? (e.g., https://yoursite.com)',
              data: { next_step: 'site_url' }
            };
          }
        } else if (userResponse.includes('no') || userResponse.includes('n') || userResponse.includes('skip')) {
          return {
            message: '⚙️  Manual configuration selected.\n\n' +
                    '🌐 What\'s your WordPress site URL? (e.g., https://yoursite.com)',
            data: { next_step: 'site_url' }
          };
        } else {
          return {
            message: 'Please answer "yes" to check vault, "no" to configure manually, or "skip" to skip.',
            data: { next_step: 'vault_response' }
          };
        }
        break;
        
      case 'site_url':
        const siteUrl = command.raw.trim();
        if (siteUrl) {
          return {
            message: `✅ Site URL: ${siteUrl}\n\n` +
                    '🔐 Choose your authentication method:\n' +
                    '1. Application Password (Recommended)\n' +
                    '2. REST API Token\n' +
                    '3. Basic Authentication\n' +
                    '4. Multi-Agent Registration (Auto-create)\n\n' +
                    'Reply with 1, 2, 3, or 4:',
            data: { 
              next_step: 'auth_method',
              store_answer: 'site_url'
            }
          };
        }
        break;
        
      case 'auth_method':
        const authChoice = command.raw.trim();
        const authMethods = {
          '1': 'application_password',
          '2': 'rest_api_token',
          '3': 'basic_auth',
          '4': 'multi_agent'
        };
        
        if (authMethods[authChoice]) {
          const method = authMethods[authChoice];
          let followUpMsg = '';
          
          switch (method) {
            case 'application_password':
              followUpMsg = '👤 Enter your WordPress username:';
              break;
            case 'rest_api_token':
              followUpMsg = '🔑 Enter your REST API Token:';
              break;
            case 'basic_auth':
              followUpMsg = '👤 Enter your WordPress username:';
              break;
            case 'multi_agent':
              followUpMsg = '🤖 Multi-Agent Registration selected!\n\n' +
                           'BuddyClaw will automatically create an account.\n' +
                           'CAPTCHA solving will be used if needed.\n\n' +
                           'Please enter the agent email address:';
              break;
          }
          
          return {
            message: `✅ ${method.replace('_', ' ')} selected!\n\n${followUpMsg}`,
            data: {
              next_step: method === 'rest_api_token'
                ? 'auth_token'
                : method === 'multi_agent'
                  ? 'agent_email'
                  : 'auth_username',
              store_answer: 'auth_method',
              store_handler: (session, answer) => {
                session.config.auth_method = method;
              }
            }
          };
        } else {
          return {
            message: 'Please reply with 1, 2, 3, or 4 to choose your authentication method.',
            data: { next_step: 'auth_method' }
          };
        }
        break;
      
      case 'auth_username':
        if (command.raw.trim()) {
          return {
            message: '🔒 Enter your password:\n\n' +
                     '(For Application Password, enter the application password. For Basic Auth, enter your account password.)',
            data: {
              next_step: 'auth_secret',
              store_answer: 'auth_username',
              store_handler: (session, answer) => {
                session.config.auth_credentials = session.config.auth_credentials || {};
                session.config.auth_credentials.username = answer;
              }
            }
          };
        }
        return {
          message: 'Please enter a valid username to continue.',
          data: { next_step: 'auth_username' }
        };
      
      case 'auth_secret':
        if (command.raw.trim()) {
          return {
            message: '✅ Authentication configured!\n\n' +
                     '🤖 Step 3: CAPTCHA Configuration (Optional)\n\n' +
                     'If you want automatic CAPTCHA solving, enter your 2captcha API key.\n' +
                     'Otherwise, just reply "skip" or press Enter to continue.',
            data: {
              next_step: 'captcha_config',
              store_answer: 'auth_secret',
              store_handler: (session, answer) => {
                session.config.auth_credentials = session.config.auth_credentials || {};
                const method = session.config.auth_method || 'application_password';
                if (method === 'application_password') {
                  session.config.auth_credentials.applicationPassword = answer;
                } else {
                  session.config.auth_credentials.password = answer;
                }
              }
            }
          };
        }
        return {
          message: 'Please enter a valid password to continue.',
          data: { next_step: 'auth_secret' }
        };
      
      case 'auth_token':
        if (command.raw.trim()) {
          return {
            message: '✅ API Token saved!\n\n' +
                     '🤖 Step 3: CAPTCHA Configuration (Optional)\n\n' +
                     'If you want automatic CAPTCHA solving, enter your 2captcha API key.\n' +
                     'Otherwise, just reply "skip" or press Enter to continue.',
            data: {
              next_step: 'captcha_config',
              store_answer: 'auth_token',
              store_handler: (session, answer) => {
                session.config.auth_method = 'rest_api_token';
                session.config.auth_credentials = { apiToken: answer };
              }
            }
          };
        }
        return {
          message: 'Please paste a valid REST API token to continue.',
          data: { next_step: 'auth_token' }
        };
      
      case 'agent_email':
        if (command.raw.trim()) {
          return {
            message: '🤖 Multi-Agent registration will use this email.\n\n' +
                     'Would you like to enable CAPTCHA solving? (yes/no)\n' +
                     'If yes, you can paste your 2captcha API key next.',
            data: {
              next_step: 'captcha_config',
              store_answer: 'agent_email',
              store_handler: (session, answer) => {
                session.config.agent_email = answer;
                session.config.auth_method = 'multi_agent';
              }
            }
          };
        }
        return {
          message: 'Please enter a valid agent email address to continue.',
          data: { next_step: 'agent_email' }
        };
        
      case 'captcha_config':
        const captchaResponse = command.raw.trim();
        if (captchaResponse && !captchaResponse.toLowerCase().includes('skip')) {
          return {
            message: '✅ CAPTCHA solving enabled!\n\n' +
                    '⚙️  Final Configuration:\n\n' +
                    'Would you like me to automatically generate:\n' +
                    '• Post titles? (yes/no)\n' +
                    '• Post excerpts? (yes/no)\n' +
                    '• Tags? (yes/no)\n' +
                    '• Featured images? (yes/no)\n\n' +
                    'Reply with your preferences (e.g., "yes yes no yes"):',
            data: { 
              next_step: 'content_prefs',
              store_answer: 'captcha_key'
            }
          };
        } else {
          return {
            message: '⚠️  CAPTCHA solving skipped.\n\n' +
                    '⚙️  Final Configuration:\n\n' +
                    'Would you like me to automatically generate:\n' +
                    '• Post titles? (yes/no)\n' +
                    '• Post excerpts? (yes/no)\n' +
                    '• Tags? (yes/no)\n' +
                    '• Featured images? (yes/no)\n\n' +
                    'Reply with your preferences (e.g., "yes yes no yes"):',
            data: { next_step: 'content_prefs' }
          };
        }
        
      case 'content_prefs':
        // Parse content preferences and complete setup
        const prefs = command.raw.trim().toLowerCase().split(/\s+/);
        const [auto_title, auto_excerpt, auto_tags, auto_featured_image] = prefs.map(p => p === 'yes');
        
        // Store the parsed preferences in the config object that will be saved
        return {
          message: '🎉 Setup Complete!\n\n' +
                  '✅ BuddyClaw has been successfully configured!\n\n' +
                  '📋 Your configuration has been saved.\n\n' +
                  '🚀 Ready to start posting!\n' +
                  'Try: "Post Hello World! This is my first BuddyClaw post!"\n\n' +
                  '📖 Full documentation: [Documentation.md](Documentation.md)\n' +
                  '🏠 GitHub: https://github.com/veracitylife/BuddyClaw\n' +
                  '💬 Support: https://github.com/veracitylife/BuddyClaw/issues',
          data: { 
            onboarding_complete: true,
            next_step: 'complete',
            store_answer: 'content_prefs',
            // Store the parsed preferences as the answer
            parsed_prefs: {
              auto_title,
              auto_excerpt, 
              auto_tags,
              auto_featured_image
            }
          }
        };
        
      default:
        return {
          message: 'I\'m not sure what step we\'re on. Let\'s start fresh!\n\n' +
                  'Type "BuddyClaw Onboarding" to begin setup.',
          data: { next_step: 'welcome' }
        };
    }
  }

  /**
   * Check if vault file exists
   */
  async checkVaultExists() {
    try {
      const fs = require('fs').promises;
      const vaultPath = require('path').join(
        process.env.HOME || process.env.USERPROFILE,
        '.openclaw/workspace/VAULTS/superuser-credentials/super-user.md'
      );
      await fs.access(vaultPath);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Save onboarding configuration to file
   */
  async saveOnboardingConfig(config) {
    try {
      const fs = require('fs').promises;
      const path = require('path');
      const configPath = path.join(process.cwd(), 'buddyclaw-config.json');
      
      // Create a proper configuration structure
      const fullConfig = {
        version: '0.0.5',
        wordpress: {
          siteUrl: config.site_url || '',
          authMethod: config.auth_method || 'application_password',
          credentials: (() => {
            const method = config.auth_method || 'application_password';
            const creds = config.auth_credentials || {};
            if (method === 'application_password') {
              return {
                username: creds.username || '',
                applicationPassword: creds.applicationPassword || ''
              };
            }
            if (method === 'basic_auth') {
              return {
                username: creds.username || '',
                password: creds.password || ''
              };
            }
            if (method === 'rest_api_token') {
              return { apiToken: creds.apiToken || '' };
            }
            if (method === 'multi_agent') {
              return { agentEmail: config.agent_email || '' };
            }
            return creds;
          })()
        },
        captcha: {
          enabled: !!config.captcha_key,
          apiKey: config.captcha_key || ''
        },
        content: {
          autoGenerateTitle: config.auto_title !== undefined ? config.auto_title : true,
          autoGenerateExcerpt: config.auto_excerpt !== undefined ? config.auto_excerpt : true,
          autoGenerateTags: config.auto_tags !== undefined ? config.auto_tags : true,
          autoGenerateFeaturedImage: config.auto_featured_image !== undefined ? config.auto_featured_image : true
        },
        onboarding: {
          completed: true,
          completedAt: new Date().toISOString()
        }
      };
      
      await fs.writeFile(configPath, JSON.stringify(fullConfig, null, 2));
      console.log('✅ Configuration saved successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to save configuration:', error);
      throw error;
    }
  }
 
  _loadSessionsFromDisk() {
    try {
      if (fs.existsSync(this._sessionsFile)) {
        const raw = fs.readFileSync(this._sessionsFile, 'utf8');
        const json = JSON.parse(raw || '{}');
        Object.entries(json).forEach(([userId, session]) => {
          this.sessions.set(userId, session);
        });
      }
    } catch (_) {}
  }
 
  _saveSessionsToDisk() {
    try {
      const obj = {};
      for (const [k, v] of this.sessions.entries()) {
        obj[k] = v;
      }
      fs.writeFileSync(this._sessionsFile, JSON.stringify(obj, null, 2));
    } catch (_) {}
  }
 
  _getSession(userId) {
    return this.sessions.get(userId);
  }
 
  _setSession(userId, session) {
    this.sessions.set(userId, session);
    this._saveSessionsToDisk();
  }
 
  _deleteSession(userId) {
    this.sessions.delete(userId);
    this._saveSessionsToDisk();
  }

  /**
   * Handle post/publish commands
   */
  async handlePost(command) {
    console.log('📝 Handling post command');
    
    try {
      // Check if configured
      await this.configManager.initialize();
      const validation = this.configManager.validateConfig();
      
      if (!validation.valid) {
        return {
          message: '❌ BuddyClaw needs configuration first. Run "setup" to configure.',
          data: { errors: validation.errors }
        };
      }

      // Get topic from parameters
      const topic = command.params.topic;
      if (!topic) {
        return {
          message: '❌ Please provide a topic. Example: "post artificial intelligence" or "write about climate change"',
          data: { example: 'post artificial intelligence --tone professional --status publish' }
        };
      }

      // Check if group joining is needed
      if (command.params.group_id || command.params.forum_id) {
        const joinResult = await this.handleGroupJoining(command.params);
        if (!joinResult.success) {
          return joinResult;
        }
      }

      // Generate options from parameters
      const options = {
        tone: command.params.tone || 'informative',
        length: command.params.length || 'medium',
        status: command.params.status || 'draft',
        generate_image: command.params.generate_image !== false,
        content_target: command.params.content_target || 'post',
        group_id: command.params.group_id,
        forum_id: command.params.forum_id
      };

      console.log('🚀 Starting autonomous posting...');
      const result = await this.autonomous.processChatInput(topic, options);

      if (result.success) {
        return {
          message: `🎉 Successfully created post: "${result.title}"`,
          data: {
            post_id: result.post_id,
            post_url: result.post_url,
            title: result.title,
            featured_image: result.featured_image,
            content_summary: result.content_summary
          }
        };
      } else {
        return {
          message: `❌ Failed to create post: ${result.error}`,
          data: result.details || {}
        };
      }

    } catch (error) {
      throw new Error(`Post failed: ${error.message}`);
    }
  }

  /**
   * Handle group joining for posts
   */
  async handleGroupJoining(params) {
    try {
      console.log('🤝 Checking group membership requirements...');
      
      // Initialize group joiner with current configuration
      const config = this.configManager.getConfig();
      this.groupJoiner.baseUrl = config.url;
      this.groupJoiner.credentials = this.configManager.getWordPressCredentials();

      const groupId = params.group_id || params.forum_id;
      if (!groupId) {
        return { success: true }; // No group specified, continue
      }

      const joinResult = await this.groupJoiner.joinGroup(groupId);
      
      if (joinResult.success) {
        console.log('✅ Group membership confirmed');
        return { success: true };
      } else {
        return {
          success: false,
          message: `❌ Group joining failed: ${joinResult.error}`,
          data: { group_id: groupId, error: joinResult.error }
        };
      }

    } catch (error) {
      return {
        success: false,
        message: `❌ Group joining error: ${error.message}`,
        data: { error: error.message }
      };
    }
  }

  /**
   * Handle bulk posting commands
   */
  async handleBulk(command) {
    console.log('📦 Handling bulk posting command');
    
    try {
      // Check if configured
      await this.configManager.initialize();
      const validation = this.configManager.validateConfig();
      
      if (!validation.valid) {
        return {
          message: '❌ BuddyClaw needs configuration first. Run "setup" to configure.',
          data: { errors: validation.errors }
        };
      }

      // Parse bulk parameters
      const params = this.parseBulkParameters(command.raw);
      
      if (!params.source) {
        return {
          message: '❌ Please specify a content source. Example: "bulk rss https://example.com/feed.xml --count 5 --status draft"',
          data: { 
            examples: [
              'bulk rss https://techcrunch.com/feed/ --count 3 --status publish',
              'bulk file ./articles.json --status draft',
              'bulk text "AI trends\nClimate change\nRemote work" --count 3 --status publish'
            ]
          }
        };
      }

      console.log('🚀 Starting bulk posting...');
      const result = await this.contentManager.processBulkPosting(params);

      if (result.success) {
        return {
          message: `🎉 Bulk posting completed successfully! ${result.data.summary.successful}/${result.data.summary.total} posts created.`,
          data: {
            summary: result.data.summary,
            stats: result.data.stats,
            source: params.source,
            status: params.status
          }
        };
      } else {
        return {
          message: `❌ Bulk posting failed: ${result.message}`,
          data: result.data || {}
        };
      }

    } catch (error) {
      throw new Error(`Bulk posting failed: ${error.message}`);
    }
  }

  /**
   * Handle group joining commands
   */
  async handleJoin(command) {
    console.log('🤝 Handling group joining command');
    
    try {
      // Check if configured
      await this.configManager.initialize();
      const validation = this.configManager.validateConfig();
      
      if (!validation.valid) {
        return {
          message: '❌ BuddyClaw needs configuration first. Run "setup" to configure.',
          data: { errors: validation.errors }
        };
      }

      const groupId = command.params.topic; // The topic parameter contains the group ID
      if (!groupId) {
        return {
          message: '❌ Please specify a group ID. Example: "join buddyboss" or "join general-discussion"',
          data: { 
            examples: [
              'join buddyboss',
              'join general-discussion',
              'join disruptarian-vlogs'
            ]
          }
        };
      }

      // Initialize group joiner with current configuration
      const config = this.configManager.getConfig();
      this.groupJoiner.baseUrl = config.url;
      this.groupJoiner.credentials = this.configManager.getWordPressCredentials();

      console.log(`🚀 Attempting to join group: ${groupId}`);
      const result = await this.groupJoiner.joinGroup(groupId);

      if (result.success) {
        return {
          message: `🎉 Successfully joined group: "${groupId}"`,
          data: {
            group_id: groupId,
            status: result.data.status,
            message: result.message
          }
        };
      } else {
        return {
          message: `❌ Failed to join group: ${result.error}`,
          data: { group_id: groupId, error: result.error }
        };
      }

    } catch (error) {
      throw new Error(`Group joining failed: ${error.message}`);
    }
  }

  /**
   * Parse bulk posting parameters
   */
  parseBulkParameters(chatInput) {
    const params = {
      source: null,
      rss_url: null,
      file_path: null,
      content: null,
      count: 0,
      status: 'draft',
      tone: 'informative',
      delay: 0,
      generate_image: true,
      content_target: 'post'
    };

    // Extract source type
    const sourceMatch = chatInput.match(/bulk\s+(\w+)/i);
    if (sourceMatch) {
      params.source = sourceMatch[1].toLowerCase();
    }

    // Extract RSS URL
    const rssMatch = chatInput.match(/--rss-url\s+(\S+)/i);
    if (rssMatch) {
      params.rss_url = rssMatch[1];
    }

    // Extract file path
    const fileMatch = chatInput.match(/--file\s+(\S+)/i);
    if (fileMatch) {
      params.file_path = fileMatch[1];
    }

    // Extract content (for text source)
    const contentMatch = chatInput.match(/bulk\s+text\s+["']([^"']+)["']/i);
    if (contentMatch) {
      params.content = contentMatch[1];
    } else {
      // Try to extract multiline content
      const lines = chatInput.split('\n');
      if (lines.length > 1 && params.source === 'text') {
        params.content = lines.slice(1).join('\n').trim();
      }
    }

    // Extract count
    const countMatch = chatInput.match(/--count\s+(\d+)/i);
    if (countMatch) {
      params.count = parseInt(countMatch[1]);
    }

    // Extract status
    const statusMatch = chatInput.match(/--status\s+(\w+)/i);
    if (statusMatch) {
      params.status = statusMatch[1].toLowerCase();
    }

    // Extract tone
    const toneMatch = chatInput.match(/--tone\s+(\w+)/i);
    if (toneMatch) {
      params.tone = toneMatch[1].toLowerCase();
    }

    // Extract delay
    const delayMatch = chatInput.match(/--delay\s+(\d+)/i);
    if (delayMatch) {
      params.delay = parseInt(delayMatch[1]);
    }

    // Extract content target
    const targetMatch = chatInput.match(/--target\s+(\w+)/i);
    if (targetMatch) {
      params.content_target = targetMatch[1].toLowerCase();
    }

    // Check for generate image flag
    params.generate_image = !chatInput.includes('--no-image');

    return params;
  }

  /**
   * Handle status commands
   */
  async handleStatus(command) {
    console.log('📊 Handling status command');
    
    try {
      await this.configManager.initialize();
      
      const configSummary = this.configManager.getConfigSummary();
      const postingStats = this.autonomous.getPostingStats();
      const contentStats = this.contentManager.getStats();
      const errorStats = this.recovery.getErrorStats();
      
      return {
        message: '📊 BuddyClaw Status Report',
        data: {
          configuration: configSummary,
          posting_stats: postingStats,
          content_stats: contentStats,
          error_stats: errorStats,
          command_history: this.commandHistory.slice(-5) // Last 5 commands
        }
      };

    } catch (error) {
      throw new Error(`Status check failed: ${error.message}`);
    }
  }

  /**
   * Handle help commands
   */
  async handleHelp(command) {
    console.log('❓ Handling help command');
    
    return {
      message: '🤖 BuddyClaw Help - Available Commands',
      data: {
        commands: [
          {
            command: 'setup',
            description: 'Configure BuddyClaw for your WordPress site',
            example: 'setup'
          },
          {
            command: 'post [topic]',
            description: 'Create and publish a post about [topic]',
            example: 'post artificial intelligence --tone professional --status publish'
          },
          {
            command: 'bulk [source]',
            description: 'Bulk post from RSS, file, or text sources',
            example: 'bulk rss https://techcrunch.com/feed/ --count 5 --status draft'
          },
          {
            command: 'join [group]',
            description: 'Join a BuddyPress/BuddyBoss group',
            example: 'join buddyboss or join general-discussion'
          },
          {
            command: 'status',
            description: 'Show current configuration and posting statistics',
            example: 'status'
          },
          {
            command: 'config',
            description: 'Show current configuration',
            example: 'config'
          },
          {
            command: 'test',
            description: 'Test connection to WordPress',
            example: 'test'
          },
          {
            command: 'help',
            description: 'Show this help message',
            example: 'help'
          }
        ],
        parameters: [
          {
            parameter: '--tone [informative|conversational|professional]',
            description: 'Content writing tone',
            default: 'informative'
          },
          {
            parameter: '--length [short|medium|long]',
            description: 'Article length',
            default: 'medium'
          },
          {
            parameter: '--status [draft|publish|private]',
            description: 'Post status',
            default: 'draft'
          },
          {
            parameter: '--source [rss|file|text]',
            description: 'Content source for bulk posting',
            default: 'text'
          },
          {
            parameter: '--count <number>',
            description: 'Number of items to process in bulk',
            default: 'all available'
          },
          {
            parameter: '--rss-url <url>',
            description: 'RSS feed URL for bulk posting'
          },
          {
            parameter: '--file <path>',
            description: 'File path for bulk posting'
          },
          {
            parameter: '--group <name>',
            description: 'BuddyPress group for posting'
          },
          {
            parameter: '--forum <name>',
            description: 'BuddyPress forum for posting'
          }
        ],
        bulk_examples: [
          'bulk rss https://techcrunch.com/feed/ --count 3 --status publish',
          'bulk file ./articles.json --status draft',
          'bulk text "AI trends\nClimate change\nRemote work" --count 3 --status publish --tone professional'
        ],
        posting_examples: [
          'post artificial intelligence --tone professional --status publish',
          'post climate change --group buddyboss --status draft',
          'write about remote work --forum general-discussion --status publish'
        ]
      }
    };
  }

  /**
   * Handle config commands
   */
  async handleConfig(command) {
    console.log('⚙️ Handling config command');
    
    try {
      await this.configManager.initialize();
      const configSummary = this.configManager.getConfigSummary();
      
      return {
        message: '⚙️ Current BuddyClaw Configuration',
        data: configSummary
      };

    } catch (error) {
      throw new Error(`Config check failed: ${error.message}`);
    }
  }

  /**
   * Handle test commands
   */
  async handleTest(command) {
    console.log('🧪 Handling test command');
    
    try {
      await this.configManager.initialize();
      const testResult = await this.configManager.testConnection();
      
      if (testResult.success) {
        return {
          message: '✅ Connection test passed!',
          data: testResult
        };
      } else {
        return {
          message: `❌ Connection test failed: ${testResult.error}`,
          data: testResult
        };
      }

    } catch (error) {
      throw new Error(`Test failed: ${error.message}`);
    }
  }

  /**
   * Handle unknown commands
   */
  async handleUnknown(command) {
    console.log('❓ Handling unknown command');
    
    return {
      message: `❓ I don't understand: "${command.raw}"`,
      data: {
        suggestion: 'Try "help" for available commands',
        examples: [
          'post artificial intelligence',
          'bulk rss https://example.com/feed.xml',
          'join buddyboss',
          'setup',
          'status',
          'help'
        ]
      }
    };
  }

  /**
   * Add command to history
   */
  addToHistory(command) {
    this.commandHistory.push(command);
    
    // Keep only recent history
    if (this.commandHistory.length > this.maxHistory) {
      this.commandHistory = this.commandHistory.slice(-this.maxHistory);
    }
  }

  /**
   * Get command history
   */
  getCommandHistory(limit = 10) {
    return this.commandHistory.slice(-limit);
  }

  /**
   * Clear command history
   */
  clearHistory() {
    this.commandHistory = [];
  }
}

// Export for use in other modules
module.exports = OpenClawIntegration;

// CLI functionality for testing
if (require.main === module) {
  const integration = new OpenClawIntegration();
  
  // Handle command line arguments
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log('BuddyClaw OpenClaw Integration');
    console.log('Usage:');
    console.log('  node openclaw-integration.js "chat command"');
    console.log('');
    console.log('Examples:');
    console.log('  node openclaw-integration.js "post artificial intelligence"');
    console.log('  node openclaw-integration.js "bulk rss https://techcrunch.com/feed/ --count 3"');
    console.log('  node openclaw-integration.js "join buddyboss"');
    console.log('  node openclaw-integration.js "setup"');
    console.log('  node openclaw-integration.js "status"');
    console.log('  node openclaw-integration.js "help"');
    process.exit(0);
  }

  if (args.includes('--history')) {
    const history = integration.getCommandHistory();
    console.log('Command History:');
    history.forEach((cmd, index) => {
      console.log(`${index + 1}. ${cmd.type}: ${cmd.raw}`);
    });
    process.exit(0);
  }

  // Get chat input from arguments
  const chatInput = args.join(' ');
  if (!chatInput) {
    console.error('❌ Please provide a chat command');
    process.exit(1);
  }

  // Process the chat command
  integration.processChatCommand(chatInput)
    .then(result => {
      console.log('🤖 BuddyClaw Response:');
      console.log(result.response);
      if (result.data) {
        console.log('📊 Data:', JSON.stringify(result.data, null, 2));
      }
    })
    .catch(error => {
      console.error('❌ Error:', error.message);
      process.exit(1);
    });
}
