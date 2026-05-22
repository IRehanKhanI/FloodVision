import { useEffect, useRef, useState, useCallback } from 'react';

const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:8000/ws';

interface UseWebSocketReturn<T = unknown> {
  lastMessage: T | null;
  isConnected: boolean;
  sendMessage: (data: unknown) => void;
}

export function useWebSocket<T = unknown>(path: string): UseWebSocketReturn<T> {
  const [lastMessage, setLastMessage] = useState<T | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const reconnectAttemptsRef = useRef(0);
  const mountedRef = useRef(true);

  const connect = useCallback(() => {
    if (!mountedRef.current) return;

    const url = `${WS_BASE_URL}${path}`;

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) return;
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
        console.log(`[WS] Connected to ${path}`);
      };

      ws.onmessage = (event) => {
        if (!mountedRef.current) return;
        try {
          const parsed = JSON.parse(event.data) as T;
          setLastMessage(parsed);
        } catch {
          setLastMessage(event.data as unknown as T);
        }
      };

      ws.onclose = () => {
        if (!mountedRef.current) return;
        setIsConnected(false);
        console.log(`[WS] Disconnected from ${path}. Scheduling reconnect…`);

        // Exponential backoff reconnect, capped at 30 seconds
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
        reconnectAttemptsRef.current += 1;
        reconnectTimeoutRef.current = setTimeout(connect, delay);
      };

      ws.onerror = (err) => {
        console.error(`[WS] Error on ${path}:`, err);
        ws.close();
      };
    } catch (err) {
      console.error(`[WS] Failed to connect to ${path}:`, err);
    }
  }, [path]);

  useEffect(() => {
    mountedRef.current = true;
    connect();

    return () => {
      mountedRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  const sendMessage = useCallback((data: unknown) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(typeof data === 'string' ? data : JSON.stringify(data));
    } else {
      console.warn('[WS] Cannot send — not connected.');
    }
  }, []);

  return { lastMessage, isConnected, sendMessage };
}
