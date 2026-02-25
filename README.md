# BuddyClaw

**Spun Web Technology**

BuddyClaw is an OpenClaw skill designed for posting content to WordPress, BuddyBoss, and BuddyPress sites. It allows your agent to publish posts, pages, custom post types, and community activity updates directly through the chat interface.

## Version
0.0.1

## Installation

1. Navigate to the skill directory:
   ```bash
   cd buddyclaw0.0.1/buddyclaw
   ```
2. Install dependencies:
   ```bash
   npm install
   ```

## Usage

This skill exposes a `publish_wordpress_content` action. The agent will use `node poster.js` to execute requests.

### Configuration
Ensure you have the necessary credentials (WordPress Application Password) and base URL configured or passed as parameters.
