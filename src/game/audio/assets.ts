// Only mastered SFX enter the game bundle; music, source recordings and reels stay offline.
const files = import.meta.glob<string>('../../../artifacts/audio-drafts/sfx/*.wav', { eager: true, query: '?url', import: 'default' });
export const soundUrls = Object.fromEntries(Object.entries(files).map(([path, url]) => [path.split('/').pop()!.replace('.wav', ''), url]));
