declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

const GA_ENABLED = typeof window !== "undefined" && !!window.gtag;

export const trackEvent = (
  name: string,
  params?: Record<string, any>
) => {
  if (!GA_ENABLED) {
    console.warn('GA4 not initialized');
    return;
  }
  window.gtag?.("event", name, params || {});
  console.log('GA4 Event:', name, params);
};

export const trackHintShown = (topic: string, attempt: number) =>
  trackEvent("hint_shown", { topic, attempt });

export const trackSolutionUnlocked = (topic: string, attempt: number) =>
  trackEvent("solution_unlocked", { topic, attempt });

export const trackAttemptSubmitted = (topic: string, attempt: number) =>
  trackEvent("attempt_submitted", { topic, attempt });

export const trackModeSwitched = (mode: "chat" | "learning") =>
  trackEvent("mode_switched", { mode });

export const trackTimeTravelToggled = (enabled: boolean) =>
  trackEvent("time_travel_toggled", { enabled });

export const trackSessionCreated = (sessionTitle: string) =>
  trackEvent("session_created", { session_title: sessionTitle });

export const trackWeatherRequested = (city: string) =>
  trackEvent("weather_requested", { city });

export const trackNewsRequested = (query: string) =>
  trackEvent("news_requested", { query });
