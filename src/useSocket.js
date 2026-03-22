import { useEffect, useRef, useCallback, useState } from 'react';
import { io } from 'socket.io-client';

const SERVER_URL = 'https://lumabackend.up.railway.app';

export function useSocket(onMessage) {
  const socketRef = useRef(null);
  const onMessageRef = useRef(onMessage);
  const [connected, setConnected] = useState(false);
  onMessageRef.current = onMessage;

  useEffect(() => {
    const socket = io(SERVER_URL, {
      transports: ['polling', 'websocket'],
      reconnectionAttempts: 20,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[Luma] Connected ✅', socket.id);
      setConnected(true);
    });

    socket.on('disconnect', (r) => {
      console.warn('[Luma] Disconnected:', r);
      setConnected(false);
    });

    socket.on('connect_error', (e) => console.error('[Luma] Error:', e.message));

    const events = [
      'waiting', 'matched', 'message', 'typing', 'prompt',
      'peer_left', 'session_ended',
      'reconnect_incoming', 'reconnect_expired', 'reconnect_declined', 'peer_message_blocked', 'peer_public_key'
    ];

    events.forEach(event => {
      socket.on(event, (data) => {
        onMessageRef.current({ type: event, ...(data || {}) });
      });
    });

    return () => socket.disconnect();
  }, []);

  const send = useCallback((data) => {
    const { type, ...rest } = data;
    if (socketRef.current?.connected) {
      socketRef.current.emit(type, rest);
    } else {
      console.warn('[Luma] Not connected, dropping:', type);
    }
  }, []);

  return { send, connected };
}
