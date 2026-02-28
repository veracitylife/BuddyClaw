const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

/**
 * BuddyClaw CAPTCHA Solver
 * Handles various CAPTCHA types for WordPress registration and login
 * Spun Web Technology - Version 0.0.4
 */

class CaptchaSolver {
  constructor(options = {}) {
    this.apiKey = options.apiKey || process.env.CAPTCHA_API_KEY;
    this.service = options.service || '2captcha'; // 2captcha, anti-captcha, etc.
    this.timeout = options.timeout || 120000; // 2 minutes default
    this.retryAttempts = options.retryAttempts || 3;
    this.retryDelay = options.retryDelay || 5000; // 5 seconds
  }

  /**
   * Solve CAPTCHA from image URL or base64
   */
  async solveCaptcha(captchaData, captchaType = 'image') {
    try {
      console.log('🤖 Starting CAPTCHA solving process...');
      
      let captchaId;
      
      switch (captchaType) {
        case 'image':
          captchaId = await this.submitImageCaptcha(captchaData);
          break;
        case 'recaptcha':
          captchaId = await this.submitRecaptcha(captchaData);
          break;
        case 'hcaptcha':
          captchaId = await this.submitHCaptcha(captchaData);
          break;
        default:
          throw new Error(`Unsupported CAPTCHA type: ${captchaType}`);
      }

      console.log(`✅ CAPTCHA submitted successfully, ID: ${captchaId}`);
      
      // Poll for solution
      const solution = await this.pollForSolution(captchaId, captchaType);
      
      console.log('🎉 CAPTCHA solved successfully!');
      return {
        success: true,
        solution: solution,
        captchaId: captchaId,
        type: captchaType
      };

    } catch (error) {
      console.error('❌ CAPTCHA solving failed:', error.message);
      return {
        success: false,
        error: error.message,
        type: captchaType
      };
    }
  }

  /**
   * Submit image CAPTCHA to solving service
   */
  async submitImageCaptcha(imageData) {
    try {
      let base64Image;
      
      // Handle image URL or base64 data
      if (imageData.startsWith('http')) {
        const response = await axios.get(imageData, { responseType: 'arraybuffer' });
        base64Image = Buffer.from(response.data).toString('base64');
      } else if (imageData.startsWith('data:image')) {
        base64Image = imageData.split(',')[1];
      } else {
        base64Image = imageData;
      }

      // Submit to 2captcha
      const submitUrl = 'http://2captcha.com/in.php';
      const formData = new FormData();
      formData.append('method', 'base64');
      formData.append('key', this.apiKey);
      formData.append('body', base64Image);
      formData.append('json', '1');

      const response = await axios.post(submitUrl, formData, {
        headers: formData.getHeaders()
      });

      if (response.data.status === 1) {
        return response.data.request;
      } else {
        throw new Error(`CAPTCHA submission failed: ${response.data.error_text}`);
      }

    } catch (error) {
      throw new Error(`Image CAPTCHA submission failed: ${error.message}`);
    }
  }

  /**
   * Submit reCAPTCHA to solving service
   */
  async submitRecaptcha(recaptchaData) {
    try {
      const { sitekey, pageurl } = recaptchaData;
      
      const submitUrl = 'http://2captcha.com/in.php';
      const params = new URLSearchParams({
        key: this.apiKey,
        method: 'userrecaptcha',
        googlekey: sitekey,
        pageurl: pageurl,
        json: '1'
      });

      const response = await axios.post(submitUrl, params.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });

      if (response.data.status === 1) {
        return response.data.request;
      } else {
        throw new Error(`reCAPTCHA submission failed: ${response.data.error_text}`);
      }

    } catch (error) {
      throw new Error(`reCAPTCHA submission failed: ${error.message}`);
    }
  }

  /**
   * Submit hCaptcha to solving service
   */
  async submitHCaptcha(hcaptchaData) {
    try {
      const { sitekey, pageurl } = hcaptchaData;
      
      const submitUrl = 'http://2captcha.com/in.php';
      const params = new URLSearchParams({
        key: this.apiKey,
        method: 'hcaptcha',
        sitekey: sitekey,
        pageurl: pageurl,
        json: '1'
      });

      const response = await axios.post(submitUrl, params.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });

      if (response.data.status === 1) {
        return response.data.request;
      } else {
        throw new Error(`hCaptcha submission failed: ${response.data.error_text}`);
      }

    } catch (error) {
      throw new Error(`hCaptcha submission failed: ${error.message}`);
    }
  }

  /**
   * Poll for CAPTCHA solution
   */
  async pollForSolution(captchaId, captchaType) {
    const startTime = Date.now();
    const pollUrl = 'http://2captcha.com/res.php';
    
    while (Date.now() - startTime < this.timeout) {
      try {
        const params = new URLSearchParams({
          key: this.apiKey,
          action: 'get',
          id: captchaId,
          json: '1'
        });

        const response = await axios.get(`${pollUrl}?${params.toString()}`);

        if (response.data.status === 1) {
          return response.data.request;
        } else if (response.data.request === 'CAPCHA_NOT_READY') {
          console.log('⏳ CAPTCHA still being solved, waiting...');
          await this.sleep(5000); // Wait 5 seconds
        } else {
          throw new Error(`CAPTCHA solving error: ${response.data.error_text}`);
        }

      } catch (error) {
        console.error('Poll error:', error.message);
        await this.sleep(5000);
      }
    }

    throw new Error('CAPTCHA solving timeout');
  }

  /**
   * Auto-detect CAPTCHA type on page
   */
  async detectCaptchaType(pageContent) {
    if (pageContent.includes('g-recaptcha')) {
      return 'recaptcha';
    } else if (pageContent.includes('h-captcha')) {
      return 'hcaptcha';
    } else if (pageContent.includes('captcha') || pageContent.includes('security code')) {
      return 'image';
    }
    return null;
  }

  /**
   * Extract CAPTCHA parameters from page
   */
  extractCaptchaParams(pageContent, captchaType) {
    try {
      switch (captchaType) {
        case 'recaptcha':
          const sitekeyMatch = pageContent.match(/data-sitekey=["']([^"']+)["']/);
          const pageUrlMatch = pageContent.match(/action=["']([^"']+)["']/);
          return {
            sitekey: sitekeyMatch ? sitekeyMatch[1] : null,
            pageurl: pageUrlMatch ? pageUrlMatch[1] : null
          };
        
        case 'hcaptcha':
          const hcaptchaMatch = pageContent.match(/data-sitekey=["']([^"']+)["']/);
          return {
            sitekey: hcaptchaMatch ? hcaptchaMatch[1] : null,
            pageurl: null
          };
        
        default:
          return null;
      }
    } catch (error) {
      console.error('CAPTCHA parameter extraction failed:', error.message);
      return null;
    }
  }

  /**
   * Utility function to sleep
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Test CAPTCHA solver configuration
   */
  async testConfiguration() {
    try {
      if (!this.apiKey) {
        throw new Error('CAPTCHA API key not configured');
      }

      // Test with a simple balance check
      const balanceUrl = 'http://2captcha.com/res.php';
      const params = new URLSearchParams({
        key: this.apiKey,
        action: 'getbalance',
        json: '1'
      });

      const response = await axios.get(`${balanceUrl}?${params.toString()}`);

      if (response.data.status === 1) {
        return {
          success: true,
          balance: response.data.request,
          message: `CAPTCHA solver configured successfully. Balance: $${response.data.request}`
        };
      } else {
        throw new Error(`Configuration test failed: ${response.data.error_text}`);
      }

    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'CAPTCHA solver configuration test failed'
      };
    }
  }
}

// Export for use in other modules
module.exports = CaptchaSolver;

// CLI functionality for testing
if (require.main === module) {
  const solver = new CaptchaSolver();
  
  // Handle command line arguments
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log('BuddyClaw CAPTCHA Solver');
    console.log('Usage:');
    console.log('  node captcha-solver.js [options]');
    console.log('');
    console.log('Options:');
    console.log('  --test                            Test CAPTCHA solver configuration');
    console.log('  --api-key <key>                   Set CAPTCHA API key');
    console.log('  --solve-image <base64>            Solve image CAPTCHA');
    console.log('  --solve-recaptcha <sitekey> <url> Solve reCAPTCHA');
    console.log('  --solve-hcaptcha <sitekey> <url>  Solve hCaptcha');
    console.log('');
    console.log('Examples:');
    console.log('  node captcha-solver.js --test');
    console.log('  node captcha-solver.js --solve-image <base64_data>');
    console.log('  node captcha-solver.js --solve-recaptcha 6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI http://example.com');
    process.exit(0);
  }

  if (args.includes('--test')) {
    solver.testConfiguration()
      .then(result => {
        console.log(result.message);
        process.exit(result.success ? 0 : 1);
      })
      .catch(error => {
        console.error('Test failed:', error.message);
        process.exit(1);
      });
  }

  if (args.includes('--solve-image')) {
    const imageIndex = args.indexOf('--solve-image');
    const imageData = args[imageIndex + 1];
    
    if (!imageData) {
      console.error('❌ Please provide image data');
      process.exit(1);
    }

    solver.solveCaptcha(imageData, 'image')
      .then(result => {
        if (result.success) {
          console.log('🎉 CAPTCHA solved:', result.solution);
        } else {
          console.error('❌ Failed:', result.error);
          process.exit(1);
        }
      })
      .catch(error => {
        console.error('❌ Error:', error.message);
        process.exit(1);
      });
  }

  if (args.includes('--solve-recaptcha')) {
    const recaptchaIndex = args.indexOf('--solve-recaptcha');
    const sitekey = args[recaptchaIndex + 1];
    const pageurl = args[recaptchaIndex + 2];
    
    if (!sitekey || !pageurl) {
      console.error('❌ Please provide sitekey and page URL');
      process.exit(1);
    }

    solver.solveCaptcha({ sitekey, pageurl }, 'recaptcha')
      .then(result => {
        if (result.success) {
          console.log('🎉 reCAPTCHA solved:', result.solution);
        } else {
          console.error('❌ Failed:', result.error);
          process.exit(1);
        }
      })
      .catch(error => {
        console.error('❌ Error:', error.message);
        process.exit(1);
      });
  }

  if (args.includes('--solve-hcaptcha')) {
    const hcaptchaIndex = args.indexOf('--solve-hcaptcha');
    const sitekey = args[hcaptchaIndex + 1];
    const pageurl = args[hcaptchaIndex + 2];
    
    if (!sitekey || !pageurl) {
      console.error('❌ Please provide sitekey and page URL');
      process.exit(1);
    }

    solver.solveCaptcha({ sitekey, pageurl }, 'hcaptcha')
      .then(result => {
        if (result.success) {
          console.log('🎉 hCaptcha solved:', result.solution);
        } else {
          console.error('❌ Failed:', result.error);
          process.exit(1);
        }
      })
      .catch(error => {
        console.error('❌ Error:', error.message);
        process.exit(1);
      });
  }
}
