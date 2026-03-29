import { useState, useEffect, useCallback, createContext, useContext } from 'react';

const ThemeContext = createContext(null);

/**
 * 获取初始主题：
 * 1. 先看 localStorage 有没有保存过
 * 2. 再看系统偏好
 * 3. 默认暗色
 */
function getInitialTheme() {
    try {
        const saved = localStorage.getItem('winff-theme');
        if (saved === 'light' || saved === 'dark') return saved;
    } catch { }

    if (window.matchMedia?.('(prefers-color-scheme: light)').matches) {
        return 'light';
    }
    return 'dark';
}

export function ThemeProvider({ children }) {
    const [theme, setTheme] = useState(getInitialTheme);

    // 同步 data-theme 属性到 html 标签
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        // 同步 meta theme-color
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) {
            meta.setAttribute('content', theme === 'dark' ? '#0f0f1a' : '#f5f5f9');
        }
        try {
            localStorage.setItem('winff-theme', theme);
        } catch { }
    }, [theme]);

    const toggleTheme = useCallback(() => {
        setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
    }, []);

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
    return ctx;
}
