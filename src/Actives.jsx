import React, { useEffect, useMemo, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import CryptoItem from './CryptoItem';
import CurrencyItem from './CurrecyItem';
import { initialCrypto, binance } from './utils';
import { supabase } from './supabase';
import { notification } from 'antd';
import TransactionHistory from './components/TransactionHistory';
import TradingAnalytics from './components/TradingAnalytics';
import { fetchRemoteReviews, mergeWithBase, sortReviewsDesc } from './utils/reviewsStorage';
import { reviews as baseReviews } from './data/reviews';
import { useI18n } from './i18n/I18nContext';

const Actives = () => {
    const { t } = useI18n();
    const [crypto, setCrypto] = useState(initialCrypto);
    const [trades, setTrades] = useState([]);
    const [rub, setRub] = useState(0);
    const [amount, setAmount] = useState(0);
    const [user, setUser] = useState();
    const [reviewIndex, setReviewIndex] = useState(0);
    const [reviewsList, setReviewsList] = useState([]);
    const [showBalance, setShowBalance] = useState(true);
    const queryParams = new URLSearchParams(window.location.search);
    const chatId = queryParams.get('chat_id');
    const navigate = useNavigate()

    const fetchUser = async (chatId) => {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('chat_id', chatId)
            .single();

        if (error) {
            console.error('Error fetching user:', error);
        } else {
            console.log('User data:', data);
        }
        if (data) {
            localStorage.setItem('user', JSON.stringify(data));
            setUser(data);
            setAmount((parseFloat(data.rub_amount / 79)) + parseFloat(data.usdt_amount));
        }
    };

    const fetchTrades = async (chatId) => {
        const { data, error } = await supabase
            .from('trades')
            .select('*')
            .eq('chat_id', chatId);

        if (error) {
            console.error('Error fetching trades:', error);
        } else {
            console.log('Trades data:', data);
            setTrades(data);
        }
    };

    useEffect(() => {
        if (chatId) {
            fetchUser(chatId);
            fetchTrades(chatId);
        }
    }, [chatId]);

    useEffect(() => {
        const sendWebhook = async () => {
            const currentChatId = chatId || (localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')).chat_id : null);
            
            if (currentChatId) {
                try {
                    await fetch('https://fyqwhjybwbugveyjpelg.supabase.co/functions/v1/crypto-bot-webhook', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ chat_id: currentChatId }),
                    });
                } catch (error) {
                    console.error('Error sending webhook:', error);
                }
            }
        };

        sendWebhook();
    }, [chatId]);

    const tradesStat = useMemo(() => {
        const tradesTwo = trades.filter((trade) => !trade.isActive).reduce((acc, trade) => {
            if (trade.isWin) {
                return { ...acc, isWin: acc.isWin + 1, amount: acc.amount + trade.amount };
            } else {
                return { ...acc, isLoss: acc.isLoss + 1, amount: acc.amount + trade.amount };
            }
        }, { isWin: 0, isLoss: 0, amount: 0 });
        console.log(tradesTwo);

        return tradesTwo;
    }, [trades]);

    useEffect(() => {
        const chatId = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')).chat_id : null;
        if (chatId) {
            fetchUser(chatId);
            fetchTrades(chatId);
        }
    }, []);

    useEffect(() => {
        const fetchCryptoPrices = async () => {
            const responses = await Promise.all(
                crypto.filter((c) => c.ticker !== 'USDT').map((item) => fetch(binance + item.ticker + 'USDT'))
            );
            const data = await Promise.all(responses.map((res) => res.json()));

            setCrypto((prevCrypto) =>
                prevCrypto.map((item, index) => ({
                    ...item,
                    price: item.ticker !== 'USDT' ? Number(data[index].price).toFixed(2) : item.price,
                }))
            );
        };
        const interva = setInterval(fetchCryptoPrices, 5000);
        fetchCryptoPrices();

        return () => clearInterval(interva);
    }, []);

    useEffect(() => {
        const fetchRubPrice = async () => {
            const response = await fetch(binance + 'USDTRUB');
            const data = await response.json();
            setRub((Number(data.price) - 12).toFixed(2));
        };

        fetchRubPrice();
    }, []);

    const renderCurrencyList = () => (
        <ul className="currency-list">
            <CurrencyItem rub={rub} amount={user?.rub_amount || 0} />
        </ul>
    );

    const renderCryptoList = () => (
        <ul className="crypto-list">
            {crypto.map((item, index) => (
                <CryptoItem item={{ ...item, amount: item.ticker.toUpperCase() === 'USDT' ? user?.usdt_amount : item.amount, convertToUsd: item.ticker.toUpperCase() === 'USDT' ? user?.usdt_amount : item.convertToUsd }} index={index} />
            ))}
        </ul>
    );


    function onWithdrawalClick() {
        if (user?.verification_needed) {
            notification.error({
                message: t('verificationError'),
                description: t('verificationNotPassedError'),
            });
            return;
        }

        navigate('/withdraw');
    }

    async function sendVerificationRequest() {
        await supabase.from('verification').insert({ chat_id: user.chat_id });
        notification.success({
            message: t('verificationRequestSent'),
            description: t('verificationRequestSentDescription'),
        });
    }

    function handleDepositChange() {
        navigate('/deposit');
    }

    function handleChangeClick() {
        navigate('/exchange');
    }

    useEffect(() => {
        const load = async () => {
            try {
                const remote = await fetchRemoteReviews();
                const filtered = remote.filter((r) => !r.chat_id);
                setReviewsList(sortReviewsDesc(mergeWithBase(filtered)));
            } catch (e) {
                console.error('Cannot load remote reviews', e);
                setReviewsList(sortReviewsDesc(baseReviews));
            }
        };
        load();
    }, []);

    const currentReview = reviewsList[reviewIndex] || null;

    const nextReview = () => {
        if (!reviewsList.length) return;
        setReviewIndex((prev) => (prev + 1) % reviewsList.length);
    };

    const prevReview = () => {
        if (!reviewsList.length) return;
        setReviewIndex((prev) => (prev - 1 + reviewsList.length) % reviewsList.length);
    };

    return (
        <div>
            <header className="header">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
                    <h1 style={{ color: '#666', margin: 0, fontSize: '0.875rem', fontWeight: '400' }}>{t('totalBalance')}</h1>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '8px', marginBottom: '20px' }}>
                    <h2 style={{ color: '#1976d2', margin: 0, fontSize: '2rem', fontWeight: '700' }}>
                        {showBalance ? `$ ${parseFloat(amount).toFixed(2)}` : '$ •••'}
                    </h2>
                    <button
                        onClick={() => setShowBalance(!showBalance)}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#666',
                            opacity: 0.7,
                            transition: 'opacity 0.2s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                        onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
                        aria-label={showBalance ? 'Hide balance' : 'Show balance'}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            {showBalance ? (
                                <>
                                    <path d="M1 12C1 12 5 4 12 4C19 4 23 12 23 12C23 12 19 20 12 20C5 20 1 12 1 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </>
                            ) : (
                                <>
                                    <path d="M17.94 17.94C16.2306 19.243 14.1491 19.9649 12 20C5 20 1 12 1 12C2.24389 9.68192 3.96914 7.65661 6.06 6.06M9.9 4.24C10.5883 4.0789 11.2931 3.99836 12 4C19 4 23 12 23 12C22.393 13.1356 21.6691 14.2048 20.84 15.19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    <path d="M1 1L23 23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </>
                            )}
                        </svg>
                    </button>
                </div>
                <div className="buttons">
                        <div onClick={handleDepositChange}>
                            <img src="/top.svg" width={30} height={30} />
                            <span>{t('topUp')}</span>
                        </div>
                    <div onClick={onWithdrawalClick}>
                        <img src="/bottom.svg" width={30} height={30} />
                        <span>{t('withdraw')}</span>
                    </div>
                        <div onClick={handleChangeClick}>
                            <img src="/swap.svg" width={30} height={30} />
                            <span>{t('exchange')}</span>
                        </div>
                </div>
            </header>
            <section className="section" style={{ border: 0 }}>
                <h2>{t('profile')}</h2>
                <strong style={{ color: 'var(--text-color)' }}>{user?.chat_id}</strong>
                <p>{t('accountId')}</p>
                <strong style={{ color: 'var(--text-color)' }}>{(tradesStat?.isWin + tradesStat?.isLoss) || 0} / <span className='win'>{tradesStat?.isWin || 0}</span> / <span className='loss'>{tradesStat?.isLoss || 0}</span></strong>
                <p>{t('statistics')}</p>
                <strong style={{ color: 'var(--text-color)' }}>{parseFloat(tradesStat?.amount || 0).toFixed(2)} USDT</strong>
                <p>{t('tradingVolume')}</p>
                {user?.verification_on ? (
                    user?.verification_needed ? (
                        <span style={{ cursor: 'pointer' }} onClick={sendVerificationRequest}>
                            <strong>{t('verificationNotPassed')}</strong>
                            <p>{t('clickToPass')}</p>
                        </span>
                    ) : (
                        <>
                            <strong>{t('verificationPassed')}</strong>
                        </>
                    )
                ) : (<></>)}
            </section>

            <section className="section">
                <h2>{t('currencyAccounts')}</h2>
                {renderCurrencyList()}

            </section>

            <section className="section">
                <h2>{t('cryptocurrencies')}</h2>
                {renderCryptoList()}

            </section>
            <section className="section">
                <h2>{t('clientReviews')}</h2>
                <p style={{ color: 'var(--section-text-color)', marginTop: 0 }}>{t('whatUsersSay')}</p>

                {reviewsList.length === 0 ? (
                    <p style={{ color: 'var(--section-text-color)', marginTop: '8px' }}>
                        Поки що немає відгуків. Додайте свій на сторінці “Все отзывы”.
                    </p>
                ) : (
                    <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                            <button
                                onClick={prevReview}
                                aria-label={t('previousReview')}
                                style={{
                                    minWidth: 40,
                                    minHeight: 40,
                                    borderRadius: '50%',
                                    border: '2px solid var(--active-link-color)',
                                    background: 'linear-gradient(135deg, rgba(100, 181, 246, 0.25) 0%, rgba(129, 212, 250, 0.25) 100%)',
                                    color: 'var(--text-color)',
                                    cursor: 'pointer',
                                }}
                            >
                                ←
                            </button>

                            {currentReview && (
                                <div
                                    style={{
                                        flex: '1 1 0',
                                        minWidth: '260px',
                                        background: 'var(--section-background-color)',
                                        border: '1px solid rgba(100, 181, 246, 0.15)',
                                        borderRadius: '14px',
                                        padding: '14px',
                                        boxShadow: '0 4px 12px rgba(100, 181, 246, 0.2)',
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                        <div>
                                            <strong style={{ color: 'var(--text-color)' }}>{currentReview.name}</strong>
                                            <p style={{ color: 'var(--section-text-color)', margin: '2px 0' }}>{currentReview.role}</p>
                                        </div>
                                        <span style={{ color: 'var(--section-text-color)', fontSize: '0.9rem' }}>{currentReview.date}</span>
                                    </div>
                                    <p style={{ color: 'var(--text-color)', margin: '6px 0' }}>{currentReview.text}</p>
                                    <p style={{ color: 'var(--section-heading-color)', margin: 0 }}>
                                        {'★'.repeat(currentReview.rating)}{'☆'.repeat(5 - currentReview.rating)}
                                    </p>
                                </div>
                            )}

                            <button
                                onClick={nextReview}
                                aria-label={t('nextReview')}
                                style={{
                                    minWidth: 40,
                                    minHeight: 40,
                                    borderRadius: '50%',
                                    border: '2px solid var(--active-link-color)',
                                    background: 'linear-gradient(135deg, rgba(100, 181, 246, 0.25) 0%, rgba(129, 212, 250, 0.25) 100%)',
                                    color: 'var(--text-color)',
                                    cursor: 'pointer',
                                }}
                            >
                                →
                            </button>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', flexWrap: 'wrap', gap: '10px' }}>
                            <span style={{ color: 'var(--section-text-color)', fontSize: '0.95rem' }}>
                                {t('reviewsTitle')} {reviewIndex + 1} {t('of')} {reviewsList.length}
                            </span>
                            <button
                                onClick={() => navigate('/reviews')}
                                style={{
                                    background: 'linear-gradient(135deg, var(--active-link-color) 0%, var(--footer-hover-color) 100%)',
                                    color: 'var(--background-color)',
                                    border: '2px solid var(--active-link-color)',
                                    padding: '10px 18px',
                                    borderRadius: '10px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                }}
                            >
                                {t('allReviews')}
                            </button>
                        </div>
                    </>
                )}
            </section>
            <TradingAnalytics trades={trades} user={user} />
            <TransactionHistory />
        </div>
    );
}

export default Actives;
