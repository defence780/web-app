import React, { useEffect, useState, useRef } from 'react';
import { BrowserRouter as Router, Route, Routes, NavLink } from 'react-router-dom';
import { Drawer, TextField, InputAdornment, Button } from '@mui/material';
import {binance} from './utils';
import { supabase } from './supabase';
import { inputBaseClasses } from '@mui/material/InputBase';
import { notification, Typography } from 'antd';
import { useI18n } from './i18n/I18nContext';

import './App.css';

const Exchange = () => {
  const { t } = useI18n();
  const [rub,setRub] = useState(0)
  const [from,setFrom] = useState(localStorage.getItem('last_exchange_from') || 'RUB')
  const [to,setTo] = useState(localStorage.getItem('last_exchange_to') || 'USDT')
  const [tokens,setTokens] = useState([])
  const [amount,setAmount] = useState(0)
  const [user,setUser] = useState(JSON.parse(localStorage.getItem('user')))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [balanceLoading, setBalanceLoading] = useState(!user)
  const [optimisticBalances, setOptimisticBalances] = useState(null)
  const submitLock = useRef(false)

  useEffect(() => {
    const fetchRubPrice = async () => {
        const response = await fetch(binance + 'USDTRUB');
        const data = await response.json();
        setRub((Number(data.price) - 12).toFixed(2));
      };
    

    fetchRubPrice();

    const fetchTokens = async () => {
      const { data, error } = await supabase.from('tokens').select('*');
      if (error) {
          console.error('Error fetching tokens:', error);
      } else {
          setTokens(data);
      }
  };

  fetchTokens();

  }, []);

  useEffect(() => {
    if (user) setBalanceLoading(false);
  }, [user]);

  useEffect(() => {
    localStorage.setItem('last_exchange_from', from);
    localStorage.setItem('last_exchange_to', to);
  }, [from, to]);

  const refreshUser = async () => {
    if (!user?.chat_id) return;
    setBalanceLoading(true);
    const { data, error } = await supabase
      .from('users')
      .select('rub_amount, usdt_amount')
      .eq('chat_id', user.chat_id)
      .single();
    if (!error && data) {
      const refreshed = { ...user, rub_amount: data.rub_amount, usdt_amount: data.usdt_amount };
      setUser(refreshed);
      localStorage.setItem('user', JSON.stringify(refreshed));
    }
    setBalanceLoading(false);
  };

  const item = (() => {
    tokens.find((item) => item.ticker.toUpperCase() === 'USDT')
  }, [tokens])

  const handleExchange = async () => {
    if (submitLock.current || isSubmitting) return;
    submitLock.current = true;
    setIsSubmitting(true);
    setOptimisticBalances(null);
    const showStatusError = (status, fallback) => {
      const messages = {
        400: t('invalidExchangeData'),
        409: t('exchangeBalanceConflict'),
        500: t('exchangeInternalError')
      };
      notification.error({
        message: t('error'),
        description: messages[status] || fallback || t('somethingWentWrong')
      });
    };

    try {
      let fromCurrency, toCurrency, exchangeRate;

      if (from === 'RUB') {
        fromCurrency = 'RUB';
        toCurrency = 'USDT';
        exchangeRate = 1 / rub; // Конвертуємо RUB в USDT

        if (parseFloat(user.rub_amount) < amount) {
          notification.error({
            message: t('error'),
            description: t('exchangeInsufficientFunds'),
          });
          return;
        }
      } else {
        fromCurrency = 'USDT';
        toCurrency = 'RUB';
        exchangeRate = rub; // Конвертуємо USDT в RUB

        if (parseFloat(user.usdt_amount) < amount) {
          notification.error({
            message: t('error'),
            description: t('exchangeInsufficientFunds'),
          });
          return;
        }
      }

      const rubBalance = parseFloat(user.rub_amount || 0);
      const usdtBalance = parseFloat(user.usdt_amount || 0);
      let optimistic = null;
      if (fromCurrency === 'RUB') {
        optimistic = {
          rub_amount: rubBalance - amount,
          usdt_amount: usdtBalance + amount * exchangeRate
        };
      } else {
        optimistic = {
          rub_amount: rubBalance + amount * exchangeRate,
          usdt_amount: usdtBalance - amount
        };
      }
      setOptimisticBalances(optimistic);

      // Використовуємо атомарну транзакцію для обміну
      console.log('[EXCHANGE] Calling atomic-transactions function:', {
        operation: 'exchange',
        chat_id: user.chat_id,
        from_currency: fromCurrency,
        to_currency: toCurrency,
        amount: amount,
        exchange_rate: exchangeRate
      });

      const { data: atomicResult, error: atomicError } = await supabase.functions.invoke('atomic-transactions', {
        body: {
          operation: 'exchange',
          chat_id: user.chat_id,
          from_currency: fromCurrency,
          to_currency: toCurrency,
          amount: amount,
          exchange_rate: exchangeRate
        }
      });

      console.log('[EXCHANGE] Response from atomic-transactions:', {
        atomicError,
        atomicResult,
        success: atomicResult?.success,
        error: atomicResult?.error
      });

      if (atomicError) {
        console.error('[EXCHANGE] Function invocation error:', atomicError);
        showStatusError(atomicError?.context?.status, `${t('error')}: ${atomicError.message || JSON.stringify(atomicError)}`);
        setIsSubmitting(false);
        submitLock.current = false;
        setOptimisticBalances(null);
        return;
      }

      if (!atomicResult?.success) {
        console.error('[EXCHANGE] Exchange failed:', atomicResult);
        showStatusError(atomicResult?.status, atomicResult?.error || atomicResult?.details || t('failedToExchange'));
        setIsSubmitting(false);
        submitLock.current = false;
        setOptimisticBalances(null);
        return;
      }

      // Оновлюємо локальний стан користувача
      const updatedUser = {
        ...user,
        rub_amount: fromCurrency === 'RUB' ? atomicResult.newFromBalance : atomicResult.newToBalance,
        usdt_amount: fromCurrency === 'USDT' ? atomicResult.newFromBalance : atomicResult.newToBalance
      };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setOptimisticBalances(null);

      notification.success({
        message: t('success'),
        description: t('exchangeSuccess'),
      });
    } catch (error) {
      console.error('Error in handleExchange:', error);
      showStatusError(error?.context?.status, t('somethingWentWrong'));
    } finally {
      setIsSubmitting(false);
      submitLock.current = false;
    }
  }

  return (
  <>
  
    <div className='section' style={{height: '100%'}}>
    <NavLink to='/actives'>
      <Button
        variant="contained"
        color="primary"
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
          '&:active': {
            transform: 'translateY(0) scale(0.98)',
          }
        }}
      >
        {t('back')}
      </Button>
    </NavLink>
      <div style={{display: 'flex', justifyContent: 'center'}}>
      <h2 style={{color: 'var(--text-color)'}}>{t('exchangeFromTo', { from, to })}</h2>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginBottom: 10 }}>
        <Button variant="outlined" size="small" onClick={refreshUser} sx={{ textTransform: 'none', minWidth: 120 }}>
          {t('updateBalances')}
        </Button>
      </div>

      <div className='header'>
      <img src="/swap.svg" width={30} height={30} onClick={() => {
        if(to === 'RUB'){
          setTo('USDT')
        } else {
          setTo('RUB')
        }
        if (from === 'RUB'){
          setFrom('USDT')
        }
        else {
          setFrom('RUB')
        }
      }}/>
      </div>
      {from === 'RUB' ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <img src={'/rub.jpeg'} alt={'Rub'} width={30} height={30} style={{ borderRadius: '50%' }} />
        <div>
            <p style={{ margin: '5px 0', color: 'var(--text-color)' }}>{t('russianRuble')}</p>
            <p style={{ margin: '5px 0', color: 'var(--crypto-list-price-color)' }} className='crypto-list-price'>
              {balanceLoading ? t('loading') : `${parseFloat((optimisticBalances?.rub_amount ?? user.rub_amount) || 0).toFixed(2)} ₽`}
            </p>
        </div>
    </div>
      ) : (
        <>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <img src={'/usdt.png'} alt={item?.name || 'USDT'} width={30} height={30} style={{ borderRadius: '50%' }} />
        <div>
          <p style={{ margin: '5px 0', color: 'var(--text-color)' }}>USDT</p>
          <p style={{ margin: '5px 0', color: 'var(--crypto-list-price-color)' }} className='crypto-list-price'>
            {balanceLoading ? t('loading') : `${parseFloat((optimisticBalances?.usdt_amount ?? user.usdt_amount) || 0).toFixed(2)} $`}
          </p>
        </div>
      </div>
      </>
      )}

      {to === 'RUB' ? (
       
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <img src={'/rub.jpeg'} alt={'Rub'} width={30} height={30} style={{ borderRadius: '50%' }} />
        <div>
            <p style={{ margin: '5px 0', color: 'var(--text-color)' }}>{t('russianRuble')}</p>
            <p style={{ margin: '5px 0', color: 'var(--crypto-list-price-color)' }} className='crypto-list-price'>
              {balanceLoading ? t('loading') : `${parseFloat((optimisticBalances?.rub_amount ?? user.rub_amount) || 0).toFixed(2)} ₽`}
            </p>
        </div>
    </div>
      
      ) : (
        <>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <img src={'/usdt.png'} alt={item?.name || 'USDT'} width={30} height={30} style={{ borderRadius: '50%' }} />
        <div>
          <p style={{ margin: '5px 0', color: 'var(--text-color)' }}>USDT</p>
          <p style={{ margin: '5px 0', color: 'var(--crypto-list-price-color)' }} className='crypto-list-price'>
            {balanceLoading ? t('loading') : `${parseFloat((optimisticBalances?.usdt_amount ?? user.usdt_amount) || 0).toFixed(2)} $`}
          </p>
        </div>
      </div>
      </>
      )}

      <TextField
        label={t('amount')}
        variant="standard"
        type="number"
        color='primary'
        value={amount}
        onChange={(e) => {
          const v = e.target.value;
          const limited = v.includes('.') ? v.split('.')[0] + '.' + v.split('.')[1].slice(0, 2) : v;
          setAmount(limited);
        }}
        sx={{
          maxWidth: '200px',
          marginBottom: '20px',
          '& .MuiInputBase-root': {
            color: 'var(--text-color)',
            background: 'linear-gradient(135deg, rgba(100, 181, 246, 0.15) 0%, rgba(129, 212, 250, 0.15) 100%)',
            borderRadius: '10px',
            backdropFilter: 'blur(10px)',
            padding: '8px 12px',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              background: 'linear-gradient(135deg, rgba(100, 181, 246, 0.25) 0%, rgba(129, 212, 250, 0.25) 100%)',
              boxShadow: '0 4px 12px rgba(100, 181, 246, 0.3)',
            },
          },
          '& .MuiInputBase-root::before': {
            borderBottom: '2px solid rgba(100, 181, 246, 0.5)',
          },
          '& .MuiInputBase-root:hover::before': {
            borderBottom: '2px solid rgba(144, 202, 249, 0.8)',
            boxShadow: '0 2px 8px rgba(100, 181, 246, 0.3)',
          },
          '& .MuiInputBase-root::after': {
            borderBottom: '2px solid var(--active-link-color)',
            boxShadow: '0 4px 12px rgba(100, 181, 246, 0.5), 0 0 15px rgba(100, 181, 246, 0.3)',
          },
          '& .MuiInputLabel-root': {
            color: 'var(--section-text-color)',
            fontWeight: '500',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          },
          '& .MuiInputLabel-root.Mui-focused': {
            color: 'var(--active-link-color)',
            textShadow: '0 0 8px rgba(100, 181, 246, 0.5)',
          },
          '& .MuiInputBase-input': {
            color: 'var(--text-color)',
            fontWeight: '500',
            padding: '12px 16px',
            '&::placeholder': {
              color: 'var(--section-text-color)',
              opacity: 1,
            },
            '&:focus': {
              color: 'var(--text-color)',
              textShadow: '0 0 4px rgba(100, 181, 246, 0.3)',
            },
          },
          '& .MuiOutlinedInput-root': {
            '& fieldset': {
              borderColor: 'rgba(100, 181, 246, 0.5)',
              borderWidth: '2px',
              borderRadius: '10px',
            },
            '&:hover fieldset': {
              borderColor: 'rgba(144, 202, 249, 0.8)',
              boxShadow: '0 0 8px rgba(100, 181, 246, 0.3)',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#64b5f6',
              boxShadow: '0 0 15px rgba(100, 181, 246, 0.5)',
            },
          },
        }}
        required
        slotProps={{
          input: {
            endAdornment: (
              <InputAdornment
                position="end"
                sx={{
                  opacity: 0,
                  pointerEvents: 'none',
                  [`[data-shrink=true] ~ .${inputBaseClasses.root} > &`]: {
                    opacity: 1,
                  },
                }}
              >
                <p style={{color: 'var(--section-text-color)'}}>{to === 'RUB' ? '$' : '₽'}</p>
              </InputAdornment>
            ),
          },
        }}
      />
      <div>
      <Button
        variant="contained"
        color="primary"
        onClick={() => handleExchange()}
        disabled={isSubmitting}
        sx={{
          marginTop: '20px',
          background: 'linear-gradient(135deg, #64b5f6 0%, #90caf9 100%)',
          color: 'var(--background-color)',
          fontWeight: '700',
          fontSize: '16px',
          padding: '12px 32px',
          borderRadius: '10px',
          border: '2px solid #90caf9',
          boxShadow: '0 6px 20px rgba(100, 181, 246, 0.5), 0 0 15px rgba(100, 181, 246, 0.3)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          textTransform: 'none',
          '&:hover': {
            transform: 'translateY(-3px) scale(1.05)',
            boxShadow: '0 8px 25px rgba(100, 181, 246, 0.6), 0 0 25px rgba(100, 181, 246, 0.4)',
            background: 'linear-gradient(135deg, #90caf9 0%, #b3e5fc 100%)',
          },
          '&:active': {
            transform: 'translateY(-1px) scale(0.98)',
          }
        }}
      >
        {isSubmitting ? t('processing') : t('exchangeButton')}
      </Button>
      </div>
    </div>
  </>
  );
};

export default Exchange;