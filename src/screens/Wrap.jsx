import React, { useState } from 'react';

const BG='#0D1B2A', CARD='#1E3045', ACCENT='#F4A261', TEXT='#F5F0E8', MUTED='rgba(245,240,232,0.45)';
const MOODS = ['😢','😐','🙂','😊','😁'];

export default function Wrap({ moodBefore, onRestart, onReconnect, reconnectStatus }) {
  const [moodAfter, setMoodAfter] = useState(null);
  const improved = moodAfter !== null && moodAfter > moodBefore;

  return (
    <div style={{ minHeight:'100vh', background:BG, color:TEXT, fontFamily:'system-ui,-apple-system,sans-serif', display:'flex', flexDirection:'column', justifyContent:'space-between', maxWidth:480, margin:'0 auto', padding:'0 24px' }}>
      <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center', paddingTop:40 }}>
        <h1 style={{ fontSize:36, fontWeight:300, margin:'0 0 12px', letterSpacing:'-1.5px' }}>That's a wrap.</h1>
        <p style={{ color:MUTED, fontSize:13, lineHeight:1.75, margin:'0 0 40px', maxWidth:270 }}>
          All messages have been permanently deleted from the server.
        </p>
        <div style={{ background:CARD, borderRadius:20, padding:'22px 40px', display:'flex', flexDirection:'column', alignItems:'center', gap:16, width:'100%', maxWidth:300 }}>
          <p style={{ color:MUTED, fontSize:11, margin:0, textTransform:'uppercase', letterSpacing:'0.12em', fontWeight:500 }}>Your mood this session</p>
          <div style={{ display:'flex', alignItems:'center', gap:20 }}>
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:36 }}>{MOODS[moodBefore]}</div>
              <p style={{ color:MUTED, fontSize:11, margin:'6px 0 0' }}>Before</p>
            </div>
            <span style={{ color:MUTED, fontSize:20, opacity:0.5 }}>→</span>
            <div style={{ textAlign:'center' }}>
              {moodAfter !== null ? (
                <>
                  <div style={{ fontSize:36 }}>{MOODS[moodAfter]}</div>
                  <p style={{ color:MUTED, fontSize:11, margin:'6px 0 0' }}>After</p>
                </>
              ) : (
                <div>
                  <div style={{ display:'flex', gap:6, marginBottom:6 }}>
                    {MOODS.map((e,i) => (
                      <button key={i} onClick={() => setMoodAfter(i)} style={{ fontSize:20, width:34, height:34, borderRadius:9, border:'none', background:'rgba(255,255,255,0.04)', cursor:'pointer', outline: moodAfter===i ? `2px solid ${ACCENT}` : 'none', transition:'all 0.12s' }}>{e}</button>
                    ))}
                  </div>
                  <p style={{ color:MUTED, fontSize:10, margin:0 }}>How do you feel?</p>
                </div>
              )}
            </div>
          </div>
          {improved && <p style={{ color:ACCENT, fontSize:14, fontWeight:600, margin:0 }}>Talking helped 🎉</p>}
        </div>
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:12, paddingBottom:48 }}>
        <button onClick={onRestart} style={{ width:'100%', height:52, borderRadius:9999, background:ACCENT, border:'none', color:BG, fontSize:15, fontWeight:700, cursor:'pointer' }}>
          Connect with someone new →
        </button>

        {onReconnect && reconnectStatus !== 'expired' && (
          <button
            onClick={onReconnect}
            disabled={reconnectStatus === 'waiting'}
            style={{
              width:'100%', height:52, borderRadius:9999,
              background:'transparent',
              border:`1.5px solid ${reconnectStatus === 'waiting' ? 'rgba(244,162,97,0.3)' : ACCENT}`,
              color: reconnectStatus === 'waiting' ? 'rgba(244,162,97,0.4)' : ACCENT,
              fontSize:15, fontWeight:600,
              cursor: reconnectStatus === 'waiting' ? 'default' : 'pointer',
              fontFamily:'inherit'
            }}
          >
            {reconnectStatus === 'waiting' ? 'Waiting for them to reconnect...' : 'Reconnect with them ↩'}
          </button>
        )}

        {reconnectStatus === 'expired' && (
          <p style={{ textAlign:'center', color:MUTED, fontSize:13, margin:0 }}>They didn't reconnect in time.</p>
        )}

        <button onClick={onRestart} style={{ background:'transparent', border:'none', color:MUTED, fontSize:14, cursor:'pointer', padding:'8px 0', fontFamily:'inherit' }}>
          Back to home
        </button>
      </div>
    </div>
  );
}
