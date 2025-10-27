import { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo, ReactNode } from 'react';

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
  type: 'presence_update' | 'document_lock_request' | 'document_unlock' | 'chat_message' | 'conflict_warning' | 'typing_start' | 'typing_stop' | 'ping' | 'pong' | 'idle_unlock' | 'start_viewing' | 'stop_viewing' | 'viewers_updated';
  payload?: any;
}

export interface TypingUser {
  userId: string;
  name: string;
}

export interface DocumentViewer {
  userId: string;
  name: string;
}

interface CollaborationContextType {
  connectionState: 'disconnected' | 'connecting' | 'connected';
  onlineUsers: ConnectedUser[];
  documentLocks: DocumentLock[];
  chatMessages: ChatMessage[];
  conflictWarnings: any[];
  typingUsers: TypingUser[];
  documentViewers: Map<string, DocumentViewer[]>;
  sendPresenceUpdate: (currentActivity: ConnectedUser['currentActivity'], userId?: string) => void;
  requestDocumentLock: (documentId: string, documentType: 'case_study' | 'event') => Promise<{ success: boolean; lock?: DocumentLock; locked?: boolean; lockedBy?: string; error?: string }>;
  releaseDocumentLock: (documentId: string, documentType: 'case_study' | 'event') => void;
  sendChatMessage: (message: string, toUserId?: string) => void;
  sendTypingIndicator: (isTyping: boolean) => void;
  getDocumentLock: (documentId: string, documentType: 'case_study' | 'event') => DocumentLock | undefined;
  startViewing: (documentId: string, documentType: 'case_study' | 'event' | 'evidence') => void;
  stopViewing: (documentId: string, documentType: 'case_study' | 'event' | 'evidence') => void;
  getViewersForDocument: (documentId: string, documentType: string) => DocumentViewer[];
}

const CollaborationContext = createContext<CollaborationContextType | null>(null);

interface CollaborationProviderProps {
  children: ReactNode;
  user: any;
  isAuthenticated: boolean;
}

export function CollaborationProvider({ children, user, isAuthenticated }: CollaborationProviderProps) {
  // Use ref for WebSocket to prevent dependency cascades
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const isConnectingRef = useRef(false);
  
  const maxReconnectAttempts = 5;
  const baseReconnectDelay = 1000;

  // State
  const [connectionState, setConnectionState] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [onlineUsers, setOnlineUsers] = useState<ConnectedUser[]>([]);
  const [documentLocks, setDocumentLocks] = useState<DocumentLock[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [conflictWarnings, setConflictWarnings] = useState<any[]>([]);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [documentViewers, setDocumentViewers] = useState<Map<string, DocumentViewer[]>>(new Map());

  // Stable message handlers using refs
  const handlePresenceUpdate = useCallback((payload: any) => {
    // Handle initial connection with full user list
    if (payload.onlineUsers && Array.isArray(payload.onlineUsers)) {
      const formattedUsers: ConnectedUser[] = payload.onlineUsers.map((u: any) => ({
        ...u,
        connectedAt: new Date(u.connectedAt),
      }));
      // Deduplicate by userId before setting
      const uniqueUsers: ConnectedUser[] = Array.from(
        new Map(formattedUsers.map((u: ConnectedUser) => [u.userId, u])).values()
      );
      setOnlineUsers(uniqueUsers);
    }
    // Handle regular presence updates
    else if (payload.users && Array.isArray(payload.users)) {
      const formattedUsers: ConnectedUser[] = payload.users.map((u: any) => ({
        ...u,
        connectedAt: new Date(u.connectedAt),
      }));
      // Deduplicate by userId before setting
      const uniqueUsers: ConnectedUser[] = Array.from(
        new Map(formattedUsers.map((u: ConnectedUser) => [u.userId, u])).values()
      );
      setOnlineUsers(uniqueUsers);
    }
    // Handle user joined
    else if (payload.action === 'user_joined' && payload.user) {
      setOnlineUsers(prev => {
        // Check if user already exists
        const exists = prev.some(u => u.userId === payload.user.userId);
        if (exists) return prev;
        return [...prev, {
          ...payload.user,
          connectedAt: new Date(payload.user.connectedAt || new Date()),
        }];
      });
    }
    // Handle user left
    else if (payload.action === 'user_left' && payload.userId) {
      setOnlineUsers(prev => prev.filter(u => u.userId !== payload.userId));
    }
    // Handle activity changed
    else if (payload.action === 'activity_changed' && payload.userId && payload.currentActivity) {
      console.log('[Collaboration] Activity changed:', payload.userId, payload.currentActivity);
      setOnlineUsers(prev => prev.map(u => 
        u.userId === payload.userId 
          ? { ...u, currentActivity: payload.currentActivity }
          : u
      ));
    }
  }, []);

  const handleDocumentLock = useCallback((payload: any) => {
    const { lock, success } = payload;
    if (success && lock) {
      const formattedLock = {
        ...lock,
        lockedAt: new Date(lock.lockedAt),
        expiresAt: new Date(lock.expiresAt),
      };
      setDocumentLocks(prev => {
        const filtered = prev.filter(l => 
          !(l.documentType === lock.documentType && l.documentId === lock.documentId)
        );
        return [...filtered, formattedLock];
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
    setTimeout(() => {
      setConflictWarnings(prev => prev.filter(w => w !== payload));
    }, 5000);
  }, []);

  const handleTypingStart = useCallback((payload: { userId: string; name: string }) => {
    setTypingUsers(prev => {
      const exists = prev.some(u => u.userId === payload.userId);
      if (exists) return prev;
      return [...prev, { userId: payload.userId, name: payload.name }];
    });
  }, []);

  const handleTypingStop = useCallback((payload: { userId: string }) => {
    setTypingUsers(prev => prev.filter(u => u.userId !== payload.userId));
  }, []);

  const handleViewersUpdated = useCallback((payload: { documentId: string; documentType: string; viewers: DocumentViewer[] }) => {
    const { documentId, documentType, viewers } = payload;
    const viewKey = `${documentType}:${documentId}`;
    
    setDocumentViewers(prev => {
      const next = new Map(prev);
      if (viewers.length === 0) {
        next.delete(viewKey);
      } else {
        next.set(viewKey, viewers);
      }
      return next;
    });
  }, []);

  // Message router
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
      case 'viewers_updated':
        handleViewersUpdated(message.payload);
        break;
    }
  }, [handlePresenceUpdate, handleDocumentLock, handleDocumentUnlock, handleChatMessage, handleConflictWarning, handleTypingStart, handleTypingStop, handleViewersUpdated]);

  // Stable sendMessage using socketRef
  const sendMessage = useCallback((message: WebSocketMessage) => {
    const socket = socketRef.current;
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    } else {
      console.warn('[Collaboration] WebSocket not connected, cannot send message');
    }
  }, []);

  // Connect function without ws dependency
  const connect = useCallback(() => {
    if (!isAuthenticated || !user) {
      console.log('[Collaboration] Not authenticated, skipping connection');
      return;
    }

    // Prevent multiple simultaneous connection attempts
    if (isConnectingRef.current) {
      console.log('[Collaboration] Connection already in progress');
      return;
    }

    const socket = socketRef.current;
    if (socket?.readyState === WebSocket.OPEN) {
      console.log('[Collaboration] Already connected');
      return;
    }
    
    if (socket?.readyState === WebSocket.CONNECTING) {
      console.log('[Collaboration] Connection in progress');
      return;
    }

    // Close any existing socket before creating a new one
    if (socket) {
      console.log('[Collaboration] Closing existing socket before reconnect');
      socket.close();
      socketRef.current = null;
    }

    isConnectingRef.current = true;
    setConnectionState('connecting');

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    console.log('[Collaboration] Connecting to WebSocket:', wsUrl);

    try {
      const newSocket = new WebSocket(wsUrl);

      newSocket.onopen = () => {
        console.log('[Collaboration] Connected to WebSocket');
        setConnectionState('connected');
        reconnectAttemptsRef.current = 0;
        isConnectingRef.current = false;
      };

      newSocket.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          handleMessage(message);
        } catch (error) {
          console.error('[Collaboration] Error parsing message:', error);
        }
      };

      newSocket.onerror = (error) => {
        console.error('[Collaboration] WebSocket error:', error);
        isConnectingRef.current = false;
      };

      newSocket.onclose = (event) => {
        console.log('[Collaboration] WebSocket closed:', event.code, event.reason);
        setConnectionState('disconnected');
        socketRef.current = null;
        isConnectingRef.current = false;

        // Clear any existing reconnect timeout
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }

        // Attempt to reconnect with exponential backoff
        if (reconnectAttemptsRef.current < maxReconnectAttempts && isAuthenticated) {
          const delay = baseReconnectDelay * Math.pow(2, reconnectAttemptsRef.current);
          console.log(`[Collaboration] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = window.setTimeout(() => {
            reconnectAttemptsRef.current++;
            connect();
          }, delay);
        } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          console.log('[Collaboration] Max reconnect attempts reached');
        }
      };

      socketRef.current = newSocket;
    } catch (error) {
      console.error('[Collaboration] Error creating WebSocket:', error);
      setConnectionState('disconnected');
      isConnectingRef.current = false;
    }
  }, [isAuthenticated, user, handleMessage]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    const socket = socketRef.current;
    if (socket) {
      socket.close();
      socketRef.current = null;
    }
    
    setConnectionState('disconnected');
    reconnectAttemptsRef.current = 0;
    isConnectingRef.current = false;
  }, []);

  // API methods using stable sendMessage
  const sendPresenceUpdate = useCallback((currentActivity: ConnectedUser['currentActivity'], userId?: string) => {
    console.log('[Collaboration] Sending presence update:', currentActivity, 'userId:', userId);
    
    // Update own status immediately for responsive UI
    if (userId) {
      setOnlineUsers(prev => {
        console.log('[Collaboration] Current online users:', prev.map(u => ({ userId: u.userId, activity: u.currentActivity })));
        const updated = prev.map(u => 
          u.userId === userId 
            ? { ...u, currentActivity }
            : u
        );
        console.log('[Collaboration] Updated online users:', updated.map(u => ({ userId: u.userId, activity: u.currentActivity })));
        return updated;
      });
    }
    
    sendMessage({
      type: 'presence_update',
      payload: { currentActivity },
    });
  }, [sendMessage]);

  const requestDocumentLock = useCallback((documentId: string, documentType: 'case_study' | 'event') => {
    return new Promise<{ success: boolean; lock?: DocumentLock; locked?: boolean; lockedBy?: string; error?: string }>((resolve) => {
      const socket = socketRef.current;
      
      const messageHandler = (event: MessageEvent) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          if (message.type === 'document_lock_request') {
            socket?.removeEventListener('message', messageHandler);
            resolve(message.payload);
          }
        } catch (error) {
          console.error('[Collaboration] Error handling lock response:', error);
        }
      };

      if (socket?.readyState === WebSocket.OPEN) {
        socket.addEventListener('message', messageHandler);
        sendMessage({
          type: 'document_lock_request',
          payload: { documentId, documentType },
        });

        setTimeout(() => {
          socket.removeEventListener('message', messageHandler);
          resolve({ success: false, error: 'Timeout' });
        }, 5000);
      } else {
        resolve({ success: false, error: 'Not connected' });
      }
    });
  }, [sendMessage]);

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

  const startViewing = useCallback((documentId: string, documentType: 'case_study' | 'event' | 'evidence') => {
    if (connectionState !== 'connected') {
      console.warn('[Collaboration] Cannot start viewing - not connected');
      return;
    }
    
    sendMessage({
      type: 'start_viewing',
      payload: { documentId, documentType },
    });
  }, [connectionState, sendMessage]);

  const stopViewing = useCallback((documentId: string, documentType: 'case_study' | 'event' | 'evidence') => {
    if (connectionState !== 'connected') {
      console.warn('[Collaboration] Cannot stop viewing - not connected');
      return;
    }
    
    sendMessage({
      type: 'stop_viewing',
      payload: { documentId, documentType },
    });
  }, [connectionState, sendMessage]);

  const getViewersForDocument = useCallback((documentId: string, documentType: string) => {
    const viewKey = `${documentType}:${documentId}`;
    return documentViewers.get(viewKey) || [];
  }, [documentViewers]);

  // Connect on mount if authenticated
  // Use userId to prevent reconnections when user object identity changes
  const userId = user?.id;
  useEffect(() => {
    if (isAuthenticated && userId) {
      connect();
    }

    return () => {
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, userId]);

  // Send ping every 25 seconds to keep connection alive
  useEffect(() => {
    if (connectionState === 'connected') {
      const pingInterval = setInterval(() => {
        sendMessage({ type: 'ping' });
      }, 25000);

      return () => clearInterval(pingInterval);
    }
  }, [connectionState, sendMessage]);

  // Idle detection: auto-unlock documents after 10 minutes of inactivity
  useEffect(() => {
    if (connectionState !== 'connected' || !user) {
      return;
    }

    let idleTimer: NodeJS.Timeout | null = null;
    let activityDebounceTimer: NodeJS.Timeout | null = null;

    const resetIdleTimer = () => {
      if (activityDebounceTimer) {
        clearTimeout(activityDebounceTimer);
      }

      activityDebounceTimer = setTimeout(() => {
        if (idleTimer) {
          clearTimeout(idleTimer);
        }

        idleTimer = setTimeout(() => {
          console.log('[Collaboration] User idle for 10 minutes, releasing locks...');
          
          const socket = socketRef.current;
          if (socket?.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({
              type: 'idle_unlock',
              payload: { userId: user.id }
            }));
          }
        }, 600000); // 10 minutes
      }, 5000); // 5 second debounce
    };

    const events = ['mousemove', 'keydown', 'mousedown', 'scroll'];
    events.forEach(event => {
      window.addEventListener(event, resetIdleTimer);
    });

    resetIdleTimer();

    return () => {
      if (idleTimer) clearTimeout(idleTimer);
      if (activityDebounceTimer) clearTimeout(activityDebounceTimer);
      events.forEach(event => {
        window.removeEventListener(event, resetIdleTimer);
      });
    };
  }, [connectionState, user]);

  const value: CollaborationContextType = useMemo(() => ({
    connectionState,
    onlineUsers,
    documentLocks,
    chatMessages,
    conflictWarnings,
    typingUsers,
    documentViewers,
    sendPresenceUpdate,
    requestDocumentLock,
    releaseDocumentLock,
    sendChatMessage,
    sendTypingIndicator,
    getDocumentLock,
    startViewing,
    stopViewing,
    getViewersForDocument,
  }), [
    connectionState,
    onlineUsers,
    documentLocks,
    chatMessages,
    conflictWarnings,
    typingUsers,
    documentViewers,
    sendPresenceUpdate,
    requestDocumentLock,
    releaseDocumentLock,
    sendChatMessage,
    sendTypingIndicator,
    getDocumentLock,
    startViewing,
    stopViewing,
    getViewersForDocument,
  ]);

  return (
    <CollaborationContext.Provider value={value}>
      {children}
    </CollaborationContext.Provider>
  );
}

export function useCollaboration() {
  const context = useContext(CollaborationContext);
  if (!context) {
    throw new Error('useCollaboration must be used within a CollaborationProvider');
  }
  return context;
}
