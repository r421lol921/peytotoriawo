export const games = [
  { id: 'chirpless_puzzles', name: 'PeytoToria Puzzles', visits: 284, up: 9, down: 3, thumb: '/DefaultThumb.png', author: 'PeytoToria Admin' },
  { id: 'platform', name: 'Hub', visits: 1100, up: 12, down: 2, thumb: '/DefaultThumb.png', author: 'Chirpless Admin' },
  { id: 'chirpless_hunt', name: 'PeytoToria Hunt 2026', visits: 720, up: 7, down: 3, thumb: '/DefaultThumb.png', author: 'PeytoToria Admin' },
  { id: 'lucky_world', name: 'Lucky World', visits: 950, up: 13, down: 2, thumb: '/DefaultThumb.png', author: 'PeytoToria Admin' },
  { id: 'sillyville', name: 'SillyVille V1', visits: 330, up: 6, down: 4, thumb: '/DefaultThumb.png', author: 'PeytoToria Admin' },
  { id: 'chirpcity', name: 'ChirpCity 1.1V', visits: 1080, up: 11, down: 3, thumb: '/DefaultThumb.png', author: 'PeytoToria Admin' },
  { id: 'memories', name: 'Memories', visits: 270, up: 5, down: 2, thumb: '/DefaultThumb.png', author: 'PeytoToria Admin' },
  { id: 'easter_2026', name: 'Easter 2026', visits: 540, up: 8, down: 3, thumb: '/DefaultThumb.png', author: 'PeytoToria Admin' },
  { id: 'blocks', name: 'Blocks', visits: 920, up: 10, down: 4, thumb: '/DefaultThumb.png', author: 'PeytoToria Admin' },
  { id: 'rocket_olympics', name: 'Rocket Olympics', visits: 680, up: 4, down: 2, thumb: '/DefaultThumb.png', author: 'PeytoToria Admin' },
  { id: 'home', name: 'Home', visits: 430, up: 3, down: 2, thumb: '/DefaultThumb.png', author: 'PeytoToria Admin' },
  // New spooky themed map
  { id: 'scary_forest', name: 'Scary Forest', visits: 0, up: 0, down: 0, thumb: '/null_plainsky512_dn.jpeg', author: 'PeytoToria Admin' },
  // New: Prison Life - a guarded prison yard with cells and patrolling NPC guards
  { id: 'prison_life', name: 'Prison Life', visits: 0, up: 0, down: 0, thumb: '/DefaultThumb.png', author: 'PeytoToria Admin' }
];

// Compute like percentage (0..100) from up/down; if no votes, show 100% by default (or 0 if both zero)
export function likePercentage(g) {
  const up = Math.max(0, Math.floor(g.up || 0));
  const down = Math.max(0, Math.floor(g.down || 0));
  const total = up + down;
  if (total === 0) return 100;
  return Math.round((up / total) * 100);
}

// Sorting helpers
export function getFilteredGames({ filter = 'popular', search = '' } = {}) {
  const q = (search || '').trim().toLowerCase();
  let list = games.slice();

  // Filter by query
  if (q.length > 0) {
    list = list.filter(g => g.name.toLowerCase().includes(q) || g.id.toLowerCase().includes(q));
  }

  // Apply sort filter
  switch (filter) {
    case 'most_upvoted':
      list.sort((a,b) => (b.up - a.up) || (b.visits - a.visits));
      break;
    case 'most_downvoted':
      list.sort((a,b) => (b.down - a.down) || (b.visits - a.visits));
      break;
    case 'popular':
    default:
      // Popular: visits primary, then upvotes
      list.sort((a,b) => (b.visits - a.visits) || (b.up - a.up));
      break;
  }
  return list;
}