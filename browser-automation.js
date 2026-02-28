const puppeteer = require('puppeteer');
const EmailVerifier = require('./email-verifier');
const CaptchaSolver = require('./captcha-solver');

class BrowserAutomation {
  constructor(options = {}) {
    this.browserURL = options.browserURL || 'http://127.0.0.1:9222';
    this.cdp_ws = options.cdp_ws || '';
    this.registration_path = options.registration_path || '/register';
    this.captchaApiKey = options.captchaApiKey || process.env.CAPTCHA_API_KEY || '';
    this.postNavigationDelay = options.postNavigationDelay || 1500;
    this.postClickDelay = options.postClickDelay || 800;
  }

  async connect() {
    if (this.cdp_ws) {
      this.browser = await puppeteer.connect({ browserWSEndpoint: this.cdp_ws, ignoreHTTPSErrors: true });
    } else {
      this.browser = await puppeteer.connect({ browserURL: this.browserURL, ignoreHTTPSErrors: true });
    }
    return this.browser;
  }

  async disconnect() {
    try {
      if (this.browser) {
        await this.browser.disconnect();
      }
    } catch (_) {}
  }

  async registerUser({ siteUrl, username, email, password }) {
    if (!siteUrl || !username || !email || !password) {
      return { success: false, error: 'Missing required fields: siteUrl, username, email, password' };
    }
    let page;
    try {
      await this.connect();
      const pages = await this.browser.pages();
      page = pages.length ? pages[0] : await this.browser.newPage();
      await page.setUserAgent('BuddyClaw/0.0.7');
      await page.setViewport({ width: 1280, height: 900 });

      // Determine registration URL
      const candidates = [
        `${siteUrl.replace(/\/$/, '')}${this.registration_path}`,
        `${siteUrl.replace(/\/$/, '')}/register/`,
        `${siteUrl.replace(/\/$/, '')}/wp-login.php?action=register`
      ];
      let regUrl = candidates[0];

      for (const url of candidates) {
        try {
          const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
          if (resp && resp.ok()) {
            regUrl = url;
            break;
          }
        } catch (_) {}
      }

      await page.goto(regUrl, { waitUntil: 'networkidle2', timeout: 45000 });
      await page.waitForTimeout(this.postNavigationDelay);

      const hasForm = await this.ensureRegistrationForm(page);
      if (!hasForm) {
        return { success: false, error: 'Registration form not found' };
      }

      // Fill form fields using common selectors
      await this.typeFirst(page, ['#user_login', 'input[name="user_login"]', '#signup_username', 'input[name="signup_username"]'], username);
      await this.typeFirst(page, ['#user_email', 'input[name="user_email"]', '#signup_email', 'input[name="email"]', 'input[type="email"]'], email);

      // Password may or may not be present depending on setup
      await this.typeFirst(page, ['#user_pass', 'input[name="user_pass"]', '#signup_password', 'input[name="signup_password"]', 'input[type="password"]'], password, { optional: true });
      await this.typeFirst(page, ['#user_pass2', 'input[name="user_pass2"]', '#signup_password_confirm', 'input[name="signup_password_confirm"]'], password, { optional: true });

      await this.checkConsentIfPresent(page);

      // Try to handle CAPTCHA minimally if present
      const content = await page.content();
      if (this.captchaApiKey && (content.includes('g-recaptcha') || content.includes('h-captcha'))) {
        const solver = new CaptchaSolver({ apiKey: this.captchaApiKey });
        const type = await solver.detectCaptchaType(content);
        const params = solver.extractCaptchaParams(content, type) || {};
        params.pageurl = regUrl;
        const solved = await solver.solveCaptcha(params, type);
        if (solved.success) {
          await page.evaluate((token) => {
            const gr = document.querySelector('[name="g-recaptcha-response"]');
            if (gr) gr.value = token;
            const hc = document.querySelector('[name="h-captcha-response"]');
            if (hc) hc.value = token;
          }, solved.solution);
          await page.waitForTimeout(this.postClickDelay);
        }
      }

      // Submit
      const clicked = await this.clickFirst(page, [
        'button[type="submit"]',
        'input[type="submit"]',
        'button#signup_submit',
        '#wp-submit'
      ]);
      if (!clicked) {
        const altClicked = await this.clickByButtonText(page, ['register', 'sign up', 'create account', 'submit']);
        if (!altClicked) {
          return { success: false, error: 'Unable to locate registration submit button' };
        }
      }

      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 45000 }).catch(() => {});
      await page.waitForTimeout(this.postNavigationDelay);

      // Try to infer success
      const successText = await page.evaluate(() => document.body.innerText);
      const success =
        /check your email|activation email|please confirm|successfully registered|account created/i.test(successText);

      // Email verification via Himalaya if available
      let verification = null;
      try {
        const verifier = new EmailVerifier();
        verification = await verifier.checkEmailVerification(email, 'WordPress', 60000);
        if (verification.success && verification.verificationLink) {
          await page.goto(verification.verificationLink, { waitUntil: 'networkidle2', timeout: 45000 }).catch(() => {});
          await this.setPasswordIfPrompted(page, password);
        }
      } catch (e) {
        // Non-fatal
      }

      let loggedIn = false;
      try {
        loggedIn = await this.loginAfterVerify(page, siteUrl, username, password);
      } catch (_) {}

      return {
        success: true,
        message: success ? 'Registration submitted; email verification handled if found.' : 'Registration likely submitted.',
        registrationUrl: regUrl,
        emailVerification: verification,
        loggedIn
      };
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      // Do not close the browser; keep the relay-attached tab alive
      await this.disconnect();
    }
  }

  async typeFirst(page, selectors, text, opts = {}) {
    for (const sel of selectors) {
      try {
        const el = await page.$(sel);
        if (el) {
          await el.click({ clickCount: 3 }).catch(() => {});
          await el.type(text, { delay: 20 });
          return true;
        }
      } catch (_) {}
    }
    return !!opts.optional;
  }

  async clickFirst(page, selectors) {
    for (const sel of selectors) {
      try {
        const el = await page.$(sel);
        if (el) {
          await el.click();
          await page.waitForTimeout(this.postClickDelay);
          return true;
        }
      } catch (_) {}
    }
    return false;
  }

  async ensureRegistrationForm(page) {
    const hasUsername = await page.$('#user_login, input[name="user_login"], #signup_username, input[name="signup_username"]');
    const hasEmail = await page.$('#user_email, input[name="user_email"], #signup_email, input[name="email"], input[type="email"]');
    if (hasUsername && hasEmail) return true;
    const linkSelectors = ['a[href*="action=register"]', 'a[href*="/register"]'];
    for (const sel of linkSelectors) {
      try {
        const el = await page.$(sel);
        if (el) {
          await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 45000 }).catch(() => {}), el.click()]);
          await page.waitForTimeout(this.postNavigationDelay);
          const u = await page.$('#user_login, input[name="user_login"], #signup_username, input[name="signup_username"]');
          const e = await page.$('#user_email, input[name="user_email"], #signup_email, input[name="email"], input[type="email"]');
          if (u && e) return true;
        }
      } catch (_) {}
    }
    return false;
  }

  async clickByButtonText(page, texts) {
    for (const t of texts) {
      try {
        const xp = `//button[contains(translate(normalize-space(.),'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'${t}')] | //input[@type='submit' and contains(translate(@value,'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'${t}')]`;
        const handles = await page.$x(xp);
        if (handles && handles[0]) {
          await handles[0].click();
          await page.waitForTimeout(this.postClickDelay);
          return true;
        }
      } catch (_) {}
    }
    return false;
  }

  async checkConsentIfPresent(page) {
    try {
      const clicked = await page.evaluate(() => {
        const labels = Array.from(document.querySelectorAll('label'));
        const match = labels.find(l => /terms|privacy|policy|agree|consent/i.test(l.innerText));
        if (match) {
          const forId = match.getAttribute('for');
          if (forId) {
            const cb = document.getElementById(forId);
            if (cb && cb.type === 'checkbox' && !cb.checked) {
              cb.click();
              return true;
            }
          }
          const cb = match.querySelector('input[type="checkbox"]');
          if (cb && !cb.checked) {
            cb.click();
            return true;
          }
        }
        const any = Array.from(document.querySelectorAll('input[type="checkbox"]')).find(c => /terms|privacy|policy|agree|consent/i.test(c.name || c.id || c.outerHTML));
        if (any && !any.checked) {
          any.click();
          return true;
        }
        return false;
      });
      return clicked;
    } catch (_) {
      return false;
    }
  }

  async setPasswordIfPrompted(page, password) {
    try {
      const hasPass = await page.$('#pass1, input[name="pass1"], #password, input[name="password"]');
      if (!hasPass) return false;
      await this.typeFirst(page, ['#pass1', 'input[name="pass1"]', '#password', 'input[name="password"]'], password);
      await this.typeFirst(page, ['#pass2', 'input[name="pass2"]'], password, { optional: true });
      const clicked = await this.clickFirst(page, ['#wp-submit', 'button[type="submit"]', 'input[type="submit"]']);
      if (!clicked) await this.clickByButtonText(page, ['reset password', 'save password', 'set password', 'update password']);
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 45000 }).catch(() => {});
      await page.waitForTimeout(this.postNavigationDelay);
      return true;
    } catch (_) {
      return false;
    }
  }

  async loginAfterVerify(page, siteUrl, username, password) {
    try {
      const loginUrl = `${siteUrl.replace(/\/$/, '')}/wp-login.php`;
      await page.goto(loginUrl, { waitUntil: 'networkidle2', timeout: 45000 }).catch(() => {});
      await page.waitForTimeout(this.postNavigationDelay);
      await this.typeFirst(page, ['#user_login', 'input[name="log"]', 'input#username', 'input[name="username"]'], username);
      await this.typeFirst(page, ['#user_pass', 'input[name="pwd"]', 'input#password', 'input[name="password"]'], password);
      const clicked = await this.clickFirst(page, ['#wp-submit', 'button[type="submit"]', 'input[type="submit"]']);
      if (!clicked) await this.clickByButtonText(page, ['log in', 'sign in', 'continue']);
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 45000 }).catch(() => {});
      await page.waitForTimeout(this.postNavigationDelay);
      const loggedIn = await page.$('#wpadminbar');
      if (loggedIn) return true;
      const bodyText = await page.evaluate(() => document.body.innerText);
      return /dashboard|log out|my account/i.test(bodyText);
    } catch (_) {
      return false;
    }
  }
}

module.exports = BrowserAutomation;

if (require.main === module) {
  // Simple CLI for testing
  const args = process.argv.slice(2);
  const get = (flag, def = '') => {
    const i = args.indexOf(flag);
    return i >= 0 ? args[i + 1] : def;
  };

  const siteUrl = get('--site');
  const username = get('--username');
  const email = get('--email');
  const password = get('--password');
  const browserURL = get('--browserURL', 'http://127.0.0.1:9222');

  const ba = new BrowserAutomation({ browserURL });
  ba.registerUser({ siteUrl, username, email, password }).then(res => {
    console.log(JSON.stringify(res, null, 2));
    process.exit(res.success ? 0 : 1);
  });
}
