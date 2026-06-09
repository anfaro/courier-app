import { useEffect } from "react";

export function useScrollLock(locked: boolean) {
  useEffect(() => {
    if (locked) {
      const prev = document.body.style.overflow;
      const prevPadding = document.body.style.paddingRight;
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = "hidden";
      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`;
      }
      window.dispatchEvent(new CustomEvent("modal:change", { detail: { isOpen: true } }));
      return () => {
        document.body.style.overflow = prev;
        document.body.style.paddingRight = prevPadding;
        window.dispatchEvent(new CustomEvent("modal:change", { detail: { isOpen: false } }));
      };
    }
  }, [locked]);
}
