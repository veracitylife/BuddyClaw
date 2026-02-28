const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const ConfigManager = require('./config-manager');

/**
 * BuddyClaw Autonomous Content Generator and Poster
 * Integrates with AI models to generate content and post to WordPress
 * Spun Web Technology - Version 0.0.4
 */

class AutonomousBuddyClaw {
  constructor() {
    this.configManager = new ConfigManager();
    this.contentCache = new Map();
    this.imageCache = new Map();
  }

  /**
   * Main autonomous posting function
   * Processes user chat input and generates complete WordPress posts
   */
  async processChatInput(chatInput, options = {}) {
    try {
      console.log('🤖 BuddyClaw Autonomous Mode Activated');
      console.log('Input:', chatInput);

      // Initialize configuration
      await this.configManager.initialize();
      
      // Validate configuration
      const validation = this.configManager.validateConfig();
      if (!validation.valid) {
        throw new Error(`Configuration invalid: ${validation.errors.join(', ')}`);
      }

      // Generate content using AI model
      console.log('📝 Generating content...');
      const generatedContent = await this.generateContent(chatInput, options);
      
      // Generate or select featured image
      console.log('🖼️  Processing featured image...');
      const featuredImage = await this.processFeaturedImage(generatedContent, options);
      
      // Prepare WordPress post data
      console.log('📋 Preparing WordPress post...');
      const postData = this.preparePostData(generatedContent, featuredImage, options);
      
      // Post to WordPress
      console.log('🚀 Posting to WordPress...');
      const result = await this.postToWordPress(postData);
      
      console.log('✅ Autonomous posting completed!');
      return {
        success: true,
        post_id: result.id,
        post_url: result.link,
        title: generatedContent.title,
        content_summary: generatedContent.content.substring(0, 200) + '...',
        featured_image: featuredImage.url || 'None'
      };

    } catch (error) {
      console.error('❌ Autonomous posting failed:', error.message);
      return {
        success: false,
        error: error.message,
        details: error.response?.data || null
      };
    }
  }

  /**
   * Generate content using AI model integration
   */
  async generateContent(userInput, options = {}) {
    try {
      // This is where you would integrate with your AI model
      // For now, we'll simulate AI content generation
      
      const contentType = options.content_type || 'post';
      const tone = options.tone || 'informative';
      const length = options.length || 'medium';
      
      // Simulate AI-generated content
      const title = this.generateTitle(userInput, tone);
      const content = this.generateArticleContent(userInput, tone, length);
      const excerpt = this.generateExcerpt(content);
      const tags = this.generateTags(userInput, content);
      const meta = this.generateMeta(title, content);
      
      return {
        title,
        content,
        excerpt,
        tags,
        meta,
        generated_at: new Date().toISOString()
      };

    } catch (error) {
      throw new Error(`Content generation failed: ${error.message}`);
    }
  }

  /**
   * Generate title based on user input
   */
  generateTitle(userInput, tone) {
    const titleTemplates = {
      informative: [
        `Understanding ${userInput}: A Comprehensive Guide`,
        `The Complete Guide to ${userInput}`,
        `Everything You Need to Know About ${userInput}`,
        `${userInput}: Facts, Myths, and Insights`
      ],
      conversational: [
        `Let's Talk About ${userInput}`,
        `My Thoughts on ${userInput}`,
        `Why ${userInput} Matters Today`,
        `The Real Story Behind ${userInput}`
      ],
      professional: [
        `Strategic Insights on ${userInput}`,
        `${userInput}: Industry Analysis and Trends`,
        `Professional Perspective: ${userInput}`,
        `${userInput} Best Practices and Recommendations`
      ]
    };

    const templates = titleTemplates[tone] || titleTemplates.informative;
    return templates[Math.floor(Math.random() * templates.length)];
  }

  /**
   * Generate article content
   */
  generateArticleContent(userInput, tone, length) {
    const lengthWords = {
      short: 300,
      medium: 800,
      long: 1500
    };

    const targetLength = lengthWords[length] || lengthWords.medium;
    
    // Simulate AI-generated content structure
    const intro = this.generateIntro(userInput, tone);
    const body = this.generateBody(userInput, tone, targetLength);
    const conclusion = this.generateConclusion(userInput, tone);
    
    return `${intro}\n\n${body}\n\n${conclusion}`;
  }

  generateIntro(userInput, tone) {
    const intros = {
      informative: `<p>In today's rapidly evolving landscape, understanding <strong>${userInput}</strong> has become more crucial than ever. This comprehensive guide will explore the key aspects, benefits, and implications of ${userInput}.</p>`,
      conversational: `<p>Hey everyone! Today I want to share my thoughts about <strong>${userInput}</strong>. It's something that's been on my mind lately, and I think it's worth discussing.</p>`,
      professional: `<p>This analysis examines <strong>${userInput}</strong> from a strategic business perspective, providing insights into current trends, challenges, and opportunities in this domain.</p>`
    };
    
    return intros[tone] || intros.informative;
  }

  generateBody(userInput, tone, targetLength) {
    const sections = [
      `<h2>What is ${userInput}?</h2><p>${userInput} represents a significant development in its respective field, offering unique opportunities and challenges for individuals and organizations alike.</p>`,
      `<h2>Key Benefits and Applications</h2><p>The practical applications of ${userInput} are numerous and diverse. From enhancing productivity to enabling new forms of innovation, ${userInput} continues to shape how we approach modern challenges.</p>`,
      `<h2>Implementation Strategies</h2><p>Successfully implementing ${userInput} requires careful planning, adequate resources, and a clear understanding of the desired outcomes. Organizations should consider both short-term and long-term implications.</p>`,
      `<h2>Common Challenges and Solutions</h2><p>While ${userInput} offers tremendous potential, it's important to acknowledge and address common challenges that may arise during adoption and implementation phases.</p>`,
      `<h2>Future Outlook</h2><p>As technology continues to advance, ${userInput} is expected to play an increasingly important role in shaping future developments and opportunities.</p>`
    ];

    // Select 2-3 sections based on desired length
    const numSections = targetLength < 500 ? 2 : targetLength < 1000 ? 3 : 4;
    const selectedSections = sections.slice(0, numSections);
    
    return selectedSections.join('\n\n');
  }

  generateConclusion(userInput, tone) {
    const conclusions = {
      informative: `<h2>Conclusion</h2><p>${userInput} represents a valuable opportunity for growth and development. By understanding its key principles and applications, individuals and organizations can make informed decisions about how to best leverage its potential.</p>`,
      conversational: `<h2>Final Thoughts</h2><p>I hope this discussion about ${userInput} has been helpful. I'd love to hear your thoughts and experiences in the comments below. What are your perspectives on ${userInput}?</p>`,
      professional: `<h2>Recommendations</h2><p>Based on this analysis, organizations should consider developing a comprehensive strategy for ${userInput} that aligns with their overall business objectives and market positioning.</p>`
    };
    
    return conclusions[tone] || conclusions.informative;
  }

  generateExcerpt(content) {
    // Extract first paragraph and truncate
    const firstParagraph = content.split('</p>')[0].replace('<p>', '');
    return firstParagraph.length > 150 ? 
      firstParagraph.substring(0, 147) + '...' : 
      firstParagraph;
  }

  generateTags(userInput, content) {
    // Extract key terms from user input and content
    const commonTags = ['technology', 'innovation', 'trends', 'insights', 'analysis'];
    const specificTags = userInput.toLowerCase().split(' ').filter(word => word.length > 3);
    
    return [...commonTags.slice(0, 2), ...specificTags.slice(0, 3)];
  }

  generateMeta(title, content) {
    return {
      title: title,
      description: this.generateExcerpt(content),
      keywords: this.generateTags(title, content).join(', '),
      author: 'BuddyClaw AI',
      published_date: new Date().toISOString()
    };
  }

  /**
   * Process featured image generation or selection
   */
  async processFeaturedImage(content, options = {}) {
    try {
      // Option 1: Use provided image URL
      if (options.featured_image_url) {
        return {
          url: options.featured_image_url,
          alt: options.featured_image_alt || content.title,
          source: 'provided'
        };
      }

      // Option 2: Generate AI image (placeholder implementation)
      if (options.generate_image) {
        const imagePrompt = this.generateImagePrompt(content.title, content.content);
        console.log('🎨 Generating AI image with prompt:', imagePrompt);
        
        // This would integrate with your AI image generation service
        // For now, return a placeholder
        return {
          url: `https://via.placeholder.com/1200x630/0066cc/ffffff?text=${encodeURIComponent(content.title.substring(0, 50))}`,
          alt: content.title,
          source: 'generated',
          prompt: imagePrompt
        };
      }

      // Option 3: Use stock photo or default
      return {
        url: 'https://via.placeholder.com/1200x630/cccccc/666666?text=Featured+Image',
        alt: content.title,
        source: 'default'
      };

    } catch (error) {
      console.warn('⚠️  Featured image processing failed, using default:', error.message);
      return {
        url: 'https://via.placeholder.com/1200x630/cccccc/666666?text=Featured+Image',
        alt: content.title,
        source: 'fallback'
      };
    }
  }

  generateImagePrompt(title, content) {
    // Generate a descriptive prompt for AI image generation
    const keyTerms = title.toLowerCase().split(' ').slice(0, 5).join(' ');
    return `Professional, modern illustration representing "${keyTerms}", clean design, suitable for blog header, high quality, 1200x630`;
  }

  /**
   * Prepare WordPress post data
   */
  preparePostData(content, featuredImage, options = {}) {
    const credentials = this.configManager.getWordPressCredentials();
    
    const postData = {
      site_base_url: credentials.url,
      content_target: options.content_target || credentials.content_target || 'post',
      title: content.title,
      content: content.content,
      excerpt: content.excerpt,
      status: options.status || credentials.status || 'draft',
      tags: content.tags,
      meta: content.meta
    };

    // Allow comment target to carry post_id
    if (options.content_target === 'comment' && options.post_id) {
      postData.post_id = options.post_id;
      // Comments don't require title; ensure minimal data
      if (!postData.title) {
        postData.title = 'Comment';
      }
    }

    if (options.content_target === 'forum') {
      if (options.forum_id) postData.forum_id = options.forum_id;
      if (options.group_id) postData.group_id = options.group_id;
    }

    // Add authentication based on configured method
    switch (credentials.auth_method) {
      case 'api_token':
        postData.wp_api_token = credentials.api_token;
        break;
      case 'app_password':
        postData.wp_username = credentials.username;
        postData.wp_app_password = credentials.app_password;
        break;
      case 'basic_auth':
        postData.wp_username = credentials.username;
        postData.wp_password = credentials.password;
        break;
      case 'multi_agent':
        postData.agent_email = credentials.multi_agent.email;
        break;
    }

    // Add featured image if available
    if (featuredImage.url) {
      postData.featured_image_url = featuredImage.url;
      postData.featured_image_alt = featuredImage.alt;
    }

    // Add any additional options
    if (options.categories) {
      postData.categories = options.categories;
    }

    if (options.dry_run) {
      postData.dry_run = true;
    }

    return postData;
  }

  /**
   * Post to WordPress using enhanced-poster.js
   */
  async postToWordPress(postData) {
    try {
      // Import the enhanced poster
      const EnhancedBuddyClaw = require('./enhanced-poster');
      const poster = new EnhancedBuddyClaw();
      
      // Process the post data
      const result = await poster.processInput(postData);
      
      if (!result.success) {
        throw new Error(`WordPress posting failed: ${result.error}`);
      }
      
      return result;
    } catch (error) {
      throw new Error(`Failed to post to WordPress: ${error.message}`);
    }
  }

  /**
   * Get posting statistics and history
   */
  getPostingStats() {
    return {
      total_posts: this.contentCache.size,
      cache_size: this.contentCache.size,
      last_post: this.contentCache.size > 0 ? 
        Array.from(this.contentCache.values()).pop().generated_at : 
        null,
      image_cache_size: this.imageCache.size
    };
  }

  /**
   * Clear caches
   */
  clearCaches() {
    this.contentCache.clear();
    this.imageCache.clear();
    console.log('🗑️  Caches cleared');
  }
}

// Export for use in other modules
module.exports = AutonomousBuddyClaw;

// CLI functionality
if (require.main === module) {
  const autonomous = new AutonomousBuddyClaw();
  
  // Handle command line arguments
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log('BuddyClaw Autonomous Content Generator and Poster');
    console.log('Usage:');
    console.log('  node autonomous-poster.js "Your topic here" [options]');
    console.log('');
    console.log('Options:');
    console.log('  --tone [informative|conversational|professional]  Content tone');
    console.log('  --length [short|medium|long]                      Article length');
    console.log('  --status [draft|publish|private]                  Post status');
    console.log('  --generate-image                                   Generate featured image');
    console.log('  --content-type [post|page]                         Content type');
    console.log('  --dry-run                                          Test without posting');
    console.log('');
    console.log('Examples:');
    console.log('  node autonomous-poster.js "artificial intelligence" --tone professional --status publish');
    console.log('  node autonomous-poster.js "climate change" --generate-image --length long');
    console.log('  node autonomous-poster.js "remote work" --tone conversational --dry-run');
    process.exit(0);
  }

  if (args.includes('--stats')) {
    console.log('Posting Statistics:');
    console.log(autonomous.getPostingStats());
    process.exit(0);
  }

  if (args.includes('--clear-cache')) {
    autonomous.clearCaches();
    process.exit(0);
  }

  // Parse user input and options
  const userInput = args.find(arg => !arg.startsWith('--'));
  if (!userInput) {
    console.error('❌ Please provide a topic or prompt');
    process.exit(1);
  }

  const options = {
    tone: args.find(arg => arg.startsWith('--tone='))?.split('=')[1] || 'informative',
    length: args.find(arg => arg.startsWith('--length='))?.split('=')[1] || 'medium',
    status: args.find(arg => arg.startsWith('--status='))?.split('=')[1] || 'draft',
    content_target: args.find(arg => arg.startsWith('--content-type='))?.split('=')[1] || 'post',
    generate_image: args.includes('--generate-image'),
    dry_run: args.includes('--dry-run')
  };

  // Run autonomous posting
  autonomous.processChatInput(userInput, options)
    .then(result => {
      if (result.success) {
        console.log('🎉 Success! Post created:');
        console.log(`   Title: ${result.title}`);
        console.log(`   URL: ${result.post_url}`);
        console.log(`   ID: ${result.post_id}`);
        console.log(`   Featured Image: ${result.featured_image}`);
      } else {
        console.error('❌ Failed:', result.error);
        if (result.details) {
          console.error('Details:', result.details);
        }
      }
    })
    .catch(error => {
      console.error('❌ Error:', error.message);
      process.exit(1);
    });
}
