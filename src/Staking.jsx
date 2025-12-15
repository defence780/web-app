import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabase';
import { notification } from 'antd';
import { Button, TextField, InputAdornment, Drawer, Card, CardContent, Typography, Box, LinearProgress } from '@mui/material';
import { inputBaseClasses } from '@mui/material/InputBase';
import { initialCrypto, binance } from './utils';
import { useI18n } from './i18n/I18nContext';
import './App.css';

const Staking = () => {
    const { t } = useI18n();
    const [crypto, setCrypto] = useState(initialCrypto);
    const [tokens, setTokens] = useState([]);
    const [stakes, setStakes] = useState([]);
    const [user, setUser] = useState(null);
    const [open, setOpen] = useState(false);
    const [stakeAmount, setStakeAmount] = useState('');
    const [selectedToken, setSelectedToken] = useState(null);
    const [stakePeriod, setStakePeriod] = useState(7); // днів
    const navigate = useNavigate();

    // Ставки доходності за період (не річні)
    const apyRates = {
        7: 4.8,   // 4.8% за 7 днів
        14: 10.3, // 10.3% за 14 днів
        21: 15.3, // 15.3% за 21 день
    };

    useEffect(() => {
        const userData = JSON.parse(localStorage.getItem('user'));
        if (userData) {
            setUser(userData);
            fetchStakes(userData.chat_id);
        }

        // Завантажуємо токени з бази даних
        const fetchTokens = async () => {
            const { data, error } = await supabase.from('tokens').select('*');
            if (!error && data) {
                setTokens(data);
            }
        };
        fetchTokens();
    }, []);

    useEffect(() => {
        const fetchCryptoPrices = async () => {
            const responses = await Promise.all(
                crypto.filter((c) => c.ticker !== 'USDT').map((item) => 
                    fetch(binance + item.ticker + 'USDT').catch(() => null)
                )
            );
            const data = await Promise.all(responses.map((res) => res?.json()));

            setCrypto((prevCrypto) =>
                prevCrypto.map((item, index) => ({
                    ...item,
                    price: item.ticker !== 'USDT' ? Number(data[index]?.price || item.price).toFixed(2) : item.price,
                }))
            );
        };

        const interval = setInterval(fetchCryptoPrices, 5000);
        fetchCryptoPrices();

        return () => clearInterval(interval);
    }, []);

    const fetchStakes = async (chatId) => {
        try {
            const { data, error } = await supabase
                .from('stakes')
                .select('*')
                .eq('chat_id', chatId)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching stakes:', error);
            } else {
                setStakes(data || []);
            }
        } catch (error) {
            console.error('Error fetching stakes:', error);
        }
    };

    const fetchUser = async (chatId) => {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('chat_id', chatId)
            .single();

        if (!error && data) {
            localStorage.setItem('user', JSON.stringify(data));
            setUser(data);
        }
    };

    const handleStake = async () => {
        const MIN_STAKE_AMOUNT = 200; // Минимальная сумма для стейкинга

        if (!selectedToken || !stakeAmount || parseFloat(stakeAmount) <= 0) {
            notification.error({
                message: t('stakeError'),
                description: t('enterValidAmount'),
            });
            return;
        }

        if (!user) {
            notification.error({
                message: t('stakeError'),
                description: t('userNotFound'),
            });
            return;
        }

        const amount = parseFloat(stakeAmount);
        
        // Проверка минимальной суммы
        if (amount < MIN_STAKE_AMOUNT) {
            notification.error({
                message: t('stakeError'),
                description: `${t('minimumStakeAmount')} ${MIN_STAKE_AMOUNT} ${selectedToken.ticker.toUpperCase()}`,
            });
            return;
        }

        const tokenBalance = selectedToken.ticker.toUpperCase() === 'USDT' 
            ? parseFloat(user.usdt_amount || 0) 
            : 0;

        if (selectedToken.ticker.toUpperCase() === 'USDT' && amount > tokenBalance) {
            notification.error({
                message: t('stakeError'),
                description: t('insufficientFundsStake'),
            });
            return;
        }

        try {
            // Створюємо стейк
            const { data: stakeData, error: stakeError } = await supabase
                .from('stakes')
                .insert({
                    chat_id: user.chat_id,
                    token_ticker: selectedToken.ticker.toUpperCase(),
                    amount: amount,
                    apy: apyRates[stakePeriod],
                    period_days: stakePeriod,
                    start_date: new Date().toISOString(),
                    end_date: new Date(Date.now() + stakePeriod * 24 * 60 * 60 * 1000).toISOString(),
                    status: 'active',
                })
                .select()
                .single();

            if (stakeError) {
                throw stakeError;
            }

            // Оновлюємо баланс користувача
            if (selectedToken.ticker.toUpperCase() === 'USDT') {
                const newUsdtAmount = parseFloat(user.usdt_amount || 0) - amount;
                const { error: updateError } = await supabase
                    .from('users')
                    .update({ usdt_amount: newUsdtAmount })
                    .eq('chat_id', user.chat_id);

                if (updateError) {
                    throw updateError;
                }
            }

            // Оновлюємо локальні дані
            await fetchUser(user.chat_id);
            await fetchStakes(user.chat_id);

            notification.success({
                message: t('success'),
                description: `${t('stakingTitle')} ${amount} ${selectedToken.ticker.toUpperCase()} ${t('stakeCreated')}`,
            });

            setOpen(false);
            setStakeAmount('');
            setSelectedToken(null);
        } catch (error) {
            console.error('Error creating stake:', error);
            notification.error({
                message: t('stakeError'),
                description: t('stakeErrorCreating'),
            });
        }
    };

    const handleUnstake = async (stakeId) => {
        try {
            const stake = stakes.find(s => s.id === stakeId);
            if (!stake) return;

            // Перевіряємо, чи минув період стейкінгу
            const endDate = new Date(stake.end_date);
            const now = new Date();
            const canUnstake = now >= endDate;

            if (!canUnstake) {
                notification.warning({
                    message: t('warning'),
                    description: `${t('unstakeWarning')} ${endDate.toLocaleDateString('ru-RU')}`,
                });
                return;
            }

            // Обчислюємо нагороди - ставка за весь період
            const periodRate = stake.apy / 100; // Конвертуємо відсотки в десяткову форму
            const rewards = stake.amount * periodRate; // Повна ставка за весь період
            const totalAmount = stake.amount + rewards;

            // Оновлюємо статус стейку
            const { error: updateError } = await supabase
                .from('stakes')
                .update({ 
                    status: 'completed',
                    rewards: rewards,
                    completed_at: new Date().toISOString(),
                })
                .eq('id', stakeId);

            if (updateError) throw updateError;

            // Додаємо кошти на баланс
            if (stake.token_ticker === 'USDT') {
                const { data: userData } = await supabase
                    .from('users')
                    .select('usdt_amount')
                    .eq('chat_id', user.chat_id)
                    .single();

                const newUsdtAmount = parseFloat(userData?.usdt_amount || 0) + totalAmount;
                const { error: balanceError } = await supabase
                    .from('users')
                    .update({ usdt_amount: newUsdtAmount })
                    .eq('chat_id', user.chat_id);

                if (balanceError) throw balanceError;
            }

            await fetchUser(user.chat_id);
            await fetchStakes(user.chat_id);

            notification.success({
                message: t('success'),
                description: t('unstakeSuccess', { total: `${totalAmount.toFixed(2)} ${stake.token_ticker}`, rewards: rewards.toFixed(2) }),
            });
        } catch (error) {
            console.error('Error unstaking:', error);
            notification.error({
                message: t('stakeError'),
                description: t('unstakeError'),
            });
        }
    };

    const calculateRewards = (stake) => {
        const now = new Date();
        const startDate = new Date(stake.start_date);
        const endDate = new Date(stake.end_date);
        const daysStaked = Math.floor((now - startDate) / (1000 * 60 * 60 * 24));
        const totalDays = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24));
        const progress = Math.min((daysStaked / totalDays) * 100, 100);
        
        // Ставка за весь період (не річна)
        const periodRate = stake.apy / 100; // Конвертуємо відсотки в десяткову форму
        // Нагороди пропорційно до прогресу
        const currentRewards = stake.amount * periodRate * (progress / 100);
        const totalRewards = stake.amount * periodRate;

        return {
            currentRewards,
            totalRewards,
            daysStaked,
            totalDays,
            progress,
            canUnstake: now >= endDate,
        };
    };

    const openStakingDrawer = (token) => {
        setSelectedToken(token);
        setOpen(true);
    };

    const getTokenBalance = (ticker) => {
        if (ticker.toUpperCase() === 'USDT') {
            return parseFloat(user?.usdt_amount || 0);
        }
        return 0;
    };

    const activeStakes = stakes.filter(s => s.status === 'active');

    return (
        <div>
            <div className="section">
                <Button
                    variant="contained"
                    color="primary"
                    onClick={() => navigate('/actives')}
                    sx={{
                        marginBottom: '20px',
                        background: 'linear-gradient(135deg, rgba(100, 181, 246, 0.3) 0%, rgba(129, 212, 250, 0.3) 100%)',
                        color: 'var(--text-color)',
                        fontWeight: '700',
                        fontSize: '14px',
                        padding: '10px 24px',
                        borderRadius: '10px',
                        border: '2px solid var(--active-link-color)',
                        boxShadow: '0 4px 12px rgba(100, 181, 246, 0.3)',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        textTransform: 'none',
                        backdropFilter: 'blur(10px)',
                        '&:hover': {
                            transform: 'translateY(-2px) scale(1.05)',
                            boxShadow: '0 6px 20px rgba(100, 181, 246, 0.5)',
                            background: 'linear-gradient(135deg, rgba(100, 181, 246, 0.5) 0%, rgba(129, 212, 250, 0.5) 100%)',
                        },
                    }}
                >
                    {t('back')}
                </Button>
                <h1 style={{ textAlign: 'center', color: 'var(--section-heading-color)' }}>{t('stakingTitle')}</h1>
                <p style={{ textAlign: 'center', color: 'var(--section-text-color)' }}>
                    {t('stakingDescription')}
                </p>
            </div>

            {activeStakes.length > 0 && (
                <section className="section">
                    <h2>{t('activeStakes')}</h2>
                    {activeStakes.map((stake) => {
                        const rewards = calculateRewards(stake);
                        return (
                            <Card
                                key={stake.id}
                                sx={{
                                    marginBottom: '15px',
                                    background: 'var(--section-background-color)',
                                    border: '1px solid var(--active-link-color)',
                                    borderRadius: '10px',
                                }}
                            >
                                <CardContent>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                        <Typography variant="h6" sx={{ color: 'var(--text-color)', fontWeight: 'bold' }}>
                                            {stake.token_ticker}
                                        </Typography>
                                        <Typography variant="body1" sx={{ color: 'var(--section-heading-color)' }}>
                                            {t('profitability')}: {stake.apy}% {t('forPeriod')} {stake.period_days} {stake.period_days === 1 ? t('day') : stake.period_days < 5 ? t('daysFew') : t('days')}
                                        </Typography>
                                    </Box>
                                    
                                    <Typography variant="body2" sx={{ color: 'var(--section-text-color)', marginBottom: '10px' }}>
                                        {t('staked')}: {parseFloat(stake.amount).toFixed(2)} {stake.token_ticker}
                                    </Typography>
                                    
                                    <Typography variant="body2" sx={{ color: 'var(--win-color)', marginBottom: '10px' }}>
                                        {t('rewards')}: {rewards.currentRewards.toFixed(4)} {stake.token_ticker}
                                    </Typography>
                                    
                                    <Box sx={{ marginBottom: '10px' }}>
                                        <Typography variant="caption" sx={{ color: 'var(--section-text-color)' }}>
                                            {t('progress')}: {rewards.daysStaked} / {rewards.totalDays} {t('days')}
                                        </Typography>
                                        <LinearProgress 
                                            variant="determinate" 
                                            value={rewards.progress} 
                                            sx={{ 
                                                marginTop: '5px',
                                                height: '8px',
                                                borderRadius: '4px',
                                                backgroundColor: 'rgba(100, 181, 246, 0.2)',
                                                '& .MuiLinearProgress-bar': {
                                                    backgroundColor: 'var(--active-link-color)',
                                                },
                                            }}
                                        />
                                    </Box>
                                    
                                    <Typography variant="caption" sx={{ color: 'var(--section-text-color)', display: 'block', marginBottom: '10px' }}>
                                        {t('until')}: {new Date(stake.end_date).toLocaleDateString('ru-RU')}
                                    </Typography>
                                    
                                    <Button
                                        variant="contained"
                                        onClick={() => handleUnstake(stake.id)}
                                        disabled={!rewards.canUnstake}
                                        sx={{
                                            width: '100%',
                                            background: rewards.canUnstake 
                                                ? 'linear-gradient(135deg, #64b5f6 0%, #90caf9 100%)'
                                                : 'rgba(100, 181, 246, 0.3)',
                                            color: rewards.canUnstake ? (document.body.classList.contains('light-theme') ? '#0a1929' : '#0a1929') : 'var(--section-text-color)',
                                            fontWeight: '700',
                                            textTransform: 'none',
                                            '&:hover': {
                                                background: rewards.canUnstake 
                                                    ? 'linear-gradient(135deg, #90caf9 0%, #b3e5fc 100%)'
                                                    : 'rgba(100, 181, 246, 0.3)',
                                            },
                                        }}
                                    >
                                        {rewards.canUnstake ? t('withdrawStake') : t('wait')}
                                    </Button>
                                </CardContent>
                            </Card>
                        );
                    })}
                </section>
            )}

            <section className="section">
                <h2>{t('availablePeriods')}</h2>
                <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', 
                    gap: '10px',
                    marginBottom: '20px'
                }}>
                    {Object.entries(apyRates)
                        .sort(([daysA], [daysB]) => parseInt(daysA) - parseInt(daysB))
                        .map(([days, apy]) => {
                            const daysNum = parseInt(days);
                            let daysText = t('days');
                            if (daysNum === 1 || (daysNum % 10 === 1 && daysNum % 100 !== 11)) {
                                daysText = t('day');
                            } else if ((daysNum % 10 >= 2 && daysNum % 10 <= 4) && (daysNum % 100 < 10 || daysNum % 100 >= 20)) {
                                daysText = t('daysFew');
                            }
                            return (
                                <div
                                    key={days}
                                    style={{
                                        padding: '15px',
                                        borderRadius: '10px',
                                        background: 'linear-gradient(135deg, rgba(100, 181, 246, 0.2) 0%, rgba(129, 212, 250, 0.2) 100%)',
                                        border: '2px solid rgba(100, 181, 246, 0.3)',
                                        textAlign: 'center',
                                    }}
                                >
                                    <Typography variant="h6" sx={{ color: 'var(--text-color)', marginBottom: '5px', fontWeight: 'bold' }}>
                                        {days} {daysText}
                                    </Typography>
                                    <Typography variant="body1" sx={{ color: 'var(--win-color)', fontSize: '1.2rem', fontWeight: 'bold' }}>
                                        {apy}% {t('forPeriod')} {days} {daysNum === 1 ? t('day') : daysNum < 5 ? t('daysFew') : t('days')}
                                    </Typography>
                                </div>
                            );
                        })}
                </div>
                <Typography variant="body2" sx={{ color: 'var(--section-text-color)', fontStyle: 'italic' }}>
                    {t('selectPeriodWhenCreating')}
                </Typography>
            </section>

            <section className="section">
                <h2>{t('availableTokens')}</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {(() => {
                        // Створюємо список доступних токенів, спочатку з бази даних, потім з initialCrypto як резерв
                        const availableTokens = [];
                        const usdtFromTokens = tokens.find(t => t.ticker?.toUpperCase() === 'USDT');
                        const usdtFromCrypto = crypto.find(t => t.ticker?.toUpperCase() === 'USDT');
                        
                        // Використовуємо токен з бази даних, якщо він є, інакше з initialCrypto
                        const usdtToken = usdtFromTokens || usdtFromCrypto || {
                            ticker: 'USDT',
                            name: 'Tether',
                            img: '/usdt.png',
                            icon: '/usdt.png'
                        };

                        if (usdtToken) {
                            const iconSrc = usdtToken.icon || usdtToken.img || '/usdt.png';
                            const tokenName = usdtToken.name || 'Tether';
                            const tokenTicker = usdtToken.ticker?.toUpperCase() || 'USDT';
                            
                            return (
                                <div
                                    key={usdtToken.id || usdtToken.ticker || 'USDT'}
                                    onClick={() => openStakingDrawer(usdtToken)}
                                    style={{
                                        display: 'flex',
                                        gap: '1rem',
                                        alignItems: 'center',
                                        padding: '1rem',
                                        borderRadius: '10px',
                                        cursor: 'pointer',
                                        backgroundColor: 'var(--section-background-color)',
                                        border: '2px solid rgba(100, 181, 246, 0.3)',
                                        transition: 'all 0.3s ease',
                                    }}
                                    onMouseOver={(e) => {
                                        e.currentTarget.style.borderColor = '#64b5f6';
                                        e.currentTarget.style.transform = 'translateX(5px)';
                                    }}
                                    onMouseOut={(e) => {
                                        e.currentTarget.style.borderColor = 'rgba(100, 181, 246, 0.3)';
                                        e.currentTarget.style.transform = 'translateX(0)';
                                    }}
                                >
                                    <img 
                                        src={iconSrc} 
                                        width={50} 
                                        height={50} 
                                        style={{ borderRadius: '50%' }} 
                                        alt={`${tokenName} icon`} 
                                    />
                                    <div style={{ flex: 1 }}>
                                        <h3 style={{ margin: 0, color: 'var(--text-color)' }}>{tokenName}</h3>
                                        <p style={{ margin: '5px 0', color: 'var(--section-text-color)' }}>
                                            {t('available')}: {getTokenBalance(tokenTicker).toFixed(2)} {tokenTicker}
                                        </p>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <p style={{ margin: 0, color: 'var(--section-heading-color)', fontWeight: 'bold' }}>{t('stakingTitle')}</p>
                                        <p style={{ margin: '5px 0', color: 'var(--win-color)', fontSize: '0.9rem' }}>
                                            {t('upTo')} {Math.max(...Object.values(apyRates))}% {t('forPeriod')}
                                        </p>
                                    </div>
                                </div>
                            );
                        }
                        return null;
                    })()}
                </div>
            </section>

            <Drawer anchor="bottom" open={open} onClose={() => setOpen(false)}>
                <div style={{ height: '500px', backgroundColor: 'var(--section-background-color)', padding: '20px', overflowY: 'auto' }}>
                    {selectedToken && (
                        <>
                            <h2 style={{ color: 'var(--text-color)', marginBottom: '20px' }}>
                                {t('stakingFor')} {selectedToken.ticker.toUpperCase()}
                            </h2>

                            <TextField
                                label={`${t('stakeAmountInput')} (мин. 200)`}
                                variant="standard"
                                type="number"
                                value={stakeAmount}
                                onChange={(e) => setStakeAmount(e.target.value)}
                                inputProps={{ min: 200 }}
                                fullWidth
                                sx={{
                                    marginBottom: '20px',
                                    '& .MuiInputBase-root': {
                                        color: 'var(--text-color)',
                                        background: 'linear-gradient(135deg, rgba(100, 181, 246, 0.15) 0%, rgba(129, 212, 250, 0.15) 100%)',
                                        borderRadius: '10px',
                                        padding: '8px 12px',
                                    },
                                    '& .MuiInputLabel-root': {
                                        color: 'var(--section-text-color)',
                                    },
                                    '& .MuiInputLabel-root.Mui-focused': {
                                        color: 'var(--active-link-color)',
                                    },
                                }}
                                slotProps={{
                                    input: {
                                        endAdornment: (
                                            <InputAdornment position="end">
                                                <p style={{ color: 'var(--section-text-color)' }}>{selectedToken.ticker.toUpperCase()}</p>
                                            </InputAdornment>
                                        ),
                                    },
                                }}
                            />

                            <Typography variant="body2" sx={{ color: 'var(--section-text-color)', marginBottom: '10px' }}>
                                {t('available')}: {getTokenBalance(selectedToken.ticker).toFixed(2)} {selectedToken.ticker.toUpperCase()}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'var(--section-heading-color)', marginBottom: '20px', display: 'block' }}>
                                {t('minimumAmount')}: 200 {selectedToken.ticker.toUpperCase()}
                            </Typography>

                            <div style={{ marginBottom: '20px' }}>
                                <Typography variant="body1" sx={{ color: 'var(--section-heading-color)', marginBottom: '10px' }}>
                                    {t('stakingPeriod')}
                                </Typography>
                                {Object.entries(apyRates)
                                    .sort(([daysA], [daysB]) => parseInt(daysA) - parseInt(daysB))
                                    .map(([days, apy]) => {
                                        const daysNum = parseInt(days);
                                        let daysText = t('days');
                                        if (daysNum === 1 || (daysNum % 10 === 1 && daysNum % 100 !== 11)) {
                                            daysText = t('day');
                                        } else if ((daysNum % 10 >= 2 && daysNum % 10 <= 4) && (daysNum % 100 < 10 || daysNum % 100 >= 20)) {
                                            daysText = t('daysFew');
                                        }
                                        return (
                                    <Button
                                        key={days}
                                        onClick={() => setStakePeriod(parseInt(days))}
                                        variant={stakePeriod === parseInt(days) ? 'contained' : 'outlined'}
                                        sx={{
                                            margin: '5px',
                                            background: stakePeriod === parseInt(days)
                                                ? 'linear-gradient(135deg, #64b5f6 0%, #90caf9 100%)'
                                                : 'transparent',
                                            color: stakePeriod === parseInt(days) ? 'var(--background-color)' : 'var(--section-heading-color)',
                                            border: '2px solid var(--active-link-color)',
                                            textTransform: 'none',
                                            '&:hover': {
                                                background: 'linear-gradient(135deg, rgba(100, 181, 246, 0.4) 0%, rgba(129, 212, 250, 0.4) 100%)',
                                            },
                                        }}
                                    >
                                        {days} {daysText} ({apy}% {t('forPeriod')})
                                    </Button>
                                        );
                                    })}
                            </div>

                            {stakeAmount && parseFloat(stakeAmount) > 0 && (
                                <Box sx={{ 
                                    padding: '15px', 
                                    background: 'rgba(100, 181, 246, 0.1)', 
                                    borderRadius: '10px',
                                    marginBottom: '20px'
                                }}>
                                    <Typography variant="body2" sx={{ color: 'var(--section-text-color)', marginBottom: '5px' }}>
                                        {t('expectedRewards')}
                                    </Typography>
                                    <Typography variant="h6" sx={{ color: 'var(--win-color)' }}>
                                        {((parseFloat(stakeAmount) || 0) * (apyRates[stakePeriod] / 100)).toFixed(4)} {selectedToken.ticker.toUpperCase()}
                                    </Typography>
                                </Box>
                            )}

                            <Button
                                variant="contained"
                                onClick={handleStake}
                                fullWidth
                                sx={{
                                    background: 'linear-gradient(135deg, #64b5f6 0%, #90caf9 100%)',
                                    color: 'var(--background-color)',
                                    fontWeight: '700',
                                    fontSize: '16px',
                                    padding: '12px 24px',
                                    borderRadius: '10px',
                                    textTransform: 'none',
                                    '&:hover': {
                                        background: 'linear-gradient(135deg, #90caf9 0%, #b3e5fc 100%)',
                                    },
                                }}
                            >
                                {t('depositStake')}
                            </Button>
                        </>
                    )}
                </div>
            </Drawer>
        </div>
    );
};

export default Staking;

