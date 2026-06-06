'use client';

import { useEffect, useRef, useCallback, useMemo } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/auth-store';
import { socketUrl } from '@/lib/socket-config';

interface DataChangeEvent {
  entity: string;
  action: 'create' | 'update' | 'delete';
  data: any;
  timestamp: number;
}

export function useRealtime(
  onDataChange?: (event: DataChangeEvent) => void,
  entities?: string[]
) {
  const { token } = useAuthStore();
  const socketRef = useRef<Socket | null>(null);
  const onDataChangeRef = useRef(onDataChange);

  // Keep callback ref up to date
  useEffect(() => {
    onDataChangeRef.current = onDataChange;
  }, [onDataChange]);

  // Memoize entities so we don't create new array every time
  const memoizedEntities = useMemo(() => entities, [entities?.join(',')]);

  useEffect(() => {
    if (!token || typeof window === 'undefined') return;
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    const socket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      path: '/socket.io',
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[Realtime] Connected to server');
      socket.emit('joinAdminRoom');
    });

    socket.on('disconnect', (reason) => {
      console.log('[Realtime] Disconnected:', reason);
    });

    socket.on('connect_error', (error: any) => {
      // Silently handle connection errors - don't spam console
      const message = error?.message || error?.toString() || 'Unknown error';
      if (message.includes('websocket error')) {
        // WebSocket error is expected if server is down or CORS issues
        // Socket.io will automatically fallback to polling
        return;
      }
      console.error('[Realtime] Connection error:', message);
    });

    socket.on('error', (error: any) => {
      console.error('[Realtime] Socket error:', error?.message || error?.toString() || error);
    });

    socket.on('reconnect', (attemptNumber) => {
      console.log('[Realtime] Reconnected after', attemptNumber, 'attempts');
    });

    socket.on('reconnect_failed', () => {
      console.log('[Realtime] Failed to reconnect after maximum attempts');
    });

    socket.on('dataChange', (event: DataChangeEvent) => {
      console.log('[Realtime] Data change received:', event);
      
      // Filter by entities if specified
      if (memoizedEntities && memoizedEntities.length > 0) {
        if (!memoizedEntities.includes(event.entity)) {
          return;
        }
      }
      
      onDataChangeRef.current?.(event);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, memoizedEntities]);

  const emit = useCallback((event: string, data?: any) => {
    socketRef.current?.emit(event, data);
  }, []);

  return { socket: socketRef.current, emit };
}

// Helper hook for specific entity
export function useRealtimeEntity(
  entity: string,
  onChange?: (action: 'create' | 'update' | 'delete', data: any) => void
) {
  // Memoize entities array to prevent re-renders
  const entities = useMemo(() => [entity], [entity]);
  const memoizedOnChange = useCallback((action: 'create' | 'update' | 'delete', data: any) => {
    onChange?.(action, data);
  }, [onChange]);

  return useRealtime(
    useCallback((event) => {
      if (event.entity === entity) {
        memoizedOnChange(event.action, event.data);
      }
    }, [entity, memoizedOnChange]),
    entities
  );
}
