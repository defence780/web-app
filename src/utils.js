export const initialCrypto = [
  { ticker: 'BTC', name: 'Bitcoin', price: 0, img: '/btc.png', amount: 0, convertToUsd: '0,00$' },
  { ticker: 'TON', name: 'Toncoin', price: 0, img: '/ton.png', amount: 0, convertToUsd: '0,00$' },
  { ticker: 'ETH', name: 'Ethereum', price: 0, img: '/eth.png', amount: 0, convertToUsd: '0,00$' },
  { ticker: 'USDT', name: 'Tether', price: 1.00, img: '/usdt.png', amount: 0, convertToUsd: '0,00$' },
];

export const binance = 'https://api.binance.com/api/v3/ticker/price?symbol=';

// Функції для управління зимовими елементами
export const getWinterThemeEnabled = () => {
  const saved = localStorage.getItem('winterThemeEnabled');
  return saved !== null ? JSON.parse(saved) : true; // За замовчуванням увімкнено
};

export const toggleWinterTheme = () => {
  const current = getWinterThemeEnabled();
  const newValue = !current;
  localStorage.setItem('winterThemeEnabled', JSON.stringify(newValue));
  return newValue;
};

// Генерація випадкових позицій для зимових елементів
export const generateRandomPositions = (count, type = 'both') => {
  // Для ялинок використовуємо тільки верхні позиції
  const treePositions = ['top-left', 'top-right'];
  const allPositions = ['bottom-left', 'bottom-right', 'top-left', 'top-right'];
  const sizes = ['small', 'medium', 'large'];
  const elements = [];
  
  const treeCount = type === 'both' ? Math.floor(count / 2) : (type === 'tree' ? count : 0);
  const snowmanCount = type === 'both' ? Math.ceil(count / 2) : (type === 'snowman' ? count : 0);
  
  // Використовуємо Set для уникнення дублікатів позицій
  const usedPositions = new Set();
  
  for (let i = 0; i < treeCount; i++) {
    let position;
    let attempts = 0;
    // Для ялинок використовуємо тільки верхні позиції
    const availablePositions = treePositions;
    // Намагаємося знайти унікальну позицію, але не більше 10 спроб
    do {
      position = availablePositions[Math.floor(Math.random() * availablePositions.length)];
      attempts++;
    } while (usedPositions.has(position) && attempts < 10);
    
    usedPositions.add(position);
    elements.push({
      type: 'tree',
      position: position,
      size: sizes[Math.floor(Math.random() * sizes.length)],
      id: `tree-${i}-${Date.now()}-${Math.random()}`,
    });
  }
  
  // Очищаємо для сніговиків, щоб вони могли бути в тих же позиціях
  usedPositions.clear();
  
  // Очищаємо для сніговиків, щоб вони могли бути в тих же позиціях
  usedPositions.clear();
  
  for (let i = 0; i < snowmanCount; i++) {
    let position;
    let attempts = 0;
    do {
      position = allPositions[Math.floor(Math.random() * allPositions.length)];
      attempts++;
    } while (usedPositions.has(position) && attempts < 10);
    
    usedPositions.add(position);
    elements.push({
      type: 'snowman',
      position: position,
      size: 'medium',
      id: `snowman-${i}-${Date.now()}-${Math.random()}`,
    });
  }
  
  return elements;
};