import React, { useState } from 'react';
import {
  SAMPLE_REPOS, EEFANO_SONGS, EEFANO_REPO, COVERS, TUTORIALS, AWESOME_URL,
  fetchSong, eefanoSourceUrl, Song,
} from '../services/strudel-explore';

// Explore panel — in-app browser of awesome-strudel resources.
//   Samples: one-tap sample-bank loaders   Tracks: eefano's loadable library
//   + attributed community-cover link-outs   Learn: tutorials
interface Props {
  onClose: () => void;
  onLoad: (code: string, title: string) => void;     // load code into the editor
  loadSample: (repo: string) => Promise<void>;        // samples('github:…')
}

const GREEN = '#8fd17a', GREEN_DIM = 'rgba(143,209,122,0.5)', BORDER = 'rgba(143,209,122,0.16)';
const REPOS = Array.from(new Set(SAMPLE_REPOS));

const StrudelExplore: React.FC<Props> = ({ onClose, onLoad, loadSample }) => {
  const [tab, setTab] = useState<'samples' | 'tracks' | 'learn'>('tracks');
  const [loaded, setLoaded] = useState<Record<string, 'load' | 'ok' | 'err'>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const doSample = async (repo: string) => {
    setLoaded((s) => ({ ...s, [repo]: 'load' }));
    try { await loadSample(repo); setLoaded((s) => ({ ...s, [repo]: 'ok' })); }
    catch { setLoaded((s) => ({ ...s, [repo]: 'err' })); }
  };
  const doLoadSong = async (song: Song) => {
    setBusy(song.file);
    try { const code = await fetchSong(song.file); onLoad(code, song.title); }
    catch (e) { setLoaded((s) => ({ ...s, [song.file]: 'err' })); }
    finally { setBusy(null); }
  };

  const TabBtn = ({ id, label }: { id: typeof tab; label: string }) => (
    <button onClick={() => setTab(id)} aria-pressed={tab === id}
      className="px-3 py-1.5 rounded text-[11px] font-mono font-bold"
      style={{ background: tab === id ? 'rgba(143,209,122,0.22)' : 'transparent', color: tab === id ? '#cdeac0' : GREEN_DIM }}>
      {label}
    </button>
  );
  const extLink = (url: string, label: string) => (
    <a href={url} target="_blank" rel="noreferrer" className="text-[10px] font-mono underline" style={{ color: GREEN_DIM }}>{label}</a>
  );

  return (
    <div className="absolute inset-0 z-10 flex flex-col" style={{ background: 'rgba(6,9,6,0.97)' }}>
      <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: BORDER }}>
        <span className="text-[13px] font-mono font-bold" style={{ color: GREEN }}>EXPLORE</span>
        <div className="flex gap-1 ml-1"><TabBtn id="tracks" label="Tracks" /><TabBtn id="samples" label="Samples" /><TabBtn id="learn" label="Learn" /></div>
        <a href={AWESOME_URL} target="_blank" rel="noreferrer" className="ml-auto text-[9px] font-mono underline" style={{ color: GREEN_DIM }}>awesome-strudel ↗</a>
        <button onClick={onClose} aria-label="Close explore" className="text-xl leading-none ml-1" style={{ color: GREEN_DIM }}>×</button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {tab === 'tracks' && (
          <div className="flex flex-col gap-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-mono font-bold" style={{ color: '#caa052' }}>Load a song into the editor</span>
                {extLink(EEFANO_REPO, 'all 87 by eefano ↗')}
              </div>
              <p className="text-[9px] font-mono mb-2" style={{ color: GREEN_DIM }}>fetched live from eefano's public repo · credit + source on each · some need sample banks (Samples tab) or sound best on strudel.cc</p>
              <div className="grid sm:grid-cols-2 gap-1.5">
                {EEFANO_SONGS.map((s) => (
                  <div key={s.file} className="flex items-center gap-2 px-2.5 py-2 rounded" style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}` }}>
                    <span className="text-[11px] font-mono flex-1 min-w-0 truncate" style={{ color: '#cdeac0' }}>{s.title}</span>
                    {loaded[s.file] === 'err' && <span className="text-[9px] text-red-400 font-mono">fetch failed</span>}
                    {extLink(eefanoSourceUrl(s.file), 'src')}
                    <button onClick={() => doLoadSong(s)} disabled={busy === s.file}
                      className="px-2 py-1 rounded text-[10px] font-mono font-bold shrink-0"
                      style={{ background: busy === s.file ? '#2a352a' : GREEN, color: busy === s.file ? GREEN_DIM : '#08120a' }}>
                      {busy === s.file ? '…' : '▶ load'}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <span className="text-[11px] font-mono font-bold block mb-1.5" style={{ color: '#caa052' }}>Community covers</span>
              <p className="text-[9px] font-mono mb-2" style={{ color: GREEN_DIM }}>covers by their authors — open the original on strudel.cc (credited; not redistributed here)</p>
              <div className="grid sm:grid-cols-2 gap-1.5">
                {COVERS.map((c) => (
                  <div key={c.title} className="flex items-center gap-2 px-2.5 py-2 rounded" style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}` }}>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-mono truncate" style={{ color: '#cdeac0' }}>{c.title}</div>
                      <div className="text-[9px] font-mono" style={{ color: GREEN_DIM }}>by {c.author}</div>
                    </div>
                    {c.strudelUrl && extLink(c.strudelUrl, 'open ↗')}
                    {extLink(c.sourceUrl, 'source ↗')}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'samples' && (
          <div>
            <p className="text-[9px] font-mono mb-2" style={{ color: GREEN_DIM }}>tap to load a sample bank, then use its sounds in patterns, e.g. <span style={{ color: '#cdeac0' }}>s("bd hh")</span></p>
            <div className="grid sm:grid-cols-2 gap-1.5">
              {REPOS.map((repo) => {
                const st = loaded[repo];
                return (
                  <button key={repo} onClick={() => doSample(repo)} disabled={st === 'load' || st === 'ok'}
                    className="flex items-center gap-2 px-2.5 py-2 rounded text-left"
                    style={{ background: st === 'ok' ? 'rgba(143,209,122,0.14)' : 'rgba(255,255,255,0.04)', border: `1px solid ${st === 'ok' ? GREEN_DIM : BORDER}`, cursor: st === 'ok' ? 'default' : 'pointer' }}>
                    <span className="text-[10px] font-mono flex-1 min-w-0 truncate" style={{ color: '#cdeac0' }}>{repo.replace('github:', '')}</span>
                    <span className="text-[10px] font-mono shrink-0" style={{ color: st === 'err' ? '#e6b0a0' : GREEN }}>
                      {st === 'ok' ? '✓' : st === 'load' ? '…' : st === 'err' ? 'retry' : '+'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {tab === 'learn' && (
          <div className="flex flex-col gap-1.5">
            {TUTORIALS.map((t) => (
              <a key={t.url} href={t.url} target="_blank" rel="noreferrer"
                className="flex items-center gap-2 px-3 py-2.5 rounded text-[11px] font-mono"
                style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}`, color: '#cdeac0' }}>
                {t.title} <span className="ml-auto" style={{ color: GREEN_DIM }}>↗</span>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StrudelExplore;
