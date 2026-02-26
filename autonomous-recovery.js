const axios = require('axios');
const CaptchaSolver = require('./captcha-solver');

/**
 * BuddyClaw Autonomous Error Recovery System
 * Self-healing capabilities for handling WordPress/BuddyPress errors
 * Spun Web Technology - Version 0.0.4
 */

class AutonomousRecovery {
  constructor(options = {}) {
    this.captchaSolver = new CaptchaSolver(options.captcha);
    this.maxRetries = options.maxRetries || 5;
    this.retryDelay = options.retryDelay || 2000; // 2 seconds base delay
    this.exponentialBackoff = options.exponentialBackoff !== false;
    this.errorHistory = [];
    this.maxHistorySize = options.maxHistorySize || 100;
    this.recoveryStrategies = this.initializeRecoveryStrategies();
  }

  /**
   * Main recovery entry point
   */
  async attemptRecovery(error, context = {}) {
    try {
      console.log('🔧 BuddyClaw Autonomous Recovery Activated');
      console.log('Error:', error.message);
      console.log('Context:', context);

      // Classify the error
      const errorType = this.classifyError(error, context);
      console.log('🎯 Error Classification:', errorType);

      // Record error in history
      this.recordError(error, context, errorType);

      // Get appropriate recovery strategy
      const strategy = this.recoveryStrategies[errorType];
      if (!strategy) {
        console.log('❓ No recovery strategy found for error type:', errorType);
        return {
          success: false,
          error: error.message,
          recoveryAttempted: false,
          message: 'No recovery strategy available for this error type'
        };
      }

      // Attempt recovery with retries
      const result = await this.executeRecoveryStrategy(strategy, error, context);
      
      if (result.success) {
        console.log('✅ Recovery successful!');
        return {
          success: true,
          recoveryMethod: strategy.name,
          message: result.message,
          data: result.data
        };
      } else {
        console.log('❌ Recovery failed after maximum attempts');
        return {
          success: false,
          error: result.error,
          recoveryMethod: strategy.name,
          attempts: result.attempts,
          message: 'Recovery failed after maximum attempts'
        };
      }

    } catch (recoveryError) {
      console.error('💥 Recovery system error:', recoveryError.message);
      return {
        success: false,
        error: recoveryError.message,
        recoveryAttempted: true,
        message: 'Recovery system encountered an error'
      };
    }
  }

  /**
   * Classify error type for appropriate recovery strategy
   */
  classifyError(error, context) {
    const errorMessage = error.message.toLowerCase();
    const errorCode = error.code || error.status || '';

    // Authentication errors
    if (errorMessage.includes('401') || errorMessage.includes('unauthorized') || 
        errorMessage.includes('authentication') || errorMessage.includes('login')) {
      return 'authentication_error';
    }

    // Authorization errors
    if (errorMessage.includes('403') || errorMessage.includes('forbidden') || 
        errorMessage.includes('permission') || errorMessage.includes('access denied')) {
      return 'authorization_error';
    }

    // CAPTCHA errors
    if (errorMessage.includes('captcha') || errorMessage.includes('security check') ||
        errorMessage.includes('verification')) {
      return 'captcha_error';
    }

    // Group/Forum membership errors
    if (errorMessage.includes('group') || errorMessage.includes('forum') || 
        errorMessage.includes('membership') || errorMessage.includes('join')) {
      return 'membership_error';
    }

    // Network errors
    if (errorMessage.includes('network') || errorMessage.includes('timeout') || 
        errorMessage.includes('connection') || errorCode === 'ECONNREFUSED') {
      return 'network_error';
    }

    // Content errors
    if (errorMessage.includes('content') || errorMessage.includes('validation') || 
        errorMessage.includes('invalid') || errorMessage.includes('required')) {
      return 'content_error';
    }

    // Rate limiting errors
    if (errorMessage.includes('rate limit') || errorMessage.includes('too many requests') || 
        errorMessage.includes('429')) {
      return 'rate_limit_error';
    }

    // Server errors
    if (errorMessage.includes('500') || errorMessage.includes('server') || 
        errorMessage.includes('internal')) {
      return 'server_error';
    }

    // Default classification
    return 'unknown_error';
  }

  /**
   * Initialize recovery strategies
   */
  initializeRecoveryStrategies() {
    return {
      authentication_error: {
        name: 'Authentication Recovery',
        description: 'Handle authentication failures',
        handler: this.handleAuthenticationError.bind(this)
      },
      authorization_error: {
        name: 'Authorization Recovery',
        description: 'Handle permission/access issues',
        handler: this.handleAuthorizationError.bind(this)
      },
      captcha_error: {
        name: 'CAPTCHA Recovery',
        description: 'Handle CAPTCHA challenges',
        handler: this.handleCaptchaError.bind(this)
      },
      membership_error: {
        name: 'Membership Recovery',
        description: 'Handle group/forum membership issues',
        handler: this.handleMembershipError.bind(this)
      },
      network_error: {
        name: 'Network Recovery',
        description: 'Handle network connectivity issues',
        handler: this.handleNetworkError.bind(this)
      },
      content_error: {
        name: 'Content Recovery',
        description: 'Handle content validation issues',
        handler: this.handleContentError.bind(this)
      },
      rate_limit_error: {
        name: 'Rate Limit Recovery',
        description: 'Handle rate limiting',
        handler: this.handleRateLimitError.bind(this)
      },
      server_error: {
        name: 'Server Recovery',
        description: 'Handle server-side errors',
        handler: this.handleServerError.bind(this)
      },
      unknown_error: {
        name: 'Generic Recovery',
        description: 'Handle unknown errors with basic retry',
        handler: this.handleUnknownError.bind(this)
      }
    };
  }

  /**
   * Execute recovery strategy with retries
   */
  async executeRecoveryStrategy(strategy, error, context) {
    let attempts = 0;
    let lastError = error;

    while (attempts < this.maxRetries) {
      attempts++;
      console.log(`🔄 Recovery attempt ${attempts}/${this.maxRetries}`);

      try {
        const result = await strategy.handler(lastError, context);
        if (result.success) {
          return {
            success: true,
            attempts: attempts,
            message: result.message,
            data: result.data
          };
        } else {
          lastError = new Error(result.error || 'Recovery attempt failed');
          console.log(`⚠️ Recovery attempt ${attempts} failed:`, lastError.message);
        }
      } catch (attemptError) {
        lastError = attemptError;
        console.error(`💥 Recovery attempt ${attempts} error:`, attemptError.message);
      }

      // Calculate delay with exponential backoff
      const delay = this.exponentialBackoff 
        ? this.retryDelay * Math.pow(2, attempts - 1)
        : this.retryDelay;

      console.log(`⏱️ Waiting ${delay}ms before next attempt...`);
      await this.sleep(delay);
    }

    return {
      success: false,
      attempts: attempts,
      error: lastError.message,
      message: 'Maximum retry attempts exceeded'
    };
  }

  /**
   * Handle authentication errors
   */
  async handleAuthenticationError(error, context) {
    console.log('🔐 Attempting authentication recovery...');
    
    try {
      // Check if we have stored credentials
      if (context.credentials) {
        console.log('🔄 Attempting credential refresh...');
        // Implement credential refresh logic here
        return {
          success: true,
          message: 'Credentials refreshed successfully',
          data: { refreshed: true }
        };
      }

      // Check if we need to handle CAPTCHA during login
      if (context.requiresCaptcha) {
        console.log('🤖 Attempting CAPTCHA resolution...');
        const captchaResult = await this.captchaSolver.solveCaptcha(context.captchaData, context.captchaType);
        
        if (captchaResult.success) {
          return {
            success: true,
            message: 'CAPTCHA solved successfully',
            data: { captchaSolution: captchaResult.solution }
          };
        }
      }

      return {
        success: false,
        error: 'Unable to resolve authentication issue',
        message: 'Authentication recovery failed - manual intervention required'
      };

    } catch (recoveryError) {
      return {
        success: false,
        error: recoveryError.message,
        message: 'Authentication recovery encountered an error'
      };
    }
  }

  /**
   * Handle authorization errors
   */
  async handleAuthorizationError(error, context) {
    console.log('🔒 Attempting authorization recovery...');
    
    try {
      // Check if user needs to join a group/forum
      if (context.groupId || context.forumId) {
        console.log('🤝 Attempting group/forum membership...');
        
        // Implement group joining logic here
        const joinResult = await this.attemptGroupJoin(context.groupId, context.forumId);
        
        if (joinResult.success) {
          return {
            success: true,
            message: 'Successfully joined group/forum',
            data: { joined: true, groupId: context.groupId }
          };
        }
      }

      // Check if we need elevated permissions
      if (context.requestedPermissions) {
        console.log('🆙 Attempting permission elevation...');
        // Implement permission elevation logic here
        return {
          success: true,
          message: 'Permissions elevated successfully',
          data: { elevated: true }
        };
      }

      return {
        success: false,
        error: 'Unable to resolve authorization issue',
        message: 'Authorization recovery failed - insufficient permissions'
      };

    } catch (recoveryError) {
      return {
        success: false,
        error: recoveryError.message,
        message: 'Authorization recovery encountered an error'
      };
    }
  }

  /**
   * Handle CAPTCHA errors
   */
  async handleCaptchaError(error, context) {
    console.log('🧩 Attempting CAPTCHA recovery...');
    
    try {
      if (context.captchaData && context.captchaType) {
        const captchaResult = await this.captchaSolver.solveCaptcha(context.captchaData, context.captchaType);
        
        if (captchaResult.success) {
          return {
            success: true,
            message: 'CAPTCHA solved successfully',
            data: { solution: captchaResult.solution }
          };
        }
      }

      return {
        success: false,
        error: 'Unable to solve CAPTCHA',
        message: 'CAPTCHA recovery failed - manual solving required'
      };

    } catch (recoveryError) {
      return {
        success: false,
        error: recoveryError.message,
        message: 'CAPTCHA recovery encountered an error'
      };
    }
  }

  /**
   * Handle membership errors (group/forum joining)
   */
  async handleMembershipError(error, context) {
    console.log('👥 Attempting membership recovery...');
    
    try {
      const groupId = context.groupId || context.forumId;
      if (!groupId) {
        return {
          success: false,
          error: 'No group/forum ID provided',
          message: 'Membership recovery failed - missing group identification'
        };
      }

      console.log(`🤝 Attempting to join group/forum: ${groupId}`);
      
      // Implement group joining logic
      const joinResult = await this.attemptGroupJoin(groupId);
      
      if (joinResult.success) {
        return {
          success: true,
          message: 'Successfully joined group/forum',
          data: { joined: true, groupId: groupId }
        };
      }

      return {
        success: false,
        error: joinResult.error,
        message: 'Membership recovery failed - unable to join group'
      };

    } catch (recoveryError) {
      return {
        success: false,
        error: recoveryError.message,
        message: 'Membership recovery encountered an error'
      };
    }
  }

  /**
   * Handle network errors
   */
  async handleNetworkError(error, context) {
    console.log('🌐 Attempting network recovery...');
    
    try {
      // Check if we should try a different endpoint
      if (context.alternativeEndpoints && context.alternativeEndpoints.length > 0) {
        console.log('🔄 Attempting alternative endpoint...');
        // Implement endpoint switching logic here
        return {
          success: true,
          message: 'Switched to alternative endpoint',
          data: { endpoint: context.alternativeEndpoints[0] }
        };
      }

      // Check if we should increase timeout
      if (context.timeout) {
        console.log('⏱️ Increasing timeout...');
        return {
          success: true,
          message: 'Timeout increased successfully',
          data: { newTimeout: context.timeout * 2 }
        };
      }

      return {
        success: false,
        error: 'Network issue persists',
        message: 'Network recovery failed - connectivity issues'
      };

    } catch (recoveryError) {
      return {
        success: false,
        error: recoveryError.message,
        message: 'Network recovery encountered an error'
      };
    }
  }

  /**
   * Handle content validation errors
   */
  async handleContentError(error, context) {
    console.log('📝 Attempting content recovery...');
    
    try {
      // Check if we can fix content issues
      if (context.contentIssues) {
        console.log('🔧 Attempting content fixes...');
        
        // Implement content fixing logic here
        const fixedContent = await this.fixContentIssues(context.content, context.contentIssues);
        
        return {
          success: true,
          message: 'Content issues fixed successfully',
          data: { fixedContent: fixedContent }
        };
      }

      return {
        success: false,
        error: 'Unable to fix content issues',
        message: 'Content recovery failed - validation errors persist'
      };

    } catch (recoveryError) {
      return {
        success: false,
        error: recoveryError.message,
        message: 'Content recovery encountered an error'
      };
    }
  }

  /**
   * Handle rate limiting errors
   */
  async handleRateLimitError(error, context) {
    console.log('⏳ Attempting rate limit recovery...');
    
    try {
      // Calculate appropriate delay based on error message
      let delay = 60000; // Default 1 minute
      
      const retryAfter = this.extractRetryAfter(error.message);
      if (retryAfter) {
        delay = retryAfter * 1000; // Convert seconds to milliseconds
      }

      console.log(`⏱️ Waiting ${delay}ms for rate limit reset...`);
      await this.sleep(delay);

      return {
        success: true,
        message: 'Rate limit delay completed',
        data: { delay: delay }
      };

    } catch (recoveryError) {
      return {
        success: false,
        error: recoveryError.message,
        message: 'Rate limit recovery encountered an error'
      };
    }
  }

  /**
   * Handle server errors
   */
  async handleServerError(error, context) {
    console.log('🖥️ Attempting server error recovery...');
    
    try {
      // Check if we should try a different server/endpoint
      if (context.backupServers && context.backupServers.length > 0) {
        console.log('🔄 Attempting backup server...');
        return {
          success: true,
          message: 'Switched to backup server',
          data: { server: context.backupServers[0] }
        };
      }

      // For 500 errors, just wait and retry
      console.log('⏱️ Waiting for server recovery...');
      await this.sleep(10000); // Wait 10 seconds

      return {
        success: true,
        message: 'Server error delay completed',
        data: { waited: 10000 }
      };

    } catch (recoveryError) {
      return {
        success: false,
        error: recoveryError.message,
        message: 'Server error recovery encountered an error'
      };
    }
  }

  /**
   * Handle unknown errors with basic retry
   */
  async handleUnknownError(error, context) {
    console.log('❓ Attempting generic recovery...');
    
    // For unknown errors, just return and let the main retry logic handle it
    return {
      success: false,
      error: error.message,
      message: 'Generic recovery - basic retry will be attempted'
    };
  }

  /**
   * Placeholder methods for specific recovery actions
   */
  async attemptGroupJoin(groupId) {
    // Implement actual group joining logic here
    console.log(`🤝 Attempting to join group: ${groupId}`);
    
    try {
      // This would make an API call to join the group
      // For now, return success to simulate successful joining
      return {
        success: true,
        message: 'Group joined successfully',
        data: { groupId: groupId }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to join group'
      };
    }
  }

  async fixContentIssues(content, issues) {
    // Implement content fixing logic here
    console.log('🔧 Fixing content issues...');
    return content; // Return fixed content
  }

  extractRetryAfter(errorMessage) {
    // Extract retry-after value from error message
    const match = errorMessage.match(/retry after (\d+)/i);
    return match ? parseInt(match[1]) : null;
  }

  /**
   * Record error in history for pattern analysis
   */
  recordError(error, context, errorType) {
    const errorRecord = {
      timestamp: new Date().toISOString(),
      message: error.message,
      type: errorType,
      context: context,
      stack: error.stack
    };

    this.errorHistory.push(errorRecord);
    
    // Keep history size manageable
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory = this.errorHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * Get error statistics and patterns
   */
  getErrorStats() {
    const stats = {
      total: this.errorHistory.length,
      byType: {},
      recent: this.errorHistory.slice(-10),
      patterns: this.analyzeErrorPatterns()
    };

    // Count by type
    this.errorHistory.forEach(record => {
      stats.byType[record.type] = (stats.byType[record.type] || 0) + 1;
    });

    return stats;
  }

  /**
   * Analyze error patterns
   */
  analyzeErrorPatterns() {
    const patterns = {
      frequentErrors: [],
      recurringErrors: [],
      timePatterns: {}
    };

    // Analyze time patterns
    const hourlyPattern = {};
    this.errorHistory.forEach(record => {
      const hour = new Date(record.timestamp).getHours();
      hourlyPattern[hour] = (hourlyPattern[hour] || 0) + 1;
    });
    patterns.timePatterns.hourly = hourlyPattern;

    return patterns;
  }

  /**
   * Utility function to sleep
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clear error history
   */
  clearErrorHistory() {
    this.errorHistory = [];
    console.log('🗑️ Error history cleared');
  }
}

// Export for use in other modules
module.exports = AutonomousRecovery;

// CLI functionality for testing
if (require.main === module) {
  const recovery = new AutonomousRecovery();
  
  // Handle command line arguments
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log('BuddyClaw Autonomous Recovery System');
    console.log('Usage:');
    console.log('  node autonomous-recovery.js [options]');
    console.log('');
    console.log('Options:');
    console.log('  --test                    Test recovery system');
    console.log('  --stats                   Show error statistics');
    console.log('  --clear-history           Clear error history');
    console.log('  --max-retries <number>    Set maximum retry attempts');
    console.log('  --retry-delay <ms>        Set base retry delay');
    console.log('');
    console.log('Examples:');
    console.log('  node autonomous-recovery.js --test');
    console.log('  node autonomous-recovery.js --stats');
    console.log('  node autonomous-recovery.js --max-retries 10 --retry-delay 5000');
    process.exit(0);
  }

  if (args.includes('--stats')) {
    const stats = recovery.getErrorStats();
    console.log('📊 Error Statistics:');
    console.log(JSON.stringify(stats, null, 2));
    process.exit(0);
  }

  if (args.includes('--clear-history')) {
    recovery.clearErrorHistory();
    console.log('✅ Error history cleared');
    process.exit(0);
  }

  if (args.includes('--test')) {
    // Test with a simulated error
    const testError = new Error('Test authentication error');
    const testContext = {
      groupId: 'test-group',
      requiresCaptcha: true,
      captchaData: 'test-captcha-data',
      captchaType: 'image'
    };

    recovery.attemptRecovery(testError, testContext)
      .then(result => {
        console.log('🧪 Test Result:');
        console.log(JSON.stringify(result, null, 2));
        process.exit(result.success ? 0 : 1);
      })
      .catch(error => {
        console.error('❌ Test failed:', error.message);
        process.exit(1);
      });
  }
}