import { useEffect, useState } from "react";

interface StatusAnnouncerProps {
  message: string;
  priority?: "polite" | "assertive";
  clearAfter?: number; // milliseconds
}

export function StatusAnnouncer({ 
  message, 
  priority = "polite",
  clearAfter = 5000 
}: StatusAnnouncerProps) {
  const [currentMessage, setCurrentMessage] = useState(message);

  useEffect(() => {
    setCurrentMessage(message);
    
    if (clearAfter && message) {
      const timer = setTimeout(() => {
        setCurrentMessage("");
      }, clearAfter);
      
      return () => clearTimeout(timer);
    }
  }, [message, clearAfter]);

  return (
    <div
      aria-live={priority}
      aria-atomic="true"
      className="sr-only"
      data-testid="status-announcer"
    >
      {currentMessage}
    </div>
  );
}

// Hook for programmatic status announcements
export function useStatusAnnouncer() {
  const [announcement, setAnnouncement] = useState("");

  const announce = (message: string, priority: "polite" | "assertive" = "polite") => {
    setAnnouncement("");
    // Small delay ensures screen reader picks up the change
    setTimeout(() => setAnnouncement(message), 100);
  };

  const clear = () => setAnnouncement("");

  return { announcement, announce, clear };
}