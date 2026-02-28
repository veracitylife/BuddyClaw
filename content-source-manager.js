const fs = require('fs');
const path = require('path');
const axios = require('axios');
const RSSParser = require('rss-parser');
const AutonomousBuddyClaw = require('./autonomous-poster');

/**
 * BuddyClaw Content Source Manager
 * Handles RSS feeds, file inputs, and bulk posting operations
 * Spun Web Technology - Version 0.0.7
 */

class ContentSourceManager {
  constructor() {
    this.autonomous = new AutonomousBuddyClaw();
    this.rssParser = new RSSParser();
    this.postQueue = [];
    this.postingStats = {
      total: 0,
      successful: 0,
      failed: 0,
      sources: {
        rss: 0,
        file: 0,
        text: 0,
        url: 0
      }
    };
  }

  /**
   * Process bulk posting from various sources
   */
  async processBulkPosting(options = {}) {
    try {
      console.log('🚀 BuddyClaw Bulk Posting Mode Activated');
      console.log('Source:', options.source || 'text');
      console.log('Count:', options.count || 'auto');
      console.log('Status:', options.status || 'draft');

      let contentItems = [];

      // Determine content source
      switch (options.source) {
        case 'rss':
          contentItems = await this.processRSSFeed(options.rss_url, options);
          break;
        case 'url':
          contentItems = await this.processUrlInput(options.url || options.rss_url, options);
          break;
        case 'file':
          contentItems = await this.processFileInput(options.file_path, options);
          break;
        case 'text':
        default:
          contentItems = await this.processTextInput(options.content, options);
          break;
      }

      // Limit content items if count is specified
      if (options.count && options.count > 0) {
        contentItems = contentItems.slice(0, options.count);
      }

      console.log(`📊 Processing ${contentItems.length} content items`);

      // Process each content item
      const results = [];
      for (let i = 0; i < contentItems.length; i++) {
        const item = contentItems[i];
        console.log(`📝 Processing item ${i + 1}/${contentItems.length}: ${item.title || item.topic}`);

        try {
          const result = await this.postContentItem(item, options);
          results.push(result);
          this.postingStats.successful++;
        } catch (error) {
          console.error(`❌ Failed to post item ${i + 1}:`, error.message);
          results.push({
            success: false,
            error: error.message,
            item: item
          });
          this.postingStats.failed++;
        }

        this.postingStats.total++;
        this.postingStats.sources[options.source || 'text']++;

        // Add delay between posts if specified
        if (options.delay && i < contentItems.length - 1) {
          console.log(`⏱️  Waiting ${options.delay}ms before next post...`);
          await this.sleep(options.delay);
        }
      }

      return {
        success: true,
        message: `Bulk posting completed: ${this.postingStats.successful}/${this.postingStats.total} successful`,
        data: {
          stats: this.postingStats,
          results: results,
          summary: {
            total: contentItems.length,
            successful: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length
          }
        }
      };

    } catch (error) {
      throw new Error(`Bulk posting failed: ${error.message}`);
    }
  }

  /**
   * Process RSS feed content
   */
  async processRSSFeed(rssUrl, options = {}) {
    try {
      if (!rssUrl) {
        throw new Error('RSS URL is required for RSS source');
      }

      console.log(`📡 Fetching RSS feed: ${rssUrl}`);
      const feed = await this.rssParser.parseURL(rssUrl);
      
      console.log(`📰 Found ${feed.items.length} items in RSS feed`);

      return feed.items.map(item => {
        const baseContent = item.content || item.contentSnippet || item.title;
        const content = options.link_back && item.link ? `${baseContent}\n\nSource: ${item.link}` : baseContent;
        return {
          topic: item.title,
          content: content,
          title: item.title,
          link: item.link,
          pubDate: item.pubDate,
          categories: item.categories || [],
          source: 'rss'
        };
      });

    } catch (error) {
      throw new Error(`RSS feed processing failed: ${error.message}`);
    }
  }

  /**
   * Process URL input content
   */
  async processUrlInput(url, options = {}) {
    try {
      if (!url) {
        throw new Error('URL is required for URL source');
      }

      console.log(`🌐 Fetching content from URL: ${url}`);
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'BuddyClaw/0.0.7 (Content Discovery)'
        },
        timeout: 15000
      });
      
      const html = response.data;
      
      // Extract title
      const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
      const title = titleMatch ? titleMatch[1].trim() : 'Extracted Content';
      
      // Extract body content (simple extraction)
      // Remove scripts, styles, and comments
      let cleanHtml = html
        .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, '')
        .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gim, '')
        .replace(/<!--[\s\S]*?-->/g, '');
        
      // Extract main content if possible (heuristic)
      // Look for article, main, or div with content/post class
      // For now, we'll strip tags and take the first chunk of meaningful text
      const text = cleanHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      
      // Limit to reasonable length for context
      const content = text.substring(0, 3000);
      
      return [{
        topic: title,
        content: `Based on content from ${url}:\n\n${content}`,
        title: title,
        source: 'url',
        link: url
      }];

    } catch (error) {
      throw new Error(`URL processing failed: ${error.message}`);
    }
  }

  /**
   * Process file input content
   */
  async processFileInput(filePath, options = {}) {
    try {
      if (!filePath) {
        throw new Error('File path is required for file source');
      }

      console.log(`📁 Reading file: ${filePath}`);
      
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Parse different file formats
      let contentItems = [];
      
      if (filePath.endsWith('.json')) {
        contentItems = JSON.parse(content);
      } else if (filePath.endsWith('.csv')) {
        contentItems = this.parseCSV(content);
      } else if (filePath.endsWith('.txt')) {
        contentItems = this.parseTextFile(content);
      } else {
        // Default to single item
        contentItems = [{
          topic: path.basename(filePath, path.extname(filePath)),
          content: content,
          source: 'file'
        }];
      }

      return contentItems.map(item => ({
        ...item,
        source: 'file'
      }));

    } catch (error) {
      throw new Error(`File input processing failed: ${error.message}`);
    }
  }

  /**
   * Process text input content
   */
  async processTextInput(content, options = {}) {
    try {
      if (!content) {
        throw new Error('Content is required for text source');
      }

      // If content contains multiple lines, split into separate items
      const lines = content.split('\n').filter(line => line.trim());
      
      if (lines.length > 1) {
        return lines.map(line => ({
          topic: line.trim(),
          content: line.trim(),
          source: 'text'
        }));
      }

      return [{
        topic: content.trim(),
        content: content.trim(),
        source: 'text'
      }];

    } catch (error) {
      throw new Error(`Text input processing failed: ${error.message}`);
    }
  }

  /**
   * Post individual content item
   */
  async postContentItem(item, options = {}) {
    try {
      const postOptions = {
        tone: options.tone || 'informative',
        status: options.status || 'draft',
        generate_image: options.generate_image !== false,
        content_target: options.content_target || 'post',
        categories: options.categories || item.categories,
        tags: options.tags || item.tags
      };

      // Use autonomous poster to generate and post content
      const result = await this.autonomous.processChatInput(item.topic, postOptions);
      
      return {
        success: true,
        title: result.title,
        post_id: result.post_id,
        post_url: result.post_url,
        featured_image: result.featured_image,
        source: item.source
      };

    } catch (error) {
      throw new Error(`Content posting failed: ${error.message}`);
    }
  }

  /**
   * Parse CSV content
   */
  parseCSV(content) {
    const lines = content.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim());
    
    return lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim());
      const item = {};
      headers.forEach((header, index) => {
        item[header] = values[index] || '';
      });
      return item;
    });
  }

  /**
   * Parse text file content
   */
  parseTextFile(content) {
    // Split by double newlines to separate articles/posts
    const sections = content.split('\n\n').filter(section => section.trim());
    
    return sections.map(section => {
      const lines = section.split('\n').filter(line => line.trim());
      return {
        topic: lines[0] || 'Untitled',
        content: lines.slice(1).join('\n') || lines[0],
        title: lines[0] || 'Untitled'
      };
    });
  }

  /**
   * Sleep utility for delays
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get posting statistics
   */
  getStats() {
    return this.postingStats;
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.postingStats = {
      total: 0,
      successful: 0,
      failed: 0,
      sources: {
        rss: 0,
        file: 0,
        text: 0
      }
    };
  }
}

// Export for use in other modules
module.exports = ContentSourceManager;

// CLI functionality
if (require.main === module) {
  const manager = new ContentSourceManager();
  
  // Handle command line arguments
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log('BuddyClaw Content Source Manager');
    console.log('Usage:');
    console.log('  node content-source-manager.js [options]');
    console.log('');
    console.log('Options:');
    console.log('  --source [rss|file|text]          Content source type');
    console.log('  --rss-url <url>                   RSS feed URL');
    console.log('  --file-path <path>                File path for content');
    console.log('  --content <text>                  Text content');
    console.log('  --count <number>                  Number of items to process');
    console.log('  --status [draft|publish|private]  Post status');
    console.log('  --tone [informative|professional|casual]  Content tone');
    console.log('  --delay <ms>                      Delay between posts');
    console.log('  --generate-image                  Generate featured images');
    console.log('  --content-target [post|page|activity]  Target content type');
    console.log('');
    console.log('Examples:');
    console.log('  node content-source-manager.js --source rss --rss-url https://example.com/feed.xml --count 5 --status draft');
    console.log('  node content-source-manager.js --source file --file-path ./articles.json --status publish');
    console.log('  node content-source-manager.js --source text --content "AI trends\nClimate change\nRemote work" --count 3');
    process.exit(0);
  }

  if (args.includes('--stats')) {
    console.log('Posting Statistics:');
    console.log(manager.getStats());
    process.exit(0);
  }

  // Parse options
  const options = {
    source: args.find(arg => arg.startsWith('--source='))?.split('=')[1] || 'text',
    rss_url: args.find(arg => arg.startsWith('--rss-url='))?.split('=')[1],
    file_path: args.find(arg => arg.startsWith('--file-path='))?.split('=')[1],
    content: args.find(arg => arg.startsWith('--content='))?.split('=')[1],
    count: parseInt(args.find(arg => arg.startsWith('--count='))?.split('=')[1]) || 0,
    status: args.find(arg => arg.startsWith('--status='))?.split('=')[1] || 'draft',
    tone: args.find(arg => arg.startsWith('--tone='))?.split('=')[1] || 'informative',
    delay: parseInt(args.find(arg => arg.startsWith('--delay='))?.split('=')[1]) || 0,
    generate_image: args.includes('--generate-image'),
    content_target: args.find(arg => arg.startsWith('--content-target='))?.split('=')[1] || 'post'
  };

  // Run bulk posting
  manager.processBulkPosting(options)
    .then(result => {
      console.log('🎉 Bulk posting completed!');
      console.log('Results:', JSON.stringify(result, null, 2));
    })
    .catch(error => {
      console.error('❌ Bulk posting failed:', error.message);
      process.exit(1);
    });
}
