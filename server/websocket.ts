import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import type { IncomingMessage } from 'http';
import { parse as parseCookie } from 'cookie';
import { storage } from './storage';

// Type definitions for WebSocket messages
export interface WebSocketMessage {
  type: 'presence_update' | 'document_lock_request' | 'document_unlock' | 'chat_message' | 'conflict_warning' | 'ping' | 'pong';
  payload?: any;
}

export interface ConnectedUser {
  userId: string;
  socketId: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  currentActivity: 'idle' | 'viewing_dashboard' | 'reviewing_evidence' | 'editing_case_study' | 'editing_event' | 'managing_schools' | 'managing_users' | 'managing_resources';
  connectedAt: Date;
  lastActivity: Date;
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
  toUserId?: string; // Optional: for direct messages
}

// Store connected clients and their metadata
const connectedClients = new Map<WebSocket, ConnectedUser>();
const userSocketMap = new Map<string, WebSocket>(); // userId -> WebSocket
const documentLocks = new Map<string, DocumentLock>(); // ${documentType}:${documentId} -> DocumentLock

// Heartbeat interval (30 seconds)
const HEARTBEAT_INTERVAL = 30000;
// Lock expiration time (5 minutes)
const LOCK_EXPIRATION_TIME = 5 * 60 * 1000;

/**
 * Initialize WebSocket server and attach it to HTTP server
 */
export function initializeWebSocket(httpServer: Server): WebSocketServer {
  const wss = new WebSocketServer({ 
    server: httpServer,
    path: '/ws',
  });

  console.log('[WebSocket] Server initialized on path /ws');

  wss.on('connection', async (ws: WebSocket, req: IncomingMessage) => {
    try {
      // Authenticate user from session
      const user = await authenticateWebSocket(req);
      
      if (!user) {
        console.log('[WebSocket] Unauthenticated connection attempt');
        ws.close(1008, 'Authentication required');
        return;
      }

      // Generate socket ID
      const socketId = generateSocketId();

      // Create connected user object
      const connectedUser: ConnectedUser = {
        userId: user.id,
        socketId,
        email: user.email || undefined,
        firstName: user.firstName || undefined,
        lastName: user.lastName || undefined,
        currentActivity: 'idle',
        connectedAt: new Date(),
        lastActivity: new Date(),
      };

      // Store connection
      connectedClients.set(ws, connectedUser);
      userSocketMap.set(user.id, ws);

      console.log(`[WebSocket] User connected: ${user.email} (${user.id})`);

      // Send welcome message with current state
      sendToClient(ws, {
        type: 'presence_update',
        payload: {
          action: 'connected',
          user: connectedUser,
          onlineUsers: getOnlineUsers(),
          documentLocks: Array.from(documentLocks.values()),
        },
      });

      // Broadcast presence update to all other clients
      broadcastToOthers(ws, {
        type: 'presence_update',
        payload: {
          action: 'user_joined',
          user: {
            userId: connectedUser.userId,
            email: connectedUser.email,
            firstName: connectedUser.firstName,
            lastName: connectedUser.lastName,
            currentActivity: connectedUser.currentActivity,
          },
        },
      });

      // Set up message handler
      ws.on('message', (data: Buffer) => {
        handleMessage(ws, data);
      });

      // Set up close handler
      ws.on('close', () => {
        handleDisconnect(ws);
      });

      // Set up error handler
      ws.on('error', (error) => {
        console.error('[WebSocket] Error:', error);
      });

      // Set up ping-pong for heartbeat
      ws.on('pong', () => {
        const client = connectedClients.get(ws);
        if (client) {
          client.lastActivity = new Date();
        }
      });

    } catch (error) {
      console.error('[WebSocket] Connection error:', error);
      ws.close(1011, 'Internal server error');
    }
  });

  // Start heartbeat interval
  const heartbeatInterval = setInterval(() => {
    heartbeat(wss);
  }, HEARTBEAT_INTERVAL);

  // Clean up on server close
  wss.on('close', () => {
    clearInterval(heartbeatInterval);
  });

  // Start document lock cleanup interval
  const lockCleanupInterval = setInterval(() => {
    cleanupExpiredLocks();
  }, 60000); // Check every minute

  return wss;
}

/**
 * Authenticate WebSocket connection using session cookie
 */
async function authenticateWebSocket(req: IncomingMessage): Promise<any> {
  try {
    // Parse cookies from request
    const cookies = req.headers.cookie ? parseCookie(req.headers.cookie) : {};
    const sessionCookie = cookies['connect.sid'];

    if (!sessionCookie) {
      return null;
    }

    // Decode session ID (remove 's:' prefix and extract ID before signature)
    const decodedSessionId = decodeURIComponent(sessionCookie).replace(/^s:/, '').split('.')[0];

    // Get session store from auth.ts
    const { getSessionStore } = await import('./auth');
    const sessionStore = getSessionStore();

    // If no session store (using default MemoryStore), we can't access it directly
    if (!sessionStore) {
      console.warn('[WebSocket] Session store not available (using MemoryStore)');
      return null;
    }

    // Retrieve session from store
    return new Promise((resolve) => {
      sessionStore.get(decodedSessionId, async (err: any, session: any) => {
        if (err || !session) {
          console.log('[WebSocket] Session not found or error:', err);
          return resolve(null);
        }

        // Extract user ID from session
        if (session.passport && session.passport.user) {
          const userId = session.passport.user;
          const user = await storage.getUser(userId);
          resolve(user);
        } else {
          resolve(null);
        }
      });
    });
  } catch (error) {
    console.error('[WebSocket] Authentication error:', error);
    return null;
  }
}

/**
 * Handle incoming WebSocket messages
 */
function handleMessage(ws: WebSocket, data: Buffer) {
  try {
    const client = connectedClients.get(ws);
    if (!client) {
      return;
    }

    // Parse message
    const message: WebSocketMessage = JSON.parse(data.toString());

    // Update last activity
    client.lastActivity = new Date();

    // Route to appropriate handler
    switch (message.type) {
      case 'presence_update':
        handlePresenceUpdate(ws, client, message.payload);
        break;
      
      case 'document_lock_request':
        handleDocumentLockRequest(ws, client, message.payload);
        break;
      
      case 'document_unlock':
        handleDocumentUnlock(ws, client, message.payload);
        break;
      
      case 'chat_message':
        handleChatMessage(ws, client, message.payload);
        break;
      
      case 'ping':
        sendToClient(ws, { type: 'pong' });
        break;
      
      default:
        console.warn('[WebSocket] Unknown message type:', message.type);
    }
  } catch (error) {
    console.error('[WebSocket] Error handling message:', error);
  }
}

/**
 * Handle presence update (user activity change)
 */
function handlePresenceUpdate(ws: WebSocket, client: ConnectedUser, payload: any) {
  if (payload.currentActivity) {
    client.currentActivity = payload.currentActivity;
    
    // Broadcast to all other clients
    broadcastToOthers(ws, {
      type: 'presence_update',
      payload: {
        action: 'activity_changed',
        userId: client.userId,
        currentActivity: client.currentActivity,
      },
    });
  }
}

/**
 * Handle document lock request
 */
function handleDocumentLockRequest(ws: WebSocket, client: ConnectedUser, payload: any) {
  const { documentId, documentType } = payload;

  if (!documentId || !documentType) {
    sendToClient(ws, {
      type: 'document_lock_request',
      payload: {
        success: false,
        error: 'Missing documentId or documentType',
      },
    });
    return;
  }

  // Create composite key for the lock map
  const lockKey = `${documentType}:${documentId}`;

  // Check if document is already locked
  const existingLock = documentLocks.get(lockKey);
  
  if (existingLock) {
    // Check if lock has expired
    if (new Date() > existingLock.expiresAt) {
      // Lock expired, remove it
      documentLocks.delete(lockKey);
    } else if (existingLock.lockedBy !== client.userId) {
      // Document is locked by someone else
      sendToClient(ws, {
        type: 'document_lock_request',
        payload: {
          success: false,
          locked: true,
          lockedBy: existingLock.lockedByName,
          expiresAt: existingLock.expiresAt,
        },
      });
      
      // Warn the user who has the lock
      const lockerSocket = userSocketMap.get(existingLock.lockedBy);
      if (lockerSocket) {
        sendToClient(lockerSocket, {
          type: 'conflict_warning',
          payload: {
            documentId,
            documentType,
            attemptedBy: `${client.firstName} ${client.lastName}`,
          },
        });
      }
      return;
    }
  }

  // Create or refresh lock
  const lock: DocumentLock = {
    documentId,
    documentType,
    lockedBy: client.userId,
    lockedByName: `${client.firstName} ${client.lastName}`,
    lockedAt: new Date(),
    expiresAt: new Date(Date.now() + LOCK_EXPIRATION_TIME),
  };

  documentLocks.set(lockKey, lock);

  // Send success to requester
  sendToClient(ws, {
    type: 'document_lock_request',
    payload: {
      success: true,
      lock,
    },
  });

  // Broadcast lock to all other clients
  broadcastToOthers(ws, {
    type: 'document_lock_request',
    payload: {
      action: 'locked',
      lock,
    },
  });
}

/**
 * Handle document unlock
 */
function handleDocumentUnlock(ws: WebSocket, client: ConnectedUser, payload: any) {
  const { documentId, documentType } = payload;

  if (!documentId || !documentType) {
    return;
  }

  // Create composite key for the lock map
  const lockKey = `${documentType}:${documentId}`;

  const lock = documentLocks.get(lockKey);
  
  // Only the lock owner can unlock
  if (lock && lock.lockedBy === client.userId) {
    documentLocks.delete(lockKey);
    
    // Broadcast unlock to all clients
    broadcastToAll({
      type: 'document_unlock',
      payload: {
        documentId,
        documentType,
        unlockedBy: client.userId,
      },
    });
  }
}

/**
 * Handle chat message
 */
function handleChatMessage(ws: WebSocket, client: ConnectedUser, payload: any) {
  const { message, toUserId } = payload;

  if (!message) {
    return;
  }

  const chatMessage: ChatMessage = {
    id: generateSocketId(),
    fromUserId: client.userId,
    fromUserName: `${client.firstName} ${client.lastName}`,
    message,
    timestamp: new Date(),
    toUserId,
  };

  if (toUserId) {
    // Direct message to specific user
    const recipientSocket = userSocketMap.get(toUserId);
    if (recipientSocket) {
      sendToClient(recipientSocket, {
        type: 'chat_message',
        payload: chatMessage,
      });
    }
    
    // Echo back to sender
    sendToClient(ws, {
      type: 'chat_message',
      payload: { ...chatMessage, sent: true },
    });
  } else {
    // Broadcast to all users
    broadcastToAll({
      type: 'chat_message',
      payload: chatMessage,
    });
  }
}

/**
 * Handle client disconnect
 */
function handleDisconnect(ws: WebSocket) {
  const client = connectedClients.get(ws);
  
  if (!client) {
    return;
  }

  console.log(`[WebSocket] User disconnected: ${client.email} (${client.userId})`);

  // Remove from maps
  connectedClients.delete(ws);
  userSocketMap.delete(client.userId);

  // Release all locks held by this user
  for (const [lockKey, lock] of Array.from(documentLocks.entries())) {
    if (lock.lockedBy === client.userId) {
      documentLocks.delete(lockKey);
      
      // Broadcast unlock
      broadcastToAll({
        type: 'document_unlock',
        payload: {
          documentId: lock.documentId,
          documentType: lock.documentType,
          reason: 'user_disconnected',
        },
      });
    }
  }

  // Broadcast presence update to remaining clients
  broadcastToAll({
    type: 'presence_update',
    payload: {
      action: 'user_left',
      userId: client.userId,
    },
  });
}

/**
 * Heartbeat mechanism to detect dead connections
 */
function heartbeat(wss: WebSocketServer) {
  const now = new Date();
  
  wss.clients.forEach((ws: WebSocket) => {
    const client = connectedClients.get(ws);
    
    if (!client) {
      return;
    }

    // Check if client hasn't responded in 2 heartbeat intervals
    const timeSinceLastActivity = now.getTime() - client.lastActivity.getTime();
    
    if (timeSinceLastActivity > HEARTBEAT_INTERVAL * 2) {
      console.log(`[WebSocket] Terminating inactive connection: ${client.email}`);
      ws.terminate();
      return;
    }

    // Send ping
    if (ws.readyState === WebSocket.OPEN) {
      ws.ping();
    }
  });
}

/**
 * Clean up expired document locks
 */
function cleanupExpiredLocks() {
  const now = new Date();
  
  for (const [lockKey, lock] of Array.from(documentLocks.entries())) {
    if (now > lock.expiresAt) {
      documentLocks.delete(lockKey);
      
      // Broadcast unlock
      broadcastToAll({
        type: 'document_unlock',
        payload: {
          documentId: lock.documentId,
          documentType: lock.documentType,
          reason: 'lock_expired',
        },
      });
      
      console.log(`[WebSocket] Lock expired for document: ${lock.documentType}:${lock.documentId}`);
    }
  }
}

/**
 * Send message to specific client
 */
function sendToClient(ws: WebSocket, message: WebSocketMessage) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

/**
 * Broadcast message to all connected clients
 */
function broadcastToAll(message: WebSocketMessage) {
  connectedClients.forEach((client, ws) => {
    sendToClient(ws, message);
  });
}

/**
 * Broadcast message to all clients except sender
 */
function broadcastToOthers(senderWs: WebSocket, message: WebSocketMessage) {
  connectedClients.forEach((client, ws) => {
    if (ws !== senderWs) {
      sendToClient(ws, message);
    }
  });
}

/**
 * Get list of online users
 */
export function getOnlineUsers(): Array<Partial<ConnectedUser>> {
  const users: Array<Partial<ConnectedUser>> = [];
  
  connectedClients.forEach((client) => {
    users.push({
      userId: client.userId,
      email: client.email,
      firstName: client.firstName,
      lastName: client.lastName,
      currentActivity: client.currentActivity,
      connectedAt: client.connectedAt,
    });
  });
  
  return users;
}

/**
 * Generate unique socket ID
 */
function generateSocketId(): string {
  return `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get WebSocket server statistics
 */
export function getWebSocketStats() {
  return {
    connectedClients: connectedClients.size,
    activeLocks: documentLocks.size,
    onlineUsers: getOnlineUsers(),
  };
}

/**
 * Broadcast chat message to all connected clients
 * Used by API routes to notify clients of new chat messages
 */
export function broadcastChatMessage(message: any) {
  broadcastToAll({
    type: 'chat_message',
    payload: {
      id: message.id,
      fromUserId: message.userId,
      fromUserName: message.user ? `${message.user.firstName || ''} ${message.user.lastName || ''}`.trim() || message.user.email : 'Unknown',
      message: message.message,
      timestamp: message.createdAt,
    },
  });
}

/**
 * Notify clients about document lock changes
 * Used by API routes to notify about lock acquisition or release
 */
export function notifyDocumentLock(lockInfo: { documentId: string; documentType: string; userId?: string; userName?: string; action: 'acquired' | 'released' }) {
  broadcastToAll({
    type: lockInfo.action === 'acquired' ? 'document_lock_request' : 'document_unlock',
    payload: lockInfo,
  });
}
