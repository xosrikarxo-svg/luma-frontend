import { useEffect, useRef, useCallback } from 'react';

const WS_URL = 'wss://lumabackend.up.railway.app';

export function useSocket(onMessage) {
  const wsRef = useRef(null);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;
    ws.onmessage = (e) => {
      try { onMessageRef.current(JSON.parse(e.data)); } catch {}
    };
    ws.onerror = () => console.error('WS error');
    return () => ws.close();
  }, []);

  const send = useCallback((data) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  return { send };
}
