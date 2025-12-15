import React, { useEffect, useState, useRef } from 'react';
import { supabase } from './supabase';
import { NavLink } from 'react-router-dom';
import TokenCard from './components/TockenCard';
import { useI18n } from './i18n/I18nContext';

const binance = 'https://api.binance.com/api/v3/ticker/24hr?symbol=';

const Trade = () => {
    const { t } = useI18n();
    const [tokens, setTokens] = useState([]);
    const abortControllerRef = useRef(null);

    useEffect(() => {
        const fetchTokens = async () => {
            const { data, error } = await supabase.from('tokens').select('*');
            if (error) {
                console.error('Error fetching tokens:', error);
            } else {
                setTokens(data);
                
                // Запускаємо завантаження цін одразу після отримання токенів
                if (data && data.length > 0) {
                    fetchCryptoPrices(data);
                }
            }
        };

        fetchTokens();
    }, []);

    const fetchCryptoPrices = async (tokensList) => {
        // Скасовуємо попередні запити, якщо вони є
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        
        abortControllerRef.current = new AbortController();
        const signal = abortControllerRef.current.signal;

        try {
            // Фільтруємо тільки ті токени, які потребують оновлення ціни
            const tokensToFetch = tokensList.filter(item => item.ticker !== 'USDT');
            
            if (tokensToFetch.length === 0) return;

            // Виконуємо всі запити паралельно
            const responses = await Promise.all(
                tokensToFetch.map((item) => 
                    fetch(binance + item.ticker.toUpperCase() + 'USDT', { signal })
                        .then(res => res.json())
                        .catch(err => {
                            if (err.name !== 'AbortError') {
                                console.error(`Error fetching price for ${item.ticker}:`, err);
                            }
                            return null;
                        })
                )
            );

            // Оновлюємо тільки якщо компонент ще змонтований
            if (!signal.aborted) {
                setTokens((prevTokens) => {
                    const priceMap = new Map();
                    tokensToFetch.forEach((item, index) => {
                        if (responses[index] && responses[index].lastPrice) {
                            // Зберігаємо оригінальну ціну як рядок, щоб не втратити точність
                            const originalPrice = responses[index].lastPrice;
                            priceMap.set(item.ticker, {
                                price: originalPrice, // Зберігаємо оригінальну ціну
                                priceChangePercent: Number(responses[index].priceChangePercent).toFixed(2)
                            });
                        }
                    });

                    return prevTokens.map((item) => {
                        const priceData = priceMap.get(item.ticker);
                        if (priceData) {
                            return {
                                ...item,
                                price: priceData.price,
                                priceChangePercent: priceData.priceChangePercent,
                            };
                        }
                        return item;
                    });
                });
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Error fetching crypto prices:', error);
            }
        }
    };

    // Очищення при розмонтуванні
    useEffect(() => {
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    return (
        <div>
        <h2 style={{color: 'var(--section-heading-color)', fontSize: '1.5rem', padding: '0px 16px'}}>{t('tradingPair')}</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {tokens.map((token) => (
                <NavLink key={token.ticker} to={`/trade/${token.ticker}`} style={{ textDecoration: 'none', color: 'var(--text-color)' }}>
                    <TokenCard token={token} />
                </NavLink>
            ))}
        </div>
        </div>
    );
};

export default Trade;
