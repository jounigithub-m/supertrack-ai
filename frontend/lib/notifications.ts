import { WebSocketClient, createWebSocketConnection } from './websocket';

/**
 * Notification types supported by the system
 */
export type NotificationType = 
  | 'info'
  | 'success'
  | 'warning'
  | 'error'
  | 'sync'
  | 'message'
  | 'update';

/**
 * Notification object structure
 */
export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  link?: string;
  data?: Record<string, any>;
}

/**
 * Notification event handlers
 */
export interface NotificationHandlers {
  onNotification?: (notification: Notification) => void;
  onStatusChange?: (connected: boolean) => void;
  onError?: (error: any) => void;
}

/**
 * Notification service configuration
 */
export interface NotificationServiceConfig {
  wsUrl: string;
  reconnectAttempts?: number;
  reconnectInterval?: number;
  autoConnect?: boolean;
}

/**
 * Notification service for handling real-time notifications
 */
export class NotificationService {
  private static instance: NotificationService;
  private wsClient: WebSocketClient | null = null;
  private config: NotificationServiceConfig;
  private handlers: NotificationHandlers = {};
  private notificationCache: Notification[] = [];
  private cacheLimit = 50;
  
  /**
   * Private constructor for singleton pattern
   */
  private constructor(config: NotificationServiceConfig) {
    this.config = {
      reconnectAttempts: 5,
      reconnectInterval: 3000,
      autoConnect: true,
      ...config
    };
    
    if (this.config.autoConnect) {
      this.connect();
    }
  }
  
  /**
   * Get the singleton instance of NotificationService
   */
  public static getInstance(config?: NotificationServiceConfig): NotificationService {
    if (!NotificationService.instance) {
      if (!config) {
        throw new Error('NotificationService must be initialized with a configuration first');
      }
      NotificationService.instance = new NotificationService(config);
    } else if (config) {
      // Update config if provided
      NotificationService.instance.updateConfig(config);
    }
    
    return NotificationService.instance;
  }
  
  /**
   * Update service configuration
   */
  private updateConfig(config: Partial<NotificationServiceConfig>): void {
    this.config = {
      ...this.config,
      ...config
    };
    
    // Reconnect if connection URL changed
    if (config.wsUrl && this.wsClient && this.wsClient.isConnected()) {
      this.reconnect();
    }
  }
  
  /**
   * Connect to the notification WebSocket
   */
  public connect(): Promise<void> {
    if (this.wsClient && this.wsClient.isConnected()) {
      return Promise.resolve();
    }
    
    return new Promise((resolve, reject) => {
      try {
        this.wsClient = createWebSocketConnection(this.config.wsUrl, {
          reconnectAttempts: this.config.reconnectAttempts,
          reconnectInterval: this.config.reconnectInterval,
          
          onOpen: () => {
            if (this.handlers.onStatusChange) {
              this.handlers.onStatusChange(true);
            }
            resolve();
          },
          
          onClose: () => {
            if (this.handlers.onStatusChange) {
              this.handlers.onStatusChange(false);
            }
          },
          
          onError: (error) => {
            if (this.handlers.onError) {
              this.handlers.onError(error);
            }
            reject(error);
          }
        });
        
        // Register handler for notifications
        this.wsClient.on('notification', (data: Notification) => {
          this.handleNotification(data);
        });
        
      } catch (error) {
        if (this.handlers.onError) {
          this.handlers.onError(error);
        }
        reject(error);
      }
    });
  }
  
  /**
   * Reconnect to the notification service
   */
  public reconnect(): Promise<void> {
    this.disconnect();
    return this.connect();
  }
  
  /**
   * Disconnect from the notification service
   */
  public disconnect(): void {
    if (this.wsClient) {
      this.wsClient.close();
      this.wsClient = null;
      
      if (this.handlers.onStatusChange) {
        this.handlers.onStatusChange(false);
      }
    }
  }
  
  /**
   * Check if connected to the notification service
   */
  public isConnected(): boolean {
    return !!this.wsClient && this.wsClient.isConnected();
  }
  
  /**
   * Set event handlers
   */
  public setHandlers(handlers: NotificationHandlers): void {
    this.handlers = {
      ...this.handlers,
      ...handlers
    };
  }
  
  /**
   * Handle a new notification
   */
  private handleNotification(notification: Notification): void {
    // Add to cache
    this.notificationCache.unshift(notification);
    
    // Limit cache size
    if (this.notificationCache.length > this.cacheLimit) {
      this.notificationCache.pop();
    }
    
    // Call notification handler if registered
    if (this.handlers.onNotification) {
      this.handlers.onNotification(notification);
    }
  }
  
  /**
   * Get cached notifications
   */
  public getNotifications(): Notification[] {
    return [...this.notificationCache];
  }
  
  /**
   * Mark notification as read
   */
  public markAsRead(id: string): void {
    const notification = this.notificationCache.find(n => n.id === id);
    if (notification) {
      notification.read = true;
      
      // Also send to server if connected
      if (this.wsClient && this.wsClient.isConnected()) {
        this.wsClient.send({ notificationId: id, read: true }, 'mark-read');
      }
    }
  }
  
  /**
   * Mark all notifications as read
   */
  public markAllAsRead(): void {
    this.notificationCache.forEach(notification => {
      notification.read = true;
    });
    
    // Also send to server if connected
    if (this.wsClient && this.wsClient.isConnected()) {
      this.wsClient.send({ allRead: true }, 'mark-all-read');
    }
  }
  
  /**
   * Get unread notification count
   */
  public getUnreadCount(): number {
    return this.notificationCache.filter(n => !n.read).length;
  }
}

/**
 * Initialize the notification service
 */
export function initNotificationService(config: NotificationServiceConfig): NotificationService {
  return NotificationService.getInstance(config);
}

export default NotificationService; 