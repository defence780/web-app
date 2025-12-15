import React from 'react';

const TokenCard = ({ token }) => {
    const tokenStyle = {
        display: 'flex',
        gap: '1rem',
        alignItems: 'center',
        padding: '0.5rem 1rem',
        borderRadius: '5px',
        cursor: 'pointer',
        outline: 'none',
        color: 'var(--text-color)',
        textDecoration: 'none',
        backgroundColor: 'var(--section-background-color)',
        transition: 'all 0.3s ease'
    };

    const handleMouseOver = (e) => {
        e.currentTarget.style.outline = '2px solid var(--active-link-color)';
        e.currentTarget.style.transform = 'translateX(5px)';
    };
    
    const handleMouseOut = (e) => {
        e.currentTarget.style.outline = 'none';
        e.currentTarget.style.transform = 'translateX(0)';
    };

    // Функція для форматування ціни з правильним числом знаків після коми
    const formatPrice = (price) => {
        if (!price) return '0';
        
        const numPrice = Number(price);
        
        // Для USDT завжди 2 знаки
        if (token.ticker.toUpperCase() === 'USDT') {
            return numPrice.toFixed(2);
        }
        
        // Для дуже малих цін (менше 0.0001) показуємо до 8 знаків
        if (numPrice < 0.0001) {
            return numPrice.toFixed(8).replace(/\.?0+$/, '');
        }
        // Для малих цін (менше 0.01) показуємо до 6 знаків
        else if (numPrice < 0.01) {
            return numPrice.toFixed(6).replace(/\.?0+$/, '');
        }
        // Для середніх цін (менше 1) показуємо до 4 знаків
        else if (numPrice < 1) {
            return numPrice.toFixed(4).replace(/\.?0+$/, '');
        }
        // Для великих цін показуємо 2 знаки
        else {
            return numPrice.toFixed(2);
        }
    };

    // Перевіряємо, чи є ціна (для USDT ціна завжди 1)
    const hasPrice = token.price || token.ticker.toUpperCase() === 'USDT';
    const priceValue = token.ticker.toUpperCase() === 'USDT' ? '1.00' : token.price;
    const formattedPrice = formatPrice(priceValue);

    return (
        <div 
            key={token.id} 
            style={tokenStyle}
            onMouseOver={handleMouseOver}
            onMouseOut={handleMouseOut}
        >
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <img 
                        src={token.icon} 
                        width={50} 
                        height={50} 
                        style={{borderRadius: '50%'}} 
                        alt={`${token.name} icon`} 
                    />
                    <div>
                        <p style={{margin: 0, fontSize: '0.8rem', color: 'var(--section-text-color)'}}>
                            {token.ticker.toUpperCase()} / USDT
                        </p>
                        <h2 style={{margin: 0, fontSize: '1.2rem', color: 'var(--text-color)'}}>
                            {token.name}
                        </h2>
                    </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    {hasPrice ? (
                        <>
                            <p style={{margin: 5, fontSize: '0.9rem', color: 'var(--text-color)'}}>
                                {formattedPrice} USDT
                            </p>
                            {token.priceChangePercent !== undefined && token.priceChangePercent !== null ? (
                                <p style={{
                                    margin: 5, 
                                    fontSize: '0.9rem', 
                                    color: Number(token.priceChangePercent) > 0 ? '#4caf50' : '#f44336'
                                }}>
                                    {Number(token.priceChangePercent) > 0 ? '+' : ''}{Number(token.priceChangePercent).toFixed(2)}%
                                </p>
                            ) : null}
                        </>
                    ) : (
                        <>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'flex-end',
                                margin: '5px 0'
                            }}>
                                <div style={{
                                    width: 16,
                                    height: 16,
                                    border: '2px solid var(--active-link-color)',
                                    borderTop: '2px solid transparent',
                                    borderRadius: '50%',
                                    animation: 'spin 1s linear infinite'
                                }}></div>
                            </div>
                            <div style={{
                                width: 60,
                                height: 8,
                                backgroundColor: 'var(--active-link-color)',
                                opacity: 0.3,
                                borderRadius: '4px',
                                marginTop: 5,
                                animation: 'pulse 1.5s infinite'
                            }}></div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TokenCard;