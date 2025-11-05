import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from 'next-themes';

const themes = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'cyberpunk', label: 'Waffle' },
];

export const ThemeSelector: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMounted(true);
    if (!theme) {
      setTheme('cyberpunk');
    }
  }, [theme, setTheme]);

  // Calculate dropdown position when it opens
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    } else {
      setDropdownPosition(null);
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  if (!mounted) return null;

  const currentTheme = themes.find(t => t.value === (theme || 'cyberpunk')) || themes[2];

  const handleThemeSelect = (themeValue: string) => {
    setTheme(themeValue);
    setIsOpen(false);
  };

  return (
    <div className="relative z-10" ref={dropdownRef}>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="select select-bordered max-w-xs min-w-[120px] flex items-center justify-start"
        aria-label="Select theme"
      >
        <span className="block text-left">{currentTheme.label}</span>
      </button>

      {isOpen && dropdownPosition && (
        <>
          {/* Backdrop to capture clicks outside */}
          <div
            className="fixed inset-0 z-[99] bg-transparent"
            onClick={() => setIsOpen(false)}
          />
          {/* Dropdown menu with fixed positioning */}
          <div
            className="fixed bg-base-100 border border-base-300 rounded-lg shadow-xl z-[100] overflow-hidden"
            style={{
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`,
              width: `${dropdownPosition.width}px`,
            }}
          >
            {themes.map((t) => (
              <button
                key={t.value}
                onClick={() => handleThemeSelect(t.value)}
                className={`w-full px-4 py-3 text-left hover:bg-base-200 transition-colors flex items-center ${
                  currentTheme.value === t.value
                    ? 'bg-primary text-primary-content font-semibold'
                    : 'text-base-content'
                }`}
              >
                <span className="block">{t.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
