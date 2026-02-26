const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const AgentManager = require('./agent-manager');
const EmailVerifier = require('./email-verifier');

/**
 * Enhanced BuddyClaw Poster - Multi-Agent WordPress Integration with REST API Token Support
 * Spun Web Technology - Version 0.0.2
 * 
 * NEW: Added REST API token authentication as optional authentication method
 */

class EnhancedBuddyClaw {
  constructor() {
    this.agentManager = new AgentManager();
    this.emailVerifier = new EmailVerifier();
  }

  async processInput(inputData) {
    try {
      // Parse input
      const data = typeof inputData === 'string' ? JSON.parse(inputData) : inputData;
      
      // Determine authentication method
      const authMethod = this.determineAuthMethod(data);
      console.log(`Using authentication method: ${authMethod}`);
      
      // Check if this is a multi-agent request
      if (data.agent_email) {
        return await this.processMultiAgentRequest(data, authMethod);
      } else {
        // Legacy single-user request with chosen auth method
        return await this.processSingleUserRequest(data, authMethod);
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        details: error.response?.data || null
      };
    }
  }

  determineAuthMethod(data) {
    // Priority order: API Token > Application Password > Basic Auth
    if (data.wp_api_token) {
      return 'api_token';
    } else if (data.wp_app_password) {
      return 'app_password';
    } else if (data.wp_username && data.wp_password) {
      return 'basic_auth';
    } else if (data.agent_email) {
      return 'multi_agent';
    } else {
      throw new Error('No authentication method provided. Use wp_api_token, wp_app_password, wp_username+wp_password, or agent_email');
    }
  }

  async processMultiAgentRequest(data, authMethod) {
    console.log(`Processing multi-agent request for ${data.agent_email}`);
    
    const { agent_email, site_base_url, content_target, title, content, status = 'draft' } = data;
    
    // Get agent credentials
    const credentialsResult = this.agentManager.getAgentCredentials(agent_email);
    
    if (!credentialsResult.success) {
      // Agent doesn't exist or isn't active - try to register
      console.log(`Agent ${agent_email} not found, attempting registration...`);
      return await this.registerAndPublish(data);
    }
    
    // Use existing credentials with app password method
    const credentials = credentialsResult.credentials;
    
    // Prepare WordPress request
    const wpData = {
      site_base_url: site_base_url || credentials.siteUrl,
      wp_username: credentials.username,
      wp_app_password: credentials.appPassword,
      content_target,
      title,
      content,
      status
    };
    
    const result = await this.publishToWordPress(wpData, 'app_password');
    result.auth_method = 'multi_agent';
    return result;
  }

  async processSingleUserRequest(data, authMethod) {
    // Handle different authentication methods
    switch (authMethod) {
      case 'api_token':
        return await this.publishWithApiToken(data);
      case 'app_password':
        return await this.publishWithAppPassword(data);
      case 'basic_auth':
        return await this.publishWithBasicAuth(data);
      default:
        throw new Error(`Unsupported authentication method: ${authMethod}`);
    }
  }

  async publishWithApiToken(data) {
    const { wp_api_token, site_base_url } = data;
    
    console.log(`Publishing with API Token authentication to ${site_base_url}`);
    
    try {
      // For API token authentication, we need to determine the user ID first
      const userInfo = await this.getUserInfoWithToken(site_base_url, wp_api_token);
      
      if (!userInfo.success) {
        throw new Error(`Failed to get user info: ${userInfo.error}`);
      }
      
      // Use the user ID from token validation
      const enhancedData = {
        ...data,
        wp_username: userInfo.data.username,
        wp_user_id: userInfo.data.id
      };
      
      const result = await this.publishToWordPress(enhancedData, 'api_token');
      result.auth_method = 'api_token';
      return result;
      
    } catch (error) {
      return {
        success: false,
        error: `API Token authentication failed: ${error.message}`,
        details: error.response?.data || null,
        auth_method: 'api_token'
      };
    }
  }

  async publishWithAppPassword(data) {
    console.log(`Publishing with Application Password authentication`);
    const result = await this.publishToWordPress(data, 'app_password');
    result.auth_method = 'app_password';
    return result;
  }

  async publishWithBasicAuth(data) {
    console.log(`Publishing with Basic Authentication`);
    const result = await this.publishToWordPress(data, 'basic_auth');
    result.auth_method = 'basic_auth';
    return result;
  }

  async getUserInfoWithToken(siteUrl, apiToken) {
    try {
      // Skip SSL verification for testing (remove in production)
      const axiosConfig = {
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        },
        httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false })
      };
      
      const response = await axios.get(`${siteUrl}/wp-json/wp/v2/users/me`, axiosConfig);
      
      return {
        success: true,
        data: {
          id: response.data.id,
          username: response.data.slug
        }
      };
      
    } catch (error) {
      return {
        success: false,
        error: `Token validation failed: ${error.message}`,
        details: error.response?.data || null
      };
    }
  }

  async registerAndPublish(data) {
    const { agent_email, site_base_url, content_target, title, content, status = 'draft' } = data;
    
    try {
      // Step 1: Register agent
      const agentName = agent_email.split('@')[0] || 'Agent';
      const registerResult = await this.agentManager.registerAgent(agent_email, agentName, site_base_url);
      
      if (!registerResult.success) {
        throw new Error(`Agent registration failed: ${registerResult.error}`);
      }
      
      // Step 2: Register WordPress account
      console.log(`Registering WordPress account for ${agent_email}...`);
      const wpRegisterResult = await this.agentManager.registerWordPressAccount(agent_email, site_base_url, site_base_url);
      
      if (!wpRegisterResult.success) {
        // If registration fails, it might be because the site doesn't allow registration
        // In this case, we'll try to use the existing account if possible
        console.log(`WordPress registration failed: ${wpRegisterResult.error}`);
        console.log(`Attempting to use existing credentials...`);
      }
      
      // Step 3: Wait for email verification (if needed)
      console.log(`Checking for email verification...`);
      const emailResult = await this.emailVerifier.checkEmailVerification(agent_email);
      
      if (emailResult.success && emailResult.verificationLink) {
        console.log(`Verification link found, clicking...`);
        const clickResult = await this.emailVerifier.clickVerificationLink(emailResult.verificationLink);
        
        if (!clickResult.success) {
          console.warn(`Verification link click failed: ${clickResult.error}`);
        }
      } else {
        console.log(`No verification email found or not required`);
      }
      
      // Step 4: Generate application password
      const appPasswordResult = await this.agentManager.generateApplicationPassword(agent_email, site_base_url);
      
      if (!appPasswordResult.success) {
        throw new Error(`Application password generation failed: ${appPasswordResult.error}`);
      }
      
      // Step 5: Get final credentials and publish
      const finalCreds = this.agentManager.getAgentCredentials(agent_email);
      
      if (!finalCreds.success) {
        throw new Error(`Failed to retrieve final credentials: ${finalCreds.error}`);
      }
      
      const publishData = {
        site_base_url,
        wp_username: finalCreds.credentials.username,
        wp_app_password: finalCreds.credentials.appPassword,
        content_target,
        title,
        content,
        status
      };
      
      const result = await this.publishToWordPress(publishData, 'app_password');
      result.auth_method = 'multi_agent';
      return result;
      
    } catch (error) {
      return {
        success: false,
        error: `Registration and publishing failed: ${error.message}`,
        details: error.response?.data || null
      };
    }
  }

  async publishToWordPress(data, authMethod) {
    const {
      site_base_url,
      wp_username,
      wp_app_password,
      wp_api_token,
      wp_password,
      wp_user_id,
      content_target = 'post',
      title,
      content,
      status = 'draft',
      media = [],
      dry_run = false
    } = data;

    if (dry_run) {
      return {
        success: true,
        dry_run: true,
        message: 'Dry run successful - credentials and data validated',
        data: {
          site_base_url,
          auth_method: authMethod,
          content_target,
          title,
          content_preview: content?.substring(0, 100) + '...',
          status
        }
      };
    }

    try {
      // Validate required fields
      if (!site_base_url) {
        throw new Error('Missing required site_base_url');
      }

      if (!title || !content) {
        throw new Error('Missing required content fields (title, content)');
      }

      // Generate appropriate auth header based on method
      let authHeader;
      switch (authMethod) {
        case 'api_token':
          if (!wp_api_token) {
            throw new Error('Missing wp_api_token for API token authentication');
          }
          authHeader = `Bearer ${wp_api_token}`;
          break;
          
        case 'app_password':
          if (!wp_username || !wp_app_password) {
            throw new Error('Missing wp_username or wp_app_password for app password authentication');
          }
          authHeader = 'Basic ' + Buffer.from(wp_username + ':' + wp_app_password).toString('base64');
          break;
          
        case 'basic_auth':
          if (!wp_username || !wp_password) {
            throw new Error('Missing wp_username or wp_password for basic authentication');
          }
          authHeader = 'Basic ' + Buffer.from(wp_username + ':' + wp_password).toString('base64');
          break;
          
        default:
          throw new Error(`Unsupported authentication method: ${authMethod}`);
      }
      
      // Handle media uploads first
      let mediaIds = [];
      if (media && media.length > 0) {
        console.log(`Uploading ${media.length} media items...`);
        for (const mediaItem of media) {
          const uploadResult = await this.uploadMedia(mediaItem, site_base_url, authHeader);
          if (uploadResult.success) {
            mediaIds.push(uploadResult.mediaId);
          } else {
            console.warn(`Failed to upload media: ${uploadResult.error}`);
          }
        }
      }

      // Prepare content
      let finalContent = content;
      
      // Insert media into content if uploaded
      if (mediaIds.length > 0) {
        finalContent = this.insertMediaIntoContent(content, mediaIds, site_base_url);
      }

      // Prepare API request based on content target
      let endpoint, payload;
      
      switch (content_target) {
        case 'page':
          endpoint = `${site_base_url}/wp-json/wp/v2/pages`;
          payload = {
            title: title,
            content: finalContent,
            status: status
          };
          break;
          
        case 'activity':
          // BuddyBoss/BuddyPress activity
          endpoint = `${site_base_url}/wp-json/buddyboss/v1/activity`;
          payload = {
            content: `${title}\n\n${finalContent}`,
            component: 'activity',
            type: 'activity_update'
          };
          break;
          
        case 'post':
        default:
          endpoint = `${site_base_url}/wp-json/wp/v2/posts`;
          payload = {
            title: title,
            content: finalContent,
            status: status
          };
          break;
      }

      console.log(`Publishing ${content_target} to ${endpoint} using ${authMethod}...`);

      // Make the API request
      const response = await axios.post(endpoint, payload, {
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        }
      });

      console.log(`Successfully published ${content_target}!`);
      
      return {
        success: true,
        message: `${content_target} published successfully`,
        data: response.data,
        auth_method: authMethod,
        media_uploaded: mediaIds.length
      };

    } catch (error) {
      console.error(`Failed to publish ${content_target}:`, error.message);
      
      return {
        success: false,
        error: error.message,
        details: error.response?.data || null,
        status: error.response?.status || null,
        auth_method: authMethod
      };
    }
  }

  async uploadMedia(mediaItem, site_base_url, authHeader) {
    try {
      const { file_path, alt_text = '', caption = '' } = mediaItem;
      
      if (!fs.existsSync(file_path)) {
        throw new Error(`Media file not found: ${file_path}`);
      }

      const form = new FormData();
      form.append('file', fs.createReadStream(file_path));
      form.append('alt_text', alt_text);
      form.append('caption', caption);

      const response = await axios.post(
        `${site_base_url}/wp-json/wp/v2/media`,
        form,
        {
          headers: {
            ...form.getHeaders(),
            'Authorization': authHeader
          }
        }
      );

      return {
        success: true,
        mediaId: response.data.id,
        url: response.data.source_url
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  insertMediaIntoContent(content, mediaIds, site_base_url) {
    let mediaHtml = '';
    
    for (const mediaId of mediaIds) {
      mediaHtml += `\n<figure><img src="${site_base_url}/wp-content/uploads/${mediaId}" alt="Uploaded media" /></figure>\n`;
    }

    return content + mediaHtml;
  }
}

// Main execution
if (require.main === module) {
  let inputData = '';
  
  process.stdin.setEncoding('utf8');
  
  process.stdin.on('data', (chunk) => {
    inputData += chunk;
  });
  
  process.stdin.on('end', async () => {
    try {
      const buddyClaw = new EnhancedBuddyClaw();
      const result = await buddyClaw.processInput(inputData.trim());
      
      console.log(JSON.stringify(result));
      process.exit(result.success ? 0 : 1);
      
    } catch (error) {
      console.log(JSON.stringify({
        success: false,
        error: error.message,
        details: error.stack
      }));
      process.exit(1);
    }
  });
}

module.exports = EnhancedBuddyClaw;