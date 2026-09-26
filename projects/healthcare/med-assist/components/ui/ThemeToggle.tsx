import { useThemeStore } from '../../lib/theme-store';

const ThemeToggle = () => {
  const { theme, toggleTheme } = useThemeStore();
  const isLight = theme === 'light';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
      aria-pressed={isLight}
      className="group relative w-7 h-7 rounded-full border transition-all duration-300 ease-out
                 motion-safe:active:scale-90 focus:outline-none"
      style={{
        background: isLight
          ? 'radial-gradient(circle at 40% 35%, #2A2D33 0%, #191B1F 100%)'
          : 'radial-gradient(circle at 40% 35%, #1a1a1a 0%, #0A0A0C 100%)',
        borderColor: isLight ? 'rgba(122, 184, 164, 0.35)' : 'rgba(255, 255, 255, 0.08)',
        boxShadow: isLight
          ? '0 0 6px rgba(122, 184, 164, 0.2), inset 0 1px 2px rgba(255,255,255,0.06)'
          : 'inset 0 1px 2px rgba(255,255,255,0.04), 0 2px 4px rgba(0,0,0,0.4)',
      }}
    >
      {/* Indicator dot */}
      <span
        className="absolute rounded-full transition-all duration-300"
        style={{
          width: 6,
          height: 6,
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: isLight ? '#7AB8A4' : 'rgba(255, 255, 255, 0.2)',
          boxShadow: isLight ? '0 0 6px rgba(122, 184, 164, 0.5)' : 'none',
        }}
      />
    </button>
  );
};

export default ThemeToggle;
