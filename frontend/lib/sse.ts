/**
 * Server-Sent Events (SSE) client implementation
 * Used for real-time streaming of data from the server to the client
 */

export interface SSEOptions {
  onMessage: (data: any) => void;
  onError?: (error: Event) => void;
  onOpen?: (event: Event) => void;
  withCredentials?: boolean;
  retry?: number;
  headers?: Record<string, string>;
}

export class SSEClient {
  private eventSource: EventSource | null = null;
  private url: string;
  private options: SSEOptions;
  
  constructor(url: string, options: SSEOptions) {
    this.url = url;
    this.options = {
      withCredentials: false,
      retry: 3000,
      ...options,
    };
  }
  
  /**
   * Start the SSE connection
   */
  connect(): void {
    if (this.eventSource) {
      this.close();
    }
    
    this.eventSource = new EventSource(this.url, {
      withCredentials: this.options.withCredentials,
    });
    
    // Handle receiving a message
    this.eventSource.onmessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        this.options.onMessage(data);
      } catch (error) {
        // If it's not valid JSON, pass the raw data
        this.options.onMessage(event.data);
      }
    };
    
    // Handle errors
    this.eventSource.onerror = (event: Event) => {
      if (this.options.onError) {
        this.options.onError(event);
      }
      
      // Auto-reconnect is handled by the browser for EventSource
    };
    
    // Handle connection open
    this.eventSource.onopen = (event: Event) => {
      if (this.options.onOpen) {
        this.options.onOpen(event);
      }
    };
  }
  
  /**
   * Close the SSE connection
   */
  close(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }
  
  /**
   * Check if the connection is active
   */
  isConnected(): boolean {
    return !!this.eventSource && this.eventSource.readyState === EventSource.OPEN;
  }
}

/**
 * Create a new SSE client and start the connection
 */
export function createSSEConnection(url: string, options: SSEOptions): SSEClient {
  const client = new SSEClient(url, options);
  client.connect();
  return client;
}

export default SSEClient; 