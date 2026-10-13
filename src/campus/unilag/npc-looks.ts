// Credible campus dress: students in casual wear with backpacks, staff in office or work wear. Unlisted fields are seeded from the NPC id.
// Kept out of content.ts (part of the startup download): only the campus preview draws these (preview.ts).
import type { Look } from '../../types/life.ts';

export const NPC_LOOKS: Record<string, Partial<Look>> = {
  'aunty-ngozi': { body: 'woman', outfit: 'casual', fabric: 'ankara', accessories: ['headwrap'] },
  'tunde-code': { body: 'man', outfit: 'hoodie', outfitColor: 'navy', accessories: ['backpack', 'glasses'] },
  'bisi-reader': { body: 'woman', outfit: 'casual', outfitColor: 'cream', accessories: ['backpack', 'glasses'] },
  'coach-yemi': { body: 'man', outfit: 'jersey', outfitColor: 'green', accessories: ['cap'] },
  'mariam-lagoon': { body: 'woman', outfit: 'casual', outfitColor: 'teal', accessories: ['handbag'] },
  'seun-stage': { body: 'man', outfit: 'chill', outfitColor: 'violet' },
  'sister-ade': { body: 'woman', outfit: 'gown', outfitColor: 'cream', accessories: ['headwrap'] },
  'kola-union': { body: 'man', outfit: 'casual', outfitColor: 'blue', accessories: ['backpack'] },
  'lecturer-ada': { body: 'woman', outfit: 'office', outfitColor: 'navy', accessories: ['glasses', 'handbag'] },
  'porter-bayo': { body: 'man', outfit: 'kaftan', outfitColor: 'cream' },
  'driver-sola': { body: 'man', outfit: 'casual', outfitColor: 'gold', accessories: ['cap'] },
  'security-efe': { body: 'man', outfit: 'site-work', outfitColor: 'navy', accessories: ['cap'] },
};
