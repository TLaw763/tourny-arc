import { randomUUID } from "node:crypto";

/** Prefixed IDs matching monorepo convention for migration compatibility. */
export function newId(prefix: string): string {
  return `${prefix}_${randomUUID()}`;
}
