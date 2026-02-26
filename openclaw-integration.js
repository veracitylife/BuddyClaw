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
 * Spun Web Technology - Version 0.0.2
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
      setup: /^(setup|configure|onboard)/i,
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
      // Initialize configuration manager
      await this.configManager.initialize();
      
      // Check if already configured
      const validation = this.configManager.validateConfig();
      if (validation.valid) {
        return {
          message: '✅ BuddyClaw is already configured! Use "status" to see current settings or "config" to modify them.',
          data: this.configManager.getConfigSummary()
        };
      }

      return {
        message: '📝 BuddyClaw needs configuration. Run the onboarding wizard with: node onboarding.js',
        data: { needs_setup: true }
      };

    } catch (error) {
      throw new Error(`Setup failed: ${error.message}`);
    }
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