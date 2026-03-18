import { useEffect, useRef, useCallback } from 'react';

const WS_URL = 'wss://lumabackend.up.railway.app';

export function useSocket(onMessage) {
  const wsRef = useRef(null);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    let reconnectTimer = null;

    const connect = () => {
      console.log('[Luma] Connecting to', WS_URL);
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => console.log('[Luma] Connected ✅');

      ws.onmessage = (e) => {
        try { onMessageRef.current(JSON.parse(e.data)); } catch {}
      };

      ws.onerror = (e) => console.error('[Luma] WebSocket error ❌', e);

      ws.onclose = (e) => {
        console.warn('[Luma] Connection closed. Code:', e.code, 'Reason:', e.reason);
        reconnectTimer = setTimeout(connect, 2000);
      };
    };

    connect();

    return () => {
      clearTimeout(reconnectTimer);
      wsRef.current?.close();
    };
  }, []);

  const send = useCallback((data) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    } else {
      console.warn('[Luma] Cannot send — not connected. State:', wsRef.current?.readyState);
    }
  }, []);

  return { send };
}
