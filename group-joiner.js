const axios = require('axios');
const fs = require('fs');
const path = require('path');
const CaptchaSolver = require('./captcha-solver');

/**
 * BuddyClaw Group/Forum Joiner
 * Handles BuddyPress and BuddyBoss group membership operations
 * Spun Web Technology - Version 0.0.5
 */

class GroupJoiner {
  constructor(options = {}) {
    this.captchaSolver = new CaptchaSolver(options.captcha);
    this.baseUrl = options.baseUrl || '';
    this.credentials = options.credentials || {};
    this.maxRetries = options.maxRetries || 3;
    this.retryDelay = options.retryDelay || 2000;
  }

  /**
   * Join a BuddyPress/BuddyBoss group
   */
  async joinGroup(groupId, options = {}) {
    try {
      console.log(`🤝 Attempting to join group: ${groupId}`);
      
      // First, check if already a member
      const membershipStatus = await this.checkMembershipStatus(groupId);
      if (membershipStatus.isMember) {
        console.log('✅ Already a member of this group');
        return {
          success: true,
          message: 'Already a member of this group',
          data: { groupId, status: 'member' }
        };
      }

      // Get group details
      const groupDetails = await this.getGroupDetails(groupId);
      console.log('📋 Group details:', groupDetails.name);

      // Check if group requires approval
      if (groupDetails.status === 'private' && !options.force) {
        console.log('🔒 Private group - sending membership request');
        return await this.requestMembership(groupId, options);
      }

      // Check for CAPTCHA requirement
      const joinPageContent = await this.getJoinPageContent(groupId);
      const captchaInfo = this.detectCaptcha(joinPageContent);
      
      if (captchaInfo.requiresCaptcha) {
        console.log('🧩 CAPTCHA detected, solving...');
        const captchaResult = await this.solveCaptcha(captchaInfo);
        
        if (!captchaResult.success) {
          throw new Error(`CAPTCHA solving failed: ${captchaResult.error}`);
        }
        
        options.captchaSolution = captchaResult.solution;
      }

      // Attempt to join the group
      const joinResult = await this.executeJoin(groupId, options);
      
      if (joinResult.success) {
        console.log('🎉 Successfully joined group!');
        return {
          success: true,
          message: 'Successfully joined group',
          data: { groupId, status: 'joined', ...joinResult.data }
        };
      } else {
        throw new Error(joinResult.error || 'Failed to join group');
      }

    } catch (error) {
      console.error('❌ Group joining failed:', error.message);
      return {
        success: false,
        error: error.message,
        message: 'Failed to join group',
        data: { groupId }
      };
    }
  }

  /**
   * Check current membership status
   */
  async checkMembershipStatus(groupId) {
    try {
      console.log(`🔍 Checking membership status for group: ${groupId}`);
      
      const endpoint = `${this.baseUrl}/wp-json/buddypress/v1/groups/${groupId}/members`;
      const response = await axios.get(endpoint, {
        headers: this.getAuthHeaders(),
        params: { user_id: 'me' }
      });

      return {
        isMember: response.data.length > 0,
        membership: response.data[0] || null
      };

    } catch (error) {
      // If user is not a member, API might return 404 or empty response
      if (error.response?.status === 404) {
        return { isMember: false, membership: null };
      }
      
      console.warn('⚠️ Membership check failed:', error.message);
      return { isMember: false, membership: null };
    }
  }

  /**
   * Get group details
   */
  async getGroupDetails(groupId) {
    try {
      console.log(`📋 Getting details for group: ${groupId}`);
      
      const endpoint = `${this.baseUrl}/wp-json/buddypress/v1/groups/${groupId}`;
      const response = await axios.get(endpoint, {
        headers: this.getAuthHeaders()
      });

      return response.data;

    } catch (error) {
      throw new Error(`Failed to get group details: ${error.message}`);
    }
  }

  /**
   * Get join page content to detect CAPTCHA and other requirements
   */
  async getJoinPageContent(groupId) {
    try {
      console.log(`📄 Getting join page content for group: ${groupId}`);
      
      const endpoint = `${this.baseUrl}/groups/${groupId}/join`;
      const response = await axios.get(endpoint, {
        headers: { 'User-Agent': 'BuddyClaw/0.0.2' }
      });

      return response.data;

    } catch (error) {
      console.warn('⚠️ Could not get join page content:', error.message);
      return '';
    }
  }

  /**
   * Detect CAPTCHA requirements on join page
   */
  detectCaptcha(pageContent) {
    const captchaInfo = {
      requiresCaptcha: false,
      type: null,
      sitekey: null,
      imageUrl: null
    };

    // Check for reCAPTCHA
    if (pageContent.includes('g-recaptcha') || pageContent.includes('recaptcha')) {
      captchaInfo.requiresCaptcha = true;
      captchaInfo.type = 'recaptcha';
      
      const sitekeyMatch = pageContent.match(/data-sitekey=["']([^"']+)["']/);
      if (sitekeyMatch) {
        captchaInfo.sitekey = sitekeyMatch[1];
      }
    }
    
    // Check for hCaptcha
    else if (pageContent.includes('h-captcha') || pageContent.includes('hcaptcha')) {
      captchaInfo.requiresCaptcha = true;
      captchaInfo.type = 'hcaptcha';
      
      const sitekeyMatch = pageContent.match(/data-sitekey=["']([^"']+)["']/);
      if (sitekeyMatch) {
        captchaInfo.sitekey = sitekeyMatch[1];
      }
    }
    
    // Check for image CAPTCHA
    else if (pageContent.includes('captcha') && pageContent.includes('img')) {
      captchaInfo.requiresCaptcha = true;
      captchaInfo.type = 'image';
      
      const imageMatch = pageContent.match(/<img[^>]+src=["']([^"']*captcha[^"']*)["']/i);
      if (imageMatch) {
        captchaInfo.imageUrl = imageMatch[1];
      }
    }

    return captchaInfo;
  }

  /**
   * Solve CAPTCHA if required
   */
  async solveCaptcha(captchaInfo) {
    try {
      console.log(`🧩 Solving ${captchaInfo.type} CAPTCHA...`);
      
      let captchaData;
      
      switch (captchaInfo.type) {
        case 'recaptcha':
        case 'hcaptcha':
          captchaData = {
            sitekey: captchaInfo.sitekey,
            pageurl: `${this.baseUrl}/groups/${captchaInfo.groupId}/join`
          };
          break;
          
        case 'image':
          captchaData = captchaInfo.imageUrl;
          break;
          
        default:
          throw new Error(`Unsupported CAPTCHA type: ${captchaInfo.type}`);
      }

      return await this.captchaSolver.solveCaptcha(captchaData, captchaInfo.type);

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Execute the actual join operation
   */
  async executeJoin(groupId, options = {}) {
    try {
      console.log(`🚀 Executing join operation for group: ${groupId}`);
      
      // BuddyPress uses different endpoints for joining
      let endpoint;
      let method = 'POST';
      let data = {};

      // Check BuddyPress version and API availability
      if (await this.hasRestApiSupport()) {
        // Use REST API if available
        endpoint = `${this.baseUrl}/wp-json/buddypress/v1/groups/${groupId}/members`;
        data = {
          user_id: 'me',
          action: 'join'
        };
        
        if (options.captchaSolution) {
          data.captcha_solution = options.captchaSolution;
        }
      } else {
        // Fall back to traditional AJAX endpoint
        endpoint = `${this.baseUrl}/wp-admin/admin-ajax.php`;
        data = {
          action: 'groups_join_group',
          group_id: groupId,
          _wpnonce: options.nonce || await this.getNonce(groupId)
        };
        
        if (options.captchaSolution) {
          data.captcha_response = options.captchaSolution;
        }
      }

      const response = await axios({
        method: method,
        url: endpoint,
        data: data,
        headers: this.getAuthHeaders()
      });

      return {
        success: true,
        message: 'Join operation completed',
        data: response.data
      };

    } catch (error) {
      // Handle specific error cases
      let errorMessage = error.message;
      
      if (error.response?.status === 403) {
        errorMessage = 'Access denied - insufficient permissions to join group';
      } else if (error.response?.status === 404) {
        errorMessage = 'Group not found or join endpoint not available';
      } else if (error.response?.status === 400) {
        errorMessage = 'Invalid request - check group ID and permissions';
      }

      return {
        success: false,
        error: errorMessage,
        status: error.response?.status
      };
    }
  }

  /**
   * Request membership for private groups
   */
  async requestMembership(groupId, options = {}) {
    try {
      console.log(`📨 Requesting membership for private group: ${groupId}`);
      
      const endpoint = `${this.baseUrl}/wp-json/buddypress/v1/groups/${groupId}/membership-requests`;
      const data = {
        user_id: 'me',
        message: options.membershipMessage || 'Requesting membership via BuddyClaw'
      };

      if (options.captchaSolution) {
        data.captcha_solution = options.captchaSolution;
      }

      const response = await axios.post(endpoint, data, {
        headers: this.getAuthHeaders()
      });

      return {
        success: true,
        message: 'Membership request sent successfully',
        data: response.data
      };

    } catch (error) {
      return {
        success: false,
        error: `Membership request failed: ${error.message}`,
        status: error.response?.status
      };
    }
  }

  /**
   * Check if REST API support is available
   */
  async hasRestApiSupport() {
    try {
      const endpoint = `${this.baseUrl}/wp-json/buddypress/v1/`;
      const response = await axios.get(endpoint, {
        headers: this.getAuthHeaders()
      });
      
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get nonce for traditional AJAX requests
   */
  async getNonce(groupId) {
    try {
      const endpoint = `${this.baseUrl}/groups/${groupId}`;
      const response = await axios.get(endpoint);
      
      // Extract nonce from page content
      const nonceMatch = response.data.match(/_wpnonce["']?\s*:\s*["']([^"']+)["']/);
      if (nonceMatch) {
        return nonceMatch[1];
      }
      
      // Alternative nonce extraction patterns
      const noncePatterns = [
        /data-bp-nonce=["']([^"']+)["']/,  // BuddyPress pattern
        /name=["']_wpnonce["'] value=["']([^"']+)["']/,  // WordPress pattern
        /wp_nonce*=*["']([^"']+)["']/  // JavaScript pattern
      ];
      
      for (const pattern of noncePatterns) {
        const match = response.data.match(pattern);
        if (match) {
          return match[1];
        }
      }
      
      throw new Error('Could not extract nonce from page');
      
    } catch (error) {
      console.warn('⚠️ Nonce extraction failed:', error.message);
      return null;
    }
  }

  /**
   * Get authentication headers
   */
  getAuthHeaders() {
    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'BuddyClaw/0.0.2'
    };

    // Add authentication based on credentials type
    if (this.credentials.apiToken) {
      headers['Authorization'] = `Bearer ${this.credentials.apiToken}`;
    } else if (this.credentials.username && this.credentials.appPassword) {
      const auth = Buffer.from(`${this.credentials.username}:${this.credentials.appPassword}`).toString('base64');
      headers['Authorization'] = `Basic ${auth}`;
    } else if (this.credentials.nonce) {
      headers['X-WP-Nonce'] = this.credentials.nonce;
    }

    return headers;
  }

  /**
   * Leave a group
   */
  async leaveGroup(groupId, options = {}) {
    try {
      console.log(`👋 Leaving group: ${groupId}`);
      
      const endpoint = `${this.baseUrl}/wp-json/buddypress/v1/groups/${groupId}/members`;
      
      const response = await axios.delete(endpoint, {
        headers: this.getAuthHeaders(),
        params: { user_id: 'me' }
      });

      return {
        success: true,
        message: 'Successfully left group',
        data: response.data
      };

    } catch (error) {
      return {
        success: false,
        error: `Failed to leave group: ${error.message}`,
        status: error.response?.status
      };
    }
  }

  /**
   * Get user's groups
   */
  async getUserGroups(userId = 'me') {
    try {
      console.log(`👤 Getting groups for user: ${userId}`);
      
      const endpoint = `${this.baseUrl}/wp-json/buddypress/v1/groups`;
      const response = await axios.get(endpoint, {
        headers: this.getAuthHeaders(),
        params: { user_id: userId }
      });

      return {
        success: true,
        message: 'User groups retrieved successfully',
        data: response.data
      };

    } catch (error) {
      return {
        success: false,
        error: `Failed to get user groups: ${error.message}`,
        status: error.response?.status
      };
    }
  }
}

// Export for use in other modules
module.exports = GroupJoiner;

// CLI functionality for testing
if (require.main === module) {
  (async () => {
    const joiner = new GroupJoiner();
    
    // Handle command line arguments
    const args = process.argv.slice(2);
    
    if (args.includes('--help') || args.includes('-h')) {
      console.log('BuddyClaw Group/Forum Joiner');
      console.log('Usage:');
      console.log('  node group-joiner.js [command] [options]');
      console.log('');
      console.log('Commands:');
      console.log('  join <groupId>                    Join a group');
      console.log('  leave <groupId>                   Leave a group');
      console.log('  status <groupId>                  Check membership status');
      console.log('  list [userId]                     List user groups (default: current user)');
      console.log('');
      console.log('Options:');
      console.log('  --base-url <url>                  WordPress site URL');
      console.log('  --username <user>                   Username for auth');
      console.log('  --app-password <pass>              App password for auth');
      console.log('  --api-token <token>                API token for auth');
      console.log('  --message <text>                   Membership request message');
      console.log('');
      console.log('Examples:');
      console.log('  node group-joiner.js join buddyboss --base-url https://site.com --username user --app-password pass');
      console.log('  node group-joiner.js status general-discussion --base-url https://site.com --api-token token');
      console.log('  node group-joiner.js list --base-url https://site.com --username user --app-password pass');
      process.exit(0);
    }

    // Parse command and options
    const command = args[0];
    const target = args[1];
    
    if (!command || !target) {
      console.error('❌ Please provide command and target');
      process.exit(1);
    }

    const options = {
      baseUrl: args.find(arg => arg.startsWith('--base-url='))?.split('=')[1] || '',
      username: args.find(arg => arg.startsWith('--username='))?.split('=')[1] || '',
      appPassword: args.find(arg => arg.startsWith('--app-password='))?.split('=')[1] || '',
      apiToken: args.find(arg => arg.startsWith('--api-token='))?.split('=')[1] || '',
      membershipMessage: args.find(arg => arg.startsWith('--message='))?.split('=')[1] || ''
    };

    // Set credentials
    joiner.baseUrl = options.baseUrl;
    joiner.credentials = {
      username: options.username,
      appPassword: options.appPassword,
      apiToken: options.apiToken
    };

    // Execute command
    let result;
    switch (command) {
      case 'join':
        result = await joiner.joinGroup(target, { membershipMessage: options.membershipMessage });
        break;
      case 'leave':
        result = await joiner.leaveGroup(target);
        break;
      case 'status':
        result = await joiner.checkMembershipStatus(target);
        break;
      case 'list':
        result = await joiner.getUserGroups(target === 'list' ? 'me' : target);
        break;
      default:
        console.error('❌ Unknown command:', command);
        process.exit(1);
    }

    if (result.success) {
      console.log('✅ Success:', result.message);
      if (result.data) {
        console.log('📊 Data:', JSON.stringify(result.data, null, 2));
      }
      process.exit(0);
    } else {
      console.error('❌ Failed:', result.error);
      process.exit(1);
    }
  })().catch(error => {
    console.error('❌ CLI Error:', error.message);
    process.exit(1);
  });
}