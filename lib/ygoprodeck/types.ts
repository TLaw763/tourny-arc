export type YgoProDeckBanStatus = "Forbidden" | "Limited" | "Semi-Limited" | null;

export type YgoProDeckCardSummary = {
  id: number;
  name: string;
  banTcg: YgoProDeckBanStatus;
  genesysPoints: number | null;
};

export type YgoProDeckBanlistRow = {
  id: number;
  name: string;
  ban_tcg: YgoProDeckBanStatus;
  ban_ocg: YgoProDeckBanStatus;
  ban_goat: YgoProDeckBanStatus;
};

export type ReferenceBanlistFormat = "tcg" | "master_duel" | "genesys";
