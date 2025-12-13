export interface StickerCategory {
    id: string;
    label: string;
    items: string[];
}

export const STICKER_CATEGORIES: StickerCategory[] = [
    {
        id: 'emojis',
        label: 'Fun',
        items: ['😀', '😂', '😍', '😎', '🤔', '😭', '😡', '👍', '👎', '🎉', '🔥', '❤️', '💯', '💩', '👻', '🤖']
    },
    {
        id: 'nature',
        label: 'Nature',
        items: ['🐶', '🐱', '🐭', '🦁', '🐸', '🌸', '🌹', '🌻', '🌲', '🌵', '🍎', '🍌', '🍕', '🍔', '🍦']
    },
    {
        id: 'objects',
        label: 'Objects',
        items: ['⚽', '🏀', '🎮', '📱', '💻', '📷', '🚗', '✈️', '🚀', '💡', '⏰', '🎁', '🎈', '🎵', '🕶️']
    },
    {
        id: 'symbols',
        label: 'Signs',
        items: ['⚠️', '⛔', '✅', '❌', '➡️', '⬅️', '⬆️', '⬇️', '🔴', '🔵', '⭐', '💲', '❗', '❓']
    }
];

export const emojiToDataURL = (emoji: string, size: number = 200): string => {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    if (ctx) {
        ctx.font = `${size * 0.8}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(emoji, size / 2, size / 2 + (size * 0.1)); // Offset for vertical centering
    }

    return canvas.toDataURL('image/png');
};
