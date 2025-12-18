/**
 * IntraMart Authentication Service
 * 
 * Handles login flow:
 * 1. GET /imdi/login - Get im_login_info and im_secure_token from HTML
 * 2. POST /imdi/certification - Login with credentials and tokens
 * 3. Store cookies for authenticated requests
 */

export interface LoginTokens {
  im_login_info: string;
  im_secure_token: string;
  sessionCookie: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
  serverUrl: string;
}

export interface LoginResult {
  success: boolean;
  cookies?: {
    sessionCookie: string;
    jsessionId: string;
  };
  error?: string;
}

class IntraMartAuthService {
  private baseUrl: string = '';
  private sessionCookie: string = '';
  private jsessionId: string = '';

  /**
   * Step 1: Get login tokens from login page
   * Parses HTML to extract im_login_info and im_secure_token
   */
  async getLoginTokens(serverUrl: string): Promise<LoginTokens> {
    this.baseUrl = serverUrl.replace(/\/$/, ''); // Remove trailing slash
    
    try {
      const response = await fetch(`${this.baseUrl}/imdi/login`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to access login page: ${response.status} ${response.statusText}`);
      }

      const html = await response.text();
      
      // Extract im_login_info
      const loginInfoMatch = html.match(/<INPUT[^>]*name="im_login_info"[^>]*value="([^"]+)"/i) 
        || html.match(/<input[^>]*name="im_login_info"[^>]*value="([^"]+)"/i);
      
      if (!loginInfoMatch) {
        throw new Error('Could not find im_login_info in login page');
      }

      // Extract im_secure_token
      const secureTokenMatch = html.match(/<input[^>]*name="im_secure_token"[^>]*value="([^"]+)"/i)
        || html.match(/<INPUT[^>]*name="im_secure_token"[^>]*value="([^"]+)"/i);
      
      if (!secureTokenMatch) {
        throw new Error('Could not find im_secure_token in login page');
      }

      // Try to get session cookie from response headers
      // Note: Due to CORS, we may not be able to read Set-Cookie headers
      // The browser should handle cookies automatically with credentials: 'include'
      const setCookie = response.headers.get('Set-Cookie') || '';
      const jsessionMatch = setCookie.match(/JSESSIONID=([^;]+)/);
      const sessionCookieValue = jsessionMatch ? jsessionMatch[1] : '';

      return {
        im_login_info: loginInfoMatch[1],
        im_secure_token: secureTokenMatch[1],
        sessionCookie: sessionCookieValue
      };
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Network error - please check if server is accessible and CORS is configured');
      }
      throw error;
    }
  }

  /**
   * Step 2: Login with credentials
   * Returns session cookies on success
   */
  async login(credentials: LoginCredentials, tokens: LoginTokens): Promise<LoginResult> {
    this.baseUrl = credentials.serverUrl.replace(/\/$/, '');
    
    try {
      const urlencoded = new URLSearchParams();
      urlencoded.append('im_user', credentials.username);
      urlencoded.append('im_password', credentials.password);
      urlencoded.append('im_login_info', tokens.im_login_info);
      urlencoded.append('im_page_key', '');
      urlencoded.append('im_secure_token', tokens.im_secure_token);

      const response = await fetch(`${this.baseUrl}/imdi/certification`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: urlencoded,
        redirect: 'manual' // Don't automatically follow redirects
      });

      // Check for successful login
      // IntraMart typically redirects on success (302/303)
      // or returns 200 with specific content
      
      // Try to get cookies from response
      const setCookie = response.headers.get('Set-Cookie') || '';
      
      const jsessionMatch = setCookie.match(/JSESSIONID=([^;]+)/);
      const sessionMatch = setCookie.match(/jp\.co\.intra_mart\.session\.cookie=([^;]+)/);

      // If we got cookies, login was successful
      if (jsessionMatch || sessionMatch || response.ok || response.status === 302 || response.status === 303) {
        this.jsessionId = jsessionMatch ? jsessionMatch[1] : '';
        this.sessionCookie = sessionMatch ? sessionMatch[1] : '';
        
        return {
          success: true,
          cookies: {
            sessionCookie: this.sessionCookie,
            jsessionId: this.jsessionId
          }
        };
      }

      // Check response body for error messages
      const responseText = await response.text();
      
      // Check if it contains error messages (common in IntraMart login)
      if (responseText.includes('error') || responseText.includes('Error') || responseText.includes('失敗')) {
        return {
          success: false,
          error: 'Login failed - invalid credentials or server error'
        };
      }

      // If we get here and status is OK, assume success
      // The browser should have the cookies stored automatically
      return {
        success: true,
        cookies: {
          sessionCookie: this.sessionCookie,
          jsessionId: this.jsessionId
        }
      };
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        return {
          success: false,
          error: 'Network error - please check your connection'
        };
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Combined login flow: get tokens then login
   */
  async performLogin(credentials: LoginCredentials): Promise<LoginResult> {
    try {
      // Step 1: Get tokens
      const tokens = await this.getLoginTokens(credentials.serverUrl);
      console.log('Got login tokens:', { 
        im_login_info: tokens.im_login_info.substring(0, 20) + '...', 
        im_secure_token: tokens.im_secure_token.substring(0, 20) + '...'
      });

      // Step 2: Login
      const result = await this.login(credentials, tokens);
      
      if (result.success) {
        console.log('Login successful!');
      }
      
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Login failed'
      };
    }
  }

  /**
   * Get current session cookies
   */
  getSessionCookies() {
    return {
      sessionCookie: this.sessionCookie,
      jsessionId: this.jsessionId
    };
  }

  /**
   * Get base URL
   */
  getBaseUrl() {
    return this.baseUrl;
  }

  /**
   * Check if currently logged in
   */
  isLoggedIn(): boolean {
    return !!this.jsessionId || !!this.sessionCookie;
  }

  /**
   * Clear session
   */
  logout() {
    this.sessionCookie = '';
    this.jsessionId = '';
    this.baseUrl = '';
  }
}

export const intraMartAuthService = new IntraMartAuthService();
