import themeUrl from '../../../artifacts/audio-drafts/music/unstable_mage_theme.wav?url';
import battleMusicUrl from '../../../artifacts/audio-drafts/music/battle_loop.wav?url';

// Only mastered SFX, home theme and battle loop enter the bundle; recordings and reels stay offline.
const files = import.meta.glob<string>('../../../artifacts/audio-drafts/sfx/*.wav', { eager: true, query: '?url', import: 'default' });
export const soundUrls = Object.fromEntries(Object.entries(files).map(([path, url]) => [path.split('/').pop()!.replace('.wav', ''), url]));
export { themeUrl, battleMusicUrl };
