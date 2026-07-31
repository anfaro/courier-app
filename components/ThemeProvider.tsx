// components/ThemeProvider.tsx
"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type ThemeMode = "light" | "dark";
type ThemeStyle = "md3" | "clay";

interface ThemeContextType {
  theme: ThemeMode;
  style: ThemeStyle;
  toggleTheme: (e?: React.MouseEvent) => void;
  setTheme: (mode: ThemeMode, options?: { x?: number, y?: number }) => void;
  setStyle: (style: ThemeStyle) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function applyDomClasses(mode: ThemeMode, style: ThemeStyle) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", mode === "dark");
  document.documentElement.classList.toggle("clay", style === "clay");
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>("light");
  const [style, setStyleState] = useState<ThemeStyle>("md3");

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const initialTheme: ThemeMode = (savedTheme === "light" || savedTheme === "dark")
      ? savedTheme
      : (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");

    const savedStyle = localStorage.getItem("theme-style");
    const initialStyle: ThemeStyle = savedStyle === "clay" ? "clay" : "md3";

    setThemeState(initialTheme);
    setStyleState(initialStyle);
    applyDomClasses(initialTheme, initialStyle);
  }, []);

  const setTheme = (newTheme: ThemeMode, options?: { x?: number, y?: number }) => {
    const updateDOM = () => {
      setThemeState(newTheme);
      localStorage.setItem("theme", newTheme);
      applyDomClasses(newTheme, style);
    };

    if (typeof document === "undefined" || !document.startViewTransition) {
      updateDOM();
      return;
    }

    const transition = document.startViewTransition(updateDOM);

    if (options?.x !== undefined && options?.y !== undefined) {
      const { x, y } = options;
      const right = window.innerWidth - x;
      const bottom = window.innerHeight - y;
      const maxRadius = Math.hypot(Math.max(x, right), Math.max(y, bottom));

      transition.ready.then(() => {
        document.documentElement.animate(
          {
            clipPath: [
              `circle(0px at ${x}px ${y}px)`,
              `circle(${maxRadius}px at ${x}px ${y}px)`,
            ],
          },
          {
            duration: 500,
            easing: "ease-in-out",
            pseudoElement: "::view-transition-new(root)",
          }
        );
      });
    }
  };

  const setStyle = (newStyle: ThemeStyle) => {
    const updateDOM = () => {
      setStyleState(newStyle);
      localStorage.setItem("theme-style", newStyle);
      applyDomClasses(theme, newStyle);
    };

    if (typeof document === "undefined" || !document.startViewTransition) {
      updateDOM();
      return;
    }

    document.startViewTransition(updateDOM);
  };

  const toggleTheme = (e?: React.MouseEvent) => {
    const newTheme = theme === "light" ? "dark" : "light";
    if (e) {
      setTheme(newTheme, { x: e.clientX, y: e.clientY });
    } else {
      setTheme(newTheme);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, style, toggleTheme, setTheme, setStyle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
