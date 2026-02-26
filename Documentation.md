# BuddyClaw Documentation

## 📚 Table of Contents

1. [Installation & Setup](#installation--setup)
2. [Configuration](#configuration)
3. [Authentication Methods](#authentication-methods)
4. [Chat Commands](#chat-commands)
5. [Content Sources](#content-sources)
6. [Advanced Features](#advanced-features)
7. [Troubleshooting](#troubleshooting)
8. [API Reference](#api-reference)
9. [Examples](#examples)
10. [Security](#security)

---

## 🚀 Installation & Setup

### Prerequisites
- Node.js >= 18.0.0
- NPM package manager
- WordPress site with REST API enabled
- OpenClaw framework (for chat integration)

### Quick Installation
```bash
# Navigate to your OpenClaw skills directory
cd ~/.openclaw/workspace/skills/

# Clone BuddyClaw repository
git clone https://github.com/veracitylife/BuddyClaw.git

# Navigate to BuddyClaw directory
cd BuddyClaw

# Install dependencies
npm install

# Run interactive setup
npm run configure
```

### Interactive Setup
The interactive setup will guide you through:
1. **Vault credential verification**
2. **WordPress site configuration**
3. **Authentication method selection**
4. **CAPTCHA solving setup (optional)**
5. **Content generation preferences**
6. **Final configuration review**

---

## ⚙️ Configuration

### Configuration File Structure
BuddyClaw stores configuration in `config/openclaw.json`:

```json
{
  "version": "0.0.3",
  "onboarding": {
    "completed": true,
    "date": "2026-02-26T00:00:00.000Z"
  },
  "wordpress": {
    "siteUrl": "https://your-site.com",
    "authMethod": "application_password",
    "credentials": {
      "username": "your-username",
      "applicationPassword": "your-app-password"
    },
    "restApi": {
      "namespace": "wp/v2",
      "endpoints": {
        "posts": "/wp/v2/posts",
        "media": "/wp/v2/media",
        "users": "/wp/v2/users"
      }
    }
  },
  "captcha": {
    "enabled": true,
    "apiKey": "your-2captcha-key",
    "service": "2captcha"
  },
  "contentGeneration": {
    "autoTitle": true,
    "autoExcerpt": true,
    "autoTags": true,
    "featuredImage": true
  },
  "bulkProcessing": {
    "defaultDelay": 3,
    "maxRetries": 3,
    "batchSize": 10
  }
}
```

### Environment Variables
You can also use environment variables for sensitive data:
```bash
export BUDDYCLAW_SITE_URL="https://your-site.com"
export BUDDYCLAW_USERNAME="your-username"
export BUDDYCLAW_APP_PASSWORD="your-app-password"
export BUDDYCLAW_2CAPTCHA_KEY="your-2captcha-key"
```

---

## 🔐 Authentication Methods

### 1. Application Password (Recommended)
**Most secure and WordPress-native method**

Setup:
1. Log into WordPress admin
2. Go to Users → Your Profile
3. Scroll to "Application Passwords"
4. Generate new application password
5. Use this password in BuddyClaw configuration

Usage:
```
Post "Hello World!" auth:application_password
```

### 2. REST API Token
**For custom authentication setups**

Setup:
1. Install JWT Authentication plugin (if not already installed)
2. Generate token via WordPress API or plugin interface
3. Configure BuddyClaw with the token

Usage:
```
Post "Hello World!" auth:rest_api_token token:your-token-here
```

### 3. Basic Authentication
**Traditional username/password**

Setup:
1. Configure WordPress to support basic auth
2. Use your regular WordPress credentials

Usage:
```
Post "Hello World!" auth:basic username:your-username password:your-password
```

### 4. Multi-Agent Registration
**Automatic account creation**

Setup:
1. BuddyClaw will automatically register a new account
2. Email verification handled via Himalaya skill
3. No manual credential setup required

Usage:
```
Post "Hello World!" auth:multi_agent
```

---

## 💬 Chat Commands

### Basic Posting
```
Post "Your content here"
Post "Your content" title:"Custom Title" status:draft
Post "Your content" tags:ai,wordpress,automation
```

### Bulk RSS Feed Processing
```
Bulk post from RSS https://techcrunch.com/feed/
Bulk post from RSS https://techcrunch.com/feed/ count:5 status:draft
Bulk post from RSS https://techcrunch.com/feed/ count:10 delay:5 tone:professional
```

### File-Based Content
```
Bulk post from file ./content/articles.json
Bulk post from file ./content/posts.csv status:published
Bulk post from file ./content/ideas.txt count:3
```

### Content with Metadata
```
Post "Content" title:"SEO Title" excerpt:"Custom excerpt" tags:ai,tech
Post "Content" featured_image:"https://example.com/image.jpg" category:technology
Post "Content" status:draft author:john-doe
```

### Advanced Options
```
Post "Content" tone:professional audience:technical language:en
Post "Content" seo_keywords:"AI, WordPress, automation" focus_keyword:"AI tools"
Post "Content" schedule:2026-03-01T10:00:00Z
```

---

## 📊 Content Sources

### RSS Feeds
BuddyClaw can process RSS feeds and convert them to WordPress posts:

```javascript
// Example RSS processing
const rssProcessor = {
  url: 'https://example.com/feed.xml',
  options: {
    count: 5,
    status: 'draft',
    delay: 3,
    tone: 'professional',
    auto_title: true,
    auto_excerpt: true,
    auto_tags: true
  }
};
```

### JSON Files
Structure for JSON content files:
```json
[
  {
    "title": "Post Title",
    "content": "Post content here...",
    "excerpt": "Brief summary",
    "tags": ["tag1", "tag2"],
    "category": "Technology",
    "status": "publish",
    "featured_image": "https://example.com/image.jpg"
  }
]
```

### CSV Files
CSV format for bulk content:
```csv
title,content,excerpt,tags,category,status,featured_image
"Post 1","Content 1","Excerpt 1","tag1,tag2","Tech","publish","https://example.com/1.jpg"
"Post 2","Content 2","Excerpt 2","tag3,tag4","Business","draft","https://example.com/2.jpg"
```

### Text Files
Plain text files are processed line by line:
```text
This is the first post content
This is the second post content
This is the third post content
```

---

## 🧠 Advanced Features

### Autonomous Error Recovery
BuddyClaw's self-healing system handles:

- **Authentication failures**: Automatically retries with different methods
- **CAPTCHA challenges**: Solves CAPTCHAs using 2captcha service
- **Group membership**: Joins required groups before posting
- **Network issues**: Implements exponential backoff retry
- **Content validation**: Fixes common content issues

### AI-Powered Content Generation
Automatic generation of:
- **SEO-optimized titles**: Based on content analysis
- **Engaging excerpts**: Compelling summaries
- **Relevant tags**: AI-powered tag suggestions
- **Featured images**: Creates or sources relevant images

### CAPTCHA Solving
Integrated 2captcha service supports:
- **Image CAPTCHAs**: Traditional image-based challenges
- **reCAPTCHA v2**: Google's reCAPTCHA service
- **hCaptcha**: Modern CAPTCHA alternative
- **Auto-detection**: Automatically identifies CAPTCHA type

---

## 🔧 Troubleshooting

### Common Issues

**Posts not appearing despite success messages**
- Check group membership requirements
- Verify WordPress permissions
- Review autonomous recovery logs
- Ensure proper authentication method

**CAPTCHA solving not working**
- Verify 2captcha API key configuration
- Check CAPTCHA type detection
- Review network connectivity
- Ensure sufficient account balance

**RSS feed parsing errors**
- Validate RSS feed URL
- Check feed format compatibility
- Review content filtering rules
- Verify feed accessibility

**Authentication failures**
- Verify credentials are correct
- Check authentication method selection
- Ensure WordPress REST API is enabled
- Review user permissions

### Debug Mode
Enable detailed logging:
```bash
DEBUG=buddyclaw:* npm start
```

### Recovery Commands
```bash
# Reset configuration
npm run reset-config

# Test authentication
npm run test-auth

# Verify WordPress connection
npm run test-connection

# Check CAPTCHA service
npm run test-captcha
```

---

## 🔌 API Reference

### Core Functions

#### `postToWordPress(content, options)`
Posts content to WordPress with specified options.

**Parameters:**
- `content` (string): The content to post
- `options` (object): Posting options

**Options:**
```javascript
{
  title: "Custom title",
  status: "publish|draft|pending",
  excerpt: "Custom excerpt",
  tags: ["tag1", "tag2"],
  category: "category-name",
  featured_image: "image-url",
  author: "author-id",
  schedule: "2026-03-01T10:00:00Z",
  tone: "professional|casual|technical",
  seo_keywords: ["keyword1", "keyword2"],
  focus_keyword: "main-keyword"
}
```

#### `processBulkContent(source, options)`
Processes bulk content from various sources.

**Parameters:**
- `source` (string): Content source (RSS URL, file path, or text)
- `options` (object): Processing options

**Options:**
```javascript
{
  count: 10,
  status: "draft",
  delay: 3,
  tone: "professional",
  auto_title: true,
  auto_excerpt: true,
  auto_tags: true,
  batch_size: 5,
  max_retries: 3
}
```

#### `solveCaptcha(captchaData, type)`
Solves CAPTCHA challenges automatically.

**Parameters:**
- `captchaData` (object): CAPTCHA information
- `type` (string): CAPTCHA type (image|recaptcha|hcaptcha)

---

## 📋 Examples

### Basic Posting Example
```javascript
const BuddyClaw = require('./enhanced-poster.js');

// Simple post
await BuddyClaw.postToWordPress("Hello World!");

// Advanced post
await BuddyClaw.postToWordPress("AI is transforming content creation", {
  title: "The Future of AI in Content Creation",
  status: "publish",
  excerpt: "How artificial intelligence is revolutionizing content creation",
  tags: ["AI", "content", "technology"],
  category: "Technology",
  featured_image: "https://example.com/ai-image.jpg",
  tone: "professional"
});
```

### Bulk Processing Example
```javascript
// Process RSS feed
await BuddyClaw.processBulkContent("https://techcrunch.com/feed/", {
  count: 5,
  status: "draft",
  delay: 3,
  tone: "professional",
  auto_title: true,
  auto_excerpt: true
});

// Process JSON file
await BuddyClaw.processBulkContent("./content/articles.json", {
  status: "publish",
  batch_size: 10,
  max_retries: 3
});
```

### Error Recovery Example
```javascript
try {
  await BuddyClaw.postToWordPress(content, options);
} catch (error) {
  // Autonomous recovery will handle common issues
  const recovery = await BuddyClaw.attemptRecovery(error, {
    context: 'posting',
    content: content,
    options: options
  });
  
  if (recovery.success) {
    console.log('Post successful after recovery!');
  } else {
    console.log('Recovery failed, manual intervention needed');
  }
}
```

---

## 🔒 Security

### Best Practices

**Credential Management**
- Store credentials in encrypted vault files
- Use environment variables for sensitive data
- Never commit credentials to version control
- Rotate application passwords regularly

**CAPTCHA Service Security**
- Keep 2captcha API keys secure
- Monitor account usage and billing
- Use rate limiting to prevent abuse
- Implement proper error handling

**WordPress Security**
- Use application passwords instead of main passwords
- Enable two-factor authentication
- Keep WordPress and plugins updated
- Use HTTPS for all communications

**Network Security**
- Validate all input data
- Implement proper rate limiting
- Use secure connections (HTTPS/WSS)
- Monitor for suspicious activity

### Security Checklist
- [ ] Credentials stored securely
- [ ] CAPTCHA keys protected
- [ ] WordPress REST API secured
- [ ] Input validation implemented
- [ ] Rate limiting configured
- [ ] Error messages sanitized
- [ ] Logging configured properly
- [ ] Regular security audits performed

---

## 📞 Support & Resources

### Getting Help
- **GitHub Issues**: https://github.com/veracitylife/BuddyClaw/issues
- **Documentation**: https://github.com/veracitylife/BuddyClaw/wiki
- **Community**: https://github.com/veracitylife/BuddyClaw/discussions

### Additional Resources
- **WordPress REST API Handbook**: https://developer.wordpress.org/rest-api/
- **2captcha API Documentation**: https://2captcha.com/2captcha-api
- **OpenClaw Documentation**: https://github.com/veracitylife/OpenClaw
- **RSS Parser Documentation**: https://github.com/rbren/rss-parser

---

**📖 This documentation is for BuddyClaw v0.0.3**  
**🔄 Last updated: February 26, 2026**