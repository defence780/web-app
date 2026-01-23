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

  // Helper function to round down to 2 decimal places
  const roundDown = (value) => {
    const num = parseFloat(value) || 0;
    return Math.floor(num * 100) / 100;
  };

  // Format balance with rounding down
  const formatBalance = (value) => {
    return roundDown(value).toFixed(2);
  };

  // Calculate exchange rate and received amount
  const getExchangeRate = () => {
    if (!rub || rub === 0) return 0;
    if (from === 'RUB') {
      return 1 / parseFloat(rub);
    } else {
      return parseFloat(rub);
    }
  };

  const getReceivedAmount = () => {
    if (!amount || amount === 0 || !rub || rub === 0) return 0;
    const rate = getExchangeRate();
    return parseFloat(amount) * rate;
  };

  const handleSelectAll = () => {
    if (!user) return;
    if (from === 'RUB') {
      const balance = parseFloat(user.rub_amount || 0);
      // Round down to 2 decimal places to avoid exceeding balance
      const roundedDown = Math.floor(balance * 100) / 100;
      setAmount(roundedDown.toFixed(2));
    } else {
      const balance = parseFloat(user.usdt_amount || 0);
      // Round down to 2 decimal places to avoid exceeding balance
      const roundedDown = Math.floor(balance * 100) / 100;
      setAmount(roundedDown.toFixed(2));
    }
  };

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
      // Convert amount to number, handling both comma and dot as decimal separator
      const amountNum = parseFloat(String(amount).replace(',', '.'));
      
      if (isNaN(amountNum) || amountNum <= 0) {
        notification.error({
          message: t('error'),
          description: t('enterValidAmount'),
        });
        setIsSubmitting(false);
        submitLock.current = false;
        return;
      }

      let fromCurrency, toCurrency, exchangeRate;

      if (from === 'RUB') {
        fromCurrency = 'RUB';
        toCurrency = 'USDT';
        exchangeRate = 1 / parseFloat(rub); // Конвертуємо RUB в USDT

        const rubBalance = parseFloat(user.rub_amount || 0);
        if (rubBalance < amountNum) {
          notification.error({
            message: t('error'),
            description: t('exchangeInsufficientFunds'),
          });
          setIsSubmitting(false);
          submitLock.current = false;
          return;
        }
      } else {
        fromCurrency = 'USDT';
        toCurrency = 'RUB';
        exchangeRate = parseFloat(rub); // Конвертуємо USDT в RUB

        const usdtBalance = parseFloat(user.usdt_amount || 0);
        if (usdtBalance < amountNum) {
          notification.error({
            message: t('error'),
            description: t('exchangeInsufficientFunds'),
          });
          setIsSubmitting(false);
          submitLock.current = false;
          return;
        }
      }

      const rubBalance = parseFloat(user.rub_amount || 0);
      const usdtBalance = parseFloat(user.usdt_amount || 0);
      let optimistic = null;
      if (fromCurrency === 'RUB') {
        optimistic = {
          rub_amount: rubBalance - amountNum,
          usdt_amount: usdtBalance + amountNum * exchangeRate
        };
      } else {
        optimistic = {
          rub_amount: rubBalance + amountNum * exchangeRate,
          usdt_amount: usdtBalance - amountNum
        };
      }
      setOptimisticBalances(optimistic);

      // Використовуємо атомарну транзакцію для обміну
      console.log('[EXCHANGE] Calling atomic-transactions function:', {
        operation: 'exchange',
        chat_id: user.chat_id,
        from_currency: fromCurrency,
        to_currency: toCurrency,
        amount: amountNum,
        exchange_rate: exchangeRate
      });

      const { data: atomicResult, error: atomicError } = await supabase.functions.invoke('atomic-transactions', {
        body: {
          operation: 'exchange',
          chat_id: user.chat_id,
          from_currency: fromCurrency,
          to_currency: toCurrency,
          amount: amountNum,
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
    <div className='section' style={{height: '100%', padding: '15px'}}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', gap: '12px' }}>
        <NavLink to='/actives'>
          <Button
            variant="contained"
            color="primary"
            size="small"
            sx={{
              background: 'linear-gradient(135deg, rgba(100, 181, 246, 0.3) 0%, rgba(129, 212, 250, 0.3) 100%)',
              color: 'var(--text-color)',
              fontWeight: '600',
              fontSize: '14px',
              padding: '8px 20px',
              borderRadius: '10px',
              border: '1px solid var(--active-link-color)',
              textTransform: 'none',
              minWidth: 'auto',
              '&:hover': {
                background: 'linear-gradient(135deg, rgba(100, 181, 246, 0.5) 0%, rgba(129, 212, 250, 0.5) 100%)',
              }
            }}
          >
            {t('back')}
          </Button>
        </NavLink>
        <h3 style={{color: 'var(--text-color)', margin: 0, fontSize: '16px', fontWeight: '600'}}>{t('exchangeFromTo', { from, to })}</h3>
        <Button variant="outlined" size="small" onClick={refreshUser} sx={{ textTransform: 'none', minWidth: 'auto', padding: '8px 20px', fontSize: '14px' }}>
          {t('updateBalances')}
        </Button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px', marginBottom: '15px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src={'/usdt.png'} alt={'USDT'} width={32} height={32} style={{ borderRadius: '50%' }} />
          <div>
            <p style={{ margin: 0, color: 'var(--text-color)', fontSize: '14px', fontWeight: '500' }}>USDT</p>
            <p style={{ margin: 0, color: 'var(--crypto-list-price-color)', fontSize: '13px' }}>
              {balanceLoading ? t('loading') : `${formatBalance((optimisticBalances?.usdt_amount ?? user.usdt_amount) || 0)} $`}
            </p>
          </div>
        </div>

        <img src="/swap.svg" width={28} height={28} onClick={() => {
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
        }} style={{
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          padding: '8px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, rgba(100, 181, 246, 0.1) 0%, rgba(129, 212, 250, 0.1) 100%)',
          border: '1px solid rgba(100, 181, 246, 0.3)',
          margin: '0 8px'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.1)';
          e.currentTarget.style.background = 'linear-gradient(135deg, rgba(100, 181, 246, 0.2) 0%, rgba(129, 212, 250, 0.2) 100%)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.background = 'linear-gradient(135deg, rgba(100, 181, 246, 0.1) 0%, rgba(129, 212, 250, 0.1) 100%)';
        }}/>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src={'/rub.jpeg'} alt={'Rub'} width={32} height={32} style={{ borderRadius: '50%' }} />
          <div>
            <p style={{ margin: 0, color: 'var(--text-color)', fontSize: '14px', fontWeight: '500' }}>{t('russianRuble')}</p>
            <p style={{ margin: 0, color: 'var(--crypto-list-price-color)', fontSize: '13px' }}>
              {balanceLoading ? t('loading') : `${formatBalance((optimisticBalances?.rub_amount ?? user.rub_amount) || 0)} ₽`}
            </p>
          </div>
        </div>
      </div>

      {rub > 0 && (
        <div style={{ 
          marginBottom: '15px', 
          padding: '12px 16px', 
          background: 'linear-gradient(135deg, rgba(100, 181, 246, 0.1) 0%, rgba(129, 212, 250, 0.1) 100%)',
          borderRadius: '10px',
          border: '1px solid rgba(100, 181, 246, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          flexWrap: 'wrap'
        }}>
          <span style={{ color: 'var(--section-text-color)', fontSize: '14px' }}>
            {t('approximateRate')}:
          </span>
          <span style={{ color: 'var(--text-color)', fontWeight: '600', fontSize: '14px' }}>
            1 {from} = {getExchangeRate().toFixed(6)} {to}
          </span>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', gap: '12px', marginBottom: '15px', flexWrap: 'wrap' }}>
        <TextField
          label={t('amount')}
          variant="standard"
          type="number"
          color='primary'
          size="small"
          value={amount}
          onChange={(e) => {
            let v = e.target.value;
            v = v.replace(',', '.');
            const limited = v.includes('.') ? v.split('.')[0] + '.' + v.split('.')[1].slice(0, 2) : v;
            setAmount(limited);
          }}
            sx={{
              flex: 1,
              minWidth: '150px',
              maxWidth: '250px',
              '& .MuiInputBase-root': {
                color: 'var(--text-color)',
                background: 'linear-gradient(135deg, rgba(100, 181, 246, 0.15) 0%, rgba(129, 212, 250, 0.15) 100%)',
                borderRadius: '10px',
                padding: '8px 12px',
                fontSize: '14px',
              },
              '& .MuiInputLabel-root': {
                fontSize: '14px',
                color: 'var(--section-text-color)',
              },
              '& .MuiInputBase-input': {
                padding: '8px 12px',
                fontSize: '14px',
              },
            }}
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <span style={{color: 'var(--section-text-color)', fontSize: '14px'}}>{from === 'RUB' ? '₽' : '$'}</span>
                  </InputAdornment>
                ),
              },
            }}
        />
        <Button
          variant="outlined"
          size="small"
          onClick={handleSelectAll}
          disabled={!user || balanceLoading}
            sx={{
              textTransform: 'none',
              minWidth: 'auto',
              padding: '8px 20px',
              fontSize: '14px',
              height: '40px',
              background: 'linear-gradient(135deg, rgba(100, 181, 246, 0.2) 0%, rgba(129, 212, 250, 0.2) 100%)',
              borderColor: 'rgba(100, 181, 246, 0.5)',
              color: 'var(--text-color)',
              '&:hover': {
                background: 'linear-gradient(135deg, rgba(100, 181, 246, 0.3) 0%, rgba(129, 212, 250, 0.3) 100%)',
              }
            }}
        >
          {t('selectAll')}
        </Button>
      </div>

      {amount > 0 && rub > 0 && (
        <div style={{ 
          marginBottom: '15px', 
          padding: '12px 16px', 
          background: 'linear-gradient(135deg, rgba(100, 181, 246, 0.15) 0%, rgba(129, 212, 250, 0.15) 100%)',
          borderRadius: '10px',
          border: '1px solid rgba(100, 181, 246, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          flexWrap: 'wrap'
        }}>
          <span style={{ color: 'var(--section-text-color)', fontSize: '14px' }}>
            {t('youWillReceiveApproximately')}:
          </span>
          <span style={{ color: 'var(--active-link-color)', fontWeight: '700', fontSize: '16px' }}>
            {formatBalance(getReceivedAmount())} {to === 'RUB' ? '₽' : '$'}
          </span>
        </div>
      )}

      <Button
        variant="contained"
        color="primary"
        onClick={() => handleExchange()}
        disabled={isSubmitting}
        fullWidth
        sx={{
          background: 'linear-gradient(135deg, #64b5f6 0%, #90caf9 100%)',
          color: 'var(--background-color)',
          fontWeight: '600',
          fontSize: '15px',
          padding: '10px 24px',
          borderRadius: '10px',
          border: '1px solid #90caf9',
          textTransform: 'none',
          marginTop: '10px',
          '&:hover': {
            background: 'linear-gradient(135deg, #90caf9 0%, #b3e5fc 100%)',
          }
        }}
      >
        {isSubmitting ? t('processing') : t('exchangeButton')}
      </Button>
      </div>
  </>
  );
};

export default Exchange;