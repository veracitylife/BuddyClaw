/**
 * BuddyClaw Interactive Chat-Based Onboarding System
 * Version: 0.0.3
 * 
 * This module provides a conversational onboarding experience for BuddyClaw,
 * guiding users through configuration step-by-step with validation and
 * vault credential management.
 */

const fs = require('fs').promises;
const path = require('path');
const readline = require('readline');
const { promisify } = require('util');

class ChatOnboarding {
    constructor() {
        this.version = '0.0.3';
        this.config = {};
        this.vaultPath = '~/.openclaw/workspace/VAULTS/superuser-credentials/super-user.md';
        this.expandedVaultPath = this.expandVaultPath();
        this.rl = null;
        this.steps = [
            'welcome',
            'vaultCheck',
            'vaultCredentials',
            'wordpressAPI',
            'captchaConfig',
            'finalConfig',
            'completion'
        ];
        this.currentStep = 0;
    }

    /**
     * Expand the vault path to handle ~ (home directory)
     */
    expandVaultPath() {
        if (this.vaultPath.startsWith('~/')) {
            return path.join(process.env.HOME || process.env.USERPROFILE, this.vaultPath.slice(2));
        }
        return this.vaultPath;
    }

    /**
     * Initialize the readline interface
     */
    initializeReadline() {
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
    }

    /**
     * Ask a question and wait for user input
     */
    async askQuestion(question, defaultValue = '') {
        return new Promise((resolve) => {
            const prompt = defaultValue ? `${question} (${defaultValue}): ` : `${question}: `;
            this.rl.question(prompt, (answer) => {
                resolve(answer.trim() || defaultValue);
            });
        });
    }

    /**
     * Ask a yes/no question
     */
    async askYesNo(question, defaultValue = true) {
        const defaultText = defaultValue ? 'Y/n' : 'y/N';
        const answer = await this.askQuestion(`${question} (${defaultText})`);
        
        if (!answer) return defaultValue;
        return answer.toLowerCase().startsWith('y');
    }

    /**
     * Display a welcome message
     */
    async displayWelcome() {
        console.log('\n🤖 ================================================');
        console.log('🤖  BuddyClaw Interactive Onboarding');
        console.log(`🤖  Version: ${this.version}`);
        console.log('🤖 ================================================');
        console.log('\n👋 Welcome to BuddyClaw!');
        console.log('I\'ll help you set up your WordPress posting assistant.');
        console.log('This process will guide you through configuration step-by-step.');
        console.log('\n💡 You can type "help" at any time for assistance.');
        console.log('   Type "skip" to skip optional steps.');
        console.log('   Press Ctrl+C to exit at any time.\n');
    }

    /**
     * Step 1: Welcome and introduction
     */
    async stepWelcome() {
        await this.displayWelcome();
        
        const continueSetup = await this.askYesNo('🚀 Would you like to continue with the setup?', true);
        
        if (!continueSetup) {
            console.log('\n👋 Setup cancelled. You can run this again anytime with: npm run configure\n');
            process.exit(0);
        }
        
        console.log('\n✅ Great! Let\'s get started...\n');
        return true;
    }

    /**
     * Step 2: Vault credential check
     */
    async stepVaultCheck() {
        console.log('🔐 Step 1: Vault Credential Check');
        console.log('=====================================');
        console.log('\nWe will be checking the VAULT for SU password credentials,');
        console.log('so that our Onboarding can configure the files for you.');
        console.log('\n📁 Default vault path:');
        console.log(`   ${this.vaultPath}`);
        console.log(`   (Expanded: ${this.expandedVaultPath})\n`);

        const continueToVault = await this.askYesNo('Continue to vault check?', true);
        
        if (!continueToVault) {
            console.log('\n⚠️  Skipping vault check. You\'ll need to enter credentials manually.\n');
            return false;
        }

        // Check if vault file exists
        try {
            await fs.access(this.expandedVaultPath);
            console.log('✅ Vault file found!');
            
            const useVault = await this.askYesNo('Would you like to use the saved VAULT credentials for your WordPress blog?', true);
            
            if (useVault) {
                console.log('\n✅ Vault credentials will be used for WordPress authentication.\n');
                this.config.useVaultCredentials = true;
                return true;
            } else {
                console.log('\n⚠️  Vault credentials will not be used.\n');
                this.config.useVaultCredentials = false;
                return false;
            }
        } catch (error) {
            console.log('\n❌ Vault file not found at the specified path.');
            console.log('You can create the file now, or we\'ll use manual configuration.\n');
            
            const createVault = await this.askYesNo('Would you like to create the vault file now?', false);
            
            if (createVault) {
                console.log('\n📋 To create the vault file:');
                console.log(`   1. Create the directory: mkdir -p "${path.dirname(this.expandedVaultPath)}"`);
                console.log(`   2. Create the file: touch "${this.expandedVaultPath}"`);
                console.log(`   3. Add your credentials in this format:`);
                console.log('      ```');
                console.log('      user: your-wordpress-username');
                console.log('      pass: your-wordpress-password');
                console.log('      ```');
                console.log('\n📝 After creating the file, type "continue" to proceed.');
                
                const continueAfterCreate = await this.askQuestion('Have you created the vault file? (type "continue" to proceed)');
                
                if (continueAfterCreate.toLowerCase() === 'continue') {
                    // Verify the file was created
                    try {
                        await fs.access(this.expandedVaultPath);
                        console.log('\n✅ Vault file created successfully!\n');
                        this.config.useVaultCredentials = true;
                        return true;
                    } catch (error) {
                        console.log('\n⚠️  Vault file still not found. Proceeding with manual configuration.\n');
                        this.config.useVaultCredentials = false;
                        return false;
                    }
                }
            }
            
            this.config.useVaultCredentials = false;
            return false;
        }
    }

    /**
     * Step 3: WordPress REST API configuration
     */
    async stepWordPressAPI() {
        console.log('\n🌐 Step 2: WordPress Configuration');
        console.log('=====================================');
        
        if (this.config.useVaultCredentials) {
            console.log('\n✅ Using vault credentials for WordPress authentication.');
            console.log('We\'ll extract the site URL and credentials from your vault file.\n');
            
            try {
                const vaultContent = await fs.readFile(this.expandedVaultPath, 'utf8');
                const lines = vaultContent.split('\n');
                
                for (const line of lines) {
                    if (line.startsWith('site:') || line.startsWith('url:')) {
                        this.config.siteUrl = line.split(':')[1].trim();
                    }
                    if (line.startsWith('user:')) {
                        this.config.username = line.split(':')[1].trim();
                    }
                    if (line.startsWith('pass:') || line.startsWith('password:')) {
                        this.config.password = line.split(':')[1].trim();
                    }
                }
                
                if (this.config.siteUrl) {
                    console.log(`✅ Site URL detected: ${this.config.siteUrl}`);
                }
                if (this.config.username) {
                    console.log(`✅ Username detected: ${this.config.username}`);
                }
                
                return true;
            } catch (error) {
                console.log('\n⚠️  Could not read vault file. Proceeding with manual configuration.\n');
            }
        }
        
        console.log('\n🔑 Manual WordPress Configuration');
        console.log('If you don\'t wish to use VAULT credentials, you can enter your');
        console.log('WordPress REST API key or Application Password here.\n');
        
        // Get site URL
        this.config.siteUrl = await this.askQuestion('🌐 Enter your WordPress site URL (e.g., https://yoursite.com)');
        
        if (!this.config.siteUrl) {
            console.log('\n❌ Site URL is required. Setup cancelled.\n');
            process.exit(1);
        }
        
        // Choose authentication method
        console.log('\n🔐 Choose your authentication method:');
        console.log('1. Application Password (Recommended)');
        console.log('2. REST API Token');
        console.log('3. Basic Authentication');
        console.log('4. Multi-Agent Registration (Auto-create account)');
        
        const authChoice = await this.askQuestion('Enter your choice (1-4)', '1');
        
        switch (authChoice) {
            case '1':
                this.config.authMethod = 'application_password';
                this.config.username = await this.askQuestion('👤 Enter your WordPress username');
                this.config.applicationPassword = await this.askQuestion('🔑 Enter your Application Password');
                break;
                
            case '2':
                this.config.authMethod = 'rest_api_token';
                this.config.apiToken = await this.askQuestion('🔑 Enter your REST API Token');
                break;
                
            case '3':
                this.config.authMethod = 'basic_auth';
                this.config.username = await this.askQuestion('👤 Enter your WordPress username');
                this.config.password = await this.askQuestion('🔑 Enter your WordPress password');
                break;
                
            case '4':
                this.config.authMethod = 'multi_agent';
                console.log('\n🤖 Multi-Agent Registration Selected');
                console.log('BuddyClaw will automatically register a new account for you.');
                console.log('Email verification will be handled via the Himalaya skill.\n');
                break;
                
            default:
                console.log('\n❌ Invalid choice. Using Application Password method.\n');
                this.config.authMethod = 'application_password';
                this.config.username = await this.askQuestion('👤 Enter your WordPress username');
                this.config.applicationPassword = await this.askQuestion('🔑 Enter your Application Password');
        }
        
        console.log('\n✅ WordPress configuration completed!\n');
        return true;
    }

    /**
     * Step 4: CAPTCHA configuration
     */
    async stepCaptchaConfig() {
        console.log('\n🤖 Step 3: CAPTCHA Configuration (Optional)');
        console.log('===============================================');
        console.log('\nIf you wish to use automatic CAPTCHA solving,');
        console.log('enter your 2captcha API key. Otherwise, just');
        console.log('press Enter to skip this step.\n');
        
        const captchaKey = await this.askQuestion('🔑 Enter your 2captcha API key (or press Enter to skip)');
        
        if (captchaKey) {
            this.config.captchaApiKey = captchaKey;
            console.log('\n✅ CAPTCHA solving enabled!');
            console.log('BuddyClaw will automatically solve CAPTCHAs during registration/login.\n');
        } else {
            console.log('\n⚠️  CAPTCHA solving disabled.');
            console.log('You can enable it later by adding the API key to your config.\n');
        }
        
        return true;
    }

    /**
     * Step 5: Final configuration
     */
    async stepFinalConfig() {
        console.log('\n⚙️  Step 4: Final Configuration');
        console.log('=================================');
        
        // Content generation preferences
        console.log('\n📝 Content Generation Preferences:');
        this.config.autoTitle = await this.askYesNo('Automatically generate post titles?', true);
        this.config.autoExcerpt = await this.askYesNo('Automatically generate post excerpts?', true);
        this.config.autoTags = await this.askYesNo('Automatically generate tags?', true);
        this.config.featuredImage = await this.askYesNo('Automatically generate featured images?', true);
        
        // Bulk processing settings
        console.log('\n📊 Bulk Processing Settings:');
        this.config.defaultDelay = parseInt(await this.askQuestion('Default delay between posts (seconds)', '3'));
        this.config.maxRetries = parseInt(await this.askQuestion('Maximum retry attempts', '3'));
        this.config.batchSize = parseInt(await this.askQuestion('Batch size for bulk operations', '10'));
        
        console.log('\n✅ Configuration preferences saved!\n');
        return true;
    }

    /**
     * Step 6: Completion and instructions
     */
    async stepCompletion() {
        console.log('\n🎉 Setup Complete!');
        console.log('===================');
        console.log('\n✅ BuddyClaw has been successfully configured!');
        console.log('\n📋 Configuration Summary:');
        console.log(`   Site URL: ${this.config.siteUrl}`);
        console.log(`   Auth Method: ${this.config.authMethod}`);
        console.log(`   CAPTCHA Solving: ${this.config.captchaApiKey ? 'Enabled' : 'Disabled'}`);
        console.log(`   Auto Content Generation: ${this.config.autoTitle ? 'Enabled' : 'Disabled'}`);
        
        // Save configuration
        await this.saveConfiguration();
        
        console.log('\n🚀 How to use BuddyClaw:');
        console.log('=========================');
        console.log('\n📋 Basic Commands:');
        console.log('   Post "Your content here"                    - Single post');
        console.log('   Bulk post from RSS [URL] count:5             - RSS feed posting');
        console.log('   Bulk post from file [path]                   - File-based posting');
        console.log('   Post "Content" status:draft tone:formal      - With options');
        
        console.log('\n📚 Documentation:');
        console.log('   📖 Full Documentation: [Documentation.md](Documentation.md)');
        console.log('   🏠 GitHub Repository: https://github.com/veracitylife/BuddyClaw');
        console.log('   💬 Chat Interface: Available through OpenClaw');
        
        console.log('\n🔧 Configuration File:');
        console.log(`   Saved to: ${path.join(process.cwd(), 'config', 'openclaw.json')}`);
        console.log('   You can edit this file manually for advanced configuration.');
        
        console.log('\n📞 Support:');
        console.log('   🐛 Issues: https://github.com/veracitylife/BuddyClaw/issues');
        console.log('   💬 Discussions: https://github.com/veracitylife/BuddyClaw/discussions');
        
        console.log('\n🎯 Ready to start posting!');
        console.log('   Try: Post "Hello World! This is my first BuddyClaw post!"');
        console.log('\n=======================================\n');
        
        return true;
    }

    /**
     * Save the configuration to file
     */
    async saveConfiguration() {
        try {
            const configDir = path.join(process.cwd(), 'config');
            const configPath = path.join(configDir, 'openclaw.json');
            
            // Ensure config directory exists
            await fs.mkdir(configDir, { recursive: true });
            
            const configData = {
                version: this.version,
                onboarding: {
                    completed: true,
                    date: new Date().toISOString()
                },
                wordpress: {
                    siteUrl: this.config.siteUrl,
                    authMethod: this.config.authMethod,
                    credentials: {
                        username: this.config.username,
                        applicationPassword: this.config.applicationPassword,
                        apiToken: this.config.apiToken,
                        password: this.config.password
                    }.filter(Boolean), // Remove undefined values
                    restApi: {
                        namespace: 'wp/v2',
                        endpoints: {
                            posts: '/wp/v2/posts',
                            media: '/wp/v2/media',
                            users: '/wp/v2/users'
                        }
                    }
                },
                captcha: {
                    enabled: !!this.config.captchaApiKey,
                    apiKey: this.config.captchaApiKey,
                    service: '2captcha'
                },
                contentGeneration: {
                    autoTitle: this.config.autoTitle,
                    autoExcerpt: this.config.autoExcerpt,
                    autoTags: this.config.autoTags,
                    featuredImage: this.config.featuredImage
                },
                bulkProcessing: {
                    defaultDelay: this.config.defaultDelay,
                    maxRetries: this.config.maxRetries,
                    batchSize: this.config.batchSize
                }
            };
            
            await fs.writeFile(configPath, JSON.stringify(configData, null, 2));
            console.log('✅ Configuration saved successfully!');
            
        } catch (error) {
            console.error('\n❌ Error saving configuration:', error.message);
            throw error;
        }
    }

    /**
     * Run the complete onboarding process
     */
    async runOnboarding() {
        try {
            this.initializeReadline();
            
            console.clear();
            
            for (const step of this.steps) {
                const stepMethod = `step${step.charAt(0).toUpperCase() + step.slice(1)}`;
                
                if (typeof this[stepMethod] === 'function') {
                    await this[stepMethod]();
                }
            }
            
        } catch (error) {
            console.error('\n❌ Onboarding error:', error.message);
            console.log('\n💡 You can restart the onboarding process anytime with: npm run configure\n');
            process.exit(1);
        } finally {
            if (this.rl) {
                this.rl.close();
            }
        }
    }

    /**
     * Check if onboarding has been completed
     */
    static async isOnboardingCompleted() {
        try {
            const configPath = path.join(process.cwd(), 'config', 'openclaw.json');
            const configData = JSON.parse(await fs.readFile(configPath, 'utf8'));
            return configData.onboarding?.completed === true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Get current configuration
     */
    static async getConfiguration() {
        try {
            const configPath = path.join(process.cwd(), 'config', 'openclaw.json');
            const configData = JSON.parse(await fs.readFile(configPath, 'utf8'));
            return configData;
        } catch (error) {
            return null;
        }
    }
}

// Export for use in other modules
module.exports = ChatOnboarding;

// Run onboarding if this file is executed directly
if (require.main === module) {
    const onboarding = new ChatOnboarding();
    onboarding.runOnboarding().catch(console.error);
}