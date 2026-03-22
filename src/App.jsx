import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useSocket } from './useSocket';
import { generateKeyPair, exportPublicKey, importPublicKey, deriveSharedKey, encryptMessage, decryptMessage } from './crypto';
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
  const [peerBlocked, setPeerBlocked] = useState(false);
  const [reconnectState, setReconnectState] = useState('idle');
  const [incomingFromId, setIncomingFromId] = useState(null);
  const [peerId, setPeerId] = useState(null);

  const typingTimer = useRef(null);
  const peerIdRef = useRef(null);
  const tagsRef = useRef([]);
  const screenRef = useRef('onboarding');
  screenRef.current = screen;

  // Crypto refs
  const keyPairRef = useRef(null);
  const sharedKeyRef = useRef(null);

  const handleMessage = useCallback(async (msg) => {
    if (msg.type === 'waiting') setScreen('matching');

    if (msg.type === 'matched') {
      setPrompt(msg.prompt);
      setMessages([]);
      setReconnectState('idle');
      setIncomingFromId(null);
      setPeerId(null);
      peerIdRef.current = null;
      sharedKeyRef.current = null;
      setScreen('conversation');

      // Generate key pair and send public key to peer
      try {
        const kp = await generateKeyPair();
        keyPairRef.current = kp;
        const pubKey = await exportPublicKey(kp);
        // send via socket after small delay to ensure conversation screen is mounted
        setTimeout(() => {
          sendRef.current({ type: 'public_key', publicKey: pubKey });
        }, 200);
      } catch(e) { console.error('Crypto init error:', e); }
    }

    if (msg.type === 'peer_public_key') {
      // Derive shared key from peer's public key
      try {
        const peerPubKey = await importPublicKey(msg.publicKey);
        const shared = await deriveSharedKey(keyPairRef.current, peerPubKey);
        sharedKeyRef.current = shared;
        console.log('[Luma] E2E encryption established ✅');
      } catch(e) { console.error('Key exchange error:', e); }
    }

    if (msg.type === 'message') {
      let text = msg.text;
      // Decrypt if we have a shared key
      if (sharedKeyRef.current) {
        try { text = await decryptMessage(sharedKeyRef.current, msg.text); } catch(e) { console.warn('Decrypt failed:', e); }
      }
      setMessages(prev => [...prev, { id: Date.now(), text, mine: false }]);
    }

    if (msg.type === 'typing') {
      setPeerTyping(true);
      clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => setPeerTyping(false), 2000);
    }

    if (msg.type === 'prompt') setPrompt(msg.prompt);

    if (msg.type === 'session_ended') {
      peerIdRef.current = msg.peerId;
      setPeerId(msg.peerId);
      setScreen('wrap');
    }

    if (msg.type === 'peer_left') {
      peerIdRef.current = msg.peerId;
      setPeerId(msg.peerId);
      setScreen('wrap');
    }

    if (msg.type === 'peer_message_blocked') {
      setPeerBlocked(true);
      setTimeout(() => setPeerBlocked(false), 4500);
    }

    if (msg.type === 'reconnect_incoming') {
      setIncomingFromId(msg.fromId);
      setReconnectState('incoming');
    }

    if (msg.type === 'reconnect_expired') setReconnectState('expired');
    if (msg.type === 'reconnect_declined') setReconnectState('declined');
  }, []);

  const { send, connected } = useSocket(handleMessage);
  const sendRef = useRef(send);
  sendRef.current = send;

  useEffect(() => {
    if (connected && screenRef.current === 'matching' && tagsRef.current.length > 0) {
      send({ type: 'join', tags: tagsRef.current });
    }
  }, [connected]);

  const handleJoin = useCallback((selectedTags) => {
    tagsRef.current = selectedTags;
    setTags(selectedTags);
    setScreen('matching');
    send({ type: 'join', tags: selectedTags });
  }, [send]);

  const handleSend = async (text) => {
    let payload = text;
    // Wait up to 3s for shared key to be ready
    if (!sharedKeyRef.current) {
      await new Promise(resolve => {
        const check = setInterval(() => {
          if (sharedKeyRef.current) { clearInterval(check); resolve(); }
        }, 100);
        setTimeout(() => { clearInterval(check); resolve(); }, 3000);
      });
    }
    if (sharedKeyRef.current) {
      try { payload = await encryptMessage(sharedKeyRef.current, text); } catch(e) { console.warn('Encrypt failed:', e); }
    }
    setMessages(prev => [...prev, { id: Date.now(), text, mine: true }]);
    send({ type: 'message', text: payload });
  };

  const handleTyping = () => send({ type: 'typing' });
  const handleNewPrompt = () => send({ type: 'new_prompt' });
  const handleBlocked = (label) => send({ type: 'message_blocked', label });

  const handleLeave = useCallback(() => {
    send({ type: 'leave' });
  }, [send]);

  const handleReconnectRequest = () => {
    if (!peerIdRef.current) return;
    setReconnectState('requesting');
    send({ type: 'reconnect_request', peerId: peerIdRef.current });
  };

  const handleReconnectAccept = () => {
    if (!incomingFromId) return;
    send({ type: 'reconnect_accept', fromId: incomingFromId });
  };

  const handleReconnectDecline = () => {
    if (!incomingFromId) return;
    send({ type: 'reconnect_decline', fromId: incomingFromId });
    setReconnectState('idle');
    setIncomingFromId(null);
  };

  const restart = () => {
    tagsRef.current = [];
    setTags([]); setMoodBefore(2); setMessages([]);
    setPrompt(''); peerIdRef.current = null; setPeerId(null);
    setReconnectState('idle'); setIncomingFromId(null);
    keyPairRef.current = null; sharedKeyRef.current = null;
    setScreen('onboarding');
  };

  return (
    <>
      {screen === 'onboarding' && <Onboarding onContinue={(t) => { setTags(t); setScreen('mood'); }} />}
      {screen === 'mood' && <Mood tags={tags} mood={moodBefore} setMood={setMoodBefore} onFind={() => handleJoin(tags)} />}
      {screen === 'matching' && <Matching tags={tags} onCancel={() => { send({ type: 'leave' }); restart(); }} />}
      {screen === 'conversation' && (
        <Conversation
          messages={messages} prompt={prompt}
          peerTyping={peerBlocked ? 'blocked' : peerTyping}
          onSend={handleSend} onTyping={handleTyping}
          onNewPrompt={handleNewPrompt} onLeave={handleLeave}
          onBlocked={handleBlocked}
        />
      )}
      {screen === 'wrap' && (
        <Wrap
          moodBefore={moodBefore}
          onRestart={restart}
          canReconnect={!!peerId}
          reconnectState={reconnectState}
          onReconnectRequest={handleReconnectRequest}
          onReconnectAccept={handleReconnectAccept}
          onReconnectDecline={handleReconnectDecline}
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
          <div className="ring" /><div className="ring" style={{ animationDelay:'0.67s' }} /><div className="ring" style={{ animationDelay:'1.33s' }} />
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
