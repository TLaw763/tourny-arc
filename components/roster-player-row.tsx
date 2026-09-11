"use client";

import { ParticipantInviteField } from "@/components/participant-invite-field";
import { ParticipantUsernameField } from "@/components/participant-username-field";

export function RosterPlayerRow({
  participantId,
  displayName,
  username,
  linkedAccountId,
  pendingInviteEmail,
  onSaveUsername,
  onApplyFromProfile,
  onInvite,
}: {
  participantId: string;
  displayName: string;
  username: string | null;
  linkedAccountId: string | null;
  pendingInviteEmail?: string | null;
  onSaveUsername: (participantId: string, username: string) => Promise<void>;
  onApplyFromProfile?: (participantId: string) => Promise<void>;
  onInvite: (participantId: string, email: string, displayName: string) => Promise<string>;
}) {
  return (
    <div className="roster-player-row panel-subtle p-3 text-sm">
      <div className="roster-player-row-fields">
        <ParticipantUsernameField
          participantId={participantId}
          displayName={displayName}
          username={username}
          linkedAccountId={linkedAccountId}
          onSave={onSaveUsername}
          onApplyFromProfile={onApplyFromProfile}
          className="roster-player-row-segment contents"
        />
        <ParticipantInviteField
          participantId={participantId}
          displayName={displayName}
          linkedAccountId={linkedAccountId}
          pendingInviteEmail={pendingInviteEmail}
          onInvite={onInvite}
          className="roster-player-row-invite-group"
        />
      </div>
    </div>
  );
}
