---
name: "buddyclaw"
description: "Post content to WordPress, BuddyBoss, and BuddyPress sites via REST API. Supports multi-agent registration with email verification using Himalaya mail client and REST API token authentication. Advanced features include bulk posting, RSS feed integration, file-based content input, CAPTCHA solving, autonomous error correction, and automatic group joining. Invoke when user wants to publish posts, pages, custom types, or activity updates to a WordPress site."
metadata: {"openclaw":{"requires":{"bins":["node"],"env":["WP_USERNAME","WP_APP_PASSWORD"]},"primaryEnv":"WP_APP_PASSWORD","emoji":"📝"}}
---

# BuddyClaw - WordPress & BuddyBoss Publishing with Multi-Agent Support & Advanced Features

**Spun Web Technology** | Version 0.0.7

This skill enables OpenClaw to publish content directly to WordPress sites, BuddyBoss communities, and BuddyPress networks through their REST APIs. **NEW**: Now supports bulk posting from multiple sources (RSS feeds, files, text), CAPTCHA solving for registration/login, autonomous error correction with self-healing capabilities, and automatic group joining for forum participation.

## When to Use This Skill

Use this skill when the user asks to:
- Publish a post to WordPress
- Create a page on a WordPress site  
- Post an activity update to BuddyBoss/BuddyPress
- Upload content with featured images
- Publish to specific groups or communities
- **NEW**: Use REST API tokens for authentication
- **NEW**: Register new agent accounts with email verification
- **NEW**: Multi-agent content publishing with individual credentials
- **NEW**: Bulk posting from RSS feeds, files, or text content
- **NEW**: Solve CAPTCHAs during registration/login
- **NEW**: Autonomous error correction and self-healing
- **NEW**: Automatic group joining for forum participation

## How It Works

The skill uses the `node enhanced-poster.js` command to interact with WordPress REST APIs using multiple authentication methods:
1. **REST API Token** - Bearer token authentication
2. **Application Password** - Basic auth with app passwords  
3. **Basic Auth** - Username/password authentication
4. **Multi-Agent** - Automatic account creation and credential management

**NEW**: Enhanced with content source manager for bulk operations, CAPTCHA solving system, and autonomous recovery engine.

## Authentication Methods

### 1. REST API Token - Recommended
Use WordPress REST API tokens for secure, token-based authentication:
```json
{
  "site_base_url": "https://example.com",
  "wp_api_token": "your_api_token_here",
  "content_target": "post",
  "title": "Post Title",
  "content": "Post content HTML"
}
```

### 2. Application Password (Legacy)
Use WordPress Application Passwords:
```json
{
  "site_base_url": "https://example.com",
  "wp_username": "username",
  "wp_app_password": "app_password_here",
  "content_target": "post",
  "title": "Post Title",
  "content": "Post content HTML"
}
```

### 3. Basic Authentication (Legacy)
Use regular WordPress username/password:
```json
{
  "site_base_url": "https://example.com",
  "wp_username": "username",
  "wp_password": "password",
  "content_target": "post",
  "title": "Post Title",
  "content": "Post content HTML"
}
```

### 4. Multi-Agent Mode
Use agent email for automatic account management:
```json
{
  "agent_email": "agent@example.com",
  "site_base_url": "https://example.com",
  "content_target": "post",
  "title": "Post Title",
  "content": "Post content HTML"
}
```

## Bulk Posting Features (NEW)

### Content Sources
- **RSS Feeds**: Automatically fetch and post from RSS feeds
- **File Input**: Process JSON, CSV, or text files
- **Text Content**: Direct text input with AI enhancement
- **Multiple Posts**: Configurable batch processing with delays

### Bulk Command Examples
```bash
# Bulk post from RSS feed
openclaw bulk post rss:"https://example.com/feed.xml" count:5 status:published tone:professional delay:2

# Bulk post from JSON file
openclaw bulk post file:"/path/to/posts.json" count:10 status:draft tone:casual

# Bulk post from CSV file
openclaw bulk post file:"/path/to/content.csv" count:3 status:published

# Bulk post from text content
openclaw bulk post text:"Write 5 blog posts about technology trends" count:5 status:published
```

### Bulk Parameters
- `source`: rss, file, or text
- `count`: Number of posts to create (1-50)
- `status`: publish, draft, or private
- `tone`: professional, casual, technical, or creative
- `delay`: Delay between posts in seconds (0-60)

## CAPTCHA Solving (NEW)

### Supported CAPTCHA Types
- **Image CAPTCHAs**: Traditional image-based challenges
- **reCAPTCHA v2**: Google's checkbox and invisible reCAPTCHA
- **hCaptcha**: Modern alternative to reCAPTCHA

### CAPTCHA Configuration
```json
{
  "captcha_service": "2captcha",
  "captcha_api_key": "your_2captcha_api_key",
  "auto_solve": true,
  "solve_timeout": 120
}
```

### CAPTCHA Solving Process
1. Automatically detects CAPTCHA type on registration/login pages
2. Submits CAPTCHA to solving service
3. Polls for solution with configurable timeout
4. Applies solution and continues registration/login
5. Falls back to manual solving if automated fails

## Autonomous Error Correction (NEW)

### Self-Healing Capabilities
- **Authentication Errors**: Automatically retries with different methods
- **Authorization Failures**: Attempts to join required groups
- **Network Issues**: Implements exponential backoff retry
- **Content Errors**: Validates and corrects malformed content
- **CAPTCHA Failures**: Retries with different solving approaches

### Error Recovery Strategies
```javascript
// Automatic recovery attempts
- Authentication retry (up to 3 attempts)
- Group joining for forum access
- Content validation and correction
- CAPTCHA re-solving
- Network timeout handling
- Credential refresh for expired tokens
```

### Recovery Parameters
- `max_retries`: Maximum retry attempts (default: 5)
- `retry_delay`: Base delay between retries in seconds (default: 2)
- `backoff_multiplier`: Exponential backoff multiplier (default: 2)
- `autonomous_recovery`: Enable self-healing (default: true)

## Group Joining (NEW)

### Automatic Group Detection
- Scans page content for group join buttons
- Extracts group IDs and join URLs
- Identifies required membership for posting
- Automatically joins groups when needed

### Group Joining Process
1. Analyzes target page for group requirements
2. Locates join group buttons and forms
3. Extracts nonce tokens and group IDs
4. Submits join requests automatically
5. Verifies successful group membership

### Group Joining Configuration
```json
{
  "auto_join_groups": true,
  "group_join_timeout": 30,
  "verify_membership": true,
  "join_all_available": false
}
```

## Required Environment Variables

- `WP_USERNAME`: WordPress username (for legacy single-user mode)
- `WP_APP_PASSWORD`: WordPress Application Password (for legacy single-user mode)
- `CAPTCHA_API_KEY`: 2captcha API key (for CAPTCHA solving)
- `HIMALAYA_CONFIG`: Path to Himalaya configuration file

## Supported Content Types

### WordPress Posts & Pages
- Standard posts with categories and tags
- Pages with custom templates
- Custom post types
- Featured image support
- Custom meta fields
- **NEW**: AI-generated titles, excerpts, and tags
- **NEW**: Automatic content formatting and optimization

### BuddyBoss/BuddyPress Activity
- Profile activity updates
- Group activity posts
- Media attachments
- Community interactions
- **NEW**: Automatic group joining for posting access

## Content Generation (NEW)

### AI-Powered Content Enhancement
- **Title Generation**: Creates engaging titles from content
- **Excerpt Creation**: Generates concise post summaries
- **Tag Suggestions**: Recommends relevant tags
- **Focus Keywords**: Identifies SEO focus keywords
- **Featured Images**: Generates or sources appropriate images

### Content Optimization
- **SEO Optimization**: Improves content for search engines
- **Readability Enhancement**: Optimizes text for better engagement
- **Tone Adjustment**: Adapts writing style to target audience
- **Format Standardization**: Ensures consistent formatting

## Multi-Agent Mode

### Automatic Agent Registration
When using `agent_email` parameter, the skill will:
1. Check if agent exists in vault
2. If not, register new WordPress account
3. Monitor email for verification using Himalaya
4. Solve any CAPTCHAs encountered during registration
5. Generate application password
6. Store credentials securely
7. **NEW**: Automatically join required groups
8. Publish content using agent credentials

### Agent Management Commands
```bash
# Register new agent with CAPTCHA solving
node agent-manager.js --register --email agent@example.com --agent-name "Agent Name" --wordpress-url https://site.com --solve-captcha

# Check email verification with autonomous retry
node email-verifier.js --check --email agent@example.com --subject WordPress --auto-recovery

# List all agents with status
node agent-manager.js --list --detailed

# Get agent credentials with security validation
node agent-manager.js --get-credentials --email agent@example.com --verify
```

## Usage Instructions

### REST API Token Authentication
When the user has a WordPress REST API token:

1. **Construct the JSON Parameters**:
   ```json
   {
     "site_base_url": "https://example.com",
     "wp_api_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
     "content_target": "post",
     "title": "Post Title",
     "content": "Post content HTML"
   }
   ```

2. **Execute the Publishing Command**:
   ```bash
   echo '{"site_base_url":"https://site.com","wp_api_token":"your_token","content_target":"post","title":"My Post","content":"Content here"}' | node enhanced-poster.js
   ```

### Bulk Posting with RSS Feed (NEW)

1. **Setup RSS Source**:
   ```json
   {
     "site_base_url": "https://myblog.com",
     "wp_api_token": "your_api_token",
     "content_target": "post",
     "source_type": "rss",
     "rss_url": "https://example.com/feed.xml",
     "max_posts": 5,
     "post_status": "published",
     "content_tone": "professional",
     "delay_seconds": 2
   }
   ```

2. **Execute Bulk Command**:
   ```bash
   openclaw bulk post rss:"https://tech-news.com/feed" count:10 status:published tone:technical delay:3
   ```

### Bulk Posting from File (NEW)

1. **Prepare Content File** (JSON format):
   ```json
   [
     {
       "title": "Post 1",
       "content": "Content for post 1",
       "tags": ["technology", "news"]
     },
     {
       "title": "Post 2", 
       "content": "Content for post 2",
       "tags": ["business", "finance"]
     }
   ]
   ```

2. **Execute Bulk Command**:
   ```bash
   openclaw bulk post file:"/path/to/posts.json" count:2 status:draft tone:casual
   ```

### Multi-Agent with CAPTCHA Solving (NEW)

1. **Configure CAPTCHA Service**:
   ```json
   {
     "agent_email": "agent@example.com",
     "site_base_url": "https://example.com",
     "content_target": "post",
     "title": "Post Title",
     "content": "Post content HTML",
     "captcha_config": {
       "service": "2captcha",
       "api_key": "your_2captcha_key",
       "auto_solve": true
     }
   }
   ```

2. **Execute with CAPTCHA Support**:
   ```bash
   node enhanced-poster.js --config config.json --solve-captcha
   ```

## Parameter Reference

### Required Parameters (REST API Token)
- `site_base_url`: WordPress site URL
- `wp_api_token`: WordPress REST API Bearer token
- `content_target`: Type of content (post, page, activity, custom_post_type)
- `content`: The content to publish

### Required Parameters (Application Password)
- `site_base_url`: WordPress site URL
- `wp_username`: WordPress username  
- `wp_app_password`: Application password
- `content_target`: Type of content (post, page, activity, custom_post_type)
- `content`: The content to publish

### Required Parameters (Basic Auth)
- `site_base_url`: WordPress site URL
- `wp_username`: WordPress username
- `wp_password`: WordPress password
- `content_target`: Type of content
- `content`: The content to publish

### Required Parameters (Multi-Agent)
- `agent_email`: Agent's email address
- `site_base_url`: WordPress site URL
- `content_target`: Type of content
- `content`: The content to publish

### Optional Parameters (All Methods)
- `title`: Title (required for posts/pages)
- `status`: publish, draft, private (default: publish)
- `categories`: Array of category IDs
- `tags`: Array of tag IDs
- `featured_image_url`: URL to download and set as featured image
- `activity_context`: For BuddyBoss activity (scope, group_id, etc.)
- `meta`: Custom post meta fields
- `dry_run`: true/false - test without publishing
- `media`: Array of media files to upload
- **NEW**: `autonomous_recovery`: Enable self-healing (default: true)
- **NEW**: `solve_captcha`: Enable CAPTCHA solving (default: false)
- **NEW**: `auto_join_groups`: Enable automatic group joining (default: true)
- **NEW**: `content_tone`: professional, casual, technical, creative
- **NEW**: `max_retries`: Maximum retry attempts (default: 5)
- **NEW**: `generate_meta`: Auto-generate titles, excerpts, tags (default: true)

### Bulk Posting Parameters (NEW)
- `source_type`: rss, file, or text
- `rss_url`: RSS feed URL (for RSS source)
- `file_path`: Path to content file (for file source)
- `text_content`: Direct text input (for text source)
- `max_posts`: Maximum number of posts to create
- `post_status`: publish, draft, or private
- `content_tone`: professional, casual, technical, creative
- `delay_seconds`: Delay between posts (0-60)
- `batch_size`: Number of posts to process simultaneously

## REST API Token Setup

### Getting a WordPress REST API Token
1. Install a JWT authentication plugin (e.g., "JWT Authentication for WP REST API")
2. Generate a token by making a POST request to `/wp-json/jwt-auth/v1/token`
3. Use the token in the `wp_api_token` parameter

### Token Authentication Benefits
- **More Secure**: Tokens can be revoked without changing passwords
- **Better Performance**: No password hashing overhead
- **Modern Standard**: Industry-standard Bearer token authentication
- **Flexible**: Tokens can have expiration times and scopes

## Himalaya Mail Client Setup

### Installation
```bash
# Install Himalaya (email client)
cargo install himalaya

# Configure email account
himalaya configure
```

### Configuration File
Create `~/.config/himalaya/config.toml`:
```toml
[general]
default-email = "agent@example.com"

[agent@example.com]
imap-host = "imap.gmail.com"
imap-port = 993
imap-login = "agent@example.com"
imap-passwd = "app-specific-password"
```

## CAPTCHA Service Setup (NEW)

### 2captcha Configuration
1. Register at https://2captcha.com
2. Get your API key from dashboard
3. Add to environment: `CAPTCHA_API_KEY=your_key_here`

### Alternative Services
- **Anti-Captcha**: https://anti-captcha.com
- **DeathByCaptcha**: https://deathbycaptcha.com
- **ImageTyperz**: https://imagetyperz.com

## Error Handling & Autonomous Recovery

### Enhanced Error Detection
The skill provides detailed error messages for:
- Authentication failures (401/403)
- Invalid API endpoints
- Missing required parameters
- Network connectivity issues
- Media upload problems
- Agent registration failures
- Email verification timeouts
- Himalaya configuration issues
- **NEW**: REST API token validation failures
- **NEW**: CAPTCHA solving failures
- **NEW**: Group joining failures
- **NEW**: Content validation errors

### Autonomous Recovery Strategies
```javascript
// Automatic recovery system handles:
- Authentication retry with different methods
- CAPTCHA solving and retry
- Group joining for forum access
- Content validation and correction
- Network timeout handling
- Credential refresh for expired tokens
- RSS feed parsing errors
- File format validation
- Bulk operation failures
```

### Recovery Configuration
```json
{
  "autonomous_recovery": true,
  "max_retries": 5,
  "retry_delay": 2,
  "backoff_multiplier": 2,
  "recovery_strategies": [
    "authentication_retry",
    "captcha_solving",
    "group_joining",
    "content_correction",
    "credential_refresh"
  ]
}
```

## Security Notes

- Always use HTTPS for API calls
- Never hardcode credentials in the skill
- Use Application Passwords or REST API tokens instead of regular passwords
- Validate all input parameters
- Check user permissions before publishing
- Agent credentials stored in encrypted vault
- Email verification prevents unauthorized account creation
- **NEW**: REST API tokens are more secure than passwords
- **NEW**: CAPTCHA solving prevents automated abuse
- **NEW**: Autonomous recovery includes security validation

## Examples

### Simple Post with REST API Token
```json
{
  "site_base_url": "https://myblog.com",
  "wp_api_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwczovL215YmxvZy5jb20iLCJpYXQiOjE3MDc4OTM2MDAsIm5iZiI6MTcwNzg5MzYwMCwiZXhwIjoxNzA4NDk4NDAwLCJkYXRhIjp7InVzZXIiOnsiaWQiOiIxIn19fQ.signature",
  "content_target": "post",
  "title": "My New Article",
  "content": "<p>This is my article content.</p>"
}
```

### Multi-Agent Post with CAPTCHA Solving
```json
{
  "agent_email": "agent1@company.com",
  "site_base_url": "https://company.com",
  "content_target": "post",
  "title": "Company Update",
  "content": "<p>Latest company news from Agent 1.</p>",
  "captcha_config": {
    "service": "2captcha",
    "api_key": "your_2captcha_key",
    "auto_solve": true
  },
  "autonomous_recovery": true
}
```

### Bulk RSS Feed Posting
```json
{
  "site_base_url": "https://news-site.com",
  "wp_api_token": "your_api_token",
  "content_target": "post",
  "source_type": "rss",
  "rss_url": "https://tech-news.example.com/feed.xml",
  "max_posts": 10,
  "post_status": "published",
  "content_tone": "professional",
  "delay_seconds": 3,
  "auto_join_groups": true
}
```

### BuddyBoss Activity with Group Joining
```json
{
  "site_base_url": "https://community.example.com",
  "wp_username": "user",
  "wp_app_password": "app_password",
  "content_target": "activity",
  "content": "Just joined the community!",
  "activity_api_provider": "buddyboss",
  "auto_join_groups": true,
  "group_context": "technology-discussions"
}
```

### Post with Featured Image and Meta Generation
```json
{
  "site_base_url": "https://site.example.com",
  "wp_username": "admin", 
  "wp_app_password": "password",
  "content_target": "post",
  "title": "Article with Image",
  "content": "Article content here",
  "featured_image_url": "https://example.com/image.jpg",
  "generate_meta": true,
  "content_tone": "professional",
  "autonomous_recovery": true
}
```

### Multi-Agent with Media and Recovery
```json
{
  "agent_email": "photographer@example.com",
  "site_base_url": "https://gallery.example.com",
  "content_target": "post",
  "title": "Photo Gallery",
  "content": "<p>Check out my latest photos.</p>",
  "media": [
    {
      "file_path": "/path/to/image1.jpg",
      "alt_text": "Beautiful sunset",
      "caption": "Sunset at the beach"
    }
  ],
  "autonomous_recovery": true,
  "solve_captcha": true,
  "auto_join_groups": true
}
```

## Troubleshooting

### Common Issues and Solutions

1. **False Positive Success Reports**: 
   - Enable `autonomous_recovery` for verification
   - Check actual post existence on site
   - Review error logs for hidden failures

2. **CAPTCHA Solving Failures**:
   - Verify 2captcha API key and balance
   - Check CAPTCHA service status
   - Try alternative solving services
   - Enable manual fallback mode

3. **Group Joining Issues**:
   - Verify group exists and is public
   - Check user permissions for joining
   - Ensure group joining is enabled on site
   - Try manual group joining first

4. **Bulk Posting Errors**:
   - Validate RSS feed format and accessibility
   - Check file permissions for content files
   - Verify content format matches expected structure
   - Reduce batch size for large operations

5. **Authentication Problems**:
   - Check that REST API is enabled on the WordPress site
   - Verify authentication method is correct (token, app password, or basic auth)
   - Ensure the user has publish permissions
   - Test with dry_run: true first
   - For API tokens: verify token is valid and not expired
   - For multi-agent: verify Himalaya is configured
   - Check email verification status
   - Ensure WordPress allows registration (if creating new accounts)

### Recovery Commands
```bash
# Force autonomous recovery
node enhanced-poster.js --recover --max-retries 10

# Test CAPTCHA solving
node captcha-solver.js --test --service 2captcha

# Verify group membership
node group-manager.js --check-membership --user agent@example.com

# Validate bulk content
node content-validator.js --file /path/to/content.json
```

**Spun Web Technology** - Empowering AI-driven multi-agent content publishing with autonomous recovery, CAPTCHA solving, and intelligent bulk operations
