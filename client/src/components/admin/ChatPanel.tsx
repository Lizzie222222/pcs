import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useCollaboration, type ChatMessage as CollabChatMessage } from '@/hooks/useCollaboration';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import Avatar from '@/components/Avatar';
import { MessageSquare, Send, X } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';

interface ChatPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unreadCount: number;
  onMessagesRead: () => void;
}

export default function ChatPanel({ open, onOpenChange, unreadCount, onMessagesRead }: ChatPanelProps) {
  const { user } = useAuth();
  const { chatMessages: realtimeMessages, sendChatMessage, typingUsers, sendTypingIndicator } = useCollaboration();
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [allMessages, setAllMessages] = useState<CollabChatMessage[]>([]);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch initial chat messages
  const { data: historicalMessages = [] } = useQuery<any[]>({
    queryKey: ['/api/collaboration/chat/messages'],
    queryFn: async () => {
      const res = await fetch('/api/collaboration/chat/messages', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch messages');
      return res.json();
    },
    enabled: open,
    retry: false,
  });

  // Merge historical and realtime messages
  useEffect(() => {
    const historical = historicalMessages.map((msg: any) => ({
      id: msg.id,
      fromUserId: msg.userId,
      fromUserName: msg.user ? `${msg.user.firstName || ''} ${msg.user.lastName || ''}`.trim() || msg.user.email : 'Unknown',
      message: msg.message,
      timestamp: new Date(msg.createdAt),
    }));

    const allIds = new Set([...historical.map(m => m.id), ...realtimeMessages.map(m => m.id)]);
    const merged = Array.from(allIds).map(id => {
      const rt = realtimeMessages.find(m => m.id === id);
      const hist = historical.find((m: CollabChatMessage) => m.id === id);
      return rt || hist;
    }).filter(Boolean) as CollabChatMessage[];

    merged.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    setAllMessages(merged);
  }, [historicalMessages, realtimeMessages]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (open && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [allMessages, open]);

  // Mark messages as read when panel opens
  useEffect(() => {
    if (open && unreadCount > 0) {
      onMessagesRead();
    }
  }, [open, unreadCount, onMessagesRead]);

  // Handle typing with debounce
  const handleTyping = (value: string) => {
    setMessage(value);
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    if (value.trim()) {
      // Send typing_start
      sendTypingIndicator(true);
      
      // Set timeout to send typing_stop after 2 seconds
      typingTimeoutRef.current = setTimeout(() => {
        sendTypingIndicator(false);
      }, 2000);
    } else {
      // If input is empty, stop typing immediately
      sendTypingIndicator(false);
    }
  };
  
  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        sendTypingIndicator(false);
      }
    };
  }, [sendTypingIndicator]);

  const handleSend = () => {
    if (message.trim()) {
      // Clear typing timeout and send typing_stop
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      sendTypingIndicator(false);
      
      sendChatMessage(message.trim());
      setMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatMessageTime = (timestamp: Date) => {
    const date = new Date(timestamp);
    if (isToday(date)) {
      return format(date, 'h:mm a');
    } else if (isYesterday(date)) {
      return `Yesterday ${format(date, 'h:mm a')}`;
    } else {
      return format(date, 'MMM d, h:mm a');
    }
  };
  
  // Format typing indicator text
  const getTypingIndicatorText = () => {
    // Filter out current user
    const otherTypingUsers = typingUsers.filter(u => u.userId !== user?.id);
    
    if (otherTypingUsers.length === 0) {
      return null;
    }
    
    if (otherTypingUsers.length === 1) {
      return `${otherTypingUsers[0].name} is typing...`;
    }
    
    if (otherTypingUsers.length === 2) {
      return `${otherTypingUsers[0].name} and ${otherTypingUsers[1].name} are typing...`;
    }
    
    // 3 or more users
    const othersCount = otherTypingUsers.length - 2;
    return `${otherTypingUsers[0].name}, ${otherTypingUsers[1].name}, and ${othersCount} ${othersCount === 1 ? 'other' : 'others'} are typing...`;
  };
  
  const typingIndicatorText = getTypingIndicatorText();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:w-[400px] sm:max-w-[400px] p-0 flex flex-col">
        <SheetHeader className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              <SheetTitle>Admin Chat</SheetTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              data-testid="button-close-chat"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-4" data-testid="chat-messages-container">
          {allMessages.length === 0 && (
            <div className="text-center py-8 text-sm text-gray-500 dark:text-gray-400">
              No messages yet. Start a conversation!
            </div>
          )}

          {allMessages.map((msg) => {
            const isOwnMessage = msg.fromUserId === user?.id;
            
            return (
              <div
                key={msg.id}
                className={`flex gap-3 ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}
                data-testid={`message-${msg.id}`}
              >
                {!isOwnMessage && (
                  <Avatar
                    seed={msg.fromUserId}
                    size={32}
                    alt={msg.fromUserName}
                    className="flex-shrink-0"
                    dataTestId={`message-avatar-${msg.id}`}
                  />
                )}
                
                <div className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'} max-w-[75%]`}>
                  <div className={`rounded-lg px-3 py-2 ${
                    isOwnMessage
                      ? 'bg-pcs_blue text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                  }`}>
                    {!isOwnMessage && (
                      <p className="text-xs font-medium mb-1 opacity-70" data-testid={`message-sender-${msg.id}`}>
                        {msg.fromUserName}
                      </p>
                    )}
                    <p className="text-sm whitespace-pre-wrap break-words" data-testid={`message-content-${msg.id}`}>
                      {msg.message}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400 dark:text-gray-500 mt-1" data-testid={`message-time-${msg.id}`}>
                    {formatMessageTime(msg.timestamp)}
                  </span>
                </div>
              </div>
            );
          })}
          
          <div ref={messagesEndRef} />
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700">
          {typingIndicatorText && (
            <div className="px-4 pt-3 pb-2" data-testid="typing-indicator">
              <p className="text-xs text-gray-500 dark:text-gray-400 italic animate-pulse">
                {typingIndicatorText}
              </p>
            </div>
          )}
          
          <div className="p-4">
            <div className="flex gap-2">
              <Input
                value={message}
                onChange={(e) => handleTyping(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type a message..."
                className="flex-1"
                data-testid="input-chat-message"
              />
              <Button
                onClick={handleSend}
                disabled={!message.trim()}
                size="icon"
                className="bg-pcs_blue hover:bg-pcs_blue/90"
                data-testid="button-send-message"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
