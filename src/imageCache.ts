const imageCache = new Map<string, string>();

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export async function getCardImage(cardId: string): Promise<string | null> {
  if (imageCache.has(cardId)) return imageCache.get(cardId)!;
  try {
    const res = await fetch(`${API_URL}/api/cards/${cardId}/image`);
    if (res.ok) {
      const data = await res.json();
      imageCache.set(cardId, data.image_base64);
      return data.image_base64;
    }
  } catch {}
  return null;
}

export function getCachedImage(cardId: string): string | null {
  return imageCache.get(cardId) || null;
}

export function setCachedImage(cardId: string, base64: string): void {
  imageCache.set(cardId, base64);
}

export function clearCachedImage(cardId: string): void {
  imageCache.delete(cardId);
}
