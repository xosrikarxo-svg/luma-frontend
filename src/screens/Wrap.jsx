import React, { useState, useEffect } from 'react';

const BG='#0D1B2A', CARD='#1E3045', ACCENT='#F4A261', TEXT='#F5F0E8', MUTED='rgba(245,240,232,0.45)';
const MOODS = ['😢','😐','🙂','😊','😁'];

export default function Wrap({ moodBefore, onRestart, canReconnect, reconnectState, onReconnectRequest, onReconnectAccept, onReconnectDecline }) {
  const [moodAfter, setMoodAfter] = useState(null);
  const [countdown, setCountdown] = useState(15);
  const improved = moodAfter !== null && moodAfter > moodBefore;

  // 15s countdown when requesting or incoming
  useEffect(() => {
    if (reconnectState !== 'requesting' && reconnectState !== 'incoming') return;
    setCountdown(15);
    const interval = setInterval(() => {
      setCountdown(p => { if (p <= 1) { clearInterval(interval); return 0; } return p - 1; });
    }, 1000);
    return () => clearInterval(interval);
  }, [reconnectState]);

  return (
    <div style={{ minHeight:'100vh', background:BG, color:TEXT, fontFamily:'system-ui,-apple-system,sans-serif', display:'flex', flexDirection:'column', justifyContent:'space-between', maxWidth:480, margin:'0 auto', padding:'0 24px' }}>

      <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center', paddingTop:40 }}>
        <h1 style={{ fontSize:36, fontWeight:300, margin:'0 0 12px', letterSpacing:'-1.5px' }}>That's a wrap.</h1>
        <p style={{ color:MUTED, fontSize:13, lineHeight:1.75, margin:'0 0 40px', maxWidth:270 }}>
          All messages have been permanently deleted from the server.
        </p>

        {/* Mood card */}
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

        {/* Incoming reconnect request */}
        {reconnectState === 'incoming' && (
          <div style={{ marginTop:28, background:'rgba(244,162,97,0.08)', border:`1px solid rgba(244,162,97,0.25)`, borderRadius:16, padding:'20px 24px', width:'100%', maxWidth:300, textAlign:'center' }}>
            <p style={{ color:ACCENT, fontSize:15, fontWeight:600, margin:'0 0 6px' }}>They want to reconnect! 👋</p>
            <p style={{ color:MUTED, fontSize:12, margin:'0 0 16px' }}>{countdown}s remaining</p>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={onReconnectAccept} style={{ flex:1, height:44, borderRadius:9999, background:ACCENT, border:'none', color:BG, fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                Accept ✓
              </button>
              <button onClick={onReconnectDecline} style={{ flex:1, height:44, borderRadius:9999, background:'transparent', border:'1.5px solid rgba(244,162,97,0.3)', color:MUTED, fontSize:14, cursor:'pointer', fontFamily:'inherit' }}>
                Decline
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom buttons */}
      <div style={{ display:'flex', flexDirection:'column', gap:12, paddingBottom:48 }}>
        <button onClick={onRestart} style={{ width:'100%', height:52, borderRadius:9999, background:ACCENT, border:'none', color:BG, fontSize:15, fontWeight:700, cursor:'pointer' }}>
          Connect with someone new →
        </button>

        {/* Reconnect button — show unless incoming request already visible */}
        {canReconnect && reconnectState !== 'incoming' && (
          <>
            {reconnectState === 'idle' && (
              <button onClick={onReconnectRequest} style={{ width:'100%', height:52, borderRadius:9999, background:'transparent', border:`1.5px solid ${ACCENT}`, color:ACCENT, fontSize:15, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                Reconnect with them ↩
              </button>
            )}
            {reconnectState === 'requesting' && (
              <div style={{ textAlign:'center', padding:'14px 0' }}>
                <p style={{ color:ACCENT, fontSize:14, margin:'0 0 4px' }}>Request sent! Waiting for them...</p>
                <p style={{ color:MUTED, fontSize:12, margin:0 }}>{countdown}s remaining</p>
              </div>
            )}
            {reconnectState === 'expired' && (
              <p style={{ textAlign:'center', color:MUTED, fontSize:13, margin:0, padding:'14px 0' }}>They didn't respond in time.</p>
            )}
            {reconnectState === 'declined' && (
              <p style={{ textAlign:'center', color:MUTED, fontSize:13, margin:0, padding:'14px 0' }}>They declined the reconnect.</p>
            )}
          </>
        )}

        <button onClick={onRestart} style={{ background:'transparent', border:'none', color:MUTED, fontSize:14, cursor:'pointer', padding:'8px 0', fontFamily:'inherit' }}>
          Back to home
        </button>
      </div>
    </div>
  );
}
