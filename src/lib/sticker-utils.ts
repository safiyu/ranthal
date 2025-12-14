import { get, set } from 'idb-keyval';

export interface StickerCategory {
    id: string;
    label: string;
    items: string[];
    isCustom?: boolean;
}

// IndexedDB key for custom stickers
const CUSTOM_STICKERS_KEY = 'ranthal-custom-stickers';

// Get custom stickers from IndexedDB
export const getCustomStickers = async (): Promise<string[]> => {
    if (typeof window === 'undefined') return [];
    try {
        const saved = await get<string[]>(CUSTOM_STICKERS_KEY);
        return saved || [];
    } catch {
        return [];
    }
};

// Save a new custom sticker to IndexedDB
export const saveCustomSticker = async (dataUrl: string): Promise<void> => {
    if (typeof window === 'undefined') return;
    try {
        const existing = await getCustomStickers();
        existing.unshift(dataUrl); // Add to beginning
        // Limit to 20 stickers
        const limited = existing.slice(0, 20);
        await set(CUSTOM_STICKERS_KEY, limited);
    } catch (e) {
        console.error('Failed to save custom sticker:', e);
        throw e; // Re-throw so caller can handle
    }
};

// Delete a custom sticker by index
export const deleteCustomSticker = async (index: number): Promise<void> => {
    if (typeof window === 'undefined') return;
    try {
        const existing = await getCustomStickers();
        existing.splice(index, 1);
        await set(CUSTOM_STICKERS_KEY, existing);
    } catch (e) {
        console.error('Failed to delete custom sticker:', e);
    }
};

export const STICKER_CATEGORIES: StickerCategory[] = [
    {
        id: 'custom',
        label: 'My Stickers',
        items: [], // Populated dynamically from localStorage
        isCustom: true
    },
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
