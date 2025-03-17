import apiClient from '../api';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
}

export interface CreateMessageRequest {
  content: string;
  conversationId?: string;
  metadata?: Record<string, any>;
}

export interface StreamResponseOptions {
  temperature?: number;
  maxTokens?: number;
  includeSourceDocuments?: boolean;
}

export interface QueryOptions {
  temperature?: number;
  maxTokens?: number;
  includeSourceDocuments?: boolean;
}

export interface DocumentReference {
  id: string;
  title: string;
  url?: string;
  content: string;
  metadata?: Record<string, any>;
  relevanceScore?: number;
}

export interface QueryResponse {
  answer: string;
  sourceDocuments?: DocumentReference[];
  metadata?: Record<string, any>;
}

// Get the API base URL from env or use default
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';

/**
 * Chat and LLM interaction API services
 */
export const chatApi = {
  /**
   * Get all conversations for current user
   */
  getConversations: () => 
    apiClient.get<Conversation[]>('/chat/conversations'),
  
  /**
   * Get a specific conversation by ID
   */
  getConversation: (id: string) => 
    apiClient.get<Conversation>(`/chat/conversations/${id}`),
  
  /**
   * Create a new conversation
   */
  createConversation: (title?: string) => 
    apiClient.post<Conversation>('/chat/conversations', { title }),
  
  /**
   * Update a conversation title
   */
  updateConversationTitle: (id: string, title: string) => 
    apiClient.patch<Conversation>(`/chat/conversations/${id}`, { title }),
  
  /**
   * Delete a conversation
   */
  deleteConversation: (id: string) => 
    apiClient.delete(`/chat/conversations/${id}`),
  
  /**
   * Send a message and get a response
   */
  sendMessage: (message: CreateMessageRequest) => 
    apiClient.post<Message>('/chat/messages', message),
  
  /**
   * Query the system with RAG capabilities
   */
  query: (query: string, options?: QueryOptions) => 
    apiClient.post<QueryResponse>('/query/rag', { query, ...options }),
  
  /**
   * Get streaming URL for server-sent events
   */
  getStreamingUrl: (conversationId: string, messageContent: string, options?: StreamResponseOptions): string => {
    const params = new URLSearchParams();
    params.append('conversationId', conversationId);
    params.append('message', messageContent);
    
    if (options) {
      if (options.temperature) params.append('temperature', options.temperature.toString());
      if (options.maxTokens) params.append('maxTokens', options.maxTokens.toString());
      if (options.includeSourceDocuments) params.append('includeSourceDocuments', options.includeSourceDocuments.toString());
    }
    
    return `${API_BASE_URL}/chat/stream?${params.toString()}`;
  },
};

export default chatApi; 