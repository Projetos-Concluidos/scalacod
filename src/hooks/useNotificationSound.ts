import { useRef, useCallback, useEffect } from "react";

export function useNotificationSound() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio("/sounds/push.mp3");
    audioRef.current.volume = 0.7;
  }, []);

  const play = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }

    // Browser notification
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("ScalaCOD 🥷", {
        body: "Nova mensagem recebida no WhatsApp",
        icon: "/favicon.ico",
      });
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if ("Notification" in window && Notification.permission === "default") {
      await Notification.requestPermission();
    }
  }, []);

  return { play, requestPermission };
}
