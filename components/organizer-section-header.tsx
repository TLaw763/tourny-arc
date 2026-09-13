type OrganizerSectionHeaderProps = {
  title: string;
  onUpdate: () => void | Promise<void>;
  disabled?: boolean;
  loading?: boolean;
  hint?: string;
  /** Prevent click from toggling a parent <details> summary. */
  stopToggle?: boolean;
};

export function OrganizerSectionHeader({
  title,
  onUpdate,
  disabled = false,
  loading = false,
  hint,
  stopToggle = false,
}: OrganizerSectionHeaderProps) {
  return (
    <div className="organizer-section-header-wrap">
      <div className="organizer-section-header">
        <h2 className="font-semibold">{title}</h2>
        <button
          type="button"
          className="btn-primary shrink-0"
          disabled={disabled || loading}
          aria-busy={loading}
          onClick={(e) => {
            if (stopToggle) e.stopPropagation();
            void onUpdate();
          }}
        >
          {loading ? "Updating…" : "Update"}
        </button>
      </div>
      {hint && <p className="organizer-section-header-hint">{hint}</p>}
    </div>
  );
}
