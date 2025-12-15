import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import './Snowflakes.css';
import { getWinterThemeEnabled } from '../utils';

const Snowflakes = () => {
  const [enabled, setEnabled] = useState(getWinterThemeEnabled());
  const [showSnow, setShowSnow] = useState(false);
  const timeoutRef = useRef(null);
  const location = useLocation();
  const prevLocationRef = useRef(location.pathname);

  // Роути, на які потрібно реагувати
  const targetRoutes = ['/actives', '/trade', '/deposit', '/withdraw', '/exchange', '/'];

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
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [enabled]);

  // Відстежуємо зміни роутів
  useEffect(() => {
    const currentPath = location.pathname;
    
    // Перевіряємо, чи поточний роут є цільовим
    const isTargetRoute = targetRoutes.some(route => {
      if (route === '/') {
        return currentPath === '/' || currentPath === '/actives';
      }
      // Перевіряємо точну відповідність або початок шляху (для вкладених роутів)
      return currentPath === route || currentPath.startsWith(route + '/');
    }) || currentPath.startsWith('/trade/'); // Також включаємо /trade/:ticker

    // Якщо перейшли на цільовий роут і це не перший рендер
    if (isTargetRoute && prevLocationRef.current !== currentPath) {
      // Показуємо сніг на 3 секунди
      setShowSnow(true);
      
      // Очищаємо попередній таймер, якщо він є
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      // Встановлюємо таймер на 3 секунди
      timeoutRef.current = setTimeout(() => {
        setShowSnow(false);
      }, 3000);
    }

    // Оновлюємо попередній роут
    prevLocationRef.current = currentPath;
  }, [location.pathname]);

  if (!enabled || !showSnow) {
    return null;
  }

  const snowflakes = Array.from({ length: 50 }, (_, i) => (
    <div
      key={i}
      className="snowflake"
      style={{
        left: `${Math.random() * 100}%`,
        animationDelay: `${Math.random() * 5}s`,
        animationDuration: `${10 + Math.random() * 10}s`,
        opacity: 0.3 + Math.random() * 0.7,
        fontSize: `${10 + Math.random() * 20}px`,
      }}
    >
      ❄
    </div>
  ));

  return <div className="snowflakes-container">{snowflakes}</div>;
};

export default Snowflakes;

