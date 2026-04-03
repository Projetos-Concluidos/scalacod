import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const AUDIO_TYPES = ["new_order", "payment_approved"];

export function useNotificationPush() {
  const { user } = useAuth();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio("/sounds/notification_kiwify.mp3");
    audioRef.current.volume = 0.8;
  }, []);

  const playAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (!user) return;

    // Request permission on mount
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    const channel = supabase
      .channel("push-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          const notif = payload.new as any;
          if (!notif) return;

          // Check user preferences
          const { data: prefs } = await supabase
            .from("notification_preferences" as any)
            .select("*")
            .eq("user_id", user.id)
            .maybeSingle();

          const p = prefs as any;
          const pushEnabled = p?.push_enabled ?? false;
          if (!pushEnabled) return;

          // Check per-type preference
          const typeMap: Record<string, string> = {
            new_order: "push_new_order",
            delivered: "push_delivered",
            frustrated: "push_frustrated",
            new_lead: "push_new_lead",
            low_tokens: "alert_low_tokens",
          };
          const prefKey = typeMap[notif.type];
          if (prefKey && p?.[prefKey] === false) return;

          // Play audio for new_order
          if (AUDIO_TYPES.includes(notif.type)) {
            playAudio();
          }

          // Browser notification
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification(notif.title || "ScalaCOD 🥷", {
              body: notif.body || "",
              icon: "/favicon.svg",
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, playAudio]);
}
