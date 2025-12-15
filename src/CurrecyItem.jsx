import React from 'react';
import { useI18n } from './i18n/I18nContext';

const CurrencyItem = ({rub, amount}) => {
  const { t } = useI18n();
  return (
    <li>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src={'/rub.jpeg'} alt={'Rub'} width={30} height={30} style={{ borderRadius: '50%' }} />
            <div>
                <p style={{ margin: '5px 0', color: 'var(--text-color)' }}>{t('russianRuble')}</p>
                <p style={{ margin: '5px 0', color: 'var(--crypto-list-price-color)' }} className='crypto-list-price'>{rub || 0} ₽</p>
            </div>
        </div>
        <span style={{ color: 'var(--text-color)' }}>{parseFloat( amount || '0').toFixed(2)} ₽</span>
    </li>
  );
};

export default CurrencyItem;