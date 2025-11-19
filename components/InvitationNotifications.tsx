'use client';

import { useChatStore } from '@/lib/store';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, X } from 'lucide-react';

export default function InvitationNotifications() {
  const { pendingInvitations, acceptGroupInvitation, rejectGroupInvitation, removePendingInvitation } = useChatStore();

  if (pendingInvitations.length === 0) {
    return null;
  }

  const handleAccept = (groupId: string) => {
    acceptGroupInvitation(groupId);
    removePendingInvitation(groupId);
  };

  const handleReject = (groupId: string) => {
    rejectGroupInvitation(groupId);
    removePendingInvitation(groupId);
  };

  return (
    <div className="space-y-2 p-4">
      <h3 className="text-sm font-semibold text-muted-foreground">Group Invitations</h3>
      {pendingInvitations.map((invitation) => (
        <Card key={invitation.groupId} className="p-4">
          <div className="space-y-3">
            <div>
              <h4 className="font-semibold text-sm">{invitation.groupName}</h4>
              {invitation.description && (
                <p className="text-xs text-muted-foreground mt-1">{invitation.description}</p>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => handleAccept(invitation.groupId)}
                size="sm"
                className="flex-1 gap-2"
              >
                <Check size={16} /> Accept
              </Button>
              <Button
                onClick={() => handleReject(invitation.groupId)}
                size="sm"
                variant="outline"
                className="flex-1 gap-2"
              >
                <X size={16} /> Reject
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
