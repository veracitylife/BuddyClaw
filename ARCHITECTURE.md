# BuddyClaw Architecture Document

**Spun Web Technology** | Version 0.0.1

## Overview

BuddyClaw is an OpenClaw skill that enables AI agents to publish content directly to WordPress, BuddyBoss, and BuddyPress sites through REST API integration. This document outlines the complete architecture, workflow, and implementation details.

## System Architecture

### Core Components

1. **SKILL.md** - Skill definition and usage instructions
2. **poster.js** - Main execution logic and API integration
3. **package.json** - Dependencies and project metadata
4. **README.md** - User documentation and setup guide

### Communication Flow

```
OpenClaw Agent → JSON Parameters → poster.js → WordPress REST API → Response → Agent
```

## REST API Integration

### Authentication
- **Method**: WordPress Application Passwords
- **Protocol**: Basic Auth over HTTPS
- **Header**: `Authorization: Basic base64(username:app_password)`

### Endpoints

#### WordPress Core
- **Posts**: `{base_url}/wp-json/wp/v2/posts`
- **Pages**: `{base_url}/wp-json/wp/v2/pages`
- **Custom Post Types**: `{base_url}/wp-json/wp/v2/{post_type}`
- **Media**: `{base_url}/wp-json/wp/v2/media`

#### BuddyBoss/BuddyPress
- **BuddyBoss Activity**: `{base_url}/wp-json/buddyboss/v1/activity`
- **BuddyPress Activity**: `{base_url}/wp-json/buddypress/v1/activity`

## Content Creation Workflows

### 1. WordPress Posts/Pages

**Input Parameters**:
```json
{
  "site_base_url": "https://example.com",
  "wp_username": "user",
  "wp_app_password": "pass",
  "content_target": "post",
  "title": "My Post Title",
  "content": "Post content HTML/Markdown",
  "status": "publish",
  "categories": [1, 2],
  "tags": [3, 4],
  "featured_image_url": "https://example.com/image.jpg",
  "meta": {"custom_field": "value"}
}
```

**Process**:
1. Validate input parameters
2. Download featured image (if provided)
3. Upload image to WordPress media library
4. Create post with media attachment
5. Return post data with ID and permalink

### 2. BuddyBoss Activity Updates

**Input Parameters**:
```json
{
  "site_base_url": "https://example.com",
  "wp_username": "user",
  "wp_app_password": "pass",
  "content_target": "activity",
  "content": "Activity update text",
  "activity_context": {
    "scope": "group",
    "group_id": 123,
    "bp_media_ids": [456, 789]
  }
}
```

**Process**:
1. Determine activity endpoint (BuddyBoss vs BuddyPress)
2. Build activity payload with context
3. Post to appropriate activity endpoint
4. Return activity data with ID and link

## Image & Media Management

### Featured Image Workflow
1. **Download**: Fetch image from URL to temp directory
2. **Upload**: POST to WordPress media endpoint
3. **Attach**: Use returned media ID as featured_media
4. **Cleanup**: Remove temporary files

### Activity Media
- Support for existing BuddyBoss media attachments
- bp_media_ids array for linking existing media
- Future: Direct media upload capability

## Error Handling Strategy

### Authentication Errors
- **401/403**: Return AUTH_ERROR with credential guidance
- **Invalid credentials**: Clear error messages for setup

### API Errors
- **4xx/5xx**: Preserve HTTP status and WordPress error messages
- **Network failures**: Retry logic and timeout handling
- **Validation errors**: Parameter-specific error messages

### Response Format
```json
{
  "success": true/false,
  "data": {...}, // API response data
  "error": "error message", // if failed
  "details": {...} // Additional error details
}
```

## Security Considerations

### Credential Management
- No hardcoded credentials in skill code
- Environment variable support for secrets
- Application Password requirement (more secure than regular passwords)
- HTTPS enforcement for all API calls

### Input Validation
- URL validation for site_base_url
- Content sanitization before API submission
- Parameter type checking
- File upload size limits

### Error Sanitization
- No credential exposure in error messages
- Safe error logging without sensitive data
- Clean stack traces in production

## Configuration Options

### Site Configuration
- `site_base_url`: Override per request
- `activity_api_provider`: Choose BuddyBoss vs BuddyPress
- Default to disruptarian.com if not specified

### Content Options
- `status`: draft, publish, private, etc.
- `author_id`: Override default user
- `meta`: Custom post meta fields
- `excerpt`: Manual excerpt for posts

### Activity Context
- `scope`: profile or group
- `group_id`: Target group for activity
- `bp_media_ids`: BuddyBoss media attachments

## Future Enhancements

### Advanced Features
- Bulk content operations
- Scheduled publishing with cron
- Content templates and snippets
- Multi-site management
- Content versioning

### Media Enhancements
- Direct image generation integration
- Video upload support
- Gallery creation tools
- Media optimization
- CDN integration

### BuddyBoss Specific
- Private messaging integration
- Event creation and management
- Group administration
- Member interaction tools
- Activity filtering and moderation

### AI Integration
- Content generation assistance
- SEO optimization suggestions
- Image alt-text generation
- Content categorization
- Engagement analytics

## Testing Strategy

### Unit Tests
- Parameter validation
- API endpoint construction
- Error handling scenarios
- Media upload workflows

### Integration Tests
- Live WordPress site testing
- BuddyBoss activity posting
- Authentication flow validation
- Error response handling

### Security Tests
- Credential leak prevention
- Input sanitization
- HTTPS enforcement
- Rate limiting compliance

## Deployment Considerations

### Dependencies
- Node.js runtime
- axios for HTTP requests
- form-data for multipart uploads
- fs and path for file operations

### Performance
- Connection pooling for multiple requests
- Efficient image download/upload
- Memory management for large files
- Timeout configuration

### Monitoring
- Request/response logging
- Error tracking and alerting
- Performance metrics
- Usage analytics

This architecture ensures robust, secure, and scalable content creation while maintaining simplicity for OpenClaw agent integration.