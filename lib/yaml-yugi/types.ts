/** Copies allowed per deck in a limit regulation vector (0 / 1 / 2). */
export type YamlYugiCopiesAllowed = 0 | 1 | 2;

export type YamlYugiLimitRegulation = {
  date: string;
  regulation: Record<string, YamlYugiCopiesAllowed>;
};
