import type { ISRCProIssue, MissingRegistration } from "./missingRegistrationTypes";

export type EuropeComplexityScore = {
  artistName: string;
  score: number;
  notes: string[];
};

export function computeEuropeComplexityScore(params: {
  artistName: string;
  proIssues: ISRCProIssue[];
  missingRegs: MissingRegistration[];
}): EuropeComplexityScore {
  const { artistName, proIssues, missingRegs } = params;

  let score = 0;
  const notes: string[] = [];

  const shareIssues = proIssues.filter(
    (i) => i.type === "PUBLISHER_SHARE_MISMATCH" || i.type === "WRITER_SHARE_MISMATCH"
  ).length;

  const titleArtistIssues = proIssues.filter(
    (i) => i.type === "TITLE_MISMATCH" || i.type === "ARTIST_MISMATCH"
  ).length;

  const missingCount = missingRegs.length;

  score += Math.min(40, shareIssues * 5);
  score += Math.min(30, titleArtistIssues * 3);
  score += Math.min(30, missingCount * 2);

  if (shareIssues > 0) {
    notes.push("Complex publisher/writer share mismatches across EU PROs.");
  }
  if (titleArtistIssues > 0) {
    notes.push("Title/artist metadata inconsistencies in EU PRO repertoires.");
  }
  if (missingCount > 0) {
    notes.push("Multiple tracks missing from EU PRO repertoires.");
  }

  if (score > 100) {
    score = 100;
  }

  return { artistName, score, notes };
}
