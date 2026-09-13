"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth, isOrganizerForSeason } from "@/lib/auth";
import { newId } from "@/lib/db/ids";
import { sanitizeDisplayText } from "@/lib/domain";
import { getAppUrl } from "@/lib/env";
import { assertGmailAddress, normalizeEmail } from "@/lib/gmail-email";
import { randomBytes } from "node:crypto";

export async function inviteParticipantAction(
  seasonId: string,
  email: string,
  displayName: string,
  participantId?: string,
) {
  const session = await requireAuth();
  if (!(await isOrganizerForSeason(session.userId, seasonId))) {
    throw new Error("Forbidden");
  }

  const normalizedEmail = normalizeEmail(email);
  assertGmailAddress(normalizedEmail);

  const admin = createAdminClient();
  const token = randomBytes(32).toString("hex");
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  await admin.from("season_invitations").insert({
    id: newId("invitation"),
    season_id: seasonId,
    participant_id: participantId ?? null,
    email: normalizedEmail,
    display_name: sanitizeDisplayText(displayName, 100),
    role: "participant",
    token,
    invited_by_customer_account_id: session.userId,
    expires_at: expiresAt,
    created_at: now,
  });

  const acceptUrl = `${getAppUrl()}/invite?token=${token}`;
  revalidatePath("/organizer");
  return { acceptUrl };
}

export async function acceptInvitationAction(token: string) {
  const session = await requireAuth();
  const admin = createAdminClient();

  const { data: invitation } = await admin
    .from("season_invitations")
    .select("*")
    .eq("token", token)
    .is("accepted_at", null)
    .single();

  if (!invitation) throw new Error("Invalid invitation");
  if (new Date(invitation.expires_at) < new Date()) throw new Error("Invitation expired");

  const { data: season } = await admin
    .from("seasons")
    .select("competition_id")
    .eq("id", invitation.season_id)
    .single();
  if (!season) throw new Error("Season not found");

  const now = new Date().toISOString();

  let participantId = invitation.participant_id as string | null;

  // Link existing roster row by id, display name, or create new participant
  const { data: existingParticipants } = await admin
    .from("participants")
    .select("id, display_name")
    .eq("competition_id", season.competition_id);

  if (participantId && !existingParticipants?.some((p) => p.id === participantId)) {
    participantId = null;
  }

  if (!participantId) {
    participantId =
      existingParticipants?.find(
        (p) => p.display_name.toLowerCase() === invitation.display_name.toLowerCase(),
      )?.id ?? null;
  }

  if (!participantId) {
    participantId = newId("participant");
    await admin.from("participants").insert({
      id: participantId,
      competition_id: season.competition_id,
      display_name: invitation.display_name,
      created_at: now,
      updated_at: now,
    });
    await admin.from("memberships").insert({
      id: newId("membership"),
      season_id: invitation.season_id,
      participant_id: participantId,
      customer_account_id: null,
      role: "participant",
      status: "active",
      eligible: true,
      created_at: now,
      updated_at: now,
    });
  }

  await admin
    .from("memberships")
    .update({ customer_account_id: session.userId, updated_at: now })
    .eq("season_id", invitation.season_id)
    .eq("participant_id", participantId);

  await admin
    .from("season_invitations")
    .update({ accepted_at: now })
    .eq("id", invitation.id);

  revalidatePath("/my-fixtures");
  return { seasonId: invitation.season_id };
}
