/** Округление вниз до 2 знаков (копейки). */
export const formatBalanceDown = (value) => {
  const num = parseFloat(value) || 0;
  return (Math.floor(num * 100) / 100).toFixed(2);
};

export const initialCrypto = [
  { ticker: 'BTC', name: 'Bitcoin', price: 0, img: '/btc.png', amount: 0, convertToUsd: '0,00$' },
  { ticker: 'TON', name: 'Toncoin', price: 0, img: '/ton.png', amount: 0, convertToUsd: '0,00$' },
  { ticker: 'ETH', name: 'Ethereum', price: 0, img: '/eth.png', amount: 0, convertToUsd: '0,00$' },
  { ticker: 'USDT', name: 'Tether', price: 1.00, img: '/usdt.png', amount: 0, convertToUsd: '0,00$' },
];

export const binance = 'https://api.binance.com/api/v3/ticker/price?symbol=';
