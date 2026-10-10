// The four looks of the proof, the twelve varied NPCs, and what today's figure is given for each.
import type { Look } from './character.ts';

export const LOOKS: Record<string, Look> = {
  'woman-braids': { id: 'woman-braids', label: 'Woman, braids, dark skin, ankara dress', body: 'female', tone: '#5e3620', hair: 'braids', hairColor: '#1c1917', garment: 'dress', fabric: 'ankara', color: '#e9822b' },
  'man-lowcut': { id: 'man-lowcut', label: 'Man, low-cut, light-brown skin, plain kaftan', body: 'male', tone: '#e0ac7e', hair: 'lowcut', hairColor: '#1c1917', garment: 'kaftan', fabric: 'plain', color: '#2f7d78' },
  'woman-afro': { id: 'woman-afro', label: 'Woman, afro, medium skin, plain dress', body: 'female', tone: '#b0764c', hair: 'afro', hairColor: '#241a16', garment: 'dress', fabric: 'plain', color: '#8055c2' },
  'man-afro': { id: 'man-afro', label: 'Man, afro, dark skin, ankara-print kaftan', body: 'male', tone: '#5e3620', hair: 'afro', hairColor: '#1c1917', garment: 'kaftan', fabric: 'ankara', color: '#1f2f6b' },
};

const TONES = ['#e0ac7e', '#c98e62', '#b0764c', '#96603c', '#7a4a2c', '#5e3620', '#3f2416'];
const DRESS_COLOURS = ['#c9423a', '#3f9a5a', '#dd6fa0', '#2f9d98', '#d6a83a', '#8055c2', '#3f72c4'];
const KAFTAN_COLOURS = ['#ece2c6', '#243a66', '#2f7d78', '#8a3b22', '#3f72c4', '#6e6a58'];
const HAIRS: Look['hair'][] = ['afro', 'braids', 'lowcut'];
export const NPC_LOOKS: Look[] = Array.from({ length: 12 }, (_, i) => {
  const female = i % 2 === 0;
  const hair = female ? (['braids', 'afro', 'afro', 'braids', 'braids', 'afro'] as Look['hair'][])[(i / 2) | 0]! : (['lowcut', 'afro', 'lowcut', 'afro', 'lowcut', 'afro'] as Look['hair'][])[(i / 2) | 0]!;
  void HAIRS;
  const ankara = i % 3 === 0 || i % 5 === 0;
  return {
    id: `npc-${i}`, label: `NPC ${i + 1}`, body: female ? 'female' : 'male', tone: TONES[(i * 3 + 1) % 7]!, hair, hairColor: hair === 'afro' && i % 4 === 1 ? '#3d2a1f' : '#1c1917',
    garment: female ? 'dress' : 'kaftan', fabric: ankara ? 'ankara' : 'plain', color: (female ? DRESS_COLOURS : KAFTAN_COLOURS)[i % (female ? 7 : 6)]!,
  };
});

/** The look today's game figure is built from for the same choices. */
export function oldLookOf(look: Look): Record<string, unknown> {
  return {
    body: look.body === 'female' ? 'woman' : 'man', hair: look.hair, outfit: look.garment === 'kaftan' ? 'kaftan' : 'gown', fabric: look.fabric,
    skin: look.tone, hairColor: look.hairColor, outfitColor: look.fabric === 'ankara' ? (look.garment === 'kaftan' ? '#243a66' : '#e0822f') : look.color, bottomsColor: look.garment === 'kaftan' ? look.color : '#243a66', accessories: [], face: 'oval', expression: 'smile',
  };
}
