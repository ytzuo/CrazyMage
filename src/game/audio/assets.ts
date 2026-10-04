import themeUrl from '../../../artifacts/audio-drafts/music/unstable_mage_theme.wav?url';

// Only mastered SFX and the home theme enter the game bundle; source recordings and reels stay offline.
const files = import.meta.glob<string>('../../../artifacts/audio-drafts/sfx/*.wav', { eager: true, query: '?url', import: 'default' });
export const soundUrls = Object.fromEntries(Object.entries(files).map(([path, url]) => [path.split('/').pop()!.replace('.wav', ''), url]));
export { themeUrl };
