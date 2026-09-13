"use server";

import { searchYgoProDeckCards } from "@/lib/ygoprodeck/client";

export async function searchCardsAction(query: string) {
  return searchYgoProDeckCards(query, 8);
}
