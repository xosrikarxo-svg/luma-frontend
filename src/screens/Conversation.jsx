import React, { useState, useEffect, useRef } from 'react';

const BG='#0D1B2A', CARD='#1E3045', ACCENT='#F4A261', TEXT='#F5F0E8', MUTED='rgba(245,240,232,0.45)';
const fmt = s => `${Math.floor(s/60)}:${(s%60).toString().padStart(2,'0')}`;

export default function Conversation({ messages, prompt, peerTyping, onSend, onTyping, onNewPrompt, onLeave }) {
  const [input, setInput] = useState('');
  const [timeLeft, setTimeLeft] = useState(20 * 60);
  const endRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft(p => {
        if (p <= 1) { clearInterval(timerRef.current); onLeave(); return 0; }
        return p - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior:'smooth' }); }, [messages, peerTyping]);

  const send = () => {
    if (!input.trim()) return;
    onSend(input.trim());
    setInput('');
  };

  return (
    <div style={{ height:'100vh', background:BG, display:'flex', flexDirection:'column', color:TEXT, maxWidth:600, margin:'0 auto' }}>
      <style>{`
        @keyframes bop{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
        .dot{width:7px;height:7px;border-radius:50%;background:${MUTED};display:inline-block;animation:bop 0.6s ease-in-out infinite}
        @keyframes fi{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        .msg{animation:fi 0.2s ease}
        input:focus{outline:none}
        input::placeholder{color:rgba(245,240,232,0.25)}
      `}</style>

      {/* Top bar */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px 20px 10px', flexShrink:0 }}>
        <div style={{ width:32, height:32, borderRadius:10, background:ACCENT, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <span style={{ color:BG, fontSize:14, fontWeight:800 }}>L</span>
        </div>
        <div style={{ background:CARD, padding:'5px 16px', borderRadius:9999 }}>
          <span style={{ color: timeLeft < 60 ? '#e05555' : ACCENT, fontSize:13, fontWeight:600, fontVariantNumeric:'tabular-nums' }}>{fmt(timeLeft)}</span>
        </div>
      </div>

      {/* Prompt card */}
      <div style={{ margin:'0 16px 10px', background:CARD, borderRadius:12, borderLeft:`3px solid ${ACCENT}`, padding:'13px 14px', display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
        <p style={{ flex:1, color:TEXT, fontSize:13, lineHeight:1.55, margin:0, opacity:0.88 }}>{prompt}</p>
        <button onClick={onNewPrompt} style={{ width:32, height:32, borderRadius:'50%', border:`1.5px solid ${ACCENT}`, background:'transparent', color:ACCENT, fontSize:16, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>↺</button>
      </div>

      {/* Messages */}
      <div style={{ flex:1, overflowY:'auto', padding:'6px 16px 4px' }}>
        {messages.length === 0 && (
          <div style={{ textAlign:'center', padding:'40px 16px' }}>
            <p style={{ color:MUTED, fontSize:13, lineHeight:1.85, margin:0 }}>You're connected 🔒<br />No names. No profiles. Just real.</p>
          </div>
        )}
        {messages.map(m => (
          <div key={m.id} className="msg" style={{ display:'flex', justifyContent: m.mine ? 'flex-end' : 'flex-start', marginBottom:8 }}>
            <div style={{ maxWidth:'76%', padding:'11px 17px', borderRadius:22, background: m.mine ? ACCENT : CARD, color: m.mine ? BG : TEXT, fontSize:15, lineHeight:1.45 }}>
              {m.text}
            </div>
          </div>
        ))}
        {peerTyping && (
          <div style={{ display:'flex', marginBottom:8 }}>
            <div style={{ background:CARD, padding:'12px 16px', borderRadius:22, display:'flex', gap:5, alignItems:'center' }}>
              <div className="dot" /><div className="dot" style={{ animationDelay:'0.15s' }} /><div className="dot" style={{ animationDelay:'0.3s' }} />
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div style={{ padding:'8px 16px 6px', display:'flex', gap:10, borderTop:'1px solid rgba(255,255,255,0.05)', flexShrink:0, alignItems:'center' }}>
        <input
          value={input}
          onChange={e => { setInput(e.target.value); onTyping(); }}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
          placeholder="Say something..."
          style={{ flex:1, background:CARD, color:TEXT, border:'none', borderRadius:22, padding:'12px 18px', fontSize:15 }}
        />
        <button onClick={send} disabled={!input.trim()} style={{ width:44, height:44, borderRadius:'50%', background: input.trim() ? ACCENT : 'rgba(244,162,97,0.14)', border:'none', color:BG, fontSize:20, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'background 0.15s' }}>↑</button>
      </div>
      <div style={{ textAlign:'center', padding:'6px 0 14px' }}>
        <button onClick={onLeave} style={{ background:'none', border:'none', color:'rgba(245,240,232,0.22)', fontSize:12 }}>End session</button>
      </div>
    </div>
  );
}
