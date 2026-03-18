import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

const SERVER_URL = 'https://lumabackend.up.railway.app';

export function useSocket(onMessage) {
  const socketRef = useRef(null);
  const onMessageRef = useRef(onMessage);
  const pendingRef = useRef([]);
  onMessageRef.current = onMessage;

  useEffect(() => {
    const socket = io(SERVER_URL, {
      transports: ['polling', 'websocket'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[Luma] Connected ✅', socket.id);
      // Flush any pending messages
      pendingRef.current.forEach(({ type, rest }) => socket.emit(type, rest));
      pendingRef.current = [];
    });

    socket.on('disconnect', (r) => console.warn('[Luma] Disconnected:', r));
    socket.on('connect_error', (e) => console.error('[Luma] Error:', e.message));

    const events = ['waiting','matched','message','typing','prompt','peer_left','reconnect_waiting','reconnect_expired'];
    events.forEach(event => {
      socket.on(event, (data) => {
        onMessageRef.current({ type: event, ...(data || {}) });
      });
    });

    return () => socket.disconnect();
  }, []);

  const send = useCallback((data) => {
    const { type, ...rest } = data;
    const socket = socketRef.current;
    if (socket?.connected) {
      socket.emit(type, rest);
    } else {
      // Queue it until connected
      console.log('[Luma] Queuing message:', type);
      pendingRef.current.push({ type, rest });
    }
  }, []);

  return { send };
}
