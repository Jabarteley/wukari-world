// The sticker pack (docs/SMALLER-FEATURES.md): short Pidgin, owambe and table-game lines with an emoji, sent as an ordinary message. Text only, no images,
// so it costs a few hundred bytes and works the same in a group, a direct chat and a venue's chat. Fetched with the sticker tab, never at first paint.
export interface StickerSet { id: string; label: string; icon: string; stickers: readonly string[] }
export const STICKER_SETS: readonly StickerSet[] = [
  { id: 'pidgin', label: 'Pidgin', icon: '🗣️', stickers: ['How far? 👋', 'No wahala 🙌', 'Abeg 🙏', 'E don do! 🛑', 'Na so 😂', 'Sharp sharp ⚡', 'I dey come 🏃', 'Wetin dey? 🤔', 'Oya now 👉', 'Thank you o 🤝'] },
  { id: 'owambe', label: 'Owambe', icon: '🎉', stickers: ['Congrats o! 🎉', 'Jollof dey! 🍛', 'Make we dance 💃', 'Gele on point 👑', 'DJ, play am 🎶', 'Aso ebi ready 👗', 'Cheers 🥂', 'Spray am! 💸', 'Eid Mubarak 🌙', 'Merry Christmas 🎄'] },
  { id: 'games', label: 'Table games', icon: '🃏', stickers: ['Whot! 🃏', 'Check up! 🃏', 'Last card 🃏', 'Ayo, my turn 🌰', 'Ludo six! 🎲', 'Checkmate ♟️', 'Good game 🤝', 'Rematch? 🔁', 'You wan cry? 😏', 'Na luck 🍀'] },
];
/** The longest sticker, in characters: far below any chat's limit. */
export const STICKER_MAX = 24;
