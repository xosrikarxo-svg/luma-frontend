import React, { useState, useEffect } from 'react';

const BG='#0D1B2A', ACCENT='#F4A261', TEXT='#F5F0E8', MUTED='rgba(245,240,232,0.45)';
const ALL_TAGS = ['Music','Gaming','Movies','Books','Sports','Art','Tech','Food','Travel','Nature','Fitness','Fashion','Photography','Science','Anime'];
const API = 'https://lumabackend.up.railway.app';

export default function Onboarding({ onContinue }) {
  const [tags, setTags] = useState([]);
  const [queueCounts, setQueueCounts] = useState({});

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const res = await fetch(`${API}/queue-status`);
        const data = await res.json();
        setQueueCounts(data);
      } catch {}
    };
    fetchCounts();
    const interval = setInterval(fetchCounts, 3000);
    return () => clearInterval(interval);
  }, []);

  const toggle = (t) => tags.includes(t) ? setTags(tags.filter(x => x !== t)) : tags.length < 3 && setTags([...tags, t]);
  const totalWaiting = Object.values(queueCounts).reduce((a, b) => a + b, 0);

  return (
    <div style={{ minHeight:'100vh', background:BG, color:TEXT, fontFamily:'system-ui,-apple-system,sans-serif' }}>
      <div style={{ maxWidth:480, margin:'0 auto', padding:'48px 24px 40px' }}>

        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6 }}>
          <div>
            <h1 style={{ margin:0, fontSize:26, fontWeight:700, letterSpacing:'-0.5px' }}>What are you into?</h1>
            <p style={{ margin:'6px 0 0', fontSize:14, color:MUTED }}>Pick up to 3 topics ({tags.length}/3)</p>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:5, background:'rgba(46,213,115,0.08)', padding:'6px 12px', borderRadius:9999, border:'1px solid rgba(46,213,115,0.18)', flexShrink:0, marginTop:4 }}>
            <div style={{ width:7, height:7, borderRadius:'50%', background:'#2ed573', boxShadow:'0 0 5px #2ed573' }} />
            <span style={{ fontSize:11, color:'#2ed573', fontWeight:500 }}>
              {totalWaiting > 0 ? `${totalWaiting} waiting` : 'matching now'}
            </span>
          </div>
        </div>

        <div style={{ height:3, background:'rgba(244,162,97,0.1)', borderRadius:9999, margin:'20px 0 28px' }}>
          <div style={{ height:3, background:ACCENT, borderRadius:9999, width:`${(tags.length/3)*100}%`, transition:'width 0.3s' }} />
        </div>

        <div style={{ display:'flex', flexWrap:'wrap', gap:10, marginBottom:44 }}>
          {ALL_TAGS.map(t => {
            const sel = tags.includes(t);
            const count = queueCounts[t] || 0;
            const hasWaiting = count > 0;

            return (
              <button key={t} onClick={() => toggle(t)} style={{
                padding:'9px 14px 9px 12px',
                borderRadius:9999,
                border:`1.5px solid ${sel ? ACCENT : 'rgba(244,162,97,0.22)'}`,
                background: sel ? ACCENT : 'transparent',
                color: sel ? BG : ACCENT,
                fontSize:14,
                fontWeight: sel ? 700 : 400,
                cursor:'pointer',
                display:'flex',
                alignItems:'center',
                gap:7,
                transition:'all 0.15s',
                fontFamily:'inherit',
              }}>
                {/* Green dot if people waiting, gray dot if not */}
                <span style={{
                  width:7,
                  height:7,
                  borderRadius:'50%',
                  flexShrink:0,
                  display:'inline-block',
                  background: hasWaiting ? '#2ed573' : 'rgba(245,240,232,0.2)',
                  boxShadow: hasWaiting ? '0 0 5px #2ed573' : 'none',
                  transition:'all 0.3s',
                }}/>

                {t}

                {/* Count badge */}
                {count > 0 && (
                  <span style={{
                    fontSize:11,
                    fontWeight:700,
                    color: sel ? 'rgba(13,27,42,0.65)' : '#2ed573',
                    background: sel ? 'rgba(13,27,42,0.15)' : 'rgba(46,213,115,0.12)',
                    padding:'1px 7px',
                    borderRadius:9999,
                    lineHeight:'18px',
                    marginLeft:2,
                  }}>{count}</span>
                )}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => onContinue(tags)}
          disabled={tags.length === 0}
          style={{
            width:'100%', height:56, borderRadius:9999,
            background: tags.length > 0 ? ACCENT : 'rgba(244,162,97,0.15)',
            border:'none',
            color: tags.length > 0 ? BG : 'rgba(244,162,97,0.35)',
            fontSize:16, fontWeight:700, transition:'all 0.15s',
            cursor: tags.length > 0 ? 'pointer' : 'default',
          }}
        >Continue</button>
      </div>
    </div>
  );
}
