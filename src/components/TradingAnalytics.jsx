import React, { useMemo, useState, useEffect } from 'react';
import Chart from 'react-apexcharts';
import { supabase } from '../supabase';
import { useI18n } from '../i18n/I18nContext';

const TradingAnalytics = ({ trades, user }) => {
    const { t } = useI18n();
    const [period, setPeriod] = useState('all'); // 'day', 'week', 'month', 'year', 'all'
    const [deposits, setDeposits] = useState([]);
    const [withdraws, setWithdraws] = useState([]);

    useEffect(() => {
        if (user?.chat_id) {
            fetchTransactions();
        }
    }, [user?.chat_id]);

    const fetchTransactions = async () => {
        try {
            const [depositsData, withdrawsData] = await Promise.all([
                supabase.from('invoices').select('*').eq('chat_id', user.chat_id).order('created_at', { ascending: true }),
                supabase.from('withdraws').select('*').eq('chat_id', user.chat_id).order('created_at', { ascending: true })
            ]);

            if (!depositsData.error) setDeposits(depositsData.data || []);
            if (!withdrawsData.error) setWithdraws(withdrawsData.data || []);
        } catch (error) {
            console.error('Error fetching transactions:', error);
        }
    };

    // Фільтрація угод по періоду
    const filteredTrades = useMemo(() => {
        if (!trades || trades.length === 0) return [];
        
        const now = new Date();
        let startDate = new Date(0); // Початок епохи

        switch (period) {
            case 'day':
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                break;
            case 'week':
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            case 'year':
                startDate = new Date(now.getFullYear(), 0, 1);
                break;
            default:
                return trades.filter(t => !t.isActive);
        }

        return trades.filter(trade => {
            if (trade.isActive) return false;
            const tradeDate = new Date(trade.created_at);
            return tradeDate >= startDate;
        });
    }, [trades, period]);

    // Розширена статистика торгівлі
    const advancedStats = useMemo(() => {
        const completedTrades = filteredTrades.filter(t => t.isWin !== null);
        
        if (completedTrades.length === 0) {
            return {
                winRate: 0,
                avgProfit: 0,
                avgLoss: 0,
                maxWin: 0,
                maxLoss: 0,
                profitFactor: 0,
                totalProfit: 0,
                totalLoss: 0
            };
        }

        const wins = completedTrades.filter(t => t.isWin);
        const losses = completedTrades.filter(t => !t.isWin);

        const winAmounts = wins.map(t => parseFloat(t.amount) * 0.75);
        const lossAmounts = losses.map(t => parseFloat(t.amount) * 0.75);

        const totalProfit = winAmounts.reduce((sum, amt) => sum + amt, 0);
        const totalLoss = lossAmounts.reduce((sum, amt) => sum + amt, 0);

        return {
            winRate: completedTrades.length > 0 ? (wins.length / completedTrades.length) * 100 : 0,
            avgProfit: wins.length > 0 ? totalProfit / wins.length : 0,
            avgLoss: losses.length > 0 ? totalLoss / losses.length : 0,
            maxWin: winAmounts.length > 0 ? Math.max(...winAmounts) : 0,
            maxLoss: lossAmounts.length > 0 ? Math.max(...lossAmounts) : 0,
            profitFactor: totalLoss > 0 ? totalProfit / totalLoss : (totalProfit > 0 ? Infinity : 0),
            totalProfit,
            totalLoss
        };
    }, [filteredTrades]);

    // Статистика по періодах
    const periodStats = useMemo(() => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthAgo = new Date(now.getFullYear(), now.getMonth(), 1);

        const todayTrades = trades.filter(t => {
            if (t.isActive) return false;
            const date = new Date(t.created_at);
            return date >= today;
        });

        const weekTrades = trades.filter(t => {
            if (t.isActive) return false;
            const date = new Date(t.created_at);
            return date >= weekAgo;
        });

        const monthTrades = trades.filter(t => {
            if (t.isActive) return false;
            const date = new Date(t.created_at);
            return date >= monthAgo;
        });

        const calculateProfit = (tradesList) => {
            return tradesList.reduce((sum, t) => {
                if (t.isWin === true) return sum + parseFloat(t.amount) * 0.75;
                if (t.isWin === false) return sum - parseFloat(t.amount) * 0.75;
                return sum;
            }, 0);
        };

        // Найактивніші дні
        const tradesByDay = {};
        trades.filter(t => !t.isActive).forEach(trade => {
            const date = new Date(trade.created_at);
            const dayKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
            if (!tradesByDay[dayKey]) {
                tradesByDay[dayKey] = 0;
            }
            tradesByDay[dayKey]++;
        });

        const mostActiveDay = Object.entries(tradesByDay).sort((a, b) => b[1] - a[1])[0];

        return {
            today: {
                profit: calculateProfit(todayTrades),
                tradesCount: todayTrades.length,
                wins: todayTrades.filter(t => t.isWin).length,
                losses: todayTrades.filter(t => t.isWin === false).length
            },
            week: {
                profit: calculateProfit(weekTrades),
                tradesCount: weekTrades.length,
                wins: weekTrades.filter(t => t.isWin).length,
                losses: weekTrades.filter(t => t.isWin === false).length
            },
            month: {
                profit: calculateProfit(monthTrades),
                tradesCount: monthTrades.length,
                wins: monthTrades.filter(t => t.isWin).length,
                losses: monthTrades.filter(t => t.isWin === false).length
            },
            mostActiveDay: mostActiveDay ? {
                date: new Date(mostActiveDay[0].split('-').map(Number)),
                count: mostActiveDay[1]
            } : null
        };
    }, [trades]);

    // Дані для графіка доходності
    const chartData = useMemo(() => {
        if (!trades || trades.length === 0) {
            return { dates: [], balances: [] };
        }

        // Об'єднуємо всі транзакції та угоди
        const allEvents = [
            ...deposits.map(d => ({
                date: new Date(d.created_at),
                type: 'deposit',
                amount: parseFloat(d.amount) / 79, // Конвертуємо RUB в USDT (приблизно)
                usdtAmount: parseFloat(d.amount) / 79
            })),
            ...withdraws.map(w => ({
                date: new Date(w.created_at),
                type: 'withdraw',
                amount: -parseFloat(w.amount) / 79,
                usdtAmount: -parseFloat(w.amount) / 79
            })),
            ...trades.filter(t => !t.isActive && t.isWin !== null).map(t => {
                const tradeAmount = parseFloat(t.amount);
                // Прибуток/збиток від угоди
                // Якщо виграв: отримує amount * 0.75 (це чистий прибуток після повернення ставки)
                // Якщо програв: втрачає amount (чистий збиток)
                const netResult = t.isWin ? tradeAmount * 0.75 : -tradeAmount;
                return {
                    date: new Date(t.created_at),
                    type: 'trade',
                    usdtAmount: netResult
                };
            })
        ].sort((a, b) => a.date - b.date);

        // Розраховуємо баланс в кожній точці
        let currentBalance = 0;
        const dates = [];
        const balances = [];

        allEvents.forEach(event => {
            currentBalance += event.usdtAmount;
            dates.push(event.date);
            balances.push(currentBalance);
        });

        // Додаємо поточну дату з поточним балансом
        if (user) {
            const currentBalanceUsdt = parseFloat(user.usdt_amount || 0);
            dates.push(new Date());
            balances.push(currentBalanceUsdt);
        }

        return { dates, balances };
    }, [trades, deposits, withdraws, user]);

    const chartOptions = {
        chart: {
            type: 'line',
            height: 350,
            toolbar: {
                show: true
            },
            zoom: {
                enabled: true
            }
        },
        stroke: {
            curve: 'smooth',
            width: 3
        },
        colors: ['#64b5f6'],
        xaxis: {
            type: 'datetime',
            labels: {
                style: {
                    colors: 'var(--text-color)'
                }
            }
        },
        yaxis: {
            labels: {
                style: {
                    colors: 'var(--text-color)'
                },
                formatter: (value) => `${value.toFixed(2)} USDT`
            }
        },
        grid: {
            borderColor: 'rgba(100, 181, 246, 0.2)'
        },
        tooltip: {
            theme: document.body.classList.contains('light-theme') ? 'light' : 'dark',
            y: {
                formatter: (value) => `${value.toFixed(2)} USDT`
            }
        },
        dataLabels: {
            enabled: false
        }
    };

    const formatDate = (date) => {
        if (!date) return '';
        return new Date(date).toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Фільтр періоду */}
            <section className="section">
                <h2>{t('tradingAnalytics')}</h2>
                <div style={{
                    display: 'flex',
                    gap: '10px',
                    marginBottom: '20px',
                    flexWrap: 'wrap'
                }}>
                    {[
                        { key: 'all', label: t('allTime') },
                        { key: 'year', label: t('year') },
                        { key: 'month', label: t('month') },
                        { key: 'week', label: t('week') },
                        { key: 'day', label: t('day') }
                    ].map(p => (
                        <button
                            key={p.key}
                            onClick={() => setPeriod(p.key)}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '8px',
                                border: period === p.key ? '2px solid #90caf9' : '2px solid #64b5f6',
                                background: period === p.key
                                    ? 'linear-gradient(135deg, #64b5f6 0%, #90caf9 100%)'
                                    : 'linear-gradient(135deg, rgba(100, 181, 246, 0.2) 0%, rgba(129, 212, 250, 0.2) 100%)',
                                color: period === p.key ? '#0a1929' : 'var(--text-color)',
                                fontWeight: '600',
                                fontSize: '14px',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease'
                            }}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>

                {/* Розширена статистика */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '15px',
                    marginBottom: '20px'
                }}>
                    <div style={{
                        background: 'var(--section-background-color)',
                        padding: '16px',
                        borderRadius: '12px',
                        border: '2px solid rgba(100, 181, 246, 0.3)',
                        boxShadow: '0 4px 12px rgba(100, 181, 246, 0.2)'
                    }}>
                        <p style={{ color: 'var(--section-text-color)', margin: '0 0 8px 0', fontSize: '14px' }}>{t('winRate')}</p>
                        <strong style={{ color: 'var(--text-color)', fontSize: '24px', fontWeight: '700' }}>
                            {advancedStats.winRate.toFixed(1)}%
                        </strong>
                    </div>

                    <div style={{
                        background: 'var(--section-background-color)',
                        padding: '16px',
                        borderRadius: '12px',
                        border: '2px solid rgba(100, 181, 246, 0.3)',
                        boxShadow: '0 4px 12px rgba(100, 181, 246, 0.2)'
                    }}>
                        <p style={{ color: 'var(--section-text-color)', margin: '0 0 8px 0', fontSize: '14px' }}>{t('averageProfit')}</p>
                        <strong style={{ color: '#4caf50', fontSize: '24px', fontWeight: '700' }}>
                            +{advancedStats.avgProfit.toFixed(2)} USDT
                        </strong>
                    </div>

                    <div style={{
                        background: 'var(--section-background-color)',
                        padding: '16px',
                        borderRadius: '12px',
                        border: '2px solid rgba(100, 181, 246, 0.3)',
                        boxShadow: '0 4px 12px rgba(100, 181, 246, 0.2)'
                    }}>
                        <p style={{ color: 'var(--section-text-color)', margin: '0 0 8px 0', fontSize: '14px' }}>{t('averageLoss')}</p>
                        <strong style={{ color: '#f44336', fontSize: '24px', fontWeight: '700' }}>
                            {advancedStats.avgLoss.toFixed(2)} USDT
                        </strong>
                    </div>

                    <div style={{
                        background: 'var(--section-background-color)',
                        padding: '16px',
                        borderRadius: '12px',
                        border: '2px solid rgba(100, 181, 246, 0.3)',
                        boxShadow: '0 4px 12px rgba(100, 181, 246, 0.2)'
                    }}>
                        <p style={{ color: 'var(--section-text-color)', margin: '0 0 8px 0', fontSize: '14px' }}>{t('maxWin')}</p>
                        <strong style={{ color: '#4caf50', fontSize: '24px', fontWeight: '700' }}>
                            +{advancedStats.maxWin.toFixed(2)} USDT
                        </strong>
                    </div>

                    <div style={{
                        background: 'var(--section-background-color)',
                        padding: '16px',
                        borderRadius: '12px',
                        border: '2px solid rgba(100, 181, 246, 0.3)',
                        boxShadow: '0 4px 12px rgba(100, 181, 246, 0.2)'
                    }}>
                        <p style={{ color: 'var(--section-text-color)', margin: '0 0 8px 0', fontSize: '14px' }}>{t('maxLoss')}</p>
                        <strong style={{ color: '#f44336', fontSize: '24px', fontWeight: '700' }}>
                            {advancedStats.maxLoss.toFixed(2)} USDT
                        </strong>
                    </div>

                    <div style={{
                        background: 'var(--section-background-color)',
                        padding: '16px',
                        borderRadius: '12px',
                        border: '2px solid rgba(100, 181, 246, 0.3)',
                        boxShadow: '0 4px 12px rgba(100, 181, 246, 0.2)'
                    }}>
                        <p style={{ color: 'var(--section-text-color)', margin: '0 0 8px 0', fontSize: '14px' }}>{t('profitFactor')}</p>
                        <strong style={{ color: 'var(--text-color)', fontSize: '24px', fontWeight: '700' }}>
                            {advancedStats.profitFactor === Infinity ? '∞' : advancedStats.profitFactor.toFixed(2)}
                        </strong>
                    </div>
                </div>
            </section>

            {/* Графік доходності */}
            <section className="section">
                <h2>{t('profitabilityChart')}</h2>
                {chartData.dates.length > 0 ? (
                    <Chart
                        options={chartOptions}
                        series={[{
                            name: t('balance'),
                            data: chartData.dates.map((date, index) => ({
                                x: date.getTime(),
                                y: chartData.balances[index]
                            }))
                        }]}
                        type="line"
                        height={350}
                    />
                ) : (
                    <div style={{
                        textAlign: 'center',
                        padding: '40px',
                        color: 'var(--section-text-color)'
                    }}>
                        <p>{t('notEnoughData')}</p>
                    </div>
                )}
            </section>

            {/* Статистика по періодах */}
            <section className="section">
                <h2>{t('statisticsByPeriods')}</h2>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                    gap: '15px',
                    marginBottom: '20px'
                }}>
                    {/* Сьогодні */}
                    <div style={{
                        background: 'var(--section-background-color)',
                        padding: '20px',
                        borderRadius: '12px',
                        border: '2px solid rgba(100, 181, 246, 0.3)',
                        boxShadow: '0 4px 12px rgba(100, 181, 246, 0.2)'
                    }}>
                        <h3 style={{ color: 'var(--section-heading-color)', margin: '0 0 15px 0', fontSize: '18px' }}>{t('today')}</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div>
                                <p style={{ color: 'var(--section-text-color)', margin: '0 0 4px 0', fontSize: '14px' }}>{t('profit')}</p>
                                <strong style={{
                                    color: periodStats.today.profit >= 0 ? '#4caf50' : '#f44336',
                                    fontSize: '20px',
                                    fontWeight: '700'
                                }}>
                                    {periodStats.today.profit >= 0 ? '+' : ''}{periodStats.today.profit.toFixed(2)} USDT
                                </strong>
                            </div>
                            <div>
                                <p style={{ color: 'var(--section-text-color)', margin: '0 0 4px 0', fontSize: '14px' }}>{t('trades')}</p>
                                <strong style={{ color: 'var(--text-color)', fontSize: '18px', fontWeight: '700' }}>
                                    {periodStats.today.tradesCount}
                                </strong>
                                <span style={{ color: 'var(--section-text-color)', fontSize: '14px', marginLeft: '8px' }}>
                                    ({periodStats.today.wins}W / {periodStats.today.losses}L)
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Тиждень */}
                    <div style={{
                        background: 'var(--section-background-color)',
                        padding: '20px',
                        borderRadius: '12px',
                        border: '2px solid rgba(100, 181, 246, 0.3)',
                        boxShadow: '0 4px 12px rgba(100, 181, 246, 0.2)'
                    }}>
                        <h3 style={{ color: 'var(--section-heading-color)', margin: '0 0 15px 0', fontSize: '18px' }}>{t('week')}</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div>
                                <p style={{ color: 'var(--section-text-color)', margin: '0 0 4px 0', fontSize: '14px' }}>{t('profit')}</p>
                                <strong style={{
                                    color: periodStats.week.profit >= 0 ? '#4caf50' : '#f44336',
                                    fontSize: '20px',
                                    fontWeight: '700'
                                }}>
                                    {periodStats.week.profit >= 0 ? '+' : ''}{periodStats.week.profit.toFixed(2)} USDT
                                </strong>
                            </div>
                            <div>
                                <p style={{ color: 'var(--section-text-color)', margin: '0 0 4px 0', fontSize: '14px' }}>{t('trades')}</p>
                                <strong style={{ color: 'var(--text-color)', fontSize: '18px', fontWeight: '700' }}>
                                    {periodStats.week.tradesCount}
                                </strong>
                                <span style={{ color: 'var(--section-text-color)', fontSize: '14px', marginLeft: '8px' }}>
                                    ({periodStats.week.wins}W / {periodStats.week.losses}L)
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Місяць */}
                    <div style={{
                        background: 'var(--section-background-color)',
                        padding: '20px',
                        borderRadius: '12px',
                        border: '2px solid rgba(100, 181, 246, 0.3)',
                        boxShadow: '0 4px 12px rgba(100, 181, 246, 0.2)'
                    }}>
                        <h3 style={{ color: 'var(--section-heading-color)', margin: '0 0 15px 0', fontSize: '18px' }}>{t('month')}</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div>
                                <p style={{ color: 'var(--section-text-color)', margin: '0 0 4px 0', fontSize: '14px' }}>{t('profit')}</p>
                                <strong style={{
                                    color: periodStats.month.profit >= 0 ? '#4caf50' : '#f44336',
                                    fontSize: '20px',
                                    fontWeight: '700'
                                }}>
                                    {periodStats.month.profit >= 0 ? '+' : ''}{periodStats.month.profit.toFixed(2)} USDT
                                </strong>
                            </div>
                            <div>
                                <p style={{ color: 'var(--section-text-color)', margin: '0 0 4px 0', fontSize: '14px' }}>{t('trades')}</p>
                                <strong style={{ color: 'var(--text-color)', fontSize: '18px', fontWeight: '700' }}>
                                    {periodStats.month.tradesCount}
                                </strong>
                                <span style={{ color: 'var(--section-text-color)', fontSize: '14px', marginLeft: '8px' }}>
                                    ({periodStats.month.wins}W / {periodStats.month.losses}L)
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Найактивніший день */}
                {periodStats.mostActiveDay && (
                    <div style={{
                        background: 'var(--section-background-color)',
                        padding: '20px',
                        borderRadius: '12px',
                        border: '2px solid rgba(100, 181, 246, 0.3)',
                        boxShadow: '0 4px 12px rgba(100, 181, 246, 0.2)',
                        marginTop: '15px'
                    }}>
                        <h3 style={{ color: 'var(--section-heading-color)', margin: '0 0 10px 0', fontSize: '18px' }}>{t('mostActiveDay')}</h3>
                        <p style={{ color: 'var(--text-color)', margin: '0', fontSize: '16px' }}>
                            <strong>{formatDate(periodStats.mostActiveDay.date)}</strong> - {periodStats.mostActiveDay.count} {periodStats.mostActiveDay.count === 1 ? t('trade') : periodStats.mostActiveDay.count < 5 ? t('tradesFew') : t('tradesMany')}
                        </p>
                    </div>
                )}
            </section>
        </div>
    );
};

export default TradingAnalytics;

