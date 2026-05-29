// strudel-explore.ts
// Data for the Strudel "Explore" panel — an in-app version of the awesome-strudel
// curated list (github.com/terryds/awesome-strudel).
//
// IP stance: we do NOT store third-party pattern code in this repo. eefano's
// collection is the loadable library — "Load" fetches the author's own public
// GitHub raw file at runtime (CORS-open) into the editor, fully credited + linked.
// The famous community covers (unlicensed covers of copyrighted songs) are
// attribution + link-out cards only — exactly how the awesome-list presents them.

export const AWESOME_URL = 'https://github.com/terryds/awesome-strudel';

// ── sample banks (one-tap samples('github:…') loaders) ───────────────────────
export const SAMPLE_REPOS: string[] = [
  'github:tidalcycles/Dirt-Samples',
  'github:eddyflux/crate',
  'github:Bubobubobubobubo/Dough-Amen',
  'github:Bubobubobubobubo/Dough-Juj',
  'github:yaxu/clean-breaks',
  'github:TodePond/samples',
  'github:tidalcycles/Dirt-Samples',
  'github:algorave-dave/samples',
  'github:AuditeMarlow/samples',
  'github:mot4i/garden',
  'github:prismograph/departure',
  'github:TristanCacqueray/mirus',
  'github:QuantumVillage/quantum-music',
  'github:salsicha/capoeira_strudel',
  'github:sonidosingapura/rochormatic',
  'github:terrorhank/samples',
  'github:tesspilot/samples',
  'github:wyan/livecoding-samples',
  'github:Veikkosuhonen/graffathon25-demo',
  'github:Nikeryms/Samples',
  'github:emrexdeger/strudelSamples',
  'github:kaiye10/strudelSamples',
  'github:fstiffo/polifonia-samples',
  'github:AustinOliverHaskell/ms-teams-sounds-strudel',
];

// ── eefano's loadable song collection (fetched live from his public repo) ─────
export const EEFANO_REPO = 'https://github.com/eefano/strudel-songs-collection';
const EEFANO_RAW = 'https://raw.githubusercontent.com/eefano/strudel-songs-collection/main/';

export interface Song { file: string; title: string; }
// curated subset (the 8 from the awesome-list table are artist-attributed; the
// rest use eefano's own song titles). Browse-all link points at the full repo.
export const EEFANO_SONGS: Song[] = [
  { file: 'bugfromheaven.js', title: 'Bug From Heaven' },
  { file: 'strangerthings.js', title: 'Stranger Things — theme' },
  { file: 'pyramidsong.js', title: 'Radiohead — Pyramid Song' },
  { file: 'rhythmofthenight.js', title: 'Corona — Rhythm of the Night' },
  { file: 'pumpupthejam.js', title: 'Technotronic — Pump Up The Jam' },
  { file: 'waltzno2.js', title: 'Shostakovich — Waltz No. 2' },
  { file: 'happybirthday.js', title: 'Happy Birthday' },
  { file: 'oldmacdonald.js', title: 'Old MacDonald' },
  { file: 'bluemonday.js', title: 'New Order — Blue Monday' },
  { file: 'enjoythesilence.js', title: 'Enjoy the Silence' },
  { file: 'blackbird.js', title: 'Blackbird' },
  { file: 'shedontusejelly.js', title: "She Don't Use Jelly" },
  { file: 'warsaw.js', title: 'Warsaw' },
  { file: 'swimandsleep.js', title: 'Swim & Sleep' },
  { file: 'tarantella.js', title: 'Tarantella' },
  { file: 'elpueblo.js', title: 'El Pueblo' },
];

export const eefanoFileUrl = (file: string) => EEFANO_RAW + file;
export const eefanoSourceUrl = (file: string) => `${EEFANO_REPO}/blob/main/${file}`;

/** Fetch a song's source from eefano's public repo (CORS-open). */
export async function fetchSong(file: string): Promise<string> {
  const r = await fetch(EEFANO_RAW + file);
  if (!r.ok) throw new Error(`fetch failed (${r.status})`);
  return r.text();
}

// ── famous community covers — attribution + link-out only ─────────────────────
export interface Cover {
  title: string; author: string;
  strudelUrl?: string;   // present only for short ?id links (no embedded code)
  sourceUrl: string;
}
export const COVERS: Cover[] = [
  { title: 'Grimes — Music 4 Machines', author: 'KAIXI', strudelUrl: 'https://strudel.cc/?sOc7cVTqJHUU', sourceUrl: 'https://www.reddit.com/r/Grimes/comments/1cqhk68/i_made_a_cover_of_grimes_music_4_machines_with/' },
  { title: 'Charli XCX — 360', author: 'KAIXI', strudelUrl: 'https://strudel.cc/?2ErYTSUotoaQ', sourceUrl: 'https://x.com/xxkaixi/status/1926482951174234429' },
  { title: 'Billie Eilish — Birds of a Feather', author: 'saga_3k', strudelUrl: 'https://strudel.cc/?yTnr825wyd9V', sourceUrl: 'https://www.youtube.com/watch?v=_PjSOSoZeSA' },
  { title: 'New Order — Blue Monday', author: 'Lewis', sourceUrl: 'https://www.youtube.com/watch?v=ilF4t0jSBUo' },
  { title: 'Super Mario Bros. — main theme', author: 'Flowhacker', sourceUrl: 'https://www.instagram.com/flowhacker_livecoding/reel/DXXSj6Qs_K2/' },
  { title: 'Undertale — Determination', author: 'Claffystic', sourceUrl: 'https://github.com/Claffystic/StudelProjects' },
  { title: 'Radiohead — Everything in Its Right Place', author: 'codester', sourceUrl: 'https://www.instagram.com/p/DRd44gNCCZB' },
];

// ── tutorials / learning ──────────────────────────────────────────────────────
export interface Link { title: string; url: string; }
export const TUTORIALS: Link[] = [
  { title: 'Official Strudel — Getting Started', url: 'https://strudel.cc/workshop/getting-started/' },
  { title: 'Learning Music Production with Strudel', url: 'https://github.com/terryds/learning-music-production-with-strudel' },
  { title: 'Live Coding for Music (Beginners) — video', url: 'https://www.youtube.com/watch?v=tKeJhjvTabc' },
  { title: 'Intro to Algorave — Strudel workshop', url: 'https://glfmn.io/presentations/algorave/' },
  { title: 'Learn live coding with Lucy Cheesman', url: 'https://www.youtube.com/watch?v=QRJ0xrjLj6A' },
  { title: 'Beats, Bytes, and Basslines', url: 'https://mirakl.tech/beats-bytes-and-basslines-an-introduction-to-live-coding-with-strudel-cc-4d378e86d5b7' },
  { title: 'Sample preview tool', url: 'https://strudel-samples.alternet.site' },
];
