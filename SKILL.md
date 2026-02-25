---
name: "buddyclaw"
description: "Post content to WordPress, BuddyBoss, and BuddyPress sites. Supports posts, pages, custom types, and community activity updates. Invoke when user wants to publish content to a WordPress site or update BuddyBoss activity."
author: "Spun Web Technology"
version: "0.0.1"
---

# BuddyClaw

**Spun Web Technology**

This skill posts content to a WordPress site via REST API, with specific support for BuddyBoss community activity.

## Action: publish_wordpress_content

This action publishes content to the configured WordPress site.

### Usage

To use this skill, the agent should construct a JSON object with the necessary parameters and execute the `poster.js` script using Node.js.

```bash
node poster.js <path-to-json-file>
# OR pipe JSON via stdin
echo '{"site_base_url": "...", ...}' | node poster.js
```

### Parameters (JSON Object)

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `site_base_url` | string | Yes | Base URL of the WordPress site (e.g., `https://example.com`) |
| `wp_username` | string | Yes | WordPress username for Application Password auth |
| `wp_app_password` | string | Yes | WordPress Application Password |
| `content_target` | string | Yes | One of: `post`, `page`, `custom_post_type`, `activity` |
| `post_type` | string | Conditional | Required if `content_target` is `custom_post_type` |
| `title` | string | Conditional | Required for post/page/custom types |
| `content` | string | Yes | The content to publish (HTML or text) |
| `status` | string | No | Default: `publish`. Options: `draft`, `publish`, etc. |
| `featured_image_url` | string | No | URL of an image to upload and set as featured image |
| `activity_context` | object | No | Context for activity updates (e.g., `{ "scope": "group", "group_id": 123 }`) |

### Example JSON Input

```json
{
  "site_base_url": "https://disruptarian.com",
  "wp_username": "myuser",
  "wp_app_password": "abcd 1234 efgh 5678",
  "content_target": "activity",
  "content": "Hello BuddyBoss community!",
  "activity_api_provider": "buddyboss"
}
```
