# BuddyClaw Usage Guide

**Spun Web Technology** | Version 0.0.1

## Quick Start

BuddyClaw enables your OpenClaw agent to publish content directly to WordPress, BuddyBoss, and BuddyPress sites through simple chat commands.

## Installation

1. Navigate to your OpenClaw skills directory
2. Copy the `buddyclaw0.0.1/buddyclaw` folder to your skills directory
3. Install dependencies:
   ```bash
   cd buddyclaw
   npm install
   ```

## Basic Usage

### Publishing a WordPress Post

Tell your agent:
```
Publish a post titled "My New Article" with content about artificial intelligence trends to my WordPress site
```

The agent will:
1. Generate the content
2. Use BuddyClaw to publish it
3. Return the post URL and ID

### Posting to BuddyBoss Activity

Tell your agent:
```
Post an activity update to my BuddyBoss community: "Just launched our new AI project!"
```

### Publishing with Featured Image

Tell your agent:
```
Create a WordPress post about machine learning with this image: https://example.com/ml-chart.jpg
```

## Configuration

### WordPress Site Setup

1. **Enable Application Passwords** in WordPress:
   - Go to Users → Your Profile
   - Generate an Application Password
   - Save the password securely

2. **Verify REST API** is working:
   - Visit: `https://yoursite.com/wp-json/`
   - Should return JSON with available endpoints

### BuddyBoss Setup

1. **Enable REST API** in BuddyBoss settings
2. **Verify Activity Endpoints**:
   - Visit: `https://yoursite.com/wp-json/buddyboss/v1/`
   - Should show activity endpoints

### Environment Variables

Set these in your OpenClaw configuration:
```bash
WP_USERNAME=your_wordpress_username
WP_APP_PASSWORD=your_application_password
WP_BASE_URL=https://your-site.com
```

## Advanced Usage

### Custom Post Types

Tell your agent:
```
Publish a portfolio item with title "New Design Project" and content about the client work
```

### Group Activity Posts

Tell your agent:
```
Post to group 123: "Team meeting scheduled for tomorrow at 2 PM"
```

### Draft Posts

Tell your agent:
```
Create a draft post about SEO best practices for review
```

## Content Types

### WordPress Posts
- **Title**: Required
- **Content**: HTML or Markdown
- **Categories**: Array of category IDs
- **Tags**: Array of tag IDs
- **Featured Image**: URL to image
- **Status**: publish, draft, private, pending
- **Meta**: Custom fields as key/value pairs

### WordPress Pages
- **Title**: Required
- **Content**: HTML content
- **Template**: Page template selection
- **Parent**: Parent page ID
- **Order**: Menu order

### BuddyBoss Activity
- **Content**: Activity text
- **Scope**: profile or group
- **Group ID**: For group posts
- **Media IDs**: Existing BuddyBoss media

## Error Handling

### Common Issues

**Authentication Failed**
- Verify Application Password is correct
- Check username spelling
- Ensure HTTPS is used

**Endpoint Not Found**
- Verify REST API is enabled
- Check BuddyBoss/BuddyPress installation
- Confirm plugin compatibility

**Media Upload Failed**
- Check file size limits
- Verify image URL is accessible
- Ensure write permissions

**Activity Post Failed**
- Verify group membership
- Check activity component settings
- Confirm user permissions

### Error Messages

BuddyClaw provides detailed error information:
```json
{
  "error": "Authentication failed",
  "details": {
    "status": 401,
    "message": "Invalid username or application password"
  }
}
```

## Best Practices

### Content Quality
- Use clear, descriptive titles
- Format content with proper HTML
- Add relevant categories and tags
- Optimize images before uploading

### Security
- Never share Application Passwords
- Use HTTPS for all communications
- Regularly rotate passwords
- Monitor site activity logs

### Performance
- Optimize images before upload
- Use appropriate file formats
- Consider CDN for media
- Batch operations when possible

## Troubleshooting

### Testing Connection

Test your setup with a simple post:
```
Create a test post with title "Connection Test" and minimal content
```

### Debug Mode

Enable detailed logging in your OpenClaw session to see API requests and responses.

### Common Solutions

**403 Forbidden**: Check user capabilities and REST API permissions
**404 Not Found**: Verify endpoint URLs and site configuration  
**500 Internal Server**: Check WordPress error logs
**Timeout Errors**: Increase timeout settings for large media uploads

## Examples

### Complete Post Example
```json
{
  "site_base_url": "https://mycommunity.com",
  "wp_username": "admin",
  "wp_app_password": "abcd 1234 efgh 5678",
  "content_target": "post",
  "title": "Community Update",
  "content": "Welcome to our new BuddyBoss community! We're excited to connect with everyone.",
  "categories": [1, 5],
  "tags": [10, 15, 20],
  "featured_image_url": "https://example.com/welcome.jpg",
  "status": "publish"
}
```

### Activity Update Example
```json
{
  "site_base_url": "https://mycommunity.com", 
  "wp_username": "admin",
  "wp_app_password": "abcd 1234 efgh 5678",
  "content_target": "activity",
  "content": "Just published our monthly newsletter! Check it out.",
  "activity_context": {
    "scope": "profile"
  }
}
```

## Support

For issues or questions:
1. Check WordPress/BuddyBoss documentation
2. Verify REST API functionality
3. Review error logs
4. Test with minimal parameters
5. Ensure proper authentication

**Spun Web Technology** - Empowering AI-driven content creation