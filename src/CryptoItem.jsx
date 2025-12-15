import React from 'react';

const CryptoItem = ({ item, index }) => {
  return (
    <li key={index} style={{ height: '50px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <img src={item.img} alt={item.name} width={30} height={30} style={{ borderRadius: '50%' }} />
        <div>
          <p style={{ margin: '5px 0', color: 'var(--text-color)' }}>{item.name}</p>
          <p style={{ margin: '5px 0', color: 'var(--crypto-list-price-color)' }} className='crypto-list-price'>{item.price} $</p>
        </div>
      </div>
      <div>
        <p style={{ margin: '5px 0', textAlign: 'end', fontWeight: 700, color: 'var(--text-color)' }}>{parseFloat(String(item.amount)).toFixed(2)}</p>
        <h1 style={{ margin: '5px 0', color: 'var(--text-color)' }}>{item.convertToUsd} $</h1>
      </div>
    </li>
  );
};

export default CryptoItem;