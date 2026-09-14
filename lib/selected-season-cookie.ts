export const SELECTED_SEASON_COOKIE = "selected_season_id";

/** Set by middleware on /seasons/[id] so RSC can read selection before cookie round-trip. */
export const SELECTED_SEASON_HEADER = "x-selected-season-id";

/** Current pathname — used to ignore stale selection cookies on `/`. */
export const PATHNAME_HEADER = "x-pathname";
