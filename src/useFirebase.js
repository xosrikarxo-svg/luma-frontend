/**
 * useFirebase.js  –  drop-in replacement for useSocket.js
 *
 * Keeps the exact same { send, connected } API so App.jsx barely changes.
 * Matching, messaging, typing, prompts, reconnects — all via Firestore.
 * E2E encryption (crypto.js) is completely untouched; we just relay
 * public keys through Firestore instead of Socket.io.
 */
import { useEffect, useRef, useCallback } from 'react';
import { db } from './firebase';
import {
  doc, collection,
  setDoc, getDoc, getDocs, deleteDoc, updateDoc, addDoc,
  onSnapshot, query, where, orderBy, limit,
  serverTimestamp, runTransaction,
} from 'firebase/firestore';

// ─── Conversation prompts (copied from old server.js) ────────────────────────
const PROMPTS = [
  "What's something you've been thinking about lately?",
  "If you could master any skill instantly, what would it be?",
  "What's the last thing that genuinely made you laugh?",
  "What's something small that always improves your mood?",
  "If you had a completely free day tomorrow, what would you do?",
  "What's something you've changed your mind about recently?",
  "What's a place that made you feel completely at home?",
  "What's something you wish more people talked about?",
  "What's the most interesting thing you've learned this week?",
  "What does a perfect evening look like for you?",
];
const randPrompt = () => PROMPTS[Math.floor(Math.random() * PROMPTS.length)];
const genId     = () => crypto.randomUUID();

// ─── Hook ────────────────────────────────────────────────────────────────────
export function useFirebase(onMessage) {
  const userIdRef         = useRef(genId());   // anonymous user ID, lives for this tab session
  const sessionIdRef      = useRef(null);
  const myRoleRef         = useRef(null);       // 'A' (created session) | 'B' (was matched)
  const peerUserIdRef     = useRef(null);
  const unsubsRef         = useRef([]);
  const onMessageRef      = useRef(onMessage);
  const seenPeerKeyRef    = useRef(false);
  const seenMsgIdsRef     = useRef(new Set());
  const prevSessionRef    = useRef({});         // last-seen session doc snapshot

  onMessageRef.current = onMessage;

  // ── helpers ────────────────────────────────────────────────────────────────
  const cleanupSubs = useCallback(() => {
    unsubsRef.current.forEach(u => { try { u?.(); } catch (_) {} });
    unsubsRef.current = [];
  }, []);

  // ── on mount: listen for incoming reconnect requests ──────────────────────
  useEffect(() => {
    const userId = userIdRef.current;

    const q = query(
      collection(db, 'reconnects'),
      where('to',     '==', userId),
      where('status', '==', 'pending'),
    );
    const unsub = onSnapshot(q, snap => {
      snap.docChanges().forEach(change => {
        if (change.type === 'added') {
          onMessageRef.current({
            type:   'reconnect_incoming',
            fromId: change.doc.data().from,
          });
        }
      });
    });

    return () => {
      unsub();
      // clean up waiting entry if the tab closes while queuing
      deleteDoc(doc(db, 'waiting', userId)).catch(() => {});
    };
  }, []);

  // ── listen to an active session ────────────────────────────────────────────
  const listenToSession = useCallback(sessionId => {
    const userId = userIdRef.current;
    const subs   = [];

    // 1. Session document (public keys, status, prompt changes)
    subs.push(onSnapshot(doc(db, 'sessions', sessionId), snap => {
      if (!snap.exists()) return;
      const data = snap.data();
      const prev = prevSessionRef.current;
      const role = myRoleRef.current;
      const peerKeyField = role === 'A' ? 'publicKeyB' : 'publicKeyA';

      // Peer's public key arrived → E2E handshake
      if (data[peerKeyField] && !seenPeerKeyRef.current) {
        seenPeerKeyRef.current = true;
        onMessageRef.current({ type: 'peer_public_key', publicKey: data[peerKeyField] });
      }

      // Session ended by the other person
      if (data.status === 'ended' && prev.status !== 'ended' && data.endedBy !== userId) {
        onMessageRef.current({ type: 'peer_left', peerId: data.endedBy });
      }

      // Prompt changed (new_prompt by either side)
      if (prev.prompt !== undefined && data.prompt !== prev.prompt) {
        onMessageRef.current({ type: 'prompt', prompt: data.prompt });
      }

      prevSessionRef.current = data;
    }));

    // 2. Messages subcollection
    subs.push(onSnapshot(
      query(collection(db, 'sessions', sessionId, 'messages'), orderBy('timestamp')),
      snap => {
        snap.docChanges().forEach(change => {
          if (change.type !== 'added') return;
          const msgId = change.doc.id;
          const data  = change.doc.data();
          if (data.from === userId)             return; // own message
          if (seenMsgIdsRef.current.has(msgId)) return;
          seenMsgIdsRef.current.add(msgId);

          if (data.msgType === 'blocked') {
            onMessageRef.current({ type: 'peer_message_blocked', label: data.label });
          } else {
            onMessageRef.current({ type: 'message', text: data.text });
          }
        });
      }
    ));

    // 3. Typing signal (shared doc, overwrites)
    subs.push(onSnapshot(doc(db, 'sessions', sessionId, 'signals', 'typing'), snap => {
      if (!snap.exists()) return;
      const data = snap.data();
      if (data.from === userId) return;
      // Only fire if the signal is fresh (< 3 s old to account for clock skew)
      const ts = data.timestamp?.toMillis?.() ?? 0;
      if (Date.now() - ts < 3500) {
        onMessageRef.current({ type: 'typing' });
      }
    }));

    unsubsRef.current.push(...subs);
  }, []);

  // ── join the waiting pool and listen for a match ───────────────────────────
  const joinWaitingPool = useCallback(async tags => {
    const userId = userIdRef.current;

    await setDoc(doc(db, 'waiting', userId), {
      tags,
      joinedAt: serverTimestamp(),
    });

    onMessageRef.current({ type: 'waiting' });

    // Listen for a session where we are userB (created by someone else)
    let resolved = false;
    const q = query(
      collection(db, 'sessions'),
      where('userB', '==', userId),
    );
    const unsub = onSnapshot(q, snap => {
      if (resolved || sessionIdRef.current) return;
      const active = snap.docs.find(d => d.data().status === 'active');
      if (!active) return;

      resolved = true;
      const data = active.data();
      sessionIdRef.current  = active.id;
      myRoleRef.current     = 'B';
      peerUserIdRef.current = data.userA;
      seenPeerKeyRef.current = false;
      seenMsgIdsRef.current  = new Set();
      prevSessionRef.current = data;

      onMessageRef.current({ type: 'matched', prompt: data.prompt });
      listenToSession(active.id);
      unsub();
    });

    unsubsRef.current.push(unsub);
  }, [listenToSession]);

  // ── main send function (same API as useSocket) ─────────────────────────────
  const send = useCallback(async msgData => {
    const { type, ...rest } = msgData;
    const userId    = userIdRef.current;
    const sessionId = sessionIdRef.current;

    // ── JOIN ──────────────────────────────────────────────────────────────────
    if (type === 'join') {
      const { tags } = rest;

      // Reset everything
      cleanupSubs();
      sessionIdRef.current   = null;
      myRoleRef.current      = null;
      peerUserIdRef.current  = null;
      seenPeerKeyRef.current = false;
      seenMsgIdsRef.current  = new Set();
      prevSessionRef.current = {};

      // Look for a waiting peer that shares at least one tag
      try {
        let matchedPeer = null;

        for (const tag of tags) {
          const snap = await getDocs(
            query(collection(db, 'waiting'), where('tags', 'array-contains', tag), limit(15))
          );
          const candidates = snap.docs.filter(d => d.id !== userId);
          if (candidates.length > 0) {
            // Pick randomly so we don't always grab the longest-waiting person
            matchedPeer = candidates[Math.floor(Math.random() * candidates.length)];
            break;
          }
        }

        if (matchedPeer) {
          const newSessionId = genId();
          const prompt       = randPrompt();
          const peerId       = matchedPeer.id;

          try {
            await runTransaction(db, async t => {
              // Verify peer is still waiting (race-condition guard)
              const peerSnap = await t.get(doc(db, 'waiting', peerId));
              if (!peerSnap.exists()) throw new Error('peer_gone');

              t.delete(doc(db, 'waiting', peerId));
              t.delete(doc(db, 'waiting', userId));
              t.set(doc(db, 'sessions', newSessionId), {
                userA:       userId,
                userB:       peerId,
                prompt,
                publicKeyA:  null,
                publicKeyB:  null,
                status:      'active',
                createdAt:   serverTimestamp(),
              });
            });

            sessionIdRef.current  = newSessionId;
            myRoleRef.current     = 'A';
            peerUserIdRef.current = peerId;
            prevSessionRef.current = {
              prompt, publicKeyA: null, publicKeyB: null, status: 'active',
            };

            onMessageRef.current({ type: 'matched', prompt });
            listenToSession(newSessionId);

          } catch (_) {
            // Race condition — peer was claimed by someone else, join queue
            await joinWaitingPool(tags);
          }
        } else {
          await joinWaitingPool(tags);
        }

      } catch (err) {
        console.error('[Luma] Join error:', err);
        await joinWaitingPool(tags);
      }
    }

    // ── PUBLIC KEY (E2E handshake) ────────────────────────────────────────────
    if (type === 'public_key' && sessionId) {
      const keyField = myRoleRef.current === 'A' ? 'publicKeyA' : 'publicKeyB';
      await updateDoc(doc(db, 'sessions', sessionId), { [keyField]: rest.publicKey });
    }

    // ── MESSAGE ───────────────────────────────────────────────────────────────
    if (type === 'message' && sessionId) {
      await addDoc(collection(db, 'sessions', sessionId, 'messages'), {
        from:      userId,
        text:      rest.text,
        timestamp: serverTimestamp(),
      });
    }

    // ── MESSAGE BLOCKED (relay to peer as a system message) ───────────────────
    if (type === 'message_blocked' && sessionId) {
      await addDoc(collection(db, 'sessions', sessionId, 'messages'), {
        from:      userId,
        msgType:   'blocked',
        label:     rest.label,
        timestamp: serverTimestamp(),
      });
    }

    // ── TYPING ────────────────────────────────────────────────────────────────
    if (type === 'typing' && sessionId) {
      // fire-and-forget: overwrite the shared typing signal doc
      setDoc(doc(db, 'sessions', sessionId, 'signals', 'typing'), {
        from:      userId,
        timestamp: serverTimestamp(),
      }).catch(() => {});
    }

    // ── NEW PROMPT ────────────────────────────────────────────────────────────
    if (type === 'new_prompt' && sessionId) {
      const newPrompt = randPrompt();
      // Optimistically update locally so there's no perceived delay
      prevSessionRef.current = { ...prevSessionRef.current, prompt: newPrompt };
      onMessageRef.current({ type: 'prompt', prompt: newPrompt });
      // Then persist so the peer's listener fires too
      await updateDoc(doc(db, 'sessions', sessionId), { prompt: newPrompt });
    }

    // ── LEAVE ─────────────────────────────────────────────────────────────────
    if (type === 'leave') {
      if (sessionId) {
        updateDoc(doc(db, 'sessions', sessionId), {
          status:  'ended',
          endedBy: userId,
        }).catch(() => {});
      }
      deleteDoc(doc(db, 'waiting', userId)).catch(() => {});
      onMessageRef.current({ type: 'session_ended', peerId: peerUserIdRef.current });
      cleanupSubs();
      sessionIdRef.current  = null;
      peerUserIdRef.current = null;
    }

    // ── RECONNECT REQUEST ─────────────────────────────────────────────────────
    if (type === 'reconnect_request' && rest.peerId) {
      const reqRef = doc(collection(db, 'reconnects'));
      await setDoc(reqRef, {
        from:      userId,
        to:        rest.peerId,
        status:    'pending',
        timestamp: serverTimestamp(),
      });

      // Watch for a response
      const unsubReq = onSnapshot(reqRef, async snap => {
        if (!snap.exists()) return;
        const status = snap.data().status;
        if (status === 'declined') {
          onMessageRef.current({ type: 'reconnect_declined' });
          unsubReq();
          deleteDoc(reqRef).catch(() => {});
        }
        if (status === 'accepted') {
          unsubReq();

          // Read the session ID directly from the reconnect doc — no querying
          const newSessionId = snap.data().newSessionId;
          if (!newSessionId) return;

          const sessSnap = await getDoc(doc(db, 'sessions', newSessionId));
          if (!sessSnap.exists()) return;
          const sessData = sessSnap.data();

          cleanupSubs();
          sessionIdRef.current   = newSessionId;
          myRoleRef.current      = 'B';
          peerUserIdRef.current  = sessData.userA;
          seenPeerKeyRef.current = false;
          seenMsgIdsRef.current  = new Set();
          prevSessionRef.current = sessData;

          onMessageRef.current({ type: 'matched', prompt: sessData.prompt });
          listenToSession(newSessionId);
          deleteDoc(reqRef).catch(() => {});
        }
      });
      unsubsRef.current.push(unsubReq);

      // Auto-expire after 15 s (mirrors original server behaviour)
      setTimeout(() => {
        onMessageRef.current({ type: 'reconnect_expired' });
        deleteDoc(reqRef).catch(() => {});
      }, 15_000);
    }

    // ── RECONNECT ACCEPT ──────────────────────────────────────────────────────
    if (type === 'reconnect_accept' && rest.fromId) {
      const q = query(
        collection(db, 'reconnects'),
        where('from',   '==', rest.fromId),
        where('to',     '==', userId),
        where('status', '==', 'pending'),
      );
      const snap = await getDocs(q);
      if (snap.empty) return;

      const reqDoc = snap.docs[0];

      // Create fresh session FIRST so the ID exists before we notify user1
      const newSessionId = genId();
      const prompt       = randPrompt();
      await setDoc(doc(db, 'sessions', newSessionId), {
        userA:      userId,
        userB:      rest.fromId,
        prompt,
        publicKeyA: null,
        publicKeyB: null,
        status:     'active',
        createdAt:  serverTimestamp(),
      });

      // Write newSessionId into the reconnect doc THEN mark accepted
      // User1 reads the session ID directly — no ambiguous querying
      await updateDoc(reqDoc.ref, { status: 'accepted', newSessionId });

      cleanupSubs();
      sessionIdRef.current   = newSessionId;
      myRoleRef.current      = 'A';
      peerUserIdRef.current  = rest.fromId;
      seenPeerKeyRef.current = false;
      seenMsgIdsRef.current  = new Set();
      prevSessionRef.current = { prompt, publicKeyA: null, publicKeyB: null, status: 'active' };

      onMessageRef.current({ type: 'matched', prompt });
      listenToSession(newSessionId);
      deleteDoc(reqDoc.ref).catch(() => {});
    }

    // ── RECONNECT DECLINE ─────────────────────────────────────────────────────
    if (type === 'reconnect_decline' && rest.fromId) {
      const q = query(
        collection(db, 'reconnects'),
        where('from',   '==', rest.fromId),
        where('to',     '==', userId),
        where('status', '==', 'pending'),
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        await updateDoc(snap.docs[0].ref, { status: 'declined' });
        deleteDoc(snap.docs[0].ref).catch(() => {});
      }
    }

  }, [listenToSession, joinWaitingPool, cleanupSubs]);

  // connected is always true — Firebase manages its own reconnection internally
  return { send, connected: true };
}
