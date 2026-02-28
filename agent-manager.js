const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const axios = require('axios');

/**
 * Agent Manager - Multi-Agent WordPress Registration System
 * Spun Web Technology - Version 0.0.1
 */

class AgentManager {
  constructor(vaultPath = '~/.openclaw/vault/') {
    this.vaultPath = vaultPath.replace('~', process.env.HOME || process.env.USERPROFILE);
    this.agentsFile = path.join(this.vaultPath, 'agents.json');
    this.ensureVaultExists();
  }

  ensureVaultExists() {
    if (!fs.existsSync(this.vaultPath)) {
      fs.mkdirSync(this.vaultPath, { recursive: true });
    }
    
    if (!fs.existsSync(this.agentsFile)) {
      fs.writeFileSync(this.agentsFile, JSON.stringify({ agents: {} }, null, 2));
    }
  }

  generateWordPressPassword() {
    // Generate WordPress-compatible password
    const length = 16;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
    let password = '';
    
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    
    return password;
  }

  async registerAgent(email, agentName, wordpressUrl) {
    console.log(`Registering agent: ${agentName} (${email})`);
    
    try {
      // Check if agent already exists
      const agents = this.loadAgents();
      if (agents.agents[email]) {
        throw new Error(`Agent with email ${email} already exists`);
      }

      // Generate password
      const password = this.generateWordPressPassword();
      
      // Create agent record
      const agent = {
        email,
        agentName,
        wordpressUrl,
        password,
        createdAt: new Date().toISOString(),
        status: 'pending_registration',
        credentials: null
      };

      // Store agent info (without credentials initially)
      agents.agents[email] = agent;
      this.saveAgents(agents);

      console.log(`Agent ${agentName} created successfully`);
      return {
        success: true,
        agent: {
          email,
          agentName,
          password,
          status: 'pending_registration'
        }
      };

    } catch (error) {
      console.error(`Failed to register agent ${agentName}:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async registerWordPressAccount(email, wordpressUrl, siteUrl) {
    console.log(`Registering WordPress account for ${email} on ${siteUrl}`);
    
    try {
      const agents = this.loadAgents();
      const agent = agents.agents[email];
      
      if (!agent) {
        throw new Error(`Agent ${email} not found`);
      }

      // WordPress registration endpoint
      const registrationEndpoint = `${siteUrl}/wp-json/wp/v2/users/register`;
      
      // For sites that don't have custom registration endpoint, use standard WordPress registration
      const registrationData = {
        username: email.split('@')[0], // Use email prefix as username
        email: email,
        password: agent.password,
        // Additional fields that might be required
        first_name: agent.agentName,
        last_name: 'Agent',
        // WordPress registration often requires additional security
        // This is a simplified version - real implementation would need more security measures
      };

      try {
        // Try direct registration (if enabled on WordPress)
        const response = await axios.post(registrationEndpoint, registrationData, {
          headers: { 'Content-Type': 'application/json' }
        });

        console.log('WordPress registration response:', response.data);
        
        // Update agent status
        agent.status = 'registered';
        agent.wordpressUsername = email.split('@')[0];
        agent.credentials = {
          username: email.split('@')[0],
          appPassword: null // Will be generated after email verification
        };
        
        this.saveAgents(agents);
        
        return {
          success: true,
          data: response.data,
          message: 'WordPress account created successfully'
        };

      } catch (wpError) {
        console.error('WordPress registration failed:', wpError.response?.data || wpError.message);
        
        // Check if it's because registration is disabled or user exists
        if (wpError.response?.status === 404 || wpError.response?.status === 405) {
          throw new Error('Registration REST endpoint not available on this site');
        } else if (wpError.response?.status === 403) {
          throw new Error('Registration is disabled on this WordPress site');
        } else if (wpError.response?.status === 400) {
          throw new Error(`Registration failed: ${wpError.response.data.message}`);
        } else {
          throw new Error(`WordPress registration error: ${wpError.message}`);
        }
      }

    } catch (error) {
      console.error(`Failed to register WordPress account for ${email}:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async generateApplicationPassword(email, siteUrl) {
    console.log(`Generating application password for ${email}`);
    
    try {
      const agents = this.loadAgents();
      const agent = agents.agents[email];
      
      if (!agent || !agent.credentials) {
        throw new Error(`Agent ${email} not found or not registered`);
      }

      // For now, we'll use the main password as app password
      // In a real implementation, this would involve WordPress admin or special API
      const appPassword = agent.password;
      
      agent.credentials.appPassword = appPassword;
      agent.status = 'active';
      
      this.saveAgents(agents);
      
      return {
        success: true,
        appPassword: appPassword,
        message: 'Application password generated successfully'
      };

    } catch (error) {
      console.error(`Failed to generate application password for ${email}:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  getAgentCredentials(email) {
    try {
      const agents = this.loadAgents();
      const agent = agents.agents[email];
      
      if (!agent) {
        throw new Error(`Agent ${email} not found`);
      }
      
      if (agent.status !== 'active' || !agent.credentials) {
        throw new Error(`Agent ${email} is not active or missing credentials`);
      }
      
      return {
        success: true,
        credentials: {
          username: agent.credentials.username,
          appPassword: agent.credentials.appPassword,
          siteUrl: agent.wordpressUrl
        }
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  loadAgents() {
    try {
      const data = fs.readFileSync(this.agentsFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Failed to load agents:', error.message);
      return { agents: {} };
    }
  }

  saveAgents(agents) {
    try {
      fs.writeFileSync(this.agentsFile, JSON.stringify(agents, null, 2));
    } catch (error) {
      console.error('Failed to save agents:', error.message);
      throw error;
    }
  }

  listAgents() {
    const agents = this.loadAgents();
    return Object.values(agents.agents).map(agent => ({
      email: agent.email,
      agentName: agent.agentName,
      status: agent.status,
      createdAt: agent.createdAt,
      wordpressUrl: agent.wordpressUrl
    }));
  }
}

// CLI Interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const manager = new AgentManager();

  if (args.length === 0) {
    console.log(JSON.stringify({
      error: "No command provided",
      usage: "node agent-manager.js --register --email EMAIL --agent-name NAME --wordpress-url URL"
    }));
    process.exit(1);
  }

  const command = args[0];
  
  switch (command) {
    case '--register':
      const email = args.find(arg => arg.startsWith('--email='))?.split('=')[1];
      const agentName = args.find(arg => arg.startsWith('--agent-name='))?.split('=')[1];
      const wordpressUrl = args.find(arg => arg.startsWith('--wordpress-url='))?.split('=')[1];
      
      if (!email || !agentName || !wordpressUrl) {
        console.log(JSON.stringify({
          error: "Missing required parameters",
          usage: "node agent-manager.js --register --email EMAIL --agent-name NAME --wordpress-url URL"
        }));
        process.exit(1);
      }
      
      manager.registerAgent(email, agentName, wordpressUrl).then(result => {
        console.log(JSON.stringify(result));
        process.exit(result.success ? 0 : 1);
      });
      break;
      
    case '--list':
      const agents = manager.listAgents();
      console.log(JSON.stringify({ success: true, agents }));
      break;
      
    case '--get-credentials':
      const getEmail = args.find(arg => arg.startsWith('--email='))?.split('=')[1];
      if (!getEmail) {
        console.log(JSON.stringify({ error: "Email required" }));
        process.exit(1);
      }
      
      const creds = manager.getAgentCredentials(getEmail);
      console.log(JSON.stringify(creds));
      process.exit(creds.success ? 0 : 1);
      
    default:
      console.log(JSON.stringify({ error: "Unknown command", command }));
      process.exit(1);
  }
}

module.exports = AgentManager;
