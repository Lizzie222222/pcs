import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './useAuth';

export interface ConnectedUser {
  userId: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  currentActivity: 'idle' | 'viewing_dashboard' | 'reviewing_evidence' | 'editing_case_study' | 'editing_event' | 'managing_schools' | 'managing_users' | 'managing_resources';
  connectedAt: Date;
}

export interface DocumentLock {
  documentId: string;
  documentType: 'case_study' | 'event';
  lockedBy: string;
  lockedByName: string;
  lockedAt: Date;
  expiresAt: Date;
}

export interface ChatMessage {
  id: string;
  fromUserId: string;
  fromUserName: string;
  message: string;
  timestamp: Date;
  toUserId?: string;
}

interface WebSocketMessage {
  type: 'presence_update' | 'document_lock_request' | 'document_unlock' | 'chat_message' | 'conflict_warning' | 'typing_start' | 'typing_stop' | 'ping' | 'pong';
  payload?: any;
}

export interface TypingUser {
  userId: string;
  name: string;
}

export function useCollaboration() {
  const { user, isAuthenticated } = useAuth();
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [connectionState, setConnectionState] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [onlineUsers, setOnlineUsers] = useState<ConnectedUser[]>([]);
  const [documentLocks, setDocumentLocks] = useState<DocumentLock[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [conflictWarnings, setConflictWarnings] = useState<any[]>([]);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  
  const reconnectTimeoutRef = useRef<number | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const baseReconnectDelay = 1000; // 1 second

  const connect = useCallback(() => {
    if (!isAuthenticated || !user) {
      console.log('[Collaboration] Not authenticated, skipping connection');
      return;
    }

    if (ws?.readyState === WebSocket.OPEN || ws?.readyState === WebSocket.CONNECTING) {
      console.log('[Collaboration] Already connected or connecting');
      return;
    }

    setConnectionState('connecting');

    // Determine protocol (ws or wss) based on current page protocol
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    console.log('[Collaboration] Connecting to WebSocket:', wsUrl);

    try {
      const socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        console.log('[Collaboration] Connected to WebSocket');
        setConnectionState('connected');
        reconnectAttemptsRef.current = 0; // Reset reconnect attempts on successful connection
      };

      socket.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          handleMessage(message);
        } catch (error) {
          console.error('[Collaboration] Error parsing message:', error);
        }
      };

      socket.onerror = (error) => {
        console.error('[Collaboration] WebSocket error:', error);
      };

      socket.onclose = (event) => {
        console.log('[Collaboration] WebSocket closed:', event.code, event.reason);
        setConnectionState('disconnected');
        setWs(null);

        // Attempt to reconnect with exponential backoff
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = baseReconnectDelay * Math.pow(2, reconnectAttemptsRef.current);
          console.log(`[Collaboration] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = window.setTimeout(() => {
            reconnectAttemptsRef.current++;
            connect();
          }, delay);
        } else {
          console.log('[Collaboration] Max reconnect attempts reached');
        }
      };

      setWs(socket);
    } catch (error) {
      console.error('[Collaboration] Error creating WebSocket:', error);
      setConnectionState('disconnected');
    }
  }, [isAuthenticated, user, ws?.readyState]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (ws) {
      ws.close();
      setWs(null);
    }
    
    setConnectionState('disconnected');
    reconnectAttemptsRef.current = 0;
  }, [ws]);

  const handleMessage = useCallback((message: WebSocketMessage) => {
    switch (message.type) {
      case 'presence_update':
        handlePresenceUpdate(message.payload);
        break;
      
      case 'document_lock_request':
        handleDocumentLock(message.payload);
        break;
      
      case 'document_unlock':
        handleDocumentUnlock(message.payload);
        break;
      
      case 'chat_message':
        handleChatMessage(message.payload);
        break;
      
      case 'conflict_warning':
        handleConflictWarning(message.payload);
        break;
      
      case 'typing_start':
        handleTypingStart(message.payload);
        break;
      
      case 'typing_stop':
        handleTypingStop(message.payload);
        break;
      
      case 'pong':
        // Heartbeat response
        break;
      
      default:
        console.warn('[Collaboration] Unknown message type:', message.type);
    }
  }, []);

  const handlePresenceUpdate = useCallback((payload: any) => {
    const { action, user: updatedUser, onlineUsers: newOnlineUsers, userId, currentActivity } = payload;

    switch (action) {
      case 'connected':
        // Initial connection, set full online users list with deduplication
        if (newOnlineUsers) {
          // Deduplicate by userId to prevent duplicates
          const uniqueUsers = new Map();
          newOnlineUsers.forEach((u: any) => {
            uniqueUsers.set(u.userId, {
              ...u,
              connectedAt: new Date(u.connectedAt),
            });
          });
          setOnlineUsers(Array.from(uniqueUsers.values()));
        }
        break;
      
      case 'user_joined':
        if (updatedUser) {
          setOnlineUsers(prev => {
            // Check if user already exists
            const exists = prev.some(u => u.userId === updatedUser.userId);
            if (exists) {
              // Update existing user instead of adding duplicate
              return prev.map(u => 
                u.userId === updatedUser.userId 
                  ? { ...updatedUser, connectedAt: new Date(updatedUser.connectedAt || new Date()) }
                  : u
              );
            }
            // Add new user
            return [...prev, { ...updatedUser, connectedAt: new Date(updatedUser.connectedAt || new Date()) }];
          });
        }
        break;
      
      case 'user_left':
        if (userId) {
          setOnlineUsers(prev => prev.filter(u => u.userId !== userId));
        }
        break;
      
      case 'activity_changed':
        if (userId && currentActivity) {
          setOnlineUsers(prev => prev.map(u =>
            u.userId === userId ? { ...u, currentActivity } : u
          ));
        }
        break;
    }
  }, []);

  const handleDocumentLock = useCallback((payload: any) => {
    if (payload.action === 'locked' && payload.lock) {
      const lock = {
        ...payload.lock,
        lockedAt: new Date(payload.lock.lockedAt),
        expiresAt: new Date(payload.lock.expiresAt),
      };
      setDocumentLocks(prev => {
        const existing = prev.findIndex(l => 
          l.documentType === lock.documentType && l.documentId === lock.documentId
        );
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = lock;
          return updated;
        }
        return [...prev, lock];
      });
    } else if (payload.success && payload.lock) {
      // Lock acquired by current user
      const lock = {
        ...payload.lock,
        lockedAt: new Date(payload.lock.lockedAt),
        expiresAt: new Date(payload.lock.expiresAt),
      };
      setDocumentLocks(prev => {
        const existing = prev.findIndex(l => 
          l.documentType === lock.documentType && l.documentId === lock.documentId
        );
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = lock;
          return updated;
        }
        return [...prev, lock];
      });
    }
  }, []);

  const handleDocumentUnlock = useCallback((payload: any) => {
    const { documentId, documentType } = payload;
    if (documentId && documentType) {
      setDocumentLocks(prev => prev.filter(l => 
        !(l.documentType === documentType && l.documentId === documentId)
      ));
    }
  }, []);

  const handleChatMessage = useCallback((payload: ChatMessage) => {
    setChatMessages(prev => [...prev, {
      ...payload,
      timestamp: new Date(payload.timestamp),
    }]);
  }, []);

  const handleConflictWarning = useCallback((payload: any) => {
    setConflictWarnings(prev => [...prev, payload]);
    // Auto-clear warning after 5 seconds
    setTimeout(() => {
      setConflictWarnings(prev => prev.filter(w => w !== payload));
    }, 5000);
  }, []);

  const handleTypingStart = useCallback((payload: { userId: string; name: string }) => {
    setTypingUsers(prev => {
      // Check if user is already in the list
      const exists = prev.some(u => u.userId === payload.userId);
      if (exists) {
        return prev;
      }
      return [...prev, { userId: payload.userId, name: payload.name }];
    });
  }, []);

  const handleTypingStop = useCallback((payload: { userId: string }) => {
    setTypingUsers(prev => prev.filter(u => u.userId !== payload.userId));
  }, []);

  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    } else {
      console.warn('[Collaboration] WebSocket not connected, cannot send message');
    }
  }, [ws]);

  const sendPresenceUpdate = useCallback((currentActivity: ConnectedUser['currentActivity']) => {
    sendMessage({
      type: 'presence_update',
      payload: { currentActivity },
    });
  }, [sendMessage]);

  const requestDocumentLock = useCallback((documentId: string, documentType: 'case_study' | 'event') => {
    return new Promise<{ success: boolean; lock?: DocumentLock; locked?: boolean; lockedBy?: string; error?: string }>((resolve) => {
      const messageHandler = (event: MessageEvent) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          if (message.type === 'document_lock_request') {
            ws?.removeEventListener('message', messageHandler);
            resolve(message.payload);
          }
        } catch (error) {
          console.error('[Collaboration] Error handling lock response:', error);
        }
      };

      if (ws?.readyState === WebSocket.OPEN) {
        ws.addEventListener('message', messageHandler);
        sendMessage({
          type: 'document_lock_request',
          payload: { documentId, documentType },
        });

        // Timeout after 5 seconds
        setTimeout(() => {
          ws.removeEventListener('message', messageHandler);
          resolve({ success: false, error: 'Timeout' });
        }, 5000);
      } else {
        resolve({ success: false, error: 'Not connected' });
      }
    });
  }, [ws, sendMessage]);

  const releaseDocumentLock = useCallback((documentId: string, documentType: 'case_study' | 'event') => {
    sendMessage({
      type: 'document_unlock',
      payload: { documentId, documentType },
    });
  }, [sendMessage]);

  const sendChatMessage = useCallback((message: string, toUserId?: string) => {
    sendMessage({
      type: 'chat_message',
      payload: { message, toUserId },
    });
  }, [sendMessage]);

  const sendTypingIndicator = useCallback((isTyping: boolean) => {
    sendMessage({
      type: isTyping ? 'typing_start' : 'typing_stop',
      payload: {},
    });
  }, [sendMessage]);

  const getDocumentLock = useCallback((documentId: string, documentType: 'case_study' | 'event') => {
    return documentLocks.find(l => l.documentType === documentType && l.documentId === documentId);
  }, [documentLocks]);

  // Connect on mount if authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      connect();
    }

    return () => {
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user]);

  // Send ping every 25 seconds to keep connection alive
  useEffect(() => {
    if (connectionState === 'connected' && ws) {
      const pingInterval = setInterval(() => {
        sendMessage({ type: 'ping' });
      }, 25000);

      return () => clearInterval(pingInterval);
    }
  }, [connectionState, ws, sendMessage]);

  return {
    connectionState,
    onlineUsers,
    documentLocks,
    chatMessages,
    conflictWarnings,
    typingUsers,
    sendPresenceUpdate,
    requestDocumentLock,
    releaseDocumentLock,
    sendChatMessage,
    sendTypingIndicator,
    getDocumentLock,
    connect,
    disconnect,
  };
}
