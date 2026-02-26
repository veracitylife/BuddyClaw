const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const AgentManager = require('./agent-manager');
const EmailVerifier = require('./email-verifier');

/**
 * Enhanced BuddyClaw Poster - Multi-Agent WordPress Integration
 * Spun Web Technology - Version 0.0.1
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
      
      // Check if this is a multi-agent request
      if (data.agent_email) {
        return await this.processMultiAgentRequest(data);
      } else {
        // Legacy single-user request
        return await this.processSingleUserRequest(data);
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        details: error.response?.data || null
      };
    }
  }

  async processMultiAgentRequest(data) {
    console.log(`Processing multi-agent request for ${data.agent_email}`);
    
    const { agent_email, site_base_url, content_target, title, content, status = 'draft' } = data;
    
    // Get agent credentials
    const credentialsResult = this.agentManager.getAgentCredentials(agent_email);
    
    if (!credentialsResult.success) {
      // Agent doesn't exist or isn't active - try to register
      console.log(`Agent ${agent_email} not found, attempting registration...`);
      return await this.registerAndPublish(data);
    }
    
    // Use existing credentials
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
    
    return await this.publishToWordPress(wpData);
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
      
      return await this.publishToWordPress(publishData);
      
    } catch (error) {
      return {
        success: false,
        error: `Registration and publishing failed: ${error.message}`,
        details: error.response?.data || null
      };
    }
  }

  async processSingleUserRequest(data) {
    // Legacy single-user processing
    return await this.publishToWordPress(data);
  }

  async publishToWordPress(data) {
    const {
      site_base_url,
      wp_username,
      wp_app_password,
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
          wp_username,
          content_target,
          title,
          content_preview: content?.substring(0, 100) + '...',
          status
        }
      };
    }

    try {
      // Validate required fields
      if (!site_base_url || !wp_username || !wp_app_password) {
        throw new Error('Missing required WordPress credentials');
      }

      if (!title || !content) {
        throw new Error('Missing required content fields (title, content)');
      }

      // Generate Basic Auth header
      const authHeader = 'Basic ' + Buffer.from(wp_username + ':' + wp_app_password).toString('base64');
      
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

      console.log(`Publishing ${content_target} to ${endpoint}...`);

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
        media_uploaded: mediaIds.length
      };

    } catch (error) {
      console.error(`Failed to publish ${content_target}:`, error.message);
      
      return {
        success: false,
        error: error.message,
        details: error.response?.data || null,
        status: error.response?.status || null
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