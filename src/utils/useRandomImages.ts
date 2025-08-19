import { useState, useEffect } from 'react';
import { CHARACTER_IMAGES } from './randomImages';

export const useRandomImages = () => {
  // Always start with the same default images to prevent hydration mismatch
  const [randomImages, setRandomImages] = useState({
    header: CHARACTER_IMAGES[0],
    background1: CHARACTER_IMAGES[1],
    background2: CHARACTER_IMAGES[2],
    background3: CHARACTER_IMAGES[3],
  });
  const [isClient, setIsClient] = useState(false);
  const [isRandomizing, setIsRandomizing] = useState(false);

  useEffect(() => {
    setIsClient(true);
    // Add a small delay to ensure hydration is complete before changing images
    const timer = setTimeout(() => {
      setIsRandomizing(true);
      // Generate new random images only after component mounts on client
      const shuffled = [...CHARACTER_IMAGES].sort(() => 0.5 - Math.random());
      setRandomImages({
        header: shuffled[0],
        background1: shuffled[1],
        background2: shuffled[2],
        background3: shuffled[3],
      });
      // Reset randomizing state after a brief moment
      setTimeout(() => setIsRandomizing(false), 200);
    }, 100); // 100ms delay

    return () => clearTimeout(timer);
  }, []);

  return {
    randomImages,
    isClient,
    isRandomizing,
    refreshImages: () => {
      setIsRandomizing(true);
      const shuffled = [...CHARACTER_IMAGES].sort(() => 0.5 - Math.random());
      setRandomImages({
        header: shuffled[0],
        background1: shuffled[1],
        background2: shuffled[2],
        background3: shuffled[3],
      });
      // Reset randomizing state after a brief moment
      setTimeout(() => setIsRandomizing(false), 200);
    }
  };
};
