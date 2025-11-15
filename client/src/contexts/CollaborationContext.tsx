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
  type: 'presence_update' | 'document_lock_request' | 'document_unlock' | 'chat_message' | 'conflict_warning' | 'typing_start' | 'typing_stop' | 'ping' | 'pong' | 'idle_unlock' | 'start_viewing' | 'stop_viewing' | 'viewers_updated' | 'notification_update';
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
  isIdleDisconnected: boolean;
  onNotificationUpdate: (callback: () => void) => () => void;
  reconnect: () => void;
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
  const messageHandlerRef = useRef<((message: WebSocketMessage) => void) | null>(null);
  const hasInitiatedConnectionRef = useRef(false);
  // Track userId in a ref to prevent reconnections when user object reference changes
  const userIdRef = useRef<string | undefined>(undefined);
  // Track whether we should maintain the connection (false when page is intentionally hidden or user logged out)
  const shouldMaintainConnectionRef = useRef(true);
  // Track idle timeout
  const idleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityTimeRef = useRef<number>(Date.now());
  // Track notification update callbacks
  const notificationCallbacksRef = useRef<Set<() => void>>(new Set());
  
  const maxReconnectAttempts = 5;
  const baseReconnectDelay = 1000;
  const idleTimeoutDuration = 30 * 60 * 1000; // 30 minutes in milliseconds

  // State
  const [connectionState, setConnectionState] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [onlineUsers, setOnlineUsers] = useState<ConnectedUser[]>([]);
  const [documentLocks, setDocumentLocks] = useState<DocumentLock[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [conflictWarnings, setConflictWarnings] = useState<any[]>([]);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [documentViewers, setDocumentViewers] = useState<Map<string, DocumentViewer[]>>(new Map());
  const [isIdleDisconnected, setIsIdleDisconnected] = useState(false);

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
      // Merge with existing state to preserve any local updates that haven't been broadcast yet
      setOnlineUsers(prev => {
        if (prev.length === 0) {
          // First time receiving users, just set them
          return uniqueUsers;
        }
        // Merge: prefer local activity if it was recently updated (within last 2 seconds)
        const now = Date.now();
        return uniqueUsers.map(serverUser => {
          const localUser = prev.find(u => u.userId === serverUser.userId);
          // If we have a local version and it's different, keep the local one briefly
          if (localUser && localUser.currentActivity !== serverUser.currentActivity) {
            console.log('[Collaboration] Preserving local activity for', serverUser.userId, ':', localUser.currentActivity);
            return localUser;
          }
          return serverUser;
        });
      });
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

  const handleNotificationUpdate = useCallback(() => {
    // Trigger all registered notification callbacks
    notificationCallbacksRef.current.forEach(callback => callback());
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
      case 'notification_update':
        handleNotificationUpdate();
        break;
    }
  }, [handlePresenceUpdate, handleDocumentLock, handleDocumentUnlock, handleChatMessage, handleConflictWarning, handleTypingStart, handleTypingStop, handleViewersUpdated, handleNotificationUpdate]);

  // Update the message handler ref whenever handleMessage changes
  useEffect(() => {
    messageHandlerRef.current = handleMessage;
  }, [handleMessage]);

  // Stable sendMessage using socketRef
  const sendMessage = useCallback((message: WebSocketMessage) => {
    const socket = socketRef.current;
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    } else {
      console.warn('[Collaboration] WebSocket not connected, cannot send message');
    }
  }, []);

  // Connect function - stable, only depends on auth state
  const connect = useCallback(() => {
    if (!isAuthenticated) {
      console.log('[Collaboration] Not authenticated, skipping connection');
      return;
    }

    // Only allow admin and partner users to connect to WebSocket
    // This prevents teachers from making connection attempts that will be rejected
    if (!user?.isAdmin && user?.role !== 'admin' && user?.role !== 'partner') {
      console.log('[Collaboration] Non-admin user, skipping WebSocket connection');
      return;
    }

    // Prevent multiple simultaneous connection attempts - set flag immediately to prevent race conditions
    if (isConnectingRef.current) {
      console.log('[Collaboration] Connection already in progress');
      return;
    }
    isConnectingRef.current = true;

    const socket = socketRef.current;
    if (socket?.readyState === WebSocket.OPEN) {
      console.log('[Collaboration] Already connected');
      isConnectingRef.current = false;
      return;
    }
    
    if (socket?.readyState === WebSocket.CONNECTING) {
      console.log('[Collaboration] Connection in progress');
      isConnectingRef.current = false;
      return;
    }

    // Close any existing socket before creating a new one
    if (socket) {
      console.log('[Collaboration] Closing existing socket before reconnect');
      socket.close();
      // Don't set to null yet - keep the old socket reference to prevent race conditions
    }

    setConnectionState('connecting');

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    console.log('[Collaboration] Connecting to WebSocket:', wsUrl);

    try {
      const newSocket = new WebSocket(wsUrl);
      
      // Set the socket ref immediately to prevent race conditions
      socketRef.current = newSocket;

      newSocket.onopen = () => {
        console.log('[Collaboration] Connected to WebSocket');
        setConnectionState('connected');
        reconnectAttemptsRef.current = 0;
        isConnectingRef.current = false;
      };

      newSocket.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          messageHandlerRef.current?.(message);
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

        // Don't reconnect if server intentionally closed the connection (code 1000)
        // This happens when a new connection replaces this one
        if (event.code === 1000 && event.reason === 'New connection established') {
          console.log('[Collaboration] Connection replaced by new one, not reconnecting');
          return;
        }

        // Don't reconnect if server rejected due to permissions (code 1008)
        // This happens when non-admin users try to connect to admin-only WebSocket
        if (event.code === 1008) {
          console.log('[Collaboration] Connection rejected due to insufficient permissions, not reconnecting');
          shouldMaintainConnectionRef.current = false; // Prevent any future reconnection attempts
          return;
        }

        // Only attempt to reconnect if still authenticated AND connection should be maintained
        // This prevents reconnection when: (1) user is not logged in, (2) page is intentionally hidden
        if (!isAuthenticated || !shouldMaintainConnectionRef.current) {
          console.log('[Collaboration] Not reconnecting - connection on hold (user logged out or page hidden)');
          return;
        }

        // Attempt to reconnect with exponential backoff
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
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
    } catch (error) {
      console.error('[Collaboration] Error creating WebSocket:', error);
      setConnectionState('disconnected');
      isConnectingRef.current = false;
    }
  }, [isAuthenticated, user]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    // Clear idle timeout when disconnecting
    if (idleTimeoutRef.current) {
      clearTimeout(idleTimeoutRef.current);
      idleTimeoutRef.current = null;
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

  // Reset idle timer whenever there's user activity
  const resetIdleTimer = useCallback(() => {
    lastActivityTimeRef.current = Date.now();
    
    // Clear existing idle timeout
    if (idleTimeoutRef.current) {
      clearTimeout(idleTimeoutRef.current);
    }
    
    // Set new idle timeout
    idleTimeoutRef.current = setTimeout(() => {
      const socket = socketRef.current;
      if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
        console.log('[Collaboration] User idle for 30 minutes, disconnecting...');
        shouldMaintainConnectionRef.current = false;
        setIsIdleDisconnected(true);
        disconnect();
        hasInitiatedConnectionRef.current = false;
      }
    }, idleTimeoutDuration);
  }, [disconnect, idleTimeoutDuration]);

  // Manual reconnect function (for when user clicks reconnect button)
  const reconnect = useCallback(() => {
    if (isAuthenticated && userIdRef.current) {
      console.log('[Collaboration] Manual reconnect requested');
      shouldMaintainConnectionRef.current = true;
      setIsIdleDisconnected(false);
      hasInitiatedConnectionRef.current = true;
      reconnectAttemptsRef.current = 0;
      connect();
    }
  }, [isAuthenticated, connect]);

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

  // Subscribe to notification updates via WebSocket
  const onNotificationUpdate = useCallback((callback: () => void) => {
    notificationCallbacksRef.current.add(callback);
    return () => {
      notificationCallbacksRef.current.delete(callback);
    };
  }, []);

  // Update userId ref when user changes (used for visibility handling)
  useEffect(() => {
    userIdRef.current = user?.id;
  }, [user?.id]);

  // Connect on mount if authenticated - FIXED: depends on isAuthenticated and user?.id, but uses ref checks to prevent duplicate connections
  useEffect(() => {
    // If user logged out, immediately disconnect and stop maintaining connection
    if (!isAuthenticated) {
      shouldMaintainConnectionRef.current = false;
      if (hasInitiatedConnectionRef.current || socketRef.current) {
        console.log('[Collaboration] User logged out, disconnecting WebSocket');
        hasInitiatedConnectionRef.current = false;
        disconnect();
      }
      return;
    }

    // User is authenticated - resume maintaining connection
    shouldMaintainConnectionRef.current = true;

    // If authenticated but no userId yet, wait for it
    const currentUserId = user?.id;
    if (!currentUserId) {
      console.log('[Collaboration] Authenticated but no userId yet, waiting...');
      return;
    }

    // Check if we should connect
    const socket = socketRef.current;
    const isConnectedOrConnecting = socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING);
    
    // Only connect if we haven't already initiated a connection
    // This prevents duplicate connections when user object reference changes but id stays the same
    if (!hasInitiatedConnectionRef.current && !isConnectedOrConnecting) {
      hasInitiatedConnectionRef.current = true;
      console.log('[Collaboration] Initiating connection for user:', currentUserId);
      connect();
    } else if (isConnectedOrConnecting) {
      console.log('[Collaboration] Already connected or connecting, skipping duplicate connection attempt');
    }

    // Cleanup only on unmount (logout is handled above in the effect body)
    return () => {
      console.log('[Collaboration] Component unmounting, disconnecting WebSocket');
      shouldMaintainConnectionRef.current = false;
      hasInitiatedConnectionRef.current = false;
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user?.id]);

  // Disconnect when user switches tabs to save money on WebSocket connections (with delay to avoid disconnecting during brief switches)
  useEffect(() => {
    let hideTimeout: NodeJS.Timeout | null = null;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Clear any existing timeout first to avoid multiple timers
        if (hideTimeout) {
          clearTimeout(hideTimeout);
          hideTimeout = null;
        }
        
        // User switched tabs or minimized window - wait 30 seconds before disconnecting
        // This prevents disconnecting during brief tab switches
        hideTimeout = setTimeout(() => {
          const socket = socketRef.current;
          if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
            console.log('[Collaboration] Page hidden for 30s, disconnecting WebSocket to save resources');
            shouldMaintainConnectionRef.current = false; // Prevent automatic reconnection
            disconnect();
            hasInitiatedConnectionRef.current = false;
          }
        }, 30000); // 30 second delay
      } else {
        // User returned to tab - cancel any pending disconnect
        if (hideTimeout) {
          clearTimeout(hideTimeout);
          hideTimeout = null;
        }
        
        // Resume maintaining connection
        shouldMaintainConnectionRef.current = true;
        
        // Reconnect if needed
        if (isAuthenticated && userIdRef.current) {
          const socket = socketRef.current;
          const isConnected = socket && socket.readyState === WebSocket.OPEN;
          if (!isConnected && !hasInitiatedConnectionRef.current) {
            console.log('[Collaboration] Page visible again, reconnecting WebSocket');
            hasInitiatedConnectionRef.current = true;
            connect();
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (hideTimeout) {
        clearTimeout(hideTimeout);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  // Send ping every 25 seconds to keep connection alive
  useEffect(() => {
    if (connectionState === 'connected') {
      const pingInterval = setInterval(() => {
        sendMessage({ type: 'ping' });
      }, 25000);

      return () => clearInterval(pingInterval);
    }
  }, [connectionState, sendMessage]);

  // Track user activity and reset idle timer for WebSocket disconnect (30 minutes)
  useEffect(() => {
    if (connectionState !== 'connected') {
      return;
    }

    // Start the idle timer when connected
    resetIdleTimer();

    // Activity events to track
    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    
    const handleActivity = () => {
      // Reset idle timer on any user activity
      resetIdleTimer();
    };

    // Add event listeners
    activityEvents.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // Cleanup
    return () => {
      activityEvents.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      
      // Clear idle timeout when disconnecting
      if (idleTimeoutRef.current) {
        clearTimeout(idleTimeoutRef.current);
        idleTimeoutRef.current = null;
      }
    };
  }, [connectionState, resetIdleTimer]);

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
    isIdleDisconnected,
    onNotificationUpdate,
    reconnect,
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
    isIdleDisconnected,
    onNotificationUpdate,
    reconnect,
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
