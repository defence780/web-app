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
import { useTheme } from './ThemeContext';

const Actives = () => {
    const { t } = useI18n();
    const { isDark, toggleTheme } = useTheme();
    const { language, changeLanguage } = useI18n();
    const [crypto, setCrypto] = useState(initialCrypto);
    const [trades, setTrades] = useState([]);
    const [rub, setRub] = useState(0);
    const [amount, setAmount] = useState(0);
    const [user, setUser] = useState();
    const [reviewIndex, setReviewIndex] = useState(0);
    const [reviewsList, setReviewsList] = useState([]);
    const [showBalance, setShowBalance] = useState(true);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const settingsMenuRef = React.useRef(null);
    const queryParams = new URLSearchParams(window.location.search);
    const chatId = queryParams.get('chat_id');
    const navigate = useNavigate()

    React.useEffect(() => {
        const handleClickOutside = (event) => {
            if (settingsMenuRef.current && !settingsMenuRef.current.contains(event.target)) {
                setIsSettingsOpen(false);
            }
        };

        if (isSettingsOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isSettingsOpen]);

    const languages = [
        { code: 'ru', label: 'RU', name: t('russian') },
        { code: 'en', label: 'EN', name: t('english') },
        { code: 'kz', label: 'KZ', name: t('kazakh') }
    ];

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
        <>
            {isSettingsOpen && (
                <div
                    style={{
                        position: 'fixed',
                        top: '56px',
                        right: '20px',
                        background: 'var(--section-background-color)',
                        border: '2px solid var(--active-link-color)',
                        borderRadius: '12px',
                        padding: '12px',
                        boxShadow: '0 8px 24px rgba(102, 126, 234, 0.4)',
                        minWidth: '200px',
                        maxWidth: '300px',
                        width: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        zIndex: 9999,
                        maxHeight: 'calc(100vh - 80px)',
                        overflowY: 'auto',
                        overflowX: 'visible',
                    }}
                >
                    {/* Theme Toggle */}
                    <div>
                        <div style={{ marginBottom: '8px', fontSize: '14px', color: 'var(--section-text-color)', fontWeight: '600' }}>
                            {t('theme')}
                        </div>
                        <button
                            onClick={() => {
                                toggleTheme();
                            }}
                            style={{
                                width: '100%',
                                padding: '10px',
                                borderRadius: '8px',
                                border: '2px solid var(--active-link-color)',
                                background: isDark 
                                    ? 'linear-gradient(135deg, rgba(100, 181, 246, 0.3) 0%, rgba(129, 212, 250, 0.3) 100%)'
                                    : 'linear-gradient(135deg, rgba(255, 193, 7, 0.3) 0%, rgba(255, 235, 59, 0.3) 100%)',
                                color: isDark ? '#e3f2fd' : '#f57f17',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                fontSize: '16px',
                                transition: 'all 0.3s ease',
                            }}
                        >
                            <span>{isDark ? '🌙' : '☀️'}</span>
                            <span>{isDark ? t('darkTheme') : t('lightTheme')}</span>
                        </button>
                    </div>

                    {/* Language Selector */}
                    <div>
                        <div style={{ marginBottom: '8px', fontSize: '14px', color: 'var(--section-text-color)', fontWeight: '600' }}>
                            {t('language')}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {languages.map((lang) => (
                                <button
                                    key={lang.code}
                                    onClick={() => {
                                        changeLanguage(lang.code);
                                        setIsSettingsOpen(false);
                                    }}
                                    style={{
                                        width: '100%',
                                        padding: '8px 12px',
                                        borderRadius: '8px',
                                        border: language === lang.code 
                                            ? '2px solid var(--active-link-color)' 
                                            : '2px solid rgba(100, 181, 246, 0.3)',
                                        background: language === lang.code
                                            ? 'linear-gradient(135deg, rgba(102, 126, 234, 0.3) 0%, rgba(118, 75, 162, 0.3) 100%)'
                                            : 'transparent',
                                        color: 'var(--text-color)',
                                        cursor: 'pointer',
                                        fontSize: '14px',
                                        fontWeight: language === lang.code ? 'bold' : 'normal',
                                        transition: 'all 0.3s ease',
                                        textAlign: 'left',
                                    }}
                                    onMouseEnter={(e) => {
                                        if (language !== lang.code) {
                                            e.currentTarget.style.background = 'rgba(102, 126, 234, 0.1)';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (language !== lang.code) {
                                            e.currentTarget.style.background = 'transparent';
                                        }
                                    }}
                                >
                                    {lang.name}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
            <div>
                <header className="header">
                    <div ref={settingsMenuRef} style={{ position: 'relative' }}>
                        <button
                            className="header-settings-button"
                            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                            aria-label="Settings"
                        >
                            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M19.4 15C19.2669 15.3016 19.2272 15.6362 19.286 15.9606C19.3448 16.285 19.4995 16.5843 19.73 16.82L19.79 16.88C19.976 17.0657 20.1235 17.2863 20.2241 17.5291C20.3248 17.7719 20.3766 18.0322 20.3766 18.295C20.3766 18.5578 20.3248 18.8181 20.2241 19.0609C20.1235 19.3037 19.976 19.5243 19.79 19.71C19.6043 19.896 19.3837 20.0435 19.1409 20.1441C18.8981 20.2448 18.6378 20.2966 18.375 20.2966C18.1122 20.2966 17.8519 20.2448 17.6091 20.1441C17.3663 20.0435 17.1457 19.896 16.96 19.71L16.9 19.65C16.6643 19.4195 16.365 19.2648 16.0406 19.206C15.7162 19.1472 15.3816 19.1869 15.08 19.32C14.7842 19.4468 14.532 19.6572 14.3543 19.9255C14.1766 20.1938 14.0813 20.5082 14.08 20.83V21C14.08 21.5304 13.8693 22.0391 13.4942 22.4142C13.1191 22.7893 12.6104 23 12.08 23C11.5496 23 11.0409 22.7893 10.6658 22.4142C10.2907 22.0391 10.08 21.5304 10.08 21V20.91C10.0723 20.579 9.96512 20.258 9.77251 19.9887C9.5799 19.7194 9.31074 19.5143 9 19.4C8.69838 19.2669 8.36381 19.2272 8.03941 19.286C7.71502 19.3448 7.41568 19.4995 7.18 19.73L7.12 19.79C6.93425 19.976 6.71368 20.1235 6.47088 20.2241C6.22808 20.3248 5.96783 20.3766 5.705 20.3766C5.44217 20.3766 5.18192 20.3248 4.93912 20.2241C4.69632 20.1235 4.47575 19.976 4.29 19.79C4.10405 19.6043 3.95653 19.3837 3.85588 19.1409C3.75523 18.8981 3.70343 18.6378 3.70343 18.375C3.70343 18.1122 3.75523 17.8519 3.85588 17.6091C3.95653 17.3663 4.10405 17.1457 4.29 16.96L4.35 16.9C4.58054 16.6643 4.73519 16.365 4.794 16.0406C4.85282 15.7162 4.81312 15.3816 4.68 15.08C4.55324 14.7842 4.34276 14.532 4.07447 14.3543C3.80618 14.1766 3.49179 14.0813 3.17 14.08H3C2.46957 14.08 1.96086 13.8693 1.58579 13.4942C1.21071 13.1191 1 12.6104 1 12.08C1 11.5496 1.21071 11.0409 1.58579 10.6658C1.96086 10.2907 2.46957 10.08 3 10.08H3.09C3.42099 10.0723 3.742 9.96512 4.01131 9.77251C4.28062 9.5799 4.48572 9.31074 4.6 9C4.73312 8.69838 4.77282 8.36381 4.714 8.03941C4.65519 7.71502 4.50054 7.41568 4.27 7.18L4.21 7.12C4.02405 6.93425 3.87653 6.71368 3.77588 6.47088C3.67523 6.22808 3.62343 5.96783 3.62343 5.705C3.62343 5.44217 3.67523 5.18192 3.77588 4.93912C3.87653 4.69632 4.02405 4.47575 4.21 4.29C4.39575 4.10405 4.61632 3.95653 4.85912 3.85588C5.10192 3.75523 5.36217 3.70343 5.625 3.70343C5.88783 3.70343 6.14808 3.75523 6.39088 3.85588C6.63368 3.95653 6.85425 4.10405 7.04 4.29L7.1 4.35C7.33568 4.58054 7.63502 4.73519 7.95941 4.794C8.28381 4.85282 8.61838 4.81312 8.92 4.68H9C9.29577 4.55324 9.54802 4.34276 9.72569 4.07447C9.90337 3.80618 9.99872 3.49179 10 3.17V3C10 2.46957 10.2107 1.96086 10.5858 1.58579C10.9609 1.21071 11.4696 1 12 1C12.5304 1 13.0391 1.21071 13.4142 1.58579C13.7893 1.96086 14 2.46957 14 3V3.09C14.0013 3.41179 14.0966 3.72618 14.2743 3.99447C14.452 4.26276 14.7042 4.47324 15 4.6C15.3016 4.73312 15.6362 4.77282 15.9606 4.714C16.285 4.65519 16.5843 4.50054 16.82 4.27L16.88 4.21C17.0657 4.02405 17.2863 3.87653 17.5291 3.77588C17.7719 3.67523 18.0322 3.62343 18.295 3.62343C18.5578 3.62343 18.8181 3.67523 19.0609 3.77588C19.3037 3.87653 19.5243 4.02405 19.71 4.21C19.896 4.39575 20.0435 4.61632 20.1441 4.85912C20.2448 5.10192 20.2966 5.36217 20.2966 5.625C20.2966 5.88783 20.2448 6.14808 20.1441 6.39088C20.0435 6.63368 19.896 6.85425 19.71 7.04L19.65 7.1C19.4195 7.33568 19.2648 7.63502 19.206 7.95941C19.1472 8.28381 19.1869 8.61838 19.32 8.92V9C19.4468 9.29577 19.6572 9.54802 19.9255 9.72569C20.1938 9.90337 20.5082 9.99872 20.83 10H21C21.5304 10 22.0391 10.2107 22.4142 10.5858C22.7893 10.9609 23 11.4696 23 12C23 12.5304 22.7893 13.0391 22.4142 13.4142C22.0391 13.7893 21.5304 14 21 14H20.91C20.5882 14.0013 20.2738 14.0966 20.0055 14.2743C19.7372 14.452 19.5268 14.7042 19.4 15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        </button>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
                        <h1 style={{ color: '#666', margin: 0, fontSize: '0.875rem', fontWeight: '400' }}>{t('totalBalance')}</h1>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '12px', marginBottom: '20px' }}>
                        <h2 style={{ color: '#1976d2', margin: 0, fontSize: '2rem', fontWeight: '700' }}>
                            {showBalance ? `$ ${parseFloat(amount).toFixed(2)}` : '$ •••'}
                        </h2>
                        <button
                            className="header-eye-button"
                            onClick={() => setShowBalance(!showBalance)}
                            aria-label={showBalance ? 'Hide balance' : 'Show balance'}
                        >
                            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
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
            </div>
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
        </>
    );
}

export default Actives;
