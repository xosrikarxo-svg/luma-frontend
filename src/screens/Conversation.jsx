import React, { useState, useEffect, useRef } from 'react';
import Filter from 'bad-words';

const BG='#0D1B2A', CARD='#1E3045', ACCENT='#F4A261', TEXT='#F5F0E8', MUTED='rgba(245,240,232,0.45)';
const fmt = s => `${Math.floor(s/60)}:${(s%60).toString().padStart(2,'0')}`;

// ── CONTENT FILTER ─────────────────────────────────────────
const profanityFilter = new Filter();

// Add extra words not in the default list
profanityFilter.addWords(
  'kys','stfu','gtfo','nsfw','ngl','fml',
  'rape','r4pe','raping','rapist',
  'pedophile','pedo','paedo','groomer',
  'suicide','suicidal','selfharm','self-harm','self harm',
  'overdose','od','cutting myself',
  'onlyfans','only fans',
  'pornhub','xvideos','xhamster','redtube',
  'nigga','n1gga','nigg','wigger',
  'tranny','shemale','ladyboy',
  'incel','femcel','simp',
  'retard','r3tard','ret4rd','spastic',
  'terrorist','jihad','isis','nazi','hitler',
  'meth','heroin','cocaine','crack','fentanyl','weed','molly','mdma','lsd',
  'drug dealer','buy drugs','sell drugs'
);

// Personal info patterns
const PERSONAL_INFO_REGEX = /(\+?\d[\s\-.]?\(?\d{1,4}\)?[\s\-.]?\d{1,4}[\s\-.]?\d{1,9})|(@[a-zA-Z0-9_.]+)|(instagram|snapchat|whatsapp|telegram|discord|twitter|tiktok|facebook|wechat|line|viber)\s*[:=\-]?\s*\w+|(my number|call me|text me|dm me|my insta|my snap|my discord|my ig|my twitter|my tiktok|add me on|follow me on|find me on)/i;

// Name detection
const NAME_REGEX = /\b(my name is|i am|i'm|im|call me|they call me|people call me|you can call me|it's|its)\s+([A-Z][a-z]{1,15}|[a-z]{2,15})\b/i;

// Violence / threats
const VIOLENCE_REGEX = /\b(kill yourself|hang yourself|shoot yourself|cut yourself|kys|i will kill|ill kill|imma kill|i will hurt|i will find you|i know where you live|come find you|i will rape|go die|drop dead|i'll hurt)\b/i;

function filterMessage(text) {
  try {
    if (profanityFilter.isProfane(text)) {
      return { blocked: true, label: 'Inappropriate language', tip: "Let's keep it respectful — this is a safe space for real connection." };
    }
  } catch(e) {}

  if (VIOLENCE_REGEX.test(text)) {
    return { blocked: true, label: 'Threatening language', tip: "Threats or violent language aren't allowed here." };
  }
  if (PERSONAL_INFO_REGEX.test(text)) {
    return { blocked: true, label: 'Personal information', tip: "Sharing contact info breaks your anonymity — that's the whole point of Luma." };
  }
  if (NAME_REGEX.test(text)) {
    return { blocked: true, label: 'Personal information', tip: "Stay anonymous — sharing your name removes the magic of this space." };
  }
  return { blocked: false };
}

// ── COMPONENT ──────────────────────────────────────────────
export default function Conversation({ messages, prompt, peerTyping, onSend, onTyping, onNewPrompt, onLeave }) {
  const [input, setInput] = useState('');
  const [timeLeft, setTimeLeft] = useState(20 * 60);
  const [warning, setWarning] = useState(null);
  const [warningVisible, setWarningVisible] = useState(false);
  const endRef = useRef(null);
  const timerRef = useRef(null);
  const warningTimer = useRef(null);

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

  const showWarning = (label, tip) => {
    setWarning({ label, tip });
    setWarningVisible(true);
    clearTimeout(warningTimer.current);
    warningTimer.current = setTimeout(() => setWarningVisible(false), 4500);
  };

  const send = () => {
    if (!input.trim()) return;
    const text = input.trim();
    const result = filterMessage(text);
    if (result.blocked) {
      setInput('');
      showWarning(result.label, result.tip);
      return;
    }
    setInput('');
    onSend(text);
  };

  return (
    <div style={{ height:'100vh', background:BG, display:'flex', flexDirection:'column', color:TEXT, maxWidth:600, margin:'0 auto', position:'relative', fontFamily:'system-ui,-apple-system,sans-serif' }}>
      <style>{`
        @keyframes bop{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
        .dot{width:7px;height:7px;border-radius:50%;background:${MUTED};display:inline-block;animation:bop 0.6s ease-in-out infinite}
        @keyframes fi{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        .msg{animation:fi 0.2s ease}
        @keyframes warnIn{from{opacity:0;transform:translateY(-100%)}to{opacity:1;transform:translateY(0)}}
        @keyframes warnOut{from{opacity:1;transform:translateY(0)}to{opacity:0;transform:translateY(-100%)}}
        .warn-in{animation:warnIn 0.2s ease forwards}
        .warn-out{animation:warnOut 0.2s ease forwards}
        input:focus{outline:none}input::placeholder{color:rgba(245,240,232,0.25)}
      `}</style>

      {/* Warning banner */}
      {warning && (
        <div
          className={warningVisible ? 'warn-in' : 'warn-out'}
          style={{
            position:'absolute', top:0, left:0, right:0, zIndex:100,
            background:'#b93232',
            padding:'12px 16px',
            display:'flex', alignItems:'flex-start', gap:10,
          }}
        >
          <span style={{ fontSize:18, flexShrink:0, lineHeight:1 }}>🚫</span>
          <div style={{ flex:1 }}>
            <p style={{ margin:0, fontSize:13, fontWeight:600, color:'#fff' }}>Message blocked — {warning.label}</p>
            <p style={{ margin:'3px 0 0', fontSize:12, color:'rgba(255,255,255,0.82)', lineHeight:1.45 }}>{warning.tip}</p>
          </div>
          <button onClick={() => setWarningVisible(false)} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.6)', fontSize:18, cursor:'pointer', flexShrink:0, lineHeight:1 }}>✕</button>
        </div>
      )}

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
        <button onClick={onNewPrompt} style={{ width:32, height:32, borderRadius:'50%', border:`1.5px solid ${ACCENT}`, background:'transparent', color:ACCENT, fontSize:16, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, cursor:'pointer' }}>↺</button>
      </div>

      {/* Messages */}
      <div style={{ flex:1, overflowY:'auto', padding:'6px 16px 4px' }}>
        {messages.length === 0 && (
          <div style={{ textAlign:'center', padding:'40px 16px' }}>
            <p style={{ color:MUTED, fontSize:13, lineHeight:1.85, margin:0 }}>You're connected 🔒<br/>No names. No profiles. Just real.</p>
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
              <div className="dot"/><div className="dot" style={{ animationDelay:'0.15s' }}/><div className="dot" style={{ animationDelay:'0.3s' }}/>
            </div>
          </div>
        )}
        <div ref={endRef}/>
      </div>

      {/* Input */}
      <div style={{ padding:'8px 16px 6px', display:'flex', gap:10, borderTop:'1px solid rgba(255,255,255,0.05)', flexShrink:0, alignItems:'center' }}>
        <input
          value={input}
          onChange={e => { setInput(e.target.value); onTyping(); }}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
          placeholder="Say something..."
          style={{ flex:1, background:CARD, color:TEXT, border:'none', borderRadius:22, padding:'12px 18px', fontSize:15, fontFamily:'inherit' }}
        />
        <button onClick={send} disabled={!input.trim()} style={{ width:44, height:44, borderRadius:'50%', background: input.trim() ? ACCENT : 'rgba(244,162,97,0.14)', border:'none', color:BG, fontSize:20, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'background 0.15s', cursor: input.trim() ? 'pointer' : 'default' }}>↑</button>
      </div>
      <div style={{ textAlign:'center', padding:'6px 0 14px' }}>
        <button onClick={onLeave} style={{ background:'none', border:'none', color:'rgba(245,240,232,0.22)', fontSize:12, cursor:'pointer' }}>End session</button>
      </div>
    </div>
  );
}
