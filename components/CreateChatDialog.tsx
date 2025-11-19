'use client';

import { useState, useEffect } from 'react';
import { useChatStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { X, AlertCircle } from 'lucide-react';

interface CreateChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateChatDialog({
  open,
  onOpenChange,
}: CreateChatDialogProps) {
  const { createPrivateChat, createGroupChat, creatingChat, error, setError } = useChatStore();
  const [chatType, setChatType] = useState<'private' | 'group' | null>(null);
  const [participantId, setParticipantId] = useState('');
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [groupMembers, setGroupMembers] = useState<string[]>([]);
  const [memberInput, setMemberInput] = useState('');
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    if (error && open) {
      setLocalError(error);
    }
  }, [error, open]);

  useEffect(() => {
    if (!open) {
      setLocalError('');
      setError(null);
    }
  }, [open, setError]);

  const handleCreatePrivate = () => {
    setLocalError('');
    if (!participantId.trim()) {
      setLocalError('Please enter a user ID');
      return;
    }
    createPrivateChat(participantId);
  };

  const handleCreateGroup = () => {
    setLocalError('');
    if (!groupName.trim()) {
      setLocalError('Please enter a group name');
      return;
    }
    createGroupChat(groupName, groupMembers, groupDescription);
  };

  const handleAddMember = () => {
    if (memberInput.trim() && !groupMembers.includes(memberInput)) {
      setGroupMembers([...groupMembers, memberInput]);
      setMemberInput('');
    }
  };

  const handleRemoveMember = (member: string) => {
    setGroupMembers(groupMembers.filter((m) => m !== member));
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Create New Chat</h2>
            <button
              onClick={() => {
                onOpenChange(false);
                setChatType(null);
              }}
              className="hover:bg-accent p-2 rounded"
            >
              <X size={20} />
            </button>
          </div>

          {localError && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/30 rounded-lg flex gap-2">
              <AlertCircle className="text-destructive flex-shrink-0 mt-0.5" size={18} />
              <p className="text-sm text-destructive">{localError}</p>
            </div>
          )}

          {!chatType ? (
            <div className="space-y-3">
              <Button
                onClick={() => setChatType('private')}
                className="w-full"
                variant="outline"
                disabled={creatingChat}
              >
                Start Private Chat
              </Button>
              <Button
                onClick={() => setChatType('group')}
                className="w-full"
                variant="outline"
                disabled={creatingChat}
              >
                Create Group Chat
              </Button>
            </div>
          ) : chatType === 'private' ? (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">User ID</label>
                <Input
                  placeholder="Enter user ID"
                  value={participantId}
                  onChange={(e) => setParticipantId(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !creatingChat && handleCreatePrivate()}
                  disabled={creatingChat}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    setChatType(null);
                    setParticipantId('');
                    setLocalError('');
                  }}
                  variant="outline"
                  className="flex-1"
                  disabled={creatingChat}
                >
                  Back
                </Button>
                <Button 
                  onClick={handleCreatePrivate} 
                  className="flex-1"
                  disabled={creatingChat}
                >
                  {creatingChat ? 'Creating...' : 'Create'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Group Name</label>
                <Input
                  placeholder="Enter group name"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  disabled={creatingChat}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description (optional)</label>
                <Input
                  placeholder="Enter group description"
                  value={groupDescription}
                  onChange={(e) => setGroupDescription(e.target.value)}
                  disabled={creatingChat}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Add Members</label>
                <div className="flex gap-2 mb-2">
                  <Input
                    placeholder="Enter member ID"
                    value={memberInput}
                    onChange={(e) => setMemberInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !creatingChat && handleAddMember()}
                    disabled={creatingChat}
                  />
                  <Button onClick={handleAddMember} size="sm" disabled={creatingChat}>
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {groupMembers.map((member) => (
                    <div
                      key={member}
                      className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm flex items-center gap-2"
                    >
                      {member}
                      <button onClick={() => !creatingChat && handleRemoveMember(member)}>
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    setChatType(null);
                    setGroupName('');
                    setGroupDescription('');
                    setGroupMembers([]);
                    setLocalError('');
                  }}
                  variant="outline"
                  className="flex-1"
                  disabled={creatingChat}
                >
                  Back
                </Button>
                <Button 
                  onClick={handleCreateGroup} 
                  className="flex-1"
                  disabled={creatingChat}
                >
                  {creatingChat ? 'Creating...' : 'Create'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
