// All available character images
export const CHARACTER_IMAGES = [
  // Original characters
  { src: '/waffle_bro.png', alt: 'Waffle Bro', name: 'Waffle Bro' },
  { src: '/syrup_bro.png', alt: 'Syrup Bro', name: 'Syrup Bro' },
  { src: '/butter_baby.png', alt: 'Butter Baby', name: 'Butter Baby' },
  
  // New characters
  { src: '/captain_crispy.png', alt: 'Captain Crispy', name: 'Captain Crispy' },
  { src: '/spicy_sauce.png', alt: 'Spicy Sauce', name: 'Spicy Sauce' },
  { src: '/waffle_town_mayor.png', alt: 'Waffle Town Mayor', name: 'Waffle Town Mayor' },
  { src: '/cypto_miner_waffle.png', alt: 'Crypto Miner Waffle', name: 'Crypto Miner Waffle' },
  { src: '/syrup_hacker.png', alt: 'Syrup Hacker', name: 'Syrup Hacker' },
  { src: '/ninja_butter_baby.png', alt: 'Ninja Butter Baby', name: 'Ninja Butter Baby' },
  { src: '/astro_butter_baby.png', alt: 'Astro Butter Baby', name: 'Astro Butter Baby' },
  { src: '/pirate_butter_baby.png', alt: 'Pirate Butter Baby', name: 'Pirate Butter Baby' },
  { src: '/chef_butter_baby.png', alt: 'Chef Butter Baby', name: 'Chef Butter Baby' },
  { src: '/super_syrup.png', alt: 'Super Syrup', name: 'Super Syrup' },
  { src: '/crypto_waffle_octo.png', alt: 'Crypto Waffle Octo', name: 'Crypto Waffle Octo' },
  { src: '/dj_syrup.png', alt: 'DJ Syrup', name: 'DJ Syrup' },
  { src: '/sleepy_waffle.png', alt: 'Sleepy Waffle', name: 'Sleepy Waffle' },
  { src: '/skater_waffle.png', alt: 'Skater Waffle', name: 'Skater Waffle' },
  { src: '/waffle_knight.png', alt: 'Waffle Knight', name: 'Waffle Knight' },
  { src: '/professor_waffle.png', alt: 'Professor Waffle', name: 'Professor Waffle' },
];

// Check if we're on the client side
const isClient = typeof window !== 'undefined';

// Get a random image (client-side only)
export const getRandomImage = () => {
  if (!isClient) {
    // Return a default image during SSR
    return CHARACTER_IMAGES[0];
  }
  const randomIndex = Math.floor(Math.random() * CHARACTER_IMAGES.length);
  return CHARACTER_IMAGES[randomIndex];
};

// Get multiple random images (client-side only)
export const getRandomImages = (count: number) => {
  if (!isClient) {
    // Return default images during SSR
    return CHARACTER_IMAGES.slice(0, Math.min(count, CHARACTER_IMAGES.length));
  }
  const shuffled = [...CHARACTER_IMAGES].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, CHARACTER_IMAGES.length));
};

// Get random images for specific positions (client-side only)
export const getRandomImagesForPositions = () => {
  if (!isClient) {
    // Return default images during SSR to prevent hydration mismatch
    return {
      header: CHARACTER_IMAGES[0],
      background1: CHARACTER_IMAGES[1],
      background2: CHARACTER_IMAGES[2],
      background3: CHARACTER_IMAGES[3],
    };
  }
  const shuffled = [...CHARACTER_IMAGES].sort(() => 0.5 - Math.random());
  return {
    header: shuffled[0],
    background1: shuffled[1],
    background2: shuffled[2],
    background3: shuffled[3],
  };
};

// Get a random image by category (if we want to group them later)
export const getRandomImageByCategory = (category: 'waffle' | 'syrup' | 'butter' | 'special') => {
  if (!isClient) {
    // Return default image during SSR
    return CHARACTER_IMAGES[0];
  }
  
  let filteredImages = CHARACTER_IMAGES;
  
  if (category === 'waffle') {
    filteredImages = CHARACTER_IMAGES.filter(img => 
      img.name.toLowerCase().includes('waffle') || 
      img.name.toLowerCase().includes('crispy') ||
      img.name.toLowerCase().includes('knight') ||
      img.name.toLowerCase().includes('professor') ||
      img.name.toLowerCase().includes('miner') ||
      img.name.toLowerCase().includes('skater') ||
      img.name.toLowerCase().includes('sleepy')
    );
  } else if (category === 'syrup') {
    filteredImages = CHARACTER_IMAGES.filter(img => 
      img.name.toLowerCase().includes('syrup') || 
      img.name.toLowerCase().includes('sauce')
    );
  } else if (category === 'butter') {
    filteredImages = CHARACTER_IMAGES.filter(img => 
      img.name.toLowerCase().includes('butter')
    );
  }
  
  const randomIndex = Math.floor(Math.random() * filteredImages.length);
  return filteredImages[randomIndex];
};
