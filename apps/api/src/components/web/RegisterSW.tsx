"use client";

import { useEffect } from "react";

export function RegisterSW() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    void navigator.serviceWorker
      .register("/sw.js", { scope: "/app" })
      .catch((err) => {
        console.warn("SW registration failed", err);
      });
  }, []);
  return null;
}
