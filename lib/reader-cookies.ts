import mongoose from "mongoose";

/** Return distinct, valid reader IDs in cookie priority order. */
export function getReaderIdCandidates(
  echoUserId?: string,
  legacyUserId?: string,
): string[] {
  return [...new Set([echoUserId, legacyUserId]
    .filter((value): value is string => Boolean(value))
    .filter((value) => mongoose.isValidObjectId(value)))];
}
