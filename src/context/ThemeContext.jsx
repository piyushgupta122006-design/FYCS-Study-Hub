import { createContext, useContext, useEffect, useState, useCallback } from "react";

const ThemeContext = createContext(null);

const STORAGE_KEY = "studyhub_theme";

// Reads any previously saved theme synchronously so there's no flash of the
// wrong theme on first paint.
const getInitialTheme = () => {
  if (typeof window === "undefined") return "dark";
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "dark" || saved === "glass") return saved;

    // First time visit: Check device preference (dark or light)
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    return prefersDark ? "dark" : "glass";
  } catch (_) {
    /* localStorage unavailable (private mode etc.) — fall back below */
  }
  return "dark";
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(getInitialTheme);

  // Reflect the theme onto <html data-theme="..."> so plain CSS
  // ([data-theme="glass"] { ... }) can restyle every shared class
  // (.glass-card, .glass-nav, .bg-app, .select-premium, .btn-primary)
  // without touching individual page components.
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (_) {
      /* ignore write failures */
    }
    // Update Chrome address-bar / theme-color meta tag
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute("content", theme === "glass" ? "#f3eefc" : "#0a0a0a");
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === "dark" ? "glass" : "dark"));
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, isGlass: theme === "glass" }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
};

export default ThemeContext;
