# BuddyClaw Examples

**Spun Web Technology** | Version 0.0.1

## Quick Examples for OpenClaw Agent

### 1. Simple WordPress Post

```json
{
  "site_base_url": "https://disruptarian.com",
  "wp_username": "your_username",
  "wp_app_password": "your_app_password",
  "content_target": "post",
  "title": "AI Revolution in Content Creation",
  "content": "<p>Artificial intelligence is transforming how we create and consume content...</p>",
  "status": "publish",
  "categories": [1, 3],
  "tags": [5, 7, 9]
}
```

### 2. BuddyBoss Activity Update

```json
{
  "site_base_url": "https://disruptarian.com",
  "wp_username": "your_username", 
  "wp_app_password": "your_app_password",
  "content_target": "activity",
  "content": "Just published our latest AI research findings! Check out the new article on our community.",
  "activity_api_provider": "buddyboss"
}
```

### 3. Post with Featured Image

```json
{
  "site_base_url": "https://disruptarian.com",
  "wp_username": "your_username",
  "wp_app_password": "your_app_password", 
  "content_target": "post",
  "title": "Machine Learning Trends 2024",
  "content": "<h2>Key Trends in Machine Learning</h2><p>This year has seen remarkable advances...</p>",
  "featured_image_url": "https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=abstract%20machine%20learning%20visualization%20with%20neural%20networks%20and%20data%20flows&image_size=landscape_16_9",
  "status": "publish"
}
```

### 4. Group Activity Post

```json
{
  "site_base_url": "https://disruptarian.com",
  "wp_username": "your_username",
  "wp_app_password": "your_app_password",
  "content_target": "activity",
  "content": "Team meeting scheduled for tomorrow at 2 PM to discuss the new AI integration project.",
  "activity_context": {
    "scope": "group",
    "group_id": 123
  },
  "activity_api_provider": "buddyboss"
}
```

### 5. Custom Post Type (Portfolio)

```json
{
  "site_base_url": "https://disruptarian.com",
  "wp_username": "your_username",
  "wp_app_password": "your_app_password",
  "content_target": "custom_post_type",
  "post_type": "portfolio",
  "title": "AI-Powered Web Application",
  "content": "<p>Developed a cutting-edge web application using machine learning algorithms...</p>",
  "featured_image_url": "https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=modern%20web%20application%20interface%20with%20AI%20elements%20clean%20professional&image_size=landscape_16_9",
  "meta": {
    "client_name": "TechCorp Inc.",
    "project_date": "2024-01-15",
    "technologies": ["React", "Node.js", "TensorFlow"]
  }
}
```

### 6. Draft Post for Review

```json
{
  "site_base_url": "https://disruptarian.com",
  "wp_username": "your_username",
  "wp_app_password": "your_app_password",
  "content_target": "post",
  "title": "SEO Best Practices for AI Content",
  "content": "<h1>Optimizing AI-Generated Content for Search Engines</h1><p>When using AI to create content...</p>",
  "status": "draft",
  "excerpt": "Learn how to optimize AI-generated content for better search engine rankings."
}
```

### 7. Page Creation

```json
{
  "site_base_url": "https://disruptarian.com",
  "wp_username": "your_username",
  "wp_app_password": "your_app_password",
  "content_target": "page",
  "title": "About Our AI Research",
  "content": "<h1>About Our AI Research Team</h1><p>We are dedicated to advancing artificial intelligence...</p>",
  "status": "publish"
}
```

### 8. Activity with Media Attachments

```json
{
  "site_base_url": "https://disruptarian.com",
  "wp_username": "your_username",
  "wp_app_password": "your_app_password",
  "content_target": "activity",
  "content": "Check out our latest AI visualization showing neural network performance!",
  "activity_context": {
    "scope": "profile",
    "bp_media_ids": [456, 789]
  },
  "activity_api_provider": "buddyboss"
}
```

### 9. Dry Run Test

```json
{
  "site_base_url": "https://disruptarian.com",
  "wp_username": "your_username",
  "wp_app_password": "your_app_password",
  "content_target": "post",
  "title": "Test Post",
  "content": "This is a test post to validate configuration.",
  "dry_run": true
}
```

### 10. Complex Post with All Features

```json
{
  "site_base_url": "https://disruptarian.com",
  "wp_username": "your_username",
  "wp_app_password": "your_app_password",
  "content_target": "post",
  "title": "The Future of AI in Web Development",
  "content": "<h2>Revolutionizing How We Build Websites</h2><p>Artificial intelligence is not just changing...</p><h3>Key Benefits</h3><ul><li>Automated code generation</li><li>Intelligent content optimization</li><li>Enhanced user experience</li></ul>",
  "excerpt": "Explore how AI is transforming web development practices and creating new opportunities for developers.",
  "featured_image_url": "https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=futuristic%20web%20development%20workspace%20with%20AI%20holograms%20and%20code%20visualization&image_size=landscape_16_9",
  "categories": [2, 5, 8],
  "tags": [10, 15, 20, 25, 30],
  "status": "publish",
  "meta": {
    "reading_time": "8 minutes",
    "difficulty": "intermediate",
    "ai_tools": ["ChatGPT", "GitHub Copilot", "Midjourney"]
  }
}
```

## Usage in OpenClaw

Tell your agent:

```
Use BuddyClaw to publish a post about machine learning trends with an AI-generated featured image
```

The agent will:
1. Generate relevant content
2. Create an appropriate featured image
3. Use BuddyClaw to publish to your WordPress site
4. Return the published post URL

## Error Handling Examples

### Authentication Error
```json
{
  "error": "Authentication failed - check your WordPress username and Application Password",
  "details": {
    "error_code": "AUTH_ERROR",
    "suggestion": "Generate a new Application Password in WordPress admin"
  }
}
```

### Invalid Image URL
```json
{
  "error": "Featured image processing failed: Image URL not found: https://invalid-url.com/image.jpg",
  "details": {
    "image_url": "https://invalid-url.com/image.jpg",
    "error_type": "DOWNLOAD_FAILED"
  }
}
```

### Endpoint Not Found
```json
{
  "error": "Endpoint not found - check if REST API is enabled",
  "details": {
    "error_code": "ENDPOINT_ERROR",
    "endpoint": "https://site.com/wp-json/wp/v2/posts",
    "suggestion": "Enable REST API in WordPress or check BuddyBoss settings"
  }
}
```

**Spun Web Technology** - Making AI content publishing seamless