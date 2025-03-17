/**
 * WebSocket client implementation for real-time bidirectional communication
 */

export type MessageHandler = (data: any) => void;

export interface WebSocketOptions {
  onOpen?: (event: Event) => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (event: Event) => void;
  reconnectAttempts?: number;
  reconnectInterval?: number;
  protocols?: string | string[];
}

export class WebSocketClient {
  private socket: WebSocket | null = null;
  private url: string;
  private options: WebSocketOptions;
  private messageHandlers: Map<string, Set<MessageHandler>> = new Map();
  private reconnectCount = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isConnecting = false;
  private manualClose = false;
  
  constructor(url: string, options: WebSocketOptions = {}) {
    this.url = url;
    this.options = {
      reconnectAttempts: 5,
      reconnectInterval: 2000,
      ...options
    };
  }
  
  /**
   * Connect to the WebSocket server
   */
  connect(): Promise<WebSocket> {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return Promise.resolve(this.socket);
    }
    
    if (this.isConnecting) {
      return new Promise((resolve, reject) => {
        const checkInterval = setInterval(() => {
          if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            clearInterval(checkInterval);
            resolve(this.socket);
          } else if (!this.isConnecting) {
            clearInterval(checkInterval);
            reject(new Error('Connection failed'));
          }
        }, 100);
      });
    }
    
    this.isConnecting = true;
    this.manualClose = false;
    
    return new Promise((resolve, reject) => {
      try {
        this.socket = new WebSocket(this.url, this.options.protocols);
        
        // Handle socket open
        this.socket.onopen = (event) => {
          this.isConnecting = false;
          this.reconnectCount = 0;
          
          if (this.options.onOpen) {
            this.options.onOpen(event);
          }
          
          resolve(this.socket!);
        };
        
        // Handle socket close
        this.socket.onclose = (event) => {
          this.isConnecting = false;
          
          if (this.options.onClose) {
            this.options.onClose(event);
          }
          
          // Attempt to reconnect unless manually closed
          if (!this.manualClose) {
            this.attemptReconnect();
          }
        };
        
        // Handle socket errors
        this.socket.onerror = (event) => {
          if (this.options.onError) {
            this.options.onError(event);
          }
          
          if (this.isConnecting) {
            this.isConnecting = false;
            reject(new Error('Connection error'));
          }
        };
        
        // Handle incoming messages
        this.socket.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            const type = message.type || 'message';
            
            // Dispatch to registered handlers for this message type
            if (this.messageHandlers.has(type)) {
              const handlers = this.messageHandlers.get(type);
              if (handlers) {
                handlers.forEach(handler => handler(message.data || message));
              }
            }
            
            // Also dispatch to general message handlers
            if (type !== 'message' && this.messageHandlers.has('message')) {
              const handlers = this.messageHandlers.get('message');
              if (handlers) {
                handlers.forEach(handler => handler(message));
              }
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
            
            // If it's not valid JSON, dispatch as raw data to default handlers
            if (this.messageHandlers.has('message')) {
              const handlers = this.messageHandlers.get('message');
              if (handlers) {
                handlers.forEach(handler => handler(event.data));
              }
            }
          }
        };
      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }
  
  /**
   * Close the WebSocket connection
   */
  close(code?: number, reason?: string): void {
    this.manualClose = true;
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.socket) {
      try {
        this.socket.close(code, reason);
      } catch (error) {
        console.error('Error closing WebSocket:', error);
      } finally {
        this.socket = null;
      }
    }
    
    this.isConnecting = false;
  }
  
  /**
   * Send a message through the WebSocket
   */
  send(data: any, type?: string): boolean {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return false;
    }
    
    try {
      const message = type 
        ? JSON.stringify({ type, data }) 
        : (typeof data === 'string' ? data : JSON.stringify(data));
      
      this.socket.send(message);
      return true;
    } catch (error) {
      console.error('Error sending WebSocket message:', error);
      return false;
    }
  }
  
  /**
   * Subscribe to a specific message type
   */
  on(type: string, handler: MessageHandler): () => void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, new Set());
    }
    
    const handlers = this.messageHandlers.get(type);
    handlers?.add(handler);
    
    // Return unsubscribe function
    return () => {
      const currentHandlers = this.messageHandlers.get(type);
      if (currentHandlers) {
        currentHandlers.delete(handler);
        if (currentHandlers.size === 0) {
          this.messageHandlers.delete(type);
        }
      }
    };
  }
  
  /**
   * Check if the connection is active
   */
  isConnected(): boolean {
    return !!this.socket && this.socket.readyState === WebSocket.OPEN;
  }
  
  /**
   * Attempt to reconnect to the server
   */
  private attemptReconnect(): void {
    if (this.manualClose || this.isConnecting || this.reconnectTimer) {
      return;
    }
    
    if (this.reconnectCount >= (this.options.reconnectAttempts || 5)) {
      console.warn('Maximum reconnection attempts reached');
      return;
    }
    
    this.reconnectCount++;
    const delay = this.options.reconnectInterval || 2000;
    
    console.log(`Attempting to reconnect (${this.reconnectCount}/${this.options.reconnectAttempts})...`);
    
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect().catch(() => {
        // Connection failed, the close handler will trigger another reconnect
      });
    }, delay);
  }
}

/**
 * Create a WebSocket connection 
 */
export function createWebSocketConnection(
  url: string, 
  options?: WebSocketOptions
): WebSocketClient {
  const client = new WebSocketClient(url, options);
  client.connect().catch(error => {
    console.error('Initial WebSocket connection failed:', error);
  });
  return client;
}

export default WebSocketClient; 