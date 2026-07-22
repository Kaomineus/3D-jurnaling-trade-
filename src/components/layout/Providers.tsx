"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "react-hot-toast";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "#1e293b",
            color: "#e2e8f0",
            border: "1px solid rgba(148, 163, 184, 0.1)",
            borderRadius: "12px",
            fontSize: "14px",
          },
          success: {
            iconTheme: {
              primary: "#34d399",
              secondary: "#1e293b",
            },
          },
          error: {
            iconTheme: {
              primary: "#f87171",
              secondary: "#1e293b",
            },
          },
        }}
      />
    </SessionProvider>
  );
}
