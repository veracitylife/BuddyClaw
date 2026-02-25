const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const { promisify } = require('util');
const stream = require('stream');
const os = require('os');

/**
 * BuddyClaw - Spun Web Technology
 * Version: 0.0.1
 * Enhanced WordPress/BuddyBoss REST API Integration
 */

const pipeline = promisify(stream.pipeline);

// Configuration
const CONFIG = {
    MAX_IMAGE_SIZE: 10 * 1024 * 1024, // 10MB
    REQUEST_TIMEOUT: 30000, // 30 seconds
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000 // 1 second
};

// Helper to log errors clearly
function exitWithError(message, details = {}, code = 1) {
    console.error(JSON.stringify({ error: message, details, timestamp: new Date().toISOString() }));
    process.exit(code);
}

// Helper to log success
function exitWithSuccess(data) {
    console.log(JSON.stringify({ success: true, data, timestamp: new Date().toISOString() }));
    process.exit(0);
}

// Enhanced image download with size validation
async function downloadImage(url, tempDir) {
    try {
        // Validate URL
        const urlObj = new URL(url);
        if (!['http:', 'https:'].includes(urlObj.protocol)) {
            throw new Error('Invalid URL protocol. Only HTTP/HTTPS supported.');
        }

        const response = await axios({
            url,
            method: 'GET',
            responseType: 'stream',
            timeout: CONFIG.REQUEST_TIMEOUT,
            maxContentLength: CONFIG.MAX_IMAGE_SIZE,
            validateStatus: (status) => status === 200
        });
        
        const contentType = response.headers['content-type'];
        if (!contentType || !contentType.startsWith('image/')) {
            throw new Error('URL does not point to a valid image file');
        }

        const filename = path.basename(urlObj.pathname) || 'image.jpg';
        const filePath = path.join(tempDir, filename);
        
        await pipeline(response.data, fs.createWriteStream(filePath));
        
        // Validate file size
        const stats = fs.statSync(filePath);
        if (stats.size > CONFIG.MAX_IMAGE_SIZE) {
            fs.unlinkSync(filePath);
            throw new Error(`Image size (${stats.size} bytes) exceeds maximum allowed size (${CONFIG.MAX_IMAGE_SIZE} bytes)`);
        }
        
        return filePath;
    } catch (error) {
        if (error.code === 'ENOTFOUND') {
            throw new Error(`Image URL not found: ${url}`);
        } else if (error.code === 'ECONNREFUSED') {
            throw new Error(`Connection refused for image URL: ${url}`);
        }
        throw new Error(`Failed to download image: ${error.message}`);
    }
}

// Enhanced media upload with retry logic
async function uploadMedia(filePath, baseUrl, auth) {
    const form = new FormData();
    
    // Get file info
    const stats = fs.statSync(filePath);
    const filename = path.basename(filePath);
    const ext = path.extname(filename).toLowerCase();
    
    // Validate file type
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
    if (!allowedExtensions.includes(ext)) {
        throw new Error(`Unsupported file type: ${ext}. Allowed: ${allowedExtensions.join(', ')}`);
    }
    
    form.append('file', fs.createReadStream(filePath), {
        filename: filename,
        knownLength: stats.size
    });
    
    let lastError;
    for (let attempt = 1; attempt <= CONFIG.RETRY_ATTEMPTS; attempt++) {
        try {
            const response = await axios.post(`${baseUrl}/wp-json/wp/v2/media`, form, {
                headers: {
                    ...form.getHeaders(),
                    'Authorization': auth
                },
                timeout: CONFIG.REQUEST_TIMEOUT * 2 // Longer timeout for uploads
            });
            
            if (response.data && response.data.id) {
                return response.data.id;
            } else {
                throw new Error('Media upload succeeded but no ID returned');
            }
        } catch (error) {
            lastError = error;
            if (attempt < CONFIG.RETRY_ATTEMPTS) {
                await new Promise(resolve => setTimeout(resolve, CONFIG.RETRY_DELAY * attempt));
            }
        }
    }
    
    throw new Error(`Media upload failed after ${CONFIG.RETRY_ATTEMPTS} attempts: ${lastError.message}`);
}

// Enhanced API request with better error handling
async function makeApiRequest(url, method, data, auth, options = {}) {
    let lastError;
    
    for (let attempt = 1; attempt <= CONFIG.RETRY_ATTEMPTS; attempt++) {
        try {
            const response = await axios({
                url,
                method,
                data,
                headers: {
                    'Authorization': auth,
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                timeout: CONFIG.REQUEST_TIMEOUT,
                validateStatus: (status) => status >= 200 && status < 300
            });
            
            return response.data;
        } catch (error) {
            lastError = error;
            
            // Don't retry on authentication errors
            if (error.response && (error.response.status === 401 || error.response.status === 403)) {
                throw error;
            }
            
            if (attempt < CONFIG.RETRY_ATTEMPTS) {
                await new Promise(resolve => setTimeout(resolve, CONFIG.RETRY_DELAY * attempt));
            }
        }
    }
    
    throw lastError;
}

// Content validation
function validateContent(content, contentTarget) {
    if (!content || typeof content !== 'string') {
        throw new Error('Content must be a non-empty string');
    }
    
    if (content.length > 100000) { // 100KB limit
        throw new Error('Content exceeds maximum length of 100,000 characters');
    }
    
    // Basic XSS prevention
    if (content.includes('<script>') || content.includes('javascript:')) {
        throw new Error('Content contains potentially unsafe HTML');
    }
    
    return content;
}

// Enhanced main function
async function main() {
    let inputData = '';
    let tempDir = null;
    
    try {
        // Parse input
        if (process.argv[2]) {
            inputData = fs.readFileSync(process.argv[2], 'utf8');
        } else {
            inputData = fs.readFileSync(0, 'utf8');
        }

        const params = JSON.parse(inputData);

        // Enhanced parameter validation
        const {
            site_base_url,
            wp_username,
            wp_app_password,
            content_target,
            post_type,
            title,
            content,
            excerpt,
            status = 'publish',
            categories,
            tags,
            featured_image_url,
            author_id,
            activity_context,
            meta,
            dry_run,
            activity_api_provider = 'buddyboss'
        } = params;

        // Validate required fields with detailed messages
        if (!site_base_url) {
            exitWithError('Missing site_base_url. Provide the full URL to your WordPress site (e.g., https://example.com)');
        }
        
        if (!wp_username || !wp_app_password) {
            exitWithError('Missing authentication credentials. Both wp_username and wp_app_password are required. Generate an Application Password in WordPress admin.');
        }
        
        if (!content_target) {
            exitWithError('Missing content_target. Must be one of: post, page, custom_post_type, activity');
        }
        
        if (!content) {
            exitWithError('Missing content. Provide the text/HTML content to publish.');
        }

        // Validate URL format
        let baseUrl;
        try {
            const urlObj = new URL(site_base_url);
            if (!['http:', 'https:'].includes(urlObj.protocol)) {
                throw new Error('URL must use HTTP or HTTPS protocol');
            }
            baseUrl = site_base_url.replace(/\/$/, '');
        } catch (error) {
            exitWithError(`Invalid site_base_url: ${error.message}`);
        }

        // Validate content
        const validatedContent = validateContent(content, content_target);

        // Validate title for non-activity content
        if (content_target !== 'activity' && !title) {
            exitWithError(`Title is required for ${content_target} content`);
        }

        const auth = `Basic ${Buffer.from(`${wp_username}:${wp_app_password}`).toString('base64')}`;

        if (dry_run) {
            exitWithSuccess({ 
                message: 'Dry run successful - configuration validated',
                params: {
                    site_base_url: baseUrl,
                    content_target,
                    title,
                    content_length: validatedContent.length,
                    has_featured_image: !!featured_image_url,
                    activity_api_provider
                }
            });
        }

        // Process featured image if provided
        let featuredMediaId = null;
        if (featured_image_url) {
            try {
                tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'buddyclaw-'));
                const imagePath = await downloadImage(featured_image_url, tempDir);
                featuredMediaId = await uploadMedia(imagePath, baseUrl, auth);
                
                // Cleanup temp file
                if (fs.existsSync(imagePath)) {
                    fs.unlinkSync(imagePath);
                }
            } catch (error) {
                // Clean up temp directory if created
                if (tempDir && fs.existsSync(tempDir)) {
                    fs.rmdirSync(tempDir);
                }
                exitWithError(`Featured image processing failed: ${error.message}`, {
                    image_url: featured_image_url,
                    error_type: error.message.includes('size') ? 'SIZE_LIMIT' : 'DOWNLOAD_FAILED'
                });
            }
        }

        // Process content based on target
        let result;
        
        if (content_target === 'activity') {
            result = await processActivityContent(baseUrl, auth, validatedContent, activity_context, author_id, activity_api_provider);
        } else {
            result = await processWordPressContent(baseUrl, auth, content_target, title, validatedContent, {
                post_type, excerpt, status, categories, tags, featuredMediaId, author_id, meta
            });
        }

        // Final cleanup
        if (tempDir && fs.existsSync(tempDir)) {
            fs.rmdirSync(tempDir);
        }

        exitWithSuccess(result);

    } catch (error) {
        // Cleanup on error
        if (tempDir && fs.existsSync(tempDir)) {
            try {
                fs.rmdirSync(tempDir, { recursive: true });
            } catch (cleanupError) {
                console.error('Failed to cleanup temp directory:', cleanupError.message);
            }
        }
        
        if (error.message.includes('ECONNREFUSED')) {
            exitWithError('Connection refused - check if your WordPress site is accessible', {
                suggestion: 'Verify your site URL and ensure WordPress is running'
            });
        } else if (error.message.includes('ENOTFOUND')) {
            exitWithError('Site not found - check your site_base_url', {
                provided_url: error.config?.url || 'unknown'
            });
        } else if (error.response?.status === 401) {
            exitWithError('Authentication failed - check your WordPress username and Application Password', {
                error_code: 'AUTH_ERROR',
                suggestion: 'Generate a new Application Password in WordPress admin'
            });
        } else if (error.response?.status === 403) {
            exitWithError('Access forbidden - check user permissions', {
                error_code: 'PERMISSION_ERROR',
                suggestion: 'Ensure your user has publish permissions'
            });
        } else if (error.response?.status === 404) {
            exitWithError('Endpoint not found - check if REST API is enabled', {
                error_code: 'ENDPOINT_ERROR',
                endpoint: error.config?.url,
                suggestion: 'Enable REST API in WordPress or check BuddyBoss settings'
            });
        } else if (error.response?.data?.message) {
            exitWithError(`WordPress API error: ${error.response.data.message}`, {
                status: error.response.status,
                code: error.response.data.code,
                data: error.response.data.data
            });
        } else {
            exitWithError(`Request failed: ${error.message}`, {
                type: error.name,
                suggestion: 'Check your configuration and try again'
            });
        }
    }
}

// Process activity content
async function processActivityContent(baseUrl, auth, content, activityContext, authorId, provider) {
    const endpoint = provider === 'buddypress' 
        ? `${baseUrl}/wp-json/buddypress/v1/activity`
        : `${baseUrl}/wp-json/buddyboss/v1/activity`;

    const payload = {
        content,
        component: 'activity',
        type: 'activity_update',
        user_id: authorId || 0
    };

    if (activityContext) {
        if (activityContext.scope === 'group' && activityContext.group_id) {
            payload.primary_item_id = activityContext.group_id;
            payload.component = 'groups';
        }
        if (activityContext.bp_media_ids && Array.isArray(activityContext.bp_media_ids)) {
            payload.bp_media_ids = activityContext.bp_media_ids;
        }
    }

    return await makeApiRequest(endpoint, 'POST', payload, auth);
}

// Process WordPress content
async function processWordPressContent(baseUrl, auth, contentTarget, title, content, options) {
    let endpoint;
    
    switch (contentTarget) {
        case 'post':
            endpoint = `${baseUrl}/wp-json/wp/v2/posts`;
            break;
        case 'page':
            endpoint = `${baseUrl}/wp-json/wp/v2/pages`;
            break;
        case 'custom_post_type':
            if (!options.post_type) {
                throw new Error('post_type is required for custom_post_type content');
            }
            endpoint = `${baseUrl}/wp-json/wp/v2/${options.post_type}`;
            break;
        default:
            throw new Error(`Unsupported content target: ${contentTarget}`);
    }

    const payload = {
        title,
        content,
        status: options.status || 'publish'
    };

    // Add optional fields
    if (options.excerpt) payload.excerpt = options.excerpt;
    if (options.categories && Array.isArray(options.categories)) payload.categories = options.categories;
    if (options.tags && Array.isArray(options.tags)) payload.tags = options.tags;
    if (options.featuredMediaId) payload.featured_media = options.featuredMediaId;
    if (options.authorId) payload.author = options.authorId;
    if (options.meta && typeof options.meta === 'object') payload.meta = options.meta;

    return await makeApiRequest(endpoint, 'POST', payload, auth);
}

main().catch(err => {
    console.error(JSON.stringify({ 
        error: 'Critical failure', 
        details: err.message,
        stack: err.stack,
        timestamp: new Date().toISOString()
    }));
    process.exit(1);
});