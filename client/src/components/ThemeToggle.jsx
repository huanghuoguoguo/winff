import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

export default function ThemeToggle() {
    const { theme, toggleTheme } = useTheme();
    const isDark = theme === 'dark';

    return (
        <button
            onClick={toggleTheme}
            className="relative w-14 h-7 rounded-full transition-colors duration-300 cursor-pointer shrink-0 flex items-center"
            style={{
                backgroundColor: isDark ? 'var(--color-surface)' : 'var(--color-primary)',
                border: '1px solid var(--color-border)',
            }}
            title={isDark ? '切换到亮色模式' : '切换到暗色模式'}
            aria-label="切换主题"
        >
            {/* 滑块 */}
            <div
                className="absolute w-5 h-5 rounded-full flex items-center justify-center transition-all duration-300 shadow-sm"
                style={{
                    backgroundColor: isDark ? 'var(--color-primary)' : '#ffffff',
                    left: isDark ? '3px' : '30px',
                }}
            >
                {isDark ? (
                    <Moon size={11} className="text-white" />
                ) : (
                    <Sun size={11} className="text-amber-500" />
                )}
            </div>

            {/* 背景图标 */}
            <div className="absolute inset-0 flex items-center justify-between px-1.5 pointer-events-none">
                <Sun size={11} className={`transition-opacity duration-300 ${isDark ? 'opacity-30 text-[var(--color-text-muted)]' : 'opacity-0'}`} />
                <Moon size={11} className={`transition-opacity duration-300 ${isDark ? 'opacity-0' : 'opacity-50 text-white'}`} />
            </div>
        </button>
    );
}
