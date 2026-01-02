import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabase';
import './App.css';
import { useI18n } from './i18n/I18nContext';
import { notification } from 'antd';
import { createChart, ColorType, CandlestickSeries } from 'lightweight-charts';

const binance = 'https://api.binance.com/api/v3/ticker/24hr?symbol=';

const BinaryOptions = () => {
    const { t } = useI18n();
    const [tokens, setTokens] = useState([]);
    const [selectedToken, setSelectedToken] = useState(null);
    const [direction, setDirection] = useState('up'); // 'up' или 'down'
    const [amount, setAmount] = useState('');
    const [expiration, setExpiration] = useState(60); // секунды
    const [user, setUser] = useState(null);
    const [activeOptions, setActiveOptions] = useState([]);
    const [historyOptions, setHistoryOptions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [optionTimers, setOptionTimers] = useState({});
    const abortControllerRef = useRef(null);
    const chartContainerRef = useRef(null);
    const chartRef = useRef(null);
    const candlestickSeriesRef = useRef(null);
    const [timeframe, setTimeframe] = useState('1m'); // Таймфрейм для графика

    const expirationOptions = [
        { label: t('expiration1min'), value: 60 },
        { label: t('expiration5min'), value: 300 },
        { label: t('expiration15min'), value: 900 },
        { label: t('expiration30min'), value: 1800 },
        { label: t('expiration1hour'), value: 3600 }
    ];

    useEffect(() => {
        const userData = JSON.parse(localStorage.getItem('user'));
        if (userData) {
            setUser(userData);
            fetchActiveOptions(userData.chat_id);
            fetchHistoryOptions(userData.chat_id);
        }

        const fetchTokens = async () => {
            const { data, error } = await supabase.from('tokens').select('*');
            if (error) {
                console.error('Error fetching tokens:', error);
            } else {
                setTokens(data || []);
                if (data && data.length > 0) {
                    fetchCryptoPrices(data);
                }
            }
        };

        fetchTokens();

        // Обновляем статусы опционов каждые 5 секунд
        const statusInterval = setInterval(() => {
            if (user) {
                checkAndUpdateOptions(user.chat_id);
            }
        }, 5000);

        return () => clearInterval(statusInterval);
    }, [user]);

    useEffect(() => {
        if (selectedToken) {
            const interval = setInterval(() => {
                fetchCryptoPrices([selectedToken]);
            }, 3000);
            return () => clearInterval(interval);
        }
    }, [selectedToken]);

    // Инициализация графика
    useEffect(() => {
        if (!chartContainerRef.current || !selectedToken) return;

        const isDark = document.body.classList.contains('dark-theme') || !document.body.classList.contains('light-theme');
        const chartOptions = {
            layout: {
                background: { type: ColorType.Solid, color: isDark ? '#1a1a1a' : '#ffffff' },
                textColor: isDark ? '#d1d4dc' : '#191919',
            },
            grid: {
                vertLines: { color: isDark ? '#2B2B43' : '#e0e0e0', style: 0 },
                horzLines: { color: isDark ? '#2B2B43' : '#e0e0e0', style: 0 },
            },
            crosshair: {
                mode: 1,
            },
            rightPriceScale: {
                borderColor: isDark ? '#485056' : '#d1d4dc',
                scaleMargins: {
                    top: 0,
                    bottom: 0,
                },
            },
            timeScale: {
                borderColor: isDark ? '#485056' : '#d1d4dc',
                timeVisible: true,
                secondsVisible: false,
            },
            width: chartContainerRef.current.clientWidth,
            height: 400,
        };

        const chart = createChart(chartContainerRef.current, chartOptions);
        chartRef.current = chart;

        const candlestickSeries = chart.addSeries(CandlestickSeries, {
            upColor: '#4caf50',
            downColor: '#f44336',
            borderVisible: false,
            wickUpColor: '#4caf50',
            wickDownColor: '#f44336',
        });
        candlestickSeriesRef.current = candlestickSeries;

        // Загружаем данные для графика
        const loadChartData = async (interval = timeframe) => {
            try {
                // Определяем количество свечей в зависимости от интервала
                let limit = 100;
                if (interval === '1h' || interval === '4h') limit = 200;
                if (interval === '1d') limit = 365;

                const response = await fetch(
                    `https://api.binance.com/api/v3/klines?symbol=${selectedToken.ticker.toUpperCase()}USDT&interval=${interval}&limit=${limit}`
                );
                const data = await response.json();

                const formattedData = data.map((d) => ({
                    time: Math.floor(d[0] / 1000),
                    open: parseFloat(d[1]),
                    high: parseFloat(d[2]),
                    low: parseFloat(d[3]),
                    close: parseFloat(d[4]),
                }));

                candlestickSeries.setData(formattedData);
                chart.timeScale().fitContent();
            } catch (error) {
                console.error('Error loading chart data:', error);
            }
        };

        loadChartData();

        // Обновляем данные в зависимости от интервала
        const updateInterval = timeframe === '1m' ? 5000 : timeframe === '5m' ? 30000 : 60000;
        const chartInterval = setInterval(() => {
            loadChartData();
        }, updateInterval);

        // Обновление темы
        const observer = new MutationObserver(() => {
            const newIsDark = document.body.classList.contains('dark-theme') || !document.body.classList.contains('light-theme');
            if (chartRef.current) {
                chartRef.current.applyOptions({
                    layout: {
                        background: { type: ColorType.Solid, color: newIsDark ? '#1a1a1a' : '#ffffff' },
                        textColor: newIsDark ? '#d1d4dc' : '#191919',
                    },
                    grid: {
                        vertLines: { color: newIsDark ? '#2B2B43' : '#e0e0e0' },
                        horzLines: { color: newIsDark ? '#2B2B43' : '#e0e0e0' },
                    },
                    rightPriceScale: {
                        borderColor: newIsDark ? '#485056' : '#d1d4dc',
                    },
                    timeScale: {
                        borderColor: newIsDark ? '#485056' : '#d1d4dc',
                    },
                });
            }
        });

        observer.observe(document.body, {
            attributes: true,
            attributeFilter: ['class'],
        });

        // Обновление размера при изменении окна
        const handleResize = () => {
            if (chartRef.current && chartContainerRef.current) {
                chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
            }
        };

        window.addEventListener('resize', handleResize);

        return () => {
            clearInterval(chartInterval);
            observer.disconnect();
            window.removeEventListener('resize', handleResize);
            chart.remove();
            chartRef.current = null;
            candlestickSeriesRef.current = null;
        };
    }, [selectedToken, timeframe]);

    const fetchCryptoPrices = async (tokensList) => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        
        abortControllerRef.current = new AbortController();
        const signal = abortControllerRef.current.signal;

        try {
            const tokensToFetch = tokensList.filter(item => item.ticker !== 'USDT');
            if (tokensToFetch.length === 0) return;

            const responses = await Promise.all(
                tokensToFetch.map((item) => 
                    fetch(binance + item.ticker.toUpperCase() + 'USDT', { signal })
                        .then(res => res.json())
                        .catch(() => null)
                )
            );

            if (!signal.aborted) {
                setTokens((prevTokens) => {
                    const priceMap = new Map();
                    tokensToFetch.forEach((item, index) => {
                        if (responses[index] && responses[index].lastPrice) {
                            priceMap.set(item.ticker, {
                                price: responses[index].lastPrice,
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

    const fetchActiveOptions = async (chatId) => {
        try {
            const { data, error } = await supabase
                .from('binary_options')
                .select('*')
                .eq('chat_id', chatId)
                .eq('status', 'active')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching active options:', error);
            } else {
                setActiveOptions(data || []);
                // Обновляем таймеры для каждого опциона
                const timers = {};
                (data || []).forEach(option => {
                    const createdAt = new Date(option.created_at);
                    const expirationTime = option.expiration_time * 1000; // конвертируем в миллисекунды
                    const expiresAt = createdAt.getTime() + expirationTime;
                    timers[option.id] = expiresAt;
                });
                setOptionTimers(timers);
            }
        } catch (error) {
            console.error('Error fetching active options:', error);
        }
    };

    const checkAndUpdateOptions = async (chatId) => {
        try {
            const { data: activeData, error: fetchError } = await supabase
                .from('binary_options')
                .select('*')
                .eq('chat_id', chatId)
                .eq('status', 'active');

            if (fetchError) {
                console.error('Error checking options:', fetchError);
                return;
            }

            const now = Date.now();
            const optionsToUpdate = [];

            for (const option of activeData || []) {
                const createdAt = new Date(option.created_at);
                const expirationTime = option.expiration_time * 1000;
                const expiresAt = createdAt.getTime() + expirationTime;

                // Получаем текущую цену токена
                const tokenData = tokens.find(t => t.ticker === option.token);
                const currentPrice = tokenData && tokenData.price ? parseFloat(tokenData.price) : null;

                // Обновляем текущую цену и время проверки даже если опцион еще не закрылся
                if (currentPrice !== null) {
                    try {
                        // Получаем существующую историю цен
                        const priceHistory = option.price_history || [];
                        const newPriceEntry = {
                            price: currentPrice,
                            timestamp: new Date().toISOString()
                        };

                        // Добавляем новую цену в историю (ограничиваем до последних 100 записей)
                        const updatedHistory = [...priceHistory, newPriceEntry].slice(-100);

                        await supabase
                            .from('binary_options')
                            .update({
                                current_price: currentPrice,
                                last_checked_at: new Date().toISOString(),
                                price_history: updatedHistory,
                                check_status: 'checked'
                            })
                            .eq('id', option.id);
                    } catch (updateError) {
                        console.error('Error updating option state:', updateError);
                    }
                }

                // Проверяем, наступило ли время экспирации
                if (now >= expiresAt) {
                    if (currentPrice !== null) {
                        const entryPrice = parseFloat(option.entry_price);
                        
                        let newStatus = 'lost';
                        let payout = null;

                        if (option.direction === 'up' && currentPrice > entryPrice) {
                            newStatus = 'won';
                            payout = parseFloat(option.amount) * 1.8;
                        } else if (option.direction === 'down' && currentPrice < entryPrice) {
                            newStatus = 'won';
                            payout = parseFloat(option.amount) * 1.8;
                        }

                        optionsToUpdate.push({
                            id: option.id,
                            status: newStatus,
                            exit_price: currentPrice,
                            payout: payout,
                            closed_at: new Date().toISOString()
                        });
                    } else {
                        // Если не удалось получить цену, помечаем как expired
                        optionsToUpdate.push({
                            id: option.id,
                            status: 'expired',
                            closed_at: new Date().toISOString()
                        });
                    }
                }
            }

            // Обновляем опционы в базе данных
            for (const update of optionsToUpdate) {
                const { error: updateError } = await supabase
                    .from('binary_options')
                    .update({
                        status: update.status,
                        exit_price: update.exit_price,
                        current_price: update.exit_price, // Обновляем текущую цену
                        payout: update.payout,
                        closed_at: update.closed_at,
                        last_checked_at: new Date().toISOString(),
                        check_status: 'checked'
                    })
                    .eq('id', update.id);

                if (updateError) {
                    console.error('Error updating option:', updateError);
                } else if (update.status === 'won' && update.payout) {
                    // Добавляем выплату к балансу пользователя
                    const { data: userData } = await supabase
                        .from('users')
                        .select('rub_amount')
                        .eq('chat_id', chatId)
                        .single();

                    if (userData) {
                        const newBalance = parseFloat(userData.rub_amount || 0) + update.payout;
                        await supabase
                            .from('users')
                            .update({ rub_amount: newBalance })
                            .eq('chat_id', chatId);

                        // Обновляем локальный баланс
                        const updatedUser = { ...user, rub_amount: newBalance };
                        localStorage.setItem('user', JSON.stringify(updatedUser));
                        setUser(updatedUser);
                    }
                }
            }

            // Обновляем списки опционов
            if (optionsToUpdate.length > 0) {
                await fetchActiveOptions(chatId);
                await fetchHistoryOptions(chatId);
            }
        } catch (error) {
            console.error('Error checking options:', error);
        }
    };

    const fetchHistoryOptions = async (chatId) => {
        try {
            const { data, error } = await supabase
                .from('binary_options')
                .select('*')
                .eq('chat_id', chatId)
                .in('status', ['won', 'lost', 'expired'])
                .order('created_at', { ascending: false })
                .limit(20);

            if (error) {
                console.error('Error fetching history options:', error);
            } else {
                setHistoryOptions(data || []);
            }
        } catch (error) {
            console.error('Error fetching history options:', error);
        }
    };

    const handleCreateOption = async () => {
        if (!selectedToken || !amount || !user) {
            notification.error({
                message: t('error'),
                description: t('fillAllFields')
            });
            return;
        }

        const amountNum = parseFloat(amount);
        if (isNaN(amountNum) || amountNum <= 0) {
            notification.error({
                message: t('error'),
                description: t('enterValidAmount')
            });
            return;
        }

        if (amountNum < 10) {
            notification.error({
                message: t('error'),
                description: t('minimumBetAmount')
            });
            return;
        }

        const currentBalance = parseFloat(user.rub_amount || 0);
        if (amountNum > currentBalance) {
            notification.error({
                message: t('error'),
                description: t('insufficientBalance')
            });
            return;
        }

        const currentPrice = parseFloat(selectedToken.price);
        if (!currentPrice) {
            notification.error({
                message: t('error'),
                description: t('failedToGetPrice')
            });
            return;
        }

        setLoading(true);
        try {
            // Используем отдельную функцию binary-options для создания опциона
            const { data, error } = await supabase.functions.invoke('binary-options', {
                body: {
                    chat_id: user.chat_id,
                    token: selectedToken.ticker,
                    direction: direction,
                    amount: amountNum,
                    entry_price: currentPrice,
                    expiration_time: expiration
                }
            });

            if (error) throw error;

            // Обновляем локальный баланс пользователя
            const newBalance = currentBalance - amountNum;
            const updatedUser = { ...user, rub_amount: newBalance };
            localStorage.setItem('user', JSON.stringify(updatedUser));
            setUser(updatedUser);

            // Обновляем список активных опционов
            await fetchActiveOptions(user.chat_id);

            setAmount('');
            notification.success({
                message: t('success'),
                description: t('optionCreated')
            });
        } catch (error) {
            console.error('Error creating binary option:', error);
            notification.error({
                message: t('error'),
                description: error.message || t('optionError')
            });
        } finally {
            setLoading(false);
        }
    };

    const getCurrentPrice = () => {
        if (!selectedToken) return null;
        return selectedToken.price ? parseFloat(selectedToken.price).toFixed(2) : null;
    };

    const getPayout = () => {
        if (!amount) return 0;
        const amountNum = parseFloat(amount);
        if (isNaN(amountNum)) return 0;
        // Выплата 80% при выигрыше
        return (amountNum * 1.8).toFixed(2);
    };

    const getTimeRemaining = (optionId) => {
        const expiresAt = optionTimers[optionId];
        if (!expiresAt) return null;

        const now = Date.now();
        const remaining = expiresAt - now;

        if (remaining <= 0) return { expired: true };

        const seconds = Math.floor(remaining / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        return {
            expired: false,
            hours: hours,
            minutes: minutes % 60,
            seconds: seconds % 60
        };
    };

    // Обновляем таймеры каждую секунду
    useEffect(() => {
        if (activeOptions.length === 0) return;

        const timerInterval = setInterval(() => {
            setOptionTimers(prev => {
                const updated = { ...prev };
                activeOptions.forEach(option => {
                    const createdAt = new Date(option.created_at);
                    const expirationTime = option.expiration_time * 1000;
                    updated[option.id] = createdAt.getTime() + expirationTime;
                });
                return updated;
            });
        }, 1000);

        return () => clearInterval(timerInterval);
    }, [activeOptions]);

    return (
        <div style={{ padding: '16px', maxWidth: '600px', margin: '0 auto' }}>
            <div style={{
                padding: '24px',
                background: 'rgba(102, 126, 234, 0.1)',
                borderRadius: '12px',
                border: '2px solid rgba(102, 126, 234, 0.3)',
                textAlign: 'center',
                marginBottom: '24px'
            }}>
                <h2 style={{ color: 'var(--section-heading-color)', fontSize: '1.5rem', marginBottom: '12px' }}>
                    {t('binaryOptionsTitle')}
                </h2>
                <p style={{ color: 'var(--text-color)', fontSize: '16px' }}>
                    {t('binaryOptionsDescription')}
                </p>
            </div>

            {/* Выбор токена */}
            <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-color)' }}>
                    {t('selectAsset')}:
                </label>
                <select
                    value={selectedToken?.ticker || ''}
                    onChange={(e) => {
                        const token = tokens.find(t => t.ticker === e.target.value);
                        setSelectedToken(token || null);
                    }}
                    style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '8px',
                        border: '1px solid rgba(102, 126, 234, 0.3)',
                        background: 'var(--section-background-color)',
                        color: 'var(--text-color)',
                        fontSize: '16px'
                    }}
                >
                    <option value="">{t('selectAsset')}</option>
                    {tokens.filter(t => t.ticker !== 'USDT').map(token => (
                        <option key={token.ticker} value={token.ticker}>
                            {token.name} ({token.ticker})
                            {token.price && ` - $${parseFloat(token.price).toFixed(2)}`}
                        </option>
                    ))}
                </select>
            </div>

            {/* График цены */}
            {selectedToken && (
                <div style={{
                    marginBottom: '20px',
                    background: 'var(--section-background-color)',
                    borderRadius: '12px',
                    padding: '0',
                    border: '1px solid rgba(102, 126, 234, 0.3)',
                    overflow: 'hidden'
                }}>
                    <div style={{
                        padding: '12px 16px',
                        background: 'rgba(102, 126, 234, 0.1)',
                        borderBottom: '1px solid rgba(102, 126, 234, 0.2)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '12px'
                }}>
                        <div>
                    <div style={{ color: 'var(--text-color)', fontSize: '14px', marginBottom: '4px' }}>
                                {selectedToken.name} ({selectedToken.ticker})
                    </div>
                            {getCurrentPrice() && (
                                <div style={{ color: 'var(--section-heading-color)', fontSize: '20px', fontWeight: 'bold' }}>
                        ${getCurrentPrice()}
                                    {selectedToken.priceChangePercent && (
                                        <span style={{
                                            marginLeft: '8px',
                                            fontSize: '14px',
                                            color: parseFloat(selectedToken.priceChangePercent) >= 0 ? '#4caf50' : '#f44336'
                                        }}>
                                            {parseFloat(selectedToken.priceChangePercent) >= 0 ? '+' : ''}
                                            {selectedToken.priceChangePercent}%
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                        {/* Кнопки вибору таймфрейму */}
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {['1m', '5m', '15m', '30m', '1h', '4h', '1d'].map((tf) => (
                                <button
                                    key={tf}
                                    onClick={() => setTimeframe(tf)}
                                    style={{
                                        padding: '6px 12px',
                                        borderRadius: '6px',
                                        border: `1px solid ${timeframe === tf ? '#667eea' : 'rgba(102, 126, 234, 0.3)'}`,
                                        background: timeframe === tf 
                                            ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                                            : 'var(--section-background-color)',
                                        color: timeframe === tf ? 'white' : 'var(--text-color)',
                                        fontSize: '12px',
                                        fontWeight: timeframe === tf ? 'bold' : 'normal',
                                        cursor: 'pointer',
                                        transition: 'all 0.3s ease',
                                        minWidth: '40px'
                                    }}
                                    onMouseEnter={(e) => {
                                        if (timeframe !== tf) {
                                            e.currentTarget.style.background = 'rgba(102, 126, 234, 0.2)';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (timeframe !== tf) {
                                            e.currentTarget.style.background = 'var(--section-background-color)';
                                        }
                                    }}
                                >
                                    {tf}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div 
                        ref={chartContainerRef}
                        style={{ 
                            width: '100%', 
                            height: '400px',
                            position: 'relative'
                        }}
                    />
                </div>
            )}

            {/* Выбор направления */}
            <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-color)' }}>
                    {t('direction')}:
                </label>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                        onClick={() => setDirection('up')}
                        style={{
                            flex: 1,
                            padding: '16px',
                            borderRadius: '8px',
                            border: `2px solid ${direction === 'up' ? '#4caf50' : 'rgba(102, 126, 234, 0.3)'}`,
                            background: direction === 'up' ? 'rgba(76, 175, 80, 0.2)' : 'var(--section-background-color)',
                            color: 'var(--text-color)',
                            fontSize: '18px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease'
                        }}
                    >
                        ⬆️ {t('up')}
                    </button>
                    <button
                        onClick={() => setDirection('down')}
                        style={{
                            flex: 1,
                            padding: '16px',
                            borderRadius: '8px',
                            border: `2px solid ${direction === 'down' ? '#f44336' : 'rgba(102, 126, 234, 0.3)'}`,
                            background: direction === 'down' ? 'rgba(244, 67, 54, 0.2)' : 'var(--section-background-color)',
                            color: 'var(--text-color)',
                            fontSize: '18px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease'
                        }}
                    >
                        ⬇️ {t('down')}
                    </button>
                </div>
            </div>

            {/* Сумма ставки */}
            <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-color)' }}>
                    {t('betAmount')}:
                </label>
                <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder={t('enterAmount')}
                    min="0"
                    step="0.01"
                    style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '8px',
                        border: '1px solid rgba(102, 126, 234, 0.3)',
                        background: 'var(--section-background-color)',
                        color: 'var(--text-color)',
                        fontSize: '16px'
                    }}
                />
                {user && (
                    <div style={{ marginTop: '8px', fontSize: '14px', color: 'var(--crypto-list-price-color)' }}>
                        {t('available')}: ₽{parseFloat(user.rub_amount || 0).toFixed(2)}
                    </div>
                )}
            </div>

            {/* Время экспирации */}
            <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-color)' }}>
                    {t('expirationTime')}:
                </label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {expirationOptions.map(opt => (
                        <button
                            key={opt.value}
                            onClick={() => setExpiration(opt.value)}
                            style={{
                                padding: '10px 16px',
                                borderRadius: '8px',
                                border: `1px solid ${expiration === opt.value ? '#667eea' : 'rgba(102, 126, 234, 0.3)'}`,
                                background: expiration === opt.value ? 'rgba(102, 126, 234, 0.2)' : 'var(--section-background-color)',
                                color: 'var(--text-color)',
                                fontSize: '14px',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease'
                            }}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Выплата */}
            {amount && (
                <div style={{
                    padding: '12px',
                    background: 'rgba(102, 126, 234, 0.1)',
                    borderRadius: '8px',
                    marginBottom: '20px',
                    textAlign: 'center'
                }}>
                    <div style={{ color: 'var(--text-color)', fontSize: '14px', marginBottom: '4px' }}>
                        {t('potentialPayout')}:
                    </div>
                    <div style={{ color: 'var(--win-color)', fontSize: '20px', fontWeight: 'bold' }}>
                        ₽{getPayout()}
                    </div>
                    <div style={{ color: 'var(--crypto-list-price-color)', fontSize: '12px', marginTop: '4px' }}>
                        {t('profitPercent')}
                    </div>
                </div>
            )}

            {/* Кнопка создания */}
            <button
                onClick={handleCreateOption}
                disabled={loading || !selectedToken || !amount}
                style={{
                    width: '100%',
                    padding: '16px',
                    borderRadius: '8px',
                    border: 'none',
                    background: loading || !selectedToken || !amount 
                        ? 'rgba(102, 126, 234, 0.3)' 
                        : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    fontSize: '18px',
                    fontWeight: 'bold',
                    cursor: loading || !selectedToken || !amount ? 'not-allowed' : 'pointer',
                    transition: 'all 0.3s ease',
                    marginBottom: '32px'
                }}
            >
                {loading ? t('creating') : t('createOption')}
            </button>

            {/* Активные опционы */}
            {activeOptions.length > 0 && (
                <div style={{ marginBottom: '32px' }}>
                    <h3 style={{ color: 'var(--section-heading-color)', fontSize: '1.2rem', marginBottom: '16px' }}>
                        {t('activeOptions')} ({activeOptions.length})
                    </h3>
                    {activeOptions.map(option => {
                        const timeRemaining = getTimeRemaining(option.id);
                        const currentPrice = tokens.find(t => t.ticker === option.token)?.price;
                        const entryPrice = parseFloat(option.entry_price);
                        const isWinning = currentPrice ? 
                            (option.direction === 'up' ? parseFloat(currentPrice) > entryPrice : parseFloat(currentPrice) < entryPrice) 
                            : null;

                        return (
                        <div
                            key={option.id}
                            style={{
                                    padding: '20px',
                                background: 'var(--section-background-color)',
                                    borderRadius: '12px',
                                    marginBottom: '16px',
                                    border: `2px solid ${option.direction === 'up' ? 'rgba(76, 175, 80, 0.4)' : 'rgba(244, 67, 54, 0.4)'}`,
                                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                            }}
                        >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ 
                                            fontSize: '24px',
                                            fontWeight: 'bold',
                                            color: option.direction === 'up' ? '#4caf50' : '#f44336'
                                        }}>
                                            {option.direction === 'up' ? '⬆️' : '⬇️'}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 'bold', color: 'var(--text-color)', fontSize: '18px' }}>
                                                {option.token}
                                            </div>
                                            <div style={{ fontSize: '12px', color: 'var(--crypto-list-price-color)' }}>
                                                {t('entryPrice')}: ${entryPrice.toFixed(2)}
                                            </div>
                                        </div>
                                </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontWeight: 'bold', color: 'var(--text-color)', fontSize: '18px' }}>
                                    ₽{parseFloat(option.amount).toFixed(2)}
                                        </div>
                                        <div style={{ fontSize: '12px', color: 'var(--win-color)' }}>
                                            {t('potentialPayout')}: ₽{(parseFloat(option.amount) * 1.8).toFixed(2)}
                                        </div>
                                    </div>
                                </div>

                                {currentPrice && (
                                    <div style={{ 
                                        padding: '8px 12px',
                                        background: isWinning ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)',
                                        borderRadius: '8px',
                                        marginBottom: '12px',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}>
                                        <div style={{ fontSize: '14px', color: 'var(--text-color)' }}>
                                            {t('currentPrice')}:
                                        </div>
                                        <div style={{ 
                                            fontSize: '16px',
                                            fontWeight: 'bold',
                                            color: isWinning ? '#4caf50' : '#f44336'
                                        }}>
                                            ${parseFloat(currentPrice).toFixed(2)}
                                            {isWinning ? ' ✅' : ' ❌'}
                                        </div>
                                    </div>
                                )}

                                {timeRemaining && !timeRemaining.expired && (
                                    <div style={{
                                        padding: '12px',
                                        background: 'rgba(102, 126, 234, 0.1)',
                                        borderRadius: '8px',
                                        textAlign: 'center'
                                    }}>
                                        <div style={{ fontSize: '12px', color: 'var(--crypto-list-price-color)', marginBottom: '4px' }}>
                                            {t('timeRemaining')}:
                                        </div>
                                        <div style={{ 
                                            fontSize: '20px',
                                            fontWeight: 'bold',
                                            color: 'var(--section-heading-color)',
                                            fontFamily: 'monospace'
                                        }}>
                                            {String(timeRemaining.hours).padStart(2, '0')}:
                                            {String(timeRemaining.minutes).padStart(2, '0')}:
                                            {String(timeRemaining.seconds).padStart(2, '0')}
                                        </div>
                                    </div>
                                )}

                                {timeRemaining && timeRemaining.expired && (
                                    <div style={{
                                        padding: '12px',
                                        background: 'rgba(244, 67, 54, 0.1)',
                                        borderRadius: '8px',
                                        textAlign: 'center',
                                        color: '#f44336',
                                        fontWeight: 'bold'
                                    }}>
                                        {t('expired')}
                            </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* История */}
            {historyOptions.length > 0 && (
                <div>
                    <h3 style={{ color: 'var(--section-heading-color)', fontSize: '1.2rem', marginBottom: '16px' }}>
                        {t('history')} ({historyOptions.length})
                    </h3>
                    {historyOptions.map(option => {
                        const createdAt = new Date(option.created_at);
                        const closedAt = option.closed_at ? new Date(option.closed_at) : null;

                        return (
                        <div
                            key={option.id}
                            style={{
                                    padding: '20px',
                                background: 'var(--section-background-color)',
                                    borderRadius: '12px',
                                    marginBottom: '16px',
                                    border: `2px solid ${option.status === 'won' ? 'rgba(76, 175, 80, 0.4)' : 'rgba(244, 67, 54, 0.4)'}`,
                                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                            }}
                        >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ 
                                            fontSize: '24px',
                                            fontWeight: 'bold',
                                            color: option.direction === 'up' ? '#4caf50' : '#f44336'
                                        }}>
                                            {option.direction === 'up' ? '⬆️' : '⬇️'}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 'bold', color: 'var(--text-color)', fontSize: '18px' }}>
                                                {option.token}
                                            </div>
                                            <div style={{ fontSize: '12px', color: 'var(--crypto-list-price-color)' }}>
                                                {createdAt.toLocaleString()}
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{
                                        padding: '8px 16px',
                                        borderRadius: '8px',
                                        background: option.status === 'won' ? 'rgba(76, 175, 80, 0.2)' : 'rgba(244, 67, 54, 0.2)',
                                        color: option.status === 'won' ? 'var(--win-color)' : 'var(--loss-color)',
                                        fontWeight: 'bold',
                                        fontSize: '14px'
                                    }}>
                                        {option.status === 'won' ? '✅ ' + t('win') : option.status === 'lost' ? '❌ ' + t('loss') : '⏱️ ' + t('closed')}
                                    </div>
                                </div>

                                <div style={{ 
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr',
                                    gap: '12px',
                                    marginBottom: '12px'
                                }}>
                                    <div style={{ 
                                        padding: '8px',
                                        background: 'rgba(102, 126, 234, 0.1)',
                                        borderRadius: '8px'
                                    }}>
                                        <div style={{ fontSize: '12px', color: 'var(--crypto-list-price-color)', marginBottom: '4px' }}>
                                            {t('bet')}
                                        </div>
                                        <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--text-color)' }}>
                                            ₽{parseFloat(option.amount).toFixed(2)}
                                        </div>
                                    </div>
                                    {option.payout && (
                                        <div style={{ 
                                            padding: '8px',
                                            background: 'rgba(76, 175, 80, 0.1)',
                                            borderRadius: '8px'
                                        }}>
                                            <div style={{ fontSize: '12px', color: 'var(--crypto-list-price-color)', marginBottom: '4px' }}>
                                                {t('payout')}
                                            </div>
                                            <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--win-color)' }}>
                                                ₽{parseFloat(option.payout).toFixed(2)}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr',
                                    gap: '12px',
                                    fontSize: '12px',
                                    color: 'var(--crypto-list-price-color)'
                                }}>
                                    <div>
                                        {t('entryPrice')}: ${parseFloat(option.entry_price).toFixed(2)}
                                    </div>
                                    {option.exit_price && (
                                        <div>
                                            {t('exitPrice')}: ${parseFloat(option.exit_price).toFixed(2)}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default BinaryOptions;

