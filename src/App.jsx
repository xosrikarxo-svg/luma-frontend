import React, { useState, useRef, useCallback } from 'react';
import { useSocket } from './useSocket';
import Onboarding from './screens/Onboarding';
import Mood from './screens/Mood';
import Conversation from './screens/Conversation';
import Wrap from './screens/Wrap';

const BG='#0D1B2A', ACCENT='#F4A261', TEXT='#F5F0E8', MUTED='rgba(245,240,232,0.45)';

export default function App() {
  const [screen, setScreen] = useState('onboarding');
  const [tags, setTags] = useState([]);
  const [moodBefore, setMoodBefore] = useState(2);
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState([]);
  const [peerTyping, setPeerTyping] = useState(false);
  const [reconnectStatus, setReconnectStatus] = useState('');
  const typingTimer = useRef(null);
  const peerIdRef = useRef(null);

  const handleMessage = useCallback((msg) => {
    if (msg.type === 'joined') return;
    if (msg.type === 'waiting') setScreen('matching');
    if (msg.type === 'matched') {
      setPrompt(msg.prompt);
      setMessages([]);
      setReconnectStatus('');
      setScreen('conversation');
    }
    if (msg.type === 'message') {
      setMessages(prev => [...prev, { id: Date.now(), text: msg.text, mine: false }]);
    }
    if (msg.type === 'typing') {
      setPeerTyping(true);
      clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => setPeerTyping(false), 2000);
    }
    if (msg.type === 'prompt') setPrompt(msg.prompt);
    if (msg.type === 'peer_left') {
      peerIdRef.current = msg.peerId;
      setScreen('wrap');
    }
    if (msg.type === 'reconnect_waiting') setReconnectStatus('waiting');
    if (msg.type === 'reconnect_expired') setReconnectStatus('expired');
  }, []);

  const { send } = useSocket(handleMessage);

  const handleJoin = (selectedTags) => {
    setTags(selectedTags);
    send({ type: 'join', tags: selectedTags });
    setScreen('matching');
  };

  const handleSend = (text) => {
    setMessages(prev => [...prev, { id: Date.now(), text, mine: true }]);
    send({ type: 'message', text });
  };

  const handleTyping = () => send({ type: 'typing' });
  const handleNewPrompt = () => send({ type: 'new_prompt' });
  const handleLeave = () => {
    peerIdRef.current = null;
    send({ type: 'leave' });
    setScreen('wrap');
  };
  const handleReconnect = () => {
    if (!peerIdRef.current) return;
    send({ type: 'reconnect_request', peerId: peerIdRef.current });
  };
  const restart = () => {
    setTags([]); setMoodBefore(2); setMessages([]);
    setPrompt(''); peerIdRef.current = null;
    setReconnectStatus(''); setScreen('onboarding');
  };

  return (
    <>
      {screen === 'onboarding' && <Onboarding onContinue={(t) => { setTags(t); setScreen('mood'); }} />}
      {screen === 'mood' && <Mood tags={tags} mood={moodBefore} setMood={setMoodBefore} onFind={() => handleJoin(tags)} />}
      {screen === 'matching' && <Matching tags={tags} onCancel={() => { send({ type: 'leave' }); setScreen('onboarding'); }} />}
      {screen === 'conversation' && (
        <Conversation
          messages={messages} prompt={prompt} peerTyping={peerTyping}
          onSend={handleSend} onTyping={handleTyping}
          onNewPrompt={handleNewPrompt} onLeave={handleLeave}
        />
      )}
      {screen === 'wrap' && (
        <Wrap
          moodBefore={moodBefore}
          onRestart={restart}
          onReconnect={peerIdRef.current ? handleReconnect : null}
          reconnectStatus={reconnectStatus}
        />
      )}
    </>
  );
}

function Matching({ tags, onCancel }) {
  return (
    <div style={{ minHeight:'100vh', background:BG, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'space-between', padding:'60px 24px 48px', textAlign:'center', fontFamily:'system-ui,-apple-system,sans-serif', color:TEXT }}>
      <style>{`
        @keyframes pr { 0%{transform:scale(0.1);opacity:0.5} 100%{transform:scale(1);opacity:0} }
        .ring { position:absolute; width:200px; height:200px; border-radius:50%; border:1.5px solid ${ACCENT}; animation:pr 2s ease-out infinite; top:50%; left:50%; margin:-100px 0 0 -100px; }
      `}</style>
      <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
        <div style={{ position:'relative', width:200, height:200, marginBottom:36 }}>
          <div className="ring" />
          <div className="ring" style={{ animationDelay:'0.67s' }} />
          <div className="ring" style={{ animationDelay:'1.33s' }} />
          <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:16, height:16, borderRadius:8, background:ACCENT }} />
        </div>
        <p style={{ fontSize:16, opacity:0.8, margin:'0 0 12px' }}>Finding your match...</p>
        <p style={{ color:MUTED, fontSize:13, margin:'0 0 24px' }}>Completely anonymous · No names shared</p>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', justifyContent:'center', marginBottom:24 }}>
          {tags.map(t => <span key={t} style={{ padding:'6px 14px', borderRadius:9999, border:`1px solid ${ACCENT}`, color:ACCENT, fontSize:13 }}>{t}</span>)}
        </div>
        <div style={{ background:'rgba(244,162,97,0.07)', border:'1px solid rgba(244,162,97,0.12)', padding:'12px 24px', borderRadius:14 }}>
          <p style={{ color:TEXT, fontSize:13, opacity:0.6, margin:0 }}>🔒 Your name is never shared</p>
        </div>
      </div>
      <button onClick={onCancel} style={{ background:'none', border:'none', color:MUTED, fontSize:15, cursor:'pointer', fontFamily:'inherit' }}>Cancel</button>
    </div>
  );
}
