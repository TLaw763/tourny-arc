"use client";

import type { ReactNode } from "react";
import { OrganizerSectionHeader } from "@/components/organizer-section-header";

type OrganizerCollapsibleSectionProps = {
  title: string;
  onUpdate: () => void | Promise<void>;
  disabled?: boolean;
  loading?: boolean;
  hint?: string;
  defaultOpen?: boolean;
  children: ReactNode;
};

export function OrganizerCollapsibleSection({
  title,
  onUpdate,
  disabled = false,
  loading = false,
  hint,
  defaultOpen = true,
  children,
}: OrganizerCollapsibleSectionProps) {
  return (
    <details className="organizer-collapsible panel" open={defaultOpen}>
      <summary className="organizer-collapsible-summary">
        <OrganizerSectionHeader
          title={title}
          onUpdate={onUpdate}
          disabled={disabled}
          loading={loading}
          hint={hint}
          stopToggle
        />
      </summary>
      <div className="organizer-collapsible-body">{children}</div>
    </details>
  );
}
