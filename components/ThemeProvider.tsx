// components/ThemeProvider.tsx
"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type ThemeMode = "light" | "dark";
type ThemeStyle = "md3" | "clay" | "neu" | "cli";

interface ThemeContextType {
  theme: ThemeMode;
  style: ThemeStyle;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
  setStyle: (style: ThemeStyle) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function applyDomClasses(mode: ThemeMode, style: ThemeStyle) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", mode === "dark");
  document.documentElement.classList.toggle("clay", style === "clay");
  document.documentElement.classList.toggle("neu", style === "neu");
  document.documentElement.classList.toggle("cli", style === "cli");
}

function syncStatusBar() {
  if (typeof document === "undefined") return;
  const color =
    getComputedStyle(document.documentElement)
      .getPropertyValue("--status-bar")
      .trim() || "#f4f6fb";

  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("name", "theme-color");
    document.head.appendChild(meta);
  }
  meta.setAttribute("content", color);
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
    const initialStyle: ThemeStyle = savedStyle === "clay" || savedStyle === "neu" || savedStyle === "cli" ? savedStyle : "md3";

    setThemeState(initialTheme);
    setStyleState(initialStyle);
    applyDomClasses(initialTheme, initialStyle);
    syncStatusBar();
  }, []);

  useEffect(() => {
    syncStatusBar();
  }, [theme, style]);

  const setTheme = (newTheme: ThemeMode) => {
    const updateDOM = () => {
      setThemeState(newTheme);
      localStorage.setItem("theme", newTheme);
      applyDomClasses(newTheme, style);
    };

    if (typeof document === "undefined" || !document.startViewTransition) {
      updateDOM();
      return;
    }

    document.startViewTransition(updateDOM);
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

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
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
