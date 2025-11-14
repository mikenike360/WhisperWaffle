import { useEffect } from 'react';
import { useTheme as useNextTheme } from 'next-themes';

const DEFAULT_THEME = 'cyberpunk';

export const useTheme = () => {
  const themeContext = useNextTheme();

  useEffect(() => {
    if (!themeContext.theme) {
      themeContext.setTheme(DEFAULT_THEME);
    }
  }, [themeContext.theme, themeContext.setTheme]);

  return {
    ...themeContext,
    theme: themeContext.theme ?? DEFAULT_THEME,
  };
};


