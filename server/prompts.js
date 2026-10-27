// Günlük kapsül promptları. Her gün sıradaki prompt kullanılır, liste bitince başa döner.
export const PROMPTS = [
  "Show us your sky.",
  "The view from your window.",
  "Your coffee or tea today.",
  "Something blue near you.",
  "Your shoes right now.",
  "The light where you are.",
  "What's on your table?",
  "Your street, right now.",
  "Something green.",
  "Where you're sitting.",
];

// Aynı gün her zaman aynı promptu verir (UTC gün sayısına göre).
export function promptFor(date) {
  const day = Math.floor(date.getTime() / 86_400_000);
  return PROMPTS[day % PROMPTS.length];
}
