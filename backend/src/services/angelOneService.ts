import { env } from '../config/env';
// @ts-ignore
import { SmartAPI, WebSocketV2 } from 'smartapi-javascript';
// @ts-ignore
import { TOTP } from 'totp-generator';
import { EventEmitter } from 'events';
import { AngelOneSession } from '../models/AngelOneSession';
import { encrypt, decrypt } from '../utils/crypto';

export class AngelOneService extends EventEmitter {
  private smartApi: any;
  private webSocket: any;
  private isAuthenticated: boolean = false;
  private sessionEstablished: boolean = false;
  private activeClientCode: string = '';
  private feedToken: string = '';
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectTimeout: NodeJS.Timeout | null = null;

  // Heartbeat monitor fields
  private lastTickTime: number = 0;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.smartApi = new SmartAPI({
      api_key: env.ANGELONE_API_KEY,
    });
  }

  getIsAuthenticated() {
    console.log(`🤖 [AngelOne] Status Check: isAuthenticated=${this.isAuthenticated}, sessionEstablished=${this.sessionEstablished}, activeClientCode=${this.activeClientCode}`);
    return this.isAuthenticated;
  }

  /**
   * Performs a lightweight API check using getProfile.
   * Returns true if the session is alive, false otherwise.
   */
  async checkSessionValid(): Promise<boolean> {
    if (!this.smartApi.access_token) return false;
    try {
      const profile = await this.smartApi.getProfile();
      if (profile && profile.status === true) {
        return true;
      }
      console.warn('🤖 [AngelOne] Session validation failed:', profile ? profile.message : 'No profile response data');
      return false;
    } catch (error) {
      console.error('🤖 [AngelOne] Session validation caught error:', error);
      return false;
    }
  }

  /**
   * Refreshes the session using the refreshToken saved in the MongoDB session.
   */
  async refreshTokenFlow(): Promise<boolean> {
    const clientCode = this.activeClientCode || env.ANGELONE_CLIENT_CODE;
    if (!clientCode) {
      console.warn('🤖 [AngelOne] Cannot refresh token: No active client code found.');
      return false;
    }

    try {
      const session = await AngelOneSession.findOne({ clientCode, isActive: true });
      if (!session || !session.refreshToken) {
        console.warn(`🤖 [AngelOne] No active session or refresh token found in DB for client ${clientCode}`);
        return false;
      }

      console.log(`🤖 [AngelOne] Requesting new access token via refreshToken for client ${clientCode}...`);
      const res = await this.smartApi.generateToken(session.refreshToken);

      if (res && res.status === true && res.data) {
        const newJwt = res.data.jwtToken || this.smartApi.access_token;
        const newRefresh = res.data.refreshToken || this.smartApi.refresh_token;

        // Sync with SDK instance
        this.smartApi.access_token = newJwt;
        this.smartApi.refresh_token = newRefresh;

        this.isAuthenticated = true;
        this.sessionEstablished = true;

        // Save new tokens to DB
        session.jwtToken = newJwt;
        session.refreshToken = newRefresh;
        session.lastLoginTime = new Date();
        await session.save();

        console.log(`✅ [AngelOne] Token refresh SUCCESSFUL for client ${clientCode}.`);
        
        // Reconnect WebSocket to use the fresh JWT token
        this.startWebSocket();
        return true;
      }

      console.warn('⚠️ [AngelOne] Token refresh API returned false:', res ? res.message : 'No response');
      return false;
    } catch (error) {
      console.error('❌ [AngelOne] Token refresh encountered an error:', error);
      return false;
    }
  }

  /**
   * Validates the active session and attempts recovery/refresh/silent re-authentication if dead.
   */
  async ensureAuthenticated(): Promise<boolean> {
    // 1. Trust active session first by checking if it is valid
    if (this.isAuthenticated && this.smartApi.access_token) {
      const isValid = await this.checkSessionValid();
      if (isValid) {
        return true;
      }
    }

    // 2. Only allow automatic refresh if a session was manually established once 
    if (!this.sessionEstablished) {
      console.log('🤖 [AngelOne] Auto-auth blocked (sessionEstablished is false)');
      return false;
    }

    // 3. Try to refresh the token using refresh token first
    console.log('🤖 [AngelOne] Session invalid or expired. Attempting token refresh via refreshToken...');
    const refreshSuccess = await this.refreshTokenFlow();
    if (refreshSuccess) {
      return true;
    }

    // 4. Fall back to silent re-authentication with PIN & TOTP
    console.log('🤖 [AngelOne] Token refresh failed. Attempting silent re-authentication...');
    return this.authenticate();
  }

  /**
   * Handles manual login from the UI, generating the initial tokens and saving credentials to MongoDB.
   */
  async loginWithCredentials(clientCode: string, pin: string, totpCode: string, totpSecret?: string): Promise<boolean> {
    try {
      console.log('🤖 [AngelOne] Manual login attempt for client:', clientCode);
      const res = await this.smartApi.generateSession(clientCode, pin, totpCode);
      
      if (res && res.status === true) {
        console.log('✅ [AngelOne] Manual login SUCCESS');
        this.isAuthenticated = true;
        this.sessionEstablished = true;
        this.activeClientCode = clientCode;
        this.feedToken = res.data?.feedToken || '';
        
        // Fallback to environment TOTP secret if dynamic is not supplied and matches env
        let actualTotpSecret = totpSecret || '';
        if (!actualTotpSecret && clientCode === env.ANGELONE_CLIENT_CODE) {
          actualTotpSecret = env.ANGELONE_TOTP_SECRET;
        }

        // Encrypt credentials before saving to MongoDB
        const encryptedPin = encrypt(pin);
        const encryptedTotp = actualTotpSecret ? encrypt(actualTotpSecret) : '';

        // Save or update session in MongoDB
        await AngelOneSession.findOneAndUpdate(
          { clientCode },
          {
            jwtToken: res.data?.jwtToken || '',
            refreshToken: res.data?.refreshToken || '',
            feedToken: this.feedToken,
            lastLoginTime: new Date(),
            sessionEstablished: true,
            pin: encryptedPin,
            totpSecret: encryptedTotp || undefined,
            isActive: true,
            websocketStatus: 'disconnected'
          },
          { upsert: true, new: true }
        );

        console.log(`💾 [AngelOne] Session and credentials saved securely to MongoDB for client: ${clientCode}`);
        
        this.startWebSocket();
        return true;
      }

      console.warn('❌ [AngelOne] Manual login failed:', res ? res.message : 'Unknown response');
      return false;
    } catch (error) {
      console.error('❌ [AngelOne] Manual login error:', error);
      return false;
    }
  }

  /**
   * Silently logs the user in by decrypting DB-stored credentials and generating new tokens.
   */
  async authenticate(): Promise<boolean> {
    console.log('🤖 [AngelOne] authenticate() called for silent re-authentication.');

    // Only allow silent auth if a session was manually established once 
    if (!this.sessionEstablished) {
      console.log('🤖 [AngelOne] Silent authenticate() rejected - sessionEstablished is false.');
      return false;
    }

    const clientCode = this.activeClientCode || env.ANGELONE_CLIENT_CODE;
    if (!clientCode) {
      console.warn('🤖 [AngelOne] Silent authenticate() failed: No client code available.');
      return false;
    }

    try {
      // Fetch credentials from DB
      const session = await AngelOneSession.findOne({ clientCode, isActive: true });
      let pin = '';
      let totpSecret = '';

      if (session) {
        pin = session.pin ? decrypt(session.pin) : '';
        totpSecret = session.totpSecret ? decrypt(session.totpSecret) : '';
      }

      // Fallback to environment variables if not found in database session
      if (!pin && clientCode === env.ANGELONE_CLIENT_CODE) pin = env.ANGELONE_PIN;
      if (!totpSecret && clientCode === env.ANGELONE_CLIENT_CODE) totpSecret = env.ANGELONE_TOTP_SECRET;

      if (!pin || !totpSecret) {
        console.warn(`⚠️ [AngelOne] Silent authenticate failed: Missing PIN or TOTP Secret for client ${clientCode}.`);
        return false;
      }

      console.log(`🤖 [AngelOne] Generating dynamic TOTP for client ${clientCode}...`);
      const { otp } = await TOTP.generate(totpSecret);

      console.log(`🤖 [AngelOne] Performing silent API login call for client ${clientCode}...`);
      const res = await this.smartApi.generateSession(clientCode, pin, otp);

      if (res && res.status === true) {
        this.isAuthenticated = true;
        this.sessionEstablished = true;
        this.activeClientCode = clientCode;
        this.feedToken = res.data?.feedToken || '';

        // Save session update in DB
        await AngelOneSession.findOneAndUpdate(
          { clientCode },
          {
            jwtToken: res.data?.jwtToken || '',
            refreshToken: res.data?.refreshToken || '',
            feedToken: this.feedToken,
            lastLoginTime: new Date(),
            sessionEstablished: true,
            isActive: true
          },
          { upsert: true }
        );

        console.log(`✅ [AngelOne] Silent authentication successful for client ${clientCode}.`);
        this.startWebSocket();
        return true;
      }

      console.warn('❌ [AngelOne] Silent authentication returned false:', res ? res.message : 'Unknown error');
      return false;
    } catch (error) {
      console.error('❌ [AngelOne] Silent authentication encountered error:', error);
      return false;
    }
  }

  /**
   * Automatically restores the last active session from MongoDB on server startup.
   */
  async restoreSession(): Promise<boolean> {
    console.log('🤖 [AngelOne] Startup recovery initiated. Searching for active session in MongoDB...');
    try {
      const session = await AngelOneSession.findOne({ isActive: true }).sort({ lastLoginTime: -1 });

      if (!session) {
        console.log('🤖 [AngelOne] No active session found in MongoDB. Manual login required.');
        return false;
      }

      console.log(`🤖 [AngelOne] Found session in DB for client ${session.clientCode}. Restoring to memory...`);
      
      // Restore properties
      this.activeClientCode = session.clientCode;
      this.feedToken = session.feedToken;
      this.sessionEstablished = session.sessionEstablished;
      this.isAuthenticated = true;

      // Sync tokens into the SmartAPI SDK instance
      this.smartApi.access_token = session.jwtToken;
      this.smartApi.refresh_token = session.refreshToken;

      // Validate the restored tokens via lightweight API ping
      console.log('🤖 [AngelOne] Validating restored session tokens...');
      const isValid = await this.checkSessionValid();

      if (isValid) {
        console.log(`✅ [AngelOne] Restored session for ${session.clientCode} is VALID. Reconnecting WebSocket...`);
        this.startWebSocket();
        return true;
      }

      // Restored token is invalid/expired. Try silent token refresh
      console.log('⚠️ [AngelOne] Restored access token is expired. Attempting token refresh via refreshToken...');
      const refreshSuccess = await this.refreshTokenFlow();
      if (refreshSuccess) {
        console.log(`✅ [AngelOne] Successfully refreshed expired session during restore for ${session.clientCode}.`);
        return true;
      }

      // Refresh token expired or failed. Attempt full silent re-authentication
      console.log('⚠️ [AngelOne] Token refresh failed. Attempting full silent re-authentication using credentials...');
      const reauthSuccess = await this.authenticate();
      if (reauthSuccess) {
        console.log(`✅ [AngelOne] Successfully re-authenticated session during restore for ${session.clientCode}.`);
        return true;
      }

      // All restore attempts failed. Invalidate active state
      console.error(`❌ [AngelOne] Startup recovery failed for ${session.clientCode}. Access revoked.`);
      this.isAuthenticated = false;
      session.websocketStatus = 'disconnected';
      await session.save();
      return false;
    } catch (error) {
      console.error('❌ [AngelOne] Startup recovery encountered an error:', error);
      return false;
    }
  }

  /**
   * Logs out the user from memory, marks the session inactive in MongoDB, and closes WebSocket.
   */
  async logout() {
    console.log('🤖 [AngelOne] Initiating thorough logout...');
    
    const clientCode = this.activeClientCode || env.ANGELONE_CLIENT_CODE;

    // 1. Clear local state IMMEDIATELY
    this.isAuthenticated = false;
    this.sessionEstablished = false;
    this.activeClientCode = '';
    this.feedToken = '';
    
    // 2. Mark session inactive in DB
    if (clientCode) {
      try {
        await AngelOneSession.findOneAndUpdate(
          { clientCode },
          { isActive: false, websocketStatus: 'disconnected' }
        );
        console.log(`✅ [AngelOne] DB Session marked inactive for client: ${clientCode}`);
      } catch (err) {
        console.error('⚠️ [AngelOne] Failed to mark DB session inactive:', err);
      }
    }

    // 3. Call API Logout if we had a token
    if (this.smartApi.access_token) {
      try {
        await this.smartApi.logout(clientCode);
        console.log('✅ [AngelOne] API session terminated.');
      } catch (e) {
        console.warn('⚠️ [AngelOne] Logout API call failed (session might already be dead):', e);
      }
    }

    this.smartApi.access_token = null;
    this.smartApi.refresh_token = null;
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.webSocket) {
      try {
        this.webSocket.close();
      } catch (e) {
        console.error('⚠️ [AngelOne] Error closing WebSocket:', e);
      } finally {
        this.webSocket = null;
      }
    }
    console.log('✅ [AngelOne] Application logout complete and WebSocket disconnected.');
  }

  /**
   * Establishes the WebSocket connection using standard reconnection and tick monitoring.
   */
  startWebSocket() {
    if (!this.isAuthenticated || !this.smartApi.access_token || !this.feedToken) {
      console.warn('🤖 [AngelOne] Cannot start WebSocket: Not fully authenticated or missing tokens.');
      return;
    }

    // Clear any existing socket
    if (this.webSocket) {
      try {
        this.webSocket.close();
      } catch (e) {}
    }

    console.log('🤖 [AngelOne] Initializing AngelOne WebSocketV2...');
    this.webSocket = new WebSocketV2({
      jwttoken: this.smartApi.access_token.startsWith('Bearer') ? this.smartApi.access_token : 'Bearer ' + this.smartApi.access_token,
      apikey: env.ANGELONE_API_KEY,
      clientcode: this.activeClientCode,
      feedtype: this.feedToken
    });

    this.webSocket.customError(); // Enable custom error handler

    this.webSocket.connect().then(() => {
      console.log('✅ [AngelOne] WebSocketV2 connected.');
      this.reconnectAttempts = 0; // Reset on successful connect
      this.lastTickTime = Date.now(); // Initialize heartbeat tick time
      this.updateDbWebsocketStatus('connected');
      
      // Subscribe to instruments
      const subscriptionPayload = {
        correlationID: 'abc1234567',
        action: 1, // Subscribe
        mode: 3, // SnapQuote (MODE.SnapQuote = 3)
        exchangeType: 1, // NSE CM (EXCHANGES.nse_cm = 1)
        tokens: ['26000', '26009'] // NIFTY and BANKNIFTY
      };

      console.log('🤖 [AngelOne] Subscribing to market data:', subscriptionPayload);
      this.webSocket.fetchData(subscriptionPayload);

      this.webSocket.on('tick', (receiveData: any) => {
        if (!receiveData) return;
        this.lastTickTime = Date.now(); // Record tick timestamp
        this.emit('market_data', receiveData);
      });
      
      // Launch tick heartbeat monitor
      this.startHeartbeatMonitor();

    }).catch((err: any) => {
      console.error('❌ [AngelOne] WebSocket Connection Error:', err);
      this.updateDbWebsocketStatus('disconnected');
      this.handleReconnect();
    });
  }

  private async updateDbWebsocketStatus(status: string) {
    if (this.activeClientCode) {
      try {
        await AngelOneSession.findOneAndUpdate(
          { clientCode: this.activeClientCode },
          { websocketStatus: status }
        );
      } catch (err) {
        // Silent error to prevent blocking execution
      }
    }
  }

  private handleReconnect() {
    if (!this.isAuthenticated) return;

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(5000 * Math.pow(2, this.reconnectAttempts - 1), 60000);
      console.log(`⚠️ [AngelOne] Attempting WebSocket reconnect in ${delay}ms (Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      
      if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = setTimeout(() => {
        this.startWebSocket();
      }, delay);
    } else {
      console.error('❌ [AngelOne] Max WebSocket reconnect attempts reached. Verifying session and re-authenticating...');
      this.ensureAuthenticated().then(success => {
        if (success) {
          console.log('✅ [AngelOne] Auto re-authenticated and WebSocket restarted.');
        } else {
          console.error('❌ [AngelOne] Auto re-authentication failed during WebSocket reconnect. Manual login required.');
        }
      });
    }
  }

  /**
   * Monitored ticks to ensure connection is actually delivering live feeds.
   * Auto recovers on silent dropouts or JWT expiration.
   */
  private startHeartbeatMonitor() {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    
    this.heartbeatInterval = setInterval(async () => {
      if (!this.isAuthenticated || !this.sessionEstablished) return;
      
      const timeSinceLastTick = Date.now() - this.lastTickTime;
      // If no ticks are received for 45 seconds during active session
      if (this.lastTickTime > 0 && timeSinceLastTick > 45000) {
        console.warn(`⚠️ [Heartbeat Monitor] No ticks received for ${Math.round(timeSinceLastTick/1000)}s. Checking session validity...`);
        const isValid = await this.checkSessionValid();
        
        if (!isValid) {
          console.error('❌ [Heartbeat Monitor] Session is invalid. Triggering recovery auth flow...');
          const success = await this.ensureAuthenticated();
          if (success) {
            console.log('✅ [Heartbeat Monitor] Recovered session and restarted WebSocket.');
          } else {
            console.error('❌ [Heartbeat Monitor] Session recovery failed.');
          }
        } else {
          console.log('ℹ️ [Heartbeat Monitor] Session is valid, but socket is silent. Re-initializing WebSocket...');
          this.startWebSocket();
        }
      }
    }, 30000); // Check every 30 seconds
  }

  async getHistoricalData(symbol: string): Promise<any[]> {
    const isReady = await this.ensureAuthenticated();
    if (!isReady) {
      console.warn('Cannot fetch historical data: Not authenticated.');
      return [];
    }

    try {
      // For Historical API, Angel One requires indices to be prefixed with '999'
      const symbolMap: Record<string, string> = {
        'NIFTY': '99926000',
        'BANKNIFTY': '99926009'
      };

      const token = symbolMap[symbol] || '99926000';
      const toDate = new Date();
      const fromDate = new Date();
      fromDate.setDate(toDate.getDate() - 3);

      const formatDate = (d: Date, time: string) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day} ${time}`;
      };

      const payload = {
        exchange: "NSE",
        symboltoken: token,
        interval: "ONE_MINUTE",
        fromdate: formatDate(fromDate, "09:15"),
        todate: formatDate(toDate, "15:30")
      };

      let res = await this.smartApi.getCandleData(payload);
      
      // Handle expired token or session issues — retry once after re-auth
      if (res && res.status === false) {
        console.warn('Historical API failed, re-authenticating...', res.message);
        const authSuccess = await this.ensureAuthenticated();
        if (authSuccess) {
           res = await this.smartApi.getCandleData(payload);
        }
      }

      if (res && res.status && res.data) {
        return res.data.map((candle: any[]) => ({
            timestamp: candle[0],
            open: candle[1],
            high: candle[2],
            low: candle[3],
            close: candle[4],
            volume: candle[5]
        }));
      }
      return [];
    } catch (e: any) {
      console.error('Failed to get historical data from Smart API', e);
      return [];
    }
  }

  async getOptionsData(): Promise<any[]> {
    if (!this.isAuthenticated) {
        console.warn('Cannot fetch options data: Not authenticated via UI yet.');
        return [];
    }

    // Fetch live market data for Nifty and BankNifty to calculate option strike prices
    try {
        const payload = {
            mode: "FULL",
            exchangeTokens: {
                "NSE": ["26000", "26009"] // Nifty and BankNifty
            }
        };
        const res = await this.smartApi.marketData(payload);
        
        let niftyLtp = 22000;
        let bankNiftyLtp = 46000;

        if (res && res.status && res.data && res.data.fetched && res.data.fetched.length > 0) {
            const niftyData = res.data.fetched.find((d: any) => d.symbolToken === "26000");
            const bankNiftyData = res.data.fetched.find((d: any) => d.symbolToken === "26009");
            if (niftyData) niftyLtp = niftyData.ltp;
            if (bankNiftyData) bankNiftyLtp = bankNiftyData.ltp;
        } else {
            return [];
        }

        // Construct response based on actual live LTP
        return [
            { id: '1', symbol: 'NIFTY', type: 'CE', strike: Math.round(niftyLtp/100)*100 + 100, entry: 150, target: 200, sl: 120, confidence: 85 },
            { id: '2', symbol: 'BANKNIFTY', type: 'PE', strike: Math.round(bankNiftyLtp/100)*100 - 200, entry: 300, target: 450, sl: 220, confidence: 90 }
        ];

    } catch (error) {
        console.error('Error fetching options data:', error);
        return [];
    }
  }

  async getDividendData(): Promise<any[]> {
    return [];
  }
}

export const angelOneService = new AngelOneService();
