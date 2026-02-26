---
name: "buddyclaw"
description: "Post content to WordPress, BuddyBoss, and BuddyPress sites via REST API. Supports multi-agent registration with email verification using Himalaya mail client. Invoke when user wants to publish posts, pages, custom types, or activity updates to a WordPress site."
metadata: {"openclaw":{"requires":{"bins":["node"],"env":["WP_USERNAME","WP_APP_PASSWORD"]},"primaryEnv":"WP_APP_PASSWORD","emoji":"📝"}}
---

# BuddyClaw - WordPress & BuddyBoss Publishing with Multi-Agent Support

**Spun Web Technology** | Version 0.0.1

This skill enables OpenClaw to publish content directly to WordPress sites, BuddyBoss communities, and BuddyPress networks through their REST APIs. **NEW**: Now supports multi-agent registration with automatic WordPress account creation and email verification using Himalaya mail client.

## When to Use This Skill

Use this skill when the user asks to:
- Publish a post to WordPress
- Create a page on a WordPress site  
- Post an activity update to BuddyBoss/BuddyPress
- Upload content with featured images
- Publish to specific groups or communities
- **NEW**: Register new agent accounts with email verification
- **NEW**: Multi-agent content publishing with individual credentials

## How It Works

The skill uses the `node enhanced-poster.js` command to interact with WordPress REST APIs using Application Password authentication. For multi-agent scenarios, it can automatically register WordPress accounts and verify emails using Himalaya mail client.

## Required Environment Variables

- `WP_USERNAME`: WordPress username (for legacy single-user mode)
- `WP_APP_PASSWORD`: WordPress Application Password (for legacy single-user mode)

## Supported Content Types

### WordPress Posts & Pages
- Standard posts with categories and tags
- Pages with custom templates
- Custom post types
- Featured image support
- Custom meta fields

### BuddyBoss/BuddyPress Activity
- Profile activity updates
- Group activity posts
- Media attachments
- Community interactions

## Multi-Agent Mode (NEW)

### Automatic Agent Registration
When using `agent_email` parameter, the skill will:
1. Check if agent exists in vault
2. If not, register new WordPress account
3. Monitor email for verification using Himalaya
4. Generate application password
5. Store credentials securely
6. Publish content using agent credentials

### Agent Management Commands
```bash
# Register new agent
node agent-manager.js --register --email agent@example.com --agent-name "Agent Name" --wordpress-url https://site.com

# Check email verification
node email-verifier.js --check --email agent@example.com --subject WordPress

# List all agents
node agent-manager.js --list

# Get agent credentials
node agent-manager.js --get-credentials --email agent@example.com
```

## Usage Instructions

### Single User Mode (Legacy)
When the user requests to publish content with existing credentials:

1. **Construct the JSON Parameters**:
   ```json
   {
     "site_base_url": "https://example.com",
     "wp_username": "username",
     "wp_app_password": "app_password",
     "content_target": "post",
     "title": "Post Title",
     "content": "Post content HTML"
   }
   ```

2. **Execute the Publishing Command**:
   ```bash
   echo '{"site_base_url":"https://site.com","wp_username":"user","wp_app_password":"pass","content_target":"post","title":"My Post","content":"Content here"}' | node enhanced-poster.js
   ```

### Multi-Agent Mode (NEW)
When the user requests to publish content using agent email:

1. **Construct the JSON Parameters**:
   ```json
   {
     "agent_email": "agent@example.com",
     "site_base_url": "https://example.com",
     "content_target": "post",
     "title": "Post Title",
     "content": "Post content HTML"
   }
   ```

2. **Execute the Publishing Command**:
   ```bash
   echo '{"agent_email":"agent@example.com","site_base_url":"https://site.com","content_target":"post","title":"My Post","content":"Content here"}' | node enhanced-poster.js
   ```

## Parameter Reference

### Required Parameters (Single User)
- `site_base_url`: WordPress site URL
- `wp_username`: WordPress username  
- `wp_app_password`: Application password
- `content_target`: Type of content (post, page, activity, custom_post_type)
- `content`: The content to publish

### Required Parameters (Multi-Agent)
- `agent_email`: Agent's email address
- `site_base_url`: WordPress site URL
- `content_target`: Type of content
- `content`: The content to publish

### Optional Parameters
- `title`: Title (required for posts/pages)
- `status`: publish, draft, private (default: publish)
- `categories`: Array of category IDs
- `tags`: Array of tag IDs
- `featured_image_url`: URL to download and set as featured image
- `activity_context`: For BuddyBoss activity (scope, group_id, etc.)
- `meta`: Custom post meta fields
- `dry_run`: true/false - test without publishing
- `media`: Array of media files to upload

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

## Error Handling

The skill provides detailed error messages for:
- Authentication failures (401/403)
- Invalid API endpoints
- Missing required parameters
- Network connectivity issues
- Media upload problems
- Agent registration failures
- Email verification timeouts
- Himalaya configuration issues

## Security Notes

- Always use HTTPS for API calls
- Never hardcode credentials in the skill
- Use Application Passwords instead of regular passwords
- Validate all input parameters
- Check user permissions before publishing
- Agent credentials stored in encrypted vault
- Email verification prevents unauthorized account creation

## Examples

### Simple Post (Single User)
```json
{
  "site_base_url": "https://myblog.com",
  "wp_username": "admin",
  "wp_app_password": "abcd 1234 efgh 5678",
  "content_target": "post",
  "title": "My New Article",
  "content": "<p>This is my article content.</p>"
}
```

### Multi-Agent Post (NEW)
```json
{
  "agent_email": "agent1@company.com",
  "site_base_url": "https://company.com",
  "content_target": "post",
  "title": "Company Update",
  "content": "<p>Latest company news from Agent 1.</p>"
}
```

### BuddyBoss Activity
```json
{
  "site_base_url": "https://community.com",
  "wp_username": "user",
  "wp_app_password": "app_password",
  "content_target": "activity",
  "content": "Just joined the community!",
  "activity_api_provider": "buddyboss"
}
```

### Post with Featured Image
```json
{
  "site_base_url": "https://site.com",
  "wp_username": "admin", 
  "wp_app_password": "password",
  "content_target": "post",
  "title": "Article with Image",
  "content": "Article content here",
  "featured_image_url": "https://example.com/image.jpg"
}
```

### Multi-Agent with Media (NEW)
```json
{
  "agent_email": "photographer@example.com",
  "site_base_url": "https://gallery.com",
  "content_target": "post",
  "title": "Photo Gallery",
  "content": "<p>Check out my latest photos.</p>",
  "media": [
    {
      "file_path": "/path/to/image1.jpg",
      "alt_text": "Beautiful sunset",
      "caption": "Sunset at the beach"
    }
  ]
}
```

## Troubleshooting

If publishing fails:
1. Check that REST API is enabled on the WordPress site
2. Verify Application Password is correct
3. Ensure the user has publish permissions
4. Check site URL format (include https://)
5. Test with dry_run: true first
6. For multi-agent: verify Himalaya is configured
7. Check email verification status
8. Ensure WordPress allows registration (if creating new accounts)

**Spun Web Technology** - Empowering AI-driven multi-agent content publishing