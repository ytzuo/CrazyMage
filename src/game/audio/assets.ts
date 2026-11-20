import themeUrl from './media/music/unstable_mage_theme.m4a?url';
import battleMusicUrl from './media/music/battle_loop.m4a?url';

// Only compressed mastered SFX, home theme and battle loop enter the bundle; WAV masters stay in artifacts/.
const files = import.meta.glob<string>('./media/sfx/*.m4a', { eager: true, query: '?url', import: 'default' });
export const soundUrls = Object.fromEntries(Object.entries(files).map(([path, url]) => [path.split('/').pop()!.replace('.m4a', ''), url]));
export { themeUrl, battleMusicUrl };
