import React from 'react';

const BG='#0D1B2A', ACCENT='#F4A261', TEXT='#F5F0E8', MUTED='rgba(245,240,232,0.45)';
const MOODS = ['😢','😐','🙂','😊','😁'];

export default function Mood({ mood, setMood, onFind }) {
  return (
    <div style={{ minHeight:'100vh', background:BG, color:TEXT, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'0 24px', textAlign:'center' }}>
      <div style={{ maxWidth:400, width:'100%', display:'flex', flexDirection:'column', alignItems:'center' }}>
        <h1 style={{ fontSize:26, fontWeight:700, margin:'0 0 10px', letterSpacing:'-0.5px' }}>Before we find your match</h1>
        <p style={{ fontSize:14, color:MUTED, margin:'0 0 44px', lineHeight:1.65 }}>
          How are you feeling right now?<br />This stays only with you.
        </p>

        <div style={{ display:'flex', gap:12, marginBottom:56 }}>
          {MOODS.map((e, i) => (
            <button key={i} onClick={() => setMood(i)} style={{
              fontSize:32, width:56, height:56, borderRadius:16, border:'none',
              background: mood === i ? 'rgba(244,162,97,0.1)' : 'transparent',
              transform: mood === i ? 'scale(1.2)' : 'scale(1)',
              outline: mood === i ? `2.5px solid ${ACCENT}` : '2.5px solid transparent',
              outlineOffset:3, transition:'all 0.15s'
            }}>{e}</button>
          ))}
        </div>

        <div style={{ width:'100%', display:'flex', flexDirection:'column', gap:12 }}>
          <button onClick={onFind} style={{
            width:'100%', height:54, borderRadius:9999,
            background:ACCENT, border:'none', color:BG,
            fontSize:16, fontWeight:700, letterSpacing:'-0.2px'
          }}>Find my match</button>

          <button onClick={onFind} style={{
            background:'none', border:'none', color:MUTED, fontSize:14
          }}>Skip</button>
        </div>
      </div>
    </div>
  );
}
