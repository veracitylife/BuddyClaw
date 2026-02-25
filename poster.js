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
 */

const pipeline = promisify(stream.pipeline);

// Helper to log errors clearly
function exitWithError(message, details = {}, code = 1) {
    console.error(JSON.stringify({ error: message, details }));
    process.exit(code);
}

// Helper to log success
function exitWithSuccess(data) {
    console.log(JSON.stringify(data));
    process.exit(0);
}

async function downloadImage(url, tempDir) {
    try {
        const response = await axios({
            url,
            method: 'GET',
            responseType: 'stream'
        });
        
        const filename = path.basename(new URL(url).pathname) || 'image.jpg';
        const filePath = path.join(tempDir, filename);
        
        await pipeline(response.data, fs.createWriteStream(filePath));
        return filePath;
    } catch (error) {
        throw new Error(`Failed to download image: ${error.message}`);
    }
}

async function uploadMedia(filePath, baseUrl, auth) {
    const form = new FormData();
    form.append('file', fs.createReadStream(filePath));
    
    try {
        const response = await axios.post(`${baseUrl}/wp-json/wp/v2/media`, form, {
            headers: {
                ...form.getHeaders(),
                'Authorization': auth
            }
        });
        return response.data.id;
    } catch (error) {
        throw new Error(`Failed to upload media: ${error.message}`);
    }
}

async function main() {
    // Parse input from stdin or file
    let inputData = '';
    
    if (process.argv[2]) {
        try {
            inputData = fs.readFileSync(process.argv[2], 'utf8');
        } catch (err) {
            exitWithError(`Failed to read input file: ${err.message}`);
        }
    } else {
        // Read from stdin
        inputData = fs.readFileSync(0, 'utf8');
    }

    let params;
    try {
        params = JSON.parse(inputData);
    } catch (err) {
        exitWithError('Invalid JSON input');
    }

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
        activity_api_provider = 'buddyboss' // default
    } = params;

    // Validate required fields
    if (!site_base_url) exitWithError('Missing site_base_url');
    if (!wp_username || !wp_app_password) exitWithError('Missing authentication credentials (wp_username, wp_app_password)');
    if (!content_target) exitWithError('Missing content_target');
    if (!content) exitWithError('Missing content');

    const auth = `Basic ${Buffer.from(`${wp_username}:${wp_app_password}`).toString('base64')}`;
    const baseUrl = site_base_url.replace(/\/$/, ''); // Remove trailing slash

    if (dry_run) {
        exitWithSuccess({ message: 'Dry run successful', params });
    }

    try {
        let featuredMediaId = null;
        if (featured_image_url) {
            const tempDir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'buddyclaw-'));
            const imagePath = await downloadImage(featured_image_url, tempDir);
            featuredMediaId = await uploadMedia(imagePath, baseUrl, auth);
            // Cleanup
            fs.unlinkSync(imagePath);
            fs.rmdirSync(tempDir);
        }

        if (content_target === 'activity') {
            const endpoint = activity_api_provider === 'buddypress' 
                ? `${baseUrl}/wp-json/buddypress/v1/activity`
                : `${baseUrl}/wp-json/buddyboss/v1/activity`;

            const payload = {
                content,
                component: 'activity',
                type: 'activity_update',
                user_id: author_id || 0 // 0 usually means current user
            };

            if (activity_context) {
                if (activity_context.scope === 'group' && activity_context.group_id) {
                    payload.primary_item_id = activity_context.group_id;
                    payload.component = 'groups'; // Often required for group activity
                }
                if (activity_context.bp_media_ids) {
                    payload.bp_media_ids = activity_context.bp_media_ids;
                }
            }

            const response = await axios.post(endpoint, payload, {
                headers: { 'Authorization': auth, 'Content-Type': 'application/json' }
            });
            
            exitWithSuccess(response.data);

        } else {
            // Post, Page, Custom Post Type
            let endpoint = `${baseUrl}/wp-json/wp/v2/posts`;
            if (content_target === 'page') endpoint = `${baseUrl}/wp-json/wp/v2/pages`;
            if (content_target === 'custom_post_type') {
                if (!post_type) exitWithError('Missing post_type for custom_post_type target');
                endpoint = `${baseUrl}/wp-json/wp/v2/${post_type}`;
            }

            const payload = {
                title,
                content,
                status,
                excerpt: excerpt || undefined,
                categories: categories || undefined,
                tags: tags || undefined,
                featured_media: featuredMediaId || undefined,
                author: author_id || undefined,
                meta: meta || undefined
            };

            const response = await axios.post(endpoint, payload, {
                headers: { 'Authorization': auth, 'Content-Type': 'application/json' }
            });

            exitWithSuccess(response.data);
        }

    } catch (error) {
        const errorDetails = error.response ? {
            status: error.response.status,
            statusText: error.response.statusText,
            data: error.response.data
        } : { message: error.message };
        
        exitWithError('API Request Failed', errorDetails);
    }
}

main().catch(err => {
    console.error(JSON.stringify({ error: 'Critical failure', details: err.message }));
    process.exit(1);
});
