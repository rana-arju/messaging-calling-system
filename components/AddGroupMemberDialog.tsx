'use client';

import { useState, useEffect } from 'react';
import { useChatStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { X, AlertCircle } from 'lucide-react';

interface AddGroupMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chatId: string;
}

export default function AddGroupMemberDialog({
  open,
  onOpenChange,
  chatId,
}: AddGroupMemberDialogProps) {
  const { addGroupMember, error, setError } = useChatStore();
  const [memberId, setMemberId] = useState('');
  const [localError, setLocalError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (error && open) {
      setLocalError(error);
    }
  }, [error, open]);

  useEffect(() => {
    if (!open) {
      setLocalError('');
      setMemberId('');
      setError(null);
    }
  }, [open, setError]);

  const handleAddMember = () => {
    setLocalError('');
    if (!memberId.trim()) {
      setLocalError('Please enter a user ID');
      return;
    }
    setIsSubmitting(true);
    addGroupMember(chatId, memberId);
    setTimeout(() => {
      setIsSubmitting(false);
      onOpenChange(false);
      setMemberId('');
    }, 1000);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Add Member to Group</h2>
            <button
              onClick={() => onOpenChange(false)}
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

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">User ID</label>
              <Input
                placeholder="Enter user ID to add"
                value={memberId}
                onChange={(e) => setMemberId(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !isSubmitting && handleAddMember()}
                disabled={isSubmitting}
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => onOpenChange(false)}
                variant="outline"
                className="flex-1"
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddMember}
                className="flex-1"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Adding...' : 'Add Member'}
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
