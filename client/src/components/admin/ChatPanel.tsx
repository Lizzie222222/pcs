import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useCollaboration, type ChatMessage as CollabChatMessage } from '@/hooks/useCollaboration';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import Avatar from '@/components/Avatar';
import { MessageSquare, Send, X } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';

interface ChatPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unreadCount: number;
  onMessagesRead: () => void;
}

interface MentionState {
  isOpen: boolean;
  searchQuery: string;
  selectedIndex: number;
  cursorPosition: number;
}

function parseMentions(message: string): Array<{ text: string; isMention: boolean; userId?: string }> {
  const mentionRegex = /@"([^"]+)"|@(\S+)/g;
  const segments: Array<{ text: string; isMention: boolean; userId?: string }> = [];
  let lastIndex = 0;
  let match;

  while ((match = mentionRegex.exec(message)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        text: message.substring(lastIndex, match.index),
        isMention: false,
      });
    }

    const mentionText = match[1] || match[2];
    segments.push({
      text: `@${mentionText}`,
      isMention: true,
      userId: mentionText,
    });

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < message.length) {
    segments.push({
      text: message.substring(lastIndex),
      isMention: false,
    });
  }

  return segments.length > 0 ? segments : [{ text: message, isMention: false }];
}

export default function ChatPanel({ open, onOpenChange, unreadCount, onMessagesRead }: ChatPanelProps) {
  const { user } = useAuth();
  const { chatMessages: realtimeMessages, sendChatMessage, typingUsers, sendTypingIndicator, onlineUsers } = useCollaboration();
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [allMessages, setAllMessages] = useState<CollabChatMessage[]>([]);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [mentionState, setMentionState] = useState<MentionState>({
    isOpen: false,
    searchQuery: '',
    selectedIndex: 0,
    cursorPosition: 0,
  });

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

  const getFilteredUsers = () => {
    const query = mentionState.searchQuery.toLowerCase();
    return onlineUsers.filter(u => {
      if (u.userId === user?.id) return false;
      const fullName = `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email || '';
      return fullName.toLowerCase().includes(query);
    });
  };

  const filteredUsers = mentionState.isOpen ? getFilteredUsers() : [];

  const handleInputChange = (value: string) => {
    setMessage(value);
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    if (value.trim()) {
      sendTypingIndicator(true);
      typingTimeoutRef.current = setTimeout(() => {
        sendTypingIndicator(false);
      }, 2000);
    } else {
      sendTypingIndicator(false);
    }

    const cursorPos = inputRef.current?.selectionStart || value.length;
    const textBeforeCursor = value.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
      
      if (/^[\w\s]*$/.test(textAfterAt) && !textAfterAt.includes(' ')) {
        setMentionState({
          isOpen: true,
          searchQuery: textAfterAt,
          selectedIndex: 0,
          cursorPosition: lastAtIndex,
        });
      } else {
        setMentionState(prev => ({ ...prev, isOpen: false }));
      }
    } else {
      setMentionState(prev => ({ ...prev, isOpen: false }));
    }
  };

  const insertMention = (userName: string) => {
    const beforeMention = message.substring(0, mentionState.cursorPosition);
    const afterMention = message.substring(inputRef.current?.selectionStart || message.length);
    
    const mentionText = userName.includes(' ') ? `@"${userName}" ` : `@${userName} `;
    const newMessage = beforeMention + mentionText + afterMention;
    
    setMessage(newMessage);
    setMentionState({ isOpen: false, searchQuery: '', selectedIndex: 0, cursorPosition: 0 });
    
    setTimeout(() => {
      inputRef.current?.focus();
      const newCursorPos = beforeMention.length + mentionText.length;
      inputRef.current?.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!mentionState.isOpen) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setMentionState(prev => ({
          ...prev,
          selectedIndex: Math.min(prev.selectedIndex + 1, filteredUsers.length - 1),
        }));
        break;
      
      case 'ArrowUp':
        e.preventDefault();
        setMentionState(prev => ({
          ...prev,
          selectedIndex: Math.max(prev.selectedIndex - 1, 0),
        }));
        break;
      
      case 'Enter':
        e.preventDefault();
        if (filteredUsers[mentionState.selectedIndex]) {
          const selectedUser = filteredUsers[mentionState.selectedIndex];
          const userName = `${selectedUser.firstName || ''} ${selectedUser.lastName || ''}`.trim() || selectedUser.email || '';
          insertMention(userName);
        }
        break;
      
      case 'Escape':
        e.preventDefault();
        setMentionState(prev => ({ ...prev, isOpen: false }));
        break;
      
      case 'Tab':
        if (filteredUsers[mentionState.selectedIndex]) {
          e.preventDefault();
          const selectedUser = filteredUsers[mentionState.selectedIndex];
          const userName = `${selectedUser.firstName || ''} ${selectedUser.lastName || ''}`.trim() || selectedUser.email || '';
          insertMention(userName);
        }
        break;
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
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      sendTypingIndicator(false);
      
      sendChatMessage(message.trim());
      setMessage('');
      setMentionState({ isOpen: false, searchQuery: '', selectedIndex: 0, cursorPosition: 0 });
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

  const renderMessageWithMentions = (message: string) => {
    const segments = parseMentions(message);
    return (
      <>
        {segments.map((segment, index) => {
          if (segment.isMention) {
            return (
              <span
                key={index}
                className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium px-1 py-0.5 rounded"
                data-testid={`mention-${segment.text}`}
              >
                {segment.text}
              </span>
            );
          }
          return <span key={index}>{segment.text}</span>;
        })}
      </>
    );
  };

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
                      {renderMessageWithMentions(msg.message)}
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
          
          <div className="p-4 relative">
            {mentionState.isOpen && (
              <div className="absolute bottom-full left-0 mb-2 w-full max-h-60 overflow-y-auto z-10" data-testid="mention-dropdown">
                <Card className="border shadow-lg">
                  {filteredUsers.length === 0 ? (
                    <div className="p-3 text-sm text-gray-500 dark:text-gray-400">
                      No users found
                    </div>
                  ) : (
                    <div>
                      {filteredUsers.map((user, index) => {
                        const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || '';
                        return (
                          <div
                            key={user.userId}
                            data-testid={`mention-user-${user.userId}`}
                            className={`flex items-center gap-2 p-2 cursor-pointer ${
                              index === mentionState.selectedIndex
                                ? 'bg-gray-100 dark:bg-gray-700'
                                : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                            }`}
                            onClick={() => insertMention(userName)}
                          >
                            <Avatar seed={user.userId} size={24} alt={userName} />
                            <span className="text-sm">{userName}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>
              </div>
            )}
            
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={message}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message... (@mention to tag someone)"
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
