import { useState, useEffect, useCallback } from 'react';

export type ThemeMode = 'light' | 'dark';

const THEME_STORAGE_KEY = 'kizuna_theme';

export function getInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'light';
  
  const saved = localStorage.getItem(THEME_STORAGE_KEY);
  if (saved === 'dark' || saved === 'light') {
    return saved;
  }
  
  // Mặc định luôn là giao diện sáng 'light' (chuẩn phong cách giấy Washi truyền thống KIZUNA 絆)
  return 'light';
}

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeMode>(getInitialTheme);

  // Áp dụng class 'dark' lên document.documentElement và lưu vào localStorage
  const applyTheme = useCallback((newTheme: ThemeMode) => {
    if (typeof document === 'undefined') return;
    
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    // Bắn event đồng bộ giữa các component / tab
    window.dispatchEvent(new CustomEvent('kizuna_theme_changed', { detail: { theme: newTheme } }));
  }, []);

  const setTheme = useCallback((newTheme: ThemeMode) => {
    setThemeState(newTheme);
    applyTheme(newTheme);
  }, [applyTheme]);

  const toggleTheme = useCallback(() => {
    setThemeState(prev => {
      const next: ThemeMode = prev === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      return next;
    });
  }, [applyTheme]);

  // Khởi tạo theme khi mount và lắng nghe thay đổi từ các component khác
  useEffect(() => {
    applyTheme(theme);

    const handleThemeChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ theme: ThemeMode }>;
      if (customEvent.detail?.theme && customEvent.detail.theme !== theme) {
        setThemeState(customEvent.detail.theme);
      }
    };

    window.addEventListener('kizuna_theme_changed', handleThemeChange);
    return () => window.removeEventListener('kizuna_theme_changed', handleThemeChange);
  }, []);

  return {
    theme,
    isDark: theme === 'dark',
    setTheme,
    toggleTheme,
  };
}
