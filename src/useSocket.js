import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

const SERVER_URL = 'https://lumabackend.up.railway.app';

export function useSocket(onMessage) {
  const socketRef = useRef(null);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    const socket = io(SERVER_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => console.log('[Luma] Connected ✅', socket.id));
    socket.on('disconnect', (r) => console.warn('[Luma] Disconnected:', r));
    socket.on('connect_error', (e) => console.error('[Luma] Error:', e.message));

    const events = ['waiting','matched','message','typing','prompt','peer_left','reconnect_waiting','reconnect_expired'];
    events.forEach(event => {
      socket.on(event, (data) => {
        onMessageRef.current({ type: event, ...data });
      });
    });

    return () => socket.disconnect();
  }, []);

  const send = useCallback((data) => {
    const { type, ...rest } = data;
    if (socketRef.current?.connected) {
      socketRef.current.emit(type, rest);
    } else {
      console.warn('[Luma] Not connected');
    }
  }, []);

  return { send };
}
