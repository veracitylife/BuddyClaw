---
name: "buddyclaw"
description: "Post content to WordPress, BuddyBoss, and BuddyPress sites via REST API. Invoke when user wants to publish posts, pages, custom types, or activity updates to a WordPress site."
metadata: {"openclaw":{"requires":{"bins":["node"],"env":["WP_USERNAME","WP_APP_PASSWORD"]},"primaryEnv":"WP_APP_PASSWORD","emoji":"📝"}}
---

# BuddyClaw - WordPress & BuddyBoss Publishing

**Spun Web Technology**

This skill enables OpenClaw to publish content directly to WordPress sites, BuddyBoss communities, and BuddyPress networks through their REST APIs.

## When to Use This Skill

Use this skill when the user asks to:
- Publish a post to WordPress
- Create a page on a WordPress site  
- Post an activity update to BuddyBoss/BuddyPress
- Upload content with featured images
- Publish to specific groups or communities

## How It Works

The skill uses the `node poster.js` command to interact with WordPress REST APIs using Application Password authentication.

## Required Environment Variables

- `WP_USERNAME`: WordPress username
- `WP_APP_PASSWORD`: WordPress Application Password (generate in WordPress admin)

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

## Usage Instructions

When the user requests to publish content:

1. **Gather Required Information**:
   - Site URL (if not using default)
   - Content type (post, page, activity, etc.)
   - Title and content
   - Any images or media

2. **Construct the JSON Parameters**:
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

3. **Execute the Publishing Command**:
   ```bash
   echo '{"site_base_url":"https://site.com","wp_username":"user","wp_app_password":"pass","content_target":"post","title":"My Post","content":"Content here"}' | node poster.js
   ```

## Parameter Reference

### Required Parameters
- `site_base_url`: WordPress site URL
- `wp_username`: WordPress username  
- `wp_app_password`: Application password
- `content_target`: Type of content (post, page, activity, custom_post_type)
- `content`: The content to publish

### Optional Parameters
- `title`: Title (required for posts/pages)
- `status`: publish, draft, private (default: publish)
- `categories`: Array of category IDs
- `tags`: Array of tag IDs
- `featured_image_url`: URL to download and set as featured image
- `activity_context`: For BuddyBoss activity (scope, group_id, etc.)
- `meta`: Custom post meta fields

## Error Handling

The skill provides detailed error messages for:
- Authentication failures (401/403)
- Invalid API endpoints
- Missing required parameters
- Network connectivity issues
- Media upload problems

## Security Notes

- Always use HTTPS for API calls
- Never hardcode credentials in the skill
- Use Application Passwords instead of regular passwords
- Validate all input parameters
- Check user permissions before publishing

## Examples

### Simple Post
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

## Troubleshooting

If publishing fails:
1. Check that REST API is enabled on the WordPress site
2. Verify Application Password is correct
3. Ensure the user has publish permissions
4. Check site URL format (include https://)
5. Test with dry_run: true first

**Spun Web Technology** - Empowering AI-driven content publishing