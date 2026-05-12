// components/ThemeProvider.tsx
"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: (e?: React.MouseEvent) => void;
  setTheme: (theme: Theme, options?: { x?: number, y?: number }) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem("theme");
    const initialTheme = (savedTheme === "light" || savedTheme === "dark") 
      ? savedTheme 
      : (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    
    if (initialTheme === "dark") {
      setThemeState("dark");
      document.documentElement.classList.add("dark");
    }
  }, []);

  const setTheme = (newTheme: Theme, options?: { x?: number, y?: number }) => {
    const updateDOM = () => {
      setThemeState(newTheme);
      localStorage.setItem("theme", newTheme);
      document.documentElement.classList.toggle("dark", newTheme === "dark");
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

  const toggleTheme = (e?: React.MouseEvent) => {
    const newTheme = theme === "light" ? "dark" : "light";
    if (e) {
      setTheme(newTheme, { x: e.clientX, y: e.clientY });
    } else {
      setTheme(newTheme);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
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
