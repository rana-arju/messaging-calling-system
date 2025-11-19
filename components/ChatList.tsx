'use client';

import { useChatStore } from '@/lib/store';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { Search, Plus } from 'lucide-react';
import { useState } from 'react';
import CreateChatDialog from './CreateChatDialog';

export default function ChatList() {
  const { chats, selectedChat, setSelectedChat } = useChatStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const filteredChats = chats.filter((chat) => {
    const name = chat.name || chat.group?.name || 'Direct Message';
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const getChatName = (chat: any) => {
    if (chat.name) return chat.name;
    if (chat.group?.name) return chat.group.name;
    if (chat.participants && chat.participants.length > 0) {
      const participant = chat.participants[0];
      return `${participant.firstName} ${participant.lastName}`;
    }
    return 'Direct Message';
  };

  const getChatAvatar = (chat: any) => {
    if (chat.group?.name) {
      return chat.group.name[0]?.toUpperCase() || 'G';
    }
    if (chat.participants && chat.participants.length > 0) {
      return chat.participants[0].firstName?.[0]?.toUpperCase() || 'U';
    }
    return 'C';
  };

  const getChatAvatarImage = (chat: any) => {
    if (chat.group?.memberships?.[0]?.user?.image) {
      return chat.group.memberships[0].user.image;
    }
    if (chat.participants && chat.participants.length > 0) {
      return chat.participants[0].image;
    }
    return undefined;
  };

  const getLastMessageTime = (chat: any) => {
    if (chat.updatedAt) {
      return formatDistanceToNow(new Date(chat.updatedAt), { addSuffix: true });
    }
    return '';
  };

  const getLastMessagePreview = (chat: any) => {
    const lastMessage = chat.messages?.[chat.messages.length - 1];
    if (!lastMessage) {
      return chat.description || 'No messages yet';
    }

    let preview = lastMessage.content || lastMessage.fileName || '';
    
    if (chat.type === 'GROUP' && lastMessage.sender) {
      preview = `${lastMessage.sender.firstName}: ${preview}`;
    }

    return preview;
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="p-4 border-b border-border">
        <div className="flex gap-2 items-center mb-4">
          <h1 className="text-2xl font-bold">Messages</h1>
          <button
            onClick={() => setIsCreateDialogOpen(true)}
            className="ml-auto p-2 hover:bg-accent rounded-lg transition"
          >
            <Plus size={20} />
          </button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-3 text-muted-foreground" size={18} />
          <Input
            placeholder="Search chats..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2">
          {filteredChats.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {chats.length === 0 ? 'No chats yet. Create one to get started!' : 'No chats found'}
            </div>
          ) : (
            filteredChats.map((chat) => (
              <button
                key={chat.id}
                onClick={() => setSelectedChat(chat)}
                className={`w-full text-left p-3 rounded-lg mb-1 transition flex gap-3 ${
                  selectedChat?.id === chat.id
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-accent/50'
                }`}
              >
                <Avatar className="h-12 w-12 flex-shrink-0">
                  <AvatarImage src={getChatAvatarImage(chat)} />
                  <AvatarFallback>{getChatAvatar(chat)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="font-semibold truncate">{getChatName(chat)}</div>
                    <div className="text-xs opacity-60 flex-shrink-0">{getLastMessageTime(chat)}</div>
                  </div>
                  <div className="text-sm opacity-70 truncate">
                    {getLastMessagePreview(chat)}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </ScrollArea>

      <CreateChatDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />
    </div>
  );
}
