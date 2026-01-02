import React, { useEffect, useState, useRef } from 'react';
import { BrowserRouter as Router, Route, Routes, NavLink } from 'react-router-dom';
import { Drawer, TextField, InputAdornment, Button } from '@mui/material';
import {binance} from './utils';
import { supabase } from './supabase';
import { inputBaseClasses } from '@mui/material/InputBase';
import { notification, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useI18n } from './i18n/I18nContext';

const Withdraw = () => {
  const { t } = useI18n();
  const [amount, setAmount] = useState('');
  const [name, setName] = useState(localStorage.getItem('last_withdraw_name') || '');
  const [card, setCard] = useState(localStorage.getItem('last_withdraw_card') || '');
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [balanceLoading, setBalanceLoading] = useState(!user);
  const submitLock = useRef(false);

  const navigation = useNavigate()

  useEffect(() => {
    if (user) setBalanceLoading(false);
  }, [user]);

  const showStatusError = (status, fallback) => {
    const messages = {
      400: t('invalidData'),
      409: t('balanceConflict'),
      500: t('internalError')
    };
    notification.error({
      message: t('error'),
      description: messages[status] || fallback || t('somethingWentWrong')
    });
  };

  const handleSubmit = async () => {
    if (submitLock.current || isSubmitting) return;
    submitLock.current = true;
    setIsSubmitting(true);

    if(parseFloat(amount) <= 0) {
      notification.error({
        message: t('error'),
        description: t('amountMustBeGreaterThanZero'),
      });
      setIsSubmitting(false);
      submitLock.current = false;
      return;
    }

    if (parseFloat(amount) < 60000) {
      notification.error({
        message: t('error'),
        description: t('minimumWithdrawAmount'),
      });
      setIsSubmitting(false);
      submitLock.current = false;
      return;
    }
    if(!name || !card || !amount) {
      notification.error({
        message: t('error'),
        description: t('fillAllFields'),
      });
      setIsSubmitting(false);
      submitLock.current = false;
      return;
    }
    if (parseFloat(user.rub_amount) < parseFloat(amount)) {
      notification.error({
        message: t('error'),
        description: t('insufficientFunds'),
      });
      setIsSubmitting(false);
      submitLock.current = false;
      return;
    }

    try {
      // Розрахунок балансу робиться після відповіді сервера

      // Спочатку створюємо заявку на виведення
      // Важливо: isDone завжди має бути false при створенні виводу з web-app
      const { data: withdrawData, error: withdrawError } = await supabase.from('withdraws').insert({
        chat_id: user.chat_id,
        amount: parseFloat(amount),
        card_number: card,
        name: name,
        isDone: false, // Завжди false при створенні виводу з web-app
      }).select().single();

      if (withdrawError || !withdrawData) {
        showStatusError(withdrawError?.status, t('failedToCreateWithdraw'));
        setIsSubmitting(false);
        submitLock.current = false;
        return;
      }

      // Використовуємо атомарну транзакцію для оновлення балансу
      const { data: atomicResult, error: atomicError } = await supabase.functions.invoke('atomic-transactions', {
        body: {
          operation: 'withdraw',
          chat_id: user.chat_id,
          amount: parseFloat(amount),
          currency: 'rub',
          withdraw_id: withdrawData.id
        }
      });

      if (atomicError || !atomicResult?.success) {
        // Якщо атомарна транзакція не вдалася, видаляємо створену заявку
        await supabase.from('withdraws').delete().eq('id', withdrawData.id);
        const status = atomicError?.context?.status || atomicResult?.status;
        showStatusError(status, atomicResult?.error || t('failedToProcessWithdraw'));
        setIsSubmitting(false);
        submitLock.current = false;
        return;
      }

      // Оновлюємо локальний стан користувача
      const updatedUser = { ...user, rub_amount: atomicResult.newBalance };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      localStorage.setItem('last_withdraw_name', name);
      localStorage.setItem('last_withdraw_card', card);
      // Баланс оновлено на основі відповіді сервера

      notification.success({
        message: t('success'),
        description: t('withdrawRequestCreated'),
      });

      navigation('/actives');
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      showStatusError(error?.context?.status, t('somethingWentWrong'));
      // Помилка — баланс не змінюємо
    } finally {
      setIsSubmitting(false);
      submitLock.current = false;
    }
  };

  const textFieldStyles = {
    maxWidth: '400px',
    marginBottom: '24px',
    '& .MuiInputBase-root': {
      color: 'var(--text-color)',
      background: 'linear-gradient(135deg, rgba(26, 58, 90, 0.8) 0%, rgba(30, 58, 95, 0.8) 100%)',
      borderRadius: '12px',
      backdropFilter: 'blur(10px)',
      padding: '4px 16px',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      border: '2px solid rgba(100, 181, 246, 0.3)',
      boxShadow: '0 4px 12px rgba(100, 181, 246, 0.15)',
      position: 'relative',
      '&:hover': {
        background: 'linear-gradient(135deg, rgba(26, 58, 90, 0.95) 0%, rgba(30, 58, 95, 0.95) 100%)',
        boxShadow: '0 6px 20px rgba(100, 181, 246, 0.3)',
        borderColor: 'rgba(144, 202, 249, 0.5)',
        transform: 'translateY(-2px)',
      },
      '&::before': {
        display: 'none',
      },
      '&::after': {
        display: 'none',
      },
    },
    '& .MuiInputBase-root.Mui-focused': {
      background: 'linear-gradient(135deg, rgba(26, 58, 90, 0.95) 0%, rgba(30, 58, 95, 0.95) 100%)',
      borderColor: 'var(--active-link-color)',
      boxShadow: '0 8px 24px rgba(100, 181, 246, 0.4), 0 0 20px rgba(100, 181, 246, 0.2)',
      transform: 'translateY(-2px)',
    },
    '& .MuiInputLabel-root': {
      color: 'var(--section-heading-color)',
      fontWeight: '600',
      fontSize: '14px',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      left: '16px',
      top: '8px',
      '&.MuiInputLabel-shrink': {
        transform: 'translate(0, -8px) scale(0.85)',
        color: 'var(--active-link-color)',
        textShadow: '0 0 8px rgba(100, 181, 246, 0.5)',
        fontWeight: '700',
      },
    },
    '& .MuiInputLabel-root.Mui-focused': {
      color: 'var(--active-link-color)',
      textShadow: '0 0 8px rgba(100, 181, 246, 0.5)',
    },
    '& .MuiInputBase-input': {
      color: 'var(--text-color)',
      fontWeight: '500',
      padding: '16px 0',
      fontSize: '16px',
      '&::placeholder': {
        color: 'rgba(227, 242, 253, 0.4)',
        opacity: 1,
      },
      '&:focus': {
        color: 'var(--text-color)',
      },
    },
  };

  return (
    <div className='section' style={{ height: '100%' }}>
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
      <div style={{ display: 'flex', justifyContent: 'center', minHeight: 32, alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        {balanceLoading ? (
          <div style={{ width: 140, height: 26, borderRadius: 8, background: 'rgba(255,255,255,0.1)', animation: 'pulse 1s ease-in-out infinite' }} />
        ) : (
          <h2>{t('balance')} <span style={{ color: 'white' }}>{parseFloat(user?.rub_amount || 0).toFixed(2)}</span></h2>
        )}
        <Button
          variant="outlined"
          size="small"
          onClick={async () => {
            if (!user?.chat_id) return;
            setBalanceLoading(true);
            const { data, error } = await supabase
              .from('users')
              .select('rub_amount')
              .eq('chat_id', user.chat_id)
              .single();
            if (!error && data) {
              const refreshed = { ...user, rub_amount: data.rub_amount };
              setUser(refreshed);
              localStorage.setItem('user', JSON.stringify(refreshed));
            }
            setBalanceLoading(false);
          }}
          sx={{ textTransform: 'none', minWidth: 110 }}
        >
          {t('update')}
        </Button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', maxWidth: '450px' }}>
        <TextField
          sx={textFieldStyles}
          id="amount"
          label={t('amount')}
          variant="standard"
          color="primary"
          value={amount}
          type="number"
          onChange={(e) => {
            const v = e.target.value;
            const limited = v.includes('.') ? v.split('.')[0] + '.' + v.split('.')[1].slice(0, 2) : v;
            setAmount(limited);
          }}
          InputLabelProps={{
            shrink: true,
          }}
        />
        <TextField
          sx={textFieldStyles}
          id="card"
          label={t('card')}
          variant="standard"
          color="primary"
          value={card}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, '').slice(0, 19);
            const masked = digits.replace(/(.{4})/g, '$1 ').trim();
            setCard(masked);
          }}
          InputLabelProps={{
            shrink: true,
          }}
        />
        <TextField
          sx={textFieldStyles}
          id="name"
          label={t('fullName')}
          variant="standard"
          color="primary"
          value={name}
          onChange={(e) => setName(e.target.value.replace(/\s+/g, ' '))}
          InputLabelProps={{
            shrink: true,
          }}
        />
      </div>
      <Button
        variant="contained"
        color="primary"
        onClick={() => handleSubmit()}
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
        {isSubmitting ? t('processing') : t('withdrawButton')}
      </Button>
    </div>
  );
};

export default Withdraw;
