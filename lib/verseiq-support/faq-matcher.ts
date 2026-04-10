import { FAQ_PAIRS } from './faq';

// Simple matcher: case-insensitive substring or fuzzy match
export function findFaqAnswer(userQuestion: string): string | null {
  const normalized = userQuestion.trim().toLowerCase();
  // Try exact substring match first
  for (const { q, a } of FAQ_PAIRS) {
    if (normalized.includes(q.toLowerCase()) || q.toLowerCase().includes(normalized)) {
      return a;
    }
  }
  // Try loose word overlap (at least 3 words in common)
  const userWords = new Set(normalized.split(/\W+/));
  for (const { q, a } of FAQ_PAIRS) {
    const qWords = new Set(q.toLowerCase().split(/\W+/));
    const overlap = [...userWords].filter(w => w && qWords.has(w));
    if (overlap.length >= 3) {
      return a;
    }
  }
  return null;
}
