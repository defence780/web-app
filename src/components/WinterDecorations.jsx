import React, { useState, useEffect } from 'react';
import ChristmasTree from './ChristmasTree';
import { getWinterThemeEnabled, generateRandomPositions } from '../utils';

const WinterDecorations = () => {
  const [enabled, setEnabled] = useState(getWinterThemeEnabled());
  const [decorations, setDecorations] = useState([]);

  useEffect(() => {
    // Ялинки прибрано
    setDecorations([]);
  }, []);

  useEffect(() => {
    // Слухаємо зміни в localStorage
    const handleStorageChange = () => {
      setEnabled(getWinterThemeEnabled());
    };

    window.addEventListener('storage', handleStorageChange);
    // Також перевіряємо кожні 500мс на випадок змін в тому ж вікні
    const interval = setInterval(() => {
      const current = getWinterThemeEnabled();
      if (current !== enabled) {
        setEnabled(current);
      }
    }, 500);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [enabled]);

  if (!enabled) {
    return null;
  }

  return (
    <>
      {decorations.map((decoration) => (
        <ChristmasTree
          key={decoration.id}
          position={decoration.position}
          size={decoration.size}
        />
      ))}
    </>
  );
};

export default WinterDecorations;

