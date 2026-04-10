"use client";

import { useEffect, useState, useRef } from "react";

/**
 * Combina navigator.onLine + estado do Socket.IO para detecção robusta de status online.
 * Recebe socketConnected como parâmetro para evitar duplicar a conexão Socket.IO.
 * Debounce de 3s na transição para offline para evitar flicker.
 */
export function useOnlineStatus(socketConnected: boolean) {
  const [browserOnline, setBrowserOnline] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const offlineTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Inicializar com valor real do browser (evita hydration mismatch)
  useEffect(() => {
    setBrowserOnline(navigator.onLine);
  }, []);

  // Escutar eventos online/offline do browser
  useEffect(() => {
    const handleOnline = () => setBrowserOnline(true);
    const handleOffline = () => setBrowserOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Combina sinais com debounce de 3s para offline
  useEffect(() => {
    const reallyOnline = browserOnline && socketConnected;

    if (reallyOnline) {
      // Volta online imediatamente
      if (offlineTimerRef.current) {
        clearTimeout(offlineTimerRef.current);
        offlineTimerRef.current = null;
      }
      setIsOnline(true);
    } else {
      // Debounce de 3s antes de declarar offline
      if (!offlineTimerRef.current) {
        offlineTimerRef.current = setTimeout(() => {
          setIsOnline(false);
          offlineTimerRef.current = null;
        }, 3000);
      }
    }

    return () => {
      if (offlineTimerRef.current) {
        clearTimeout(offlineTimerRef.current);
        offlineTimerRef.current = null;
      }
    };
  }, [browserOnline, socketConnected]);

  return { isOnline, browserOnline, socketConnected };
}
