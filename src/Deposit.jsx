import React, {useState, useEffect} from 'react';
import './App.css'

import { initialCrypto, binance } from './utils'
import { useNavigate } from 'react-router-dom';
import CryptoItem from './CryptoItem';
import CurrencyItem from './CurrecyItem';
import { Drawer, TextField, InputAdornment, Button } from '@mui/material';
import { inputBaseClasses } from '@mui/material/InputBase';
import { Form, NavLink } from 'react-router-dom';
import { notification } from 'antd';
import { useI18n } from './i18n/I18nContext';

import axios from 'axios'
import { supabase } from './supabase';
const API_BASE_URL = "https://pay.crypt.bot/api";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
    "Crypto-Pay-API-Token": `329526:AAqVg9KZUxlXPSGq4QLQV2488s2dQ0bmwTd`,
  },
});

const Deposit = () => {
  const { t } = useI18n();
  const [crypto, setCrypto] = useState(initialCrypto);
  const [rub, setRub] = useState(0);
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(0);
  const [currency, setCurrency] = useState('rub');
  const [res,setRes] = useState(null);
  const navigation = useNavigate()


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

  function openCryptoBot(currency) {
    setCurrency(currency);
    setOpen(true);
  }

  const renderCurrencyList = () => (
      <ul className="currency-list">
          <span onClick={() => openCryptoBot('rub')}>
            <CurrencyItem rub={rub}/>
          </span>
      </ul>
  );

  const renderCryptoList = () => (
      <ul className="crypto-list">
          {crypto.map((item, index) => (
            <span index={index} onClick={() => openCryptoBot(item.ticker)}>
                <CryptoItem item={item}  />
            </span>
          ))}
      </ul>
  );
  
  async function createInvoice() {
    const formData = new FormData();
    formData.append('amount', value);
    formData.append('currency', currency);
    formData.append('chat_id', localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')).chat_id : null);
    try{
      const res = await axios.post('https://fyqwhjybwbugveyjpelg.supabase.co/functions/v1/create-invoice', formData, {
        headers: {
        'Content-Type': 'multipart/form-data'
        }
      });
    } catch (e) {
      console.log(e);
    }
    navigation('/actives')
    notification.success({
      message: t('invoiceSuccess'),
      description: t('invoiceSuccessDescription'),
    })
  }
  return (
   <>
   <div className='section'>
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

   <h1 style={{textAlign: 'center', color: 'var(--text-color)'}}>
    {t('whatToTopUp')}
   </h1>
   </div>
    <section className="section">
          <h2>{t('currencyAccounts')}</h2>
          {renderCurrencyList()}
    </section>

    <section className="section">
        <h2>{t('cryptocurrencies')}</h2>
        {renderCryptoList()}
    </section>

    <Drawer anchor='bottom' open={open} onClose={() => setOpen(false)}>
    {currency === 'rub' && (
      <div style={{height: '400px', backgroundColor: 'var(--section-background-color)', padding: '10px'}} >
        <h2 style={{color: 'var(--text-color)'}}>Bы покупаете <span style={{color: 'var(--section-heading-color)', fontWeight: 600}}>{currency.toUpperCase()}</span></h2>
        <TextField
            id="outlined-suffix-shrink"
            label="Количество"
            variant="standard"
            type="number"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            color="primary"
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
                    <p style={{color: 'var(--section-text-color)'}}>RUB</p>
                  </InputAdornment>
                ),
              },
            }}
          />
        <div style={{ marginTop: '20px' }}>
          {[5000, 10000, 15000, 20000].map((amount) => (
            <button
              key={amount}
              onClick={() => setValue(amount)}
              style={{
                margin: '5px',
                padding: '12px 24px',
                border: amount === value ? '2px solid #90caf9' : '2px solid #81d4fa',
                borderRadius: '10px',
                cursor: 'pointer',
                background: amount === value 
                  ? 'linear-gradient(135deg, #64b5f6 0%, #90caf9 100%)' 
                  : 'linear-gradient(135deg, rgba(100, 181, 246, 0.2) 0%, rgba(129, 212, 250, 0.2) 100%)',
                color: amount === value ? (document.body.classList.contains('light-theme') ? '#0a1929' : '#0a1929') : 'var(--section-heading-color)',
                fontWeight: '700',
                fontSize: '14px',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: amount === value 
                  ? '0 6px 20px rgba(100, 181, 246, 0.5), 0 0 15px rgba(100, 181, 246, 0.3)' 
                  : '0 4px 12px rgba(100, 181, 246, 0.2)',
              }}
              onMouseEnter={(e) => {
                if (amount !== value) {
                  e.currentTarget.style.transform = 'translateY(-2px) scale(1.05)';
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(100, 181, 246, 0.4) 0%, rgba(129, 212, 250, 0.4) 100%)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(100, 181, 246, 0.4)';
                }
              }}
              onMouseLeave={(e) => {
                if (amount !== value) {
                  e.currentTarget.style.transform = 'translateY(0) scale(1)';
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(100, 181, 246, 0.2) 0%, rgba(129, 212, 250, 0.2) 100%)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(100, 181, 246, 0.2)';
                }
              }}
            >
              {amount}
            </button>
          ))}
        </div>
        <div style={{display: 'flex', justifyContent: 'center'}}>
       
        <Button 
          sx={{
            width: '180px', 
            border: '2px solid #90caf9', 
            background: 'linear-gradient(135deg, #64b5f6 0%, #90caf9 100%)',
            color: 'var(--background-color)', 
            fontWeight: '700', 
            fontSize: '16px',
            margin: '15px',
            borderRadius: '10px',
            padding: '12px 24px',
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
          variant={'contained'} 
          onClick={createInvoice}
        >
          {t('topUpButton')}
        </Button>
        </div>
      </div>
    )}

    {currency !== 'rub' && (
      <>
      <div style={{height: '400px', backgroundColor: 'var(--section-background-color)', padding: '10px'}} >
        <h2 style={{color: 'var(--text-color)'}}>Bы покупаете <span style={{color: 'var(--section-heading-color)', fontWeight: 600}}>{currency.toUpperCase()}</span></h2>
        <TextField
            id="outlined-suffix-shrink"
            label="Количество"
            variant="standard"
            type="number"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            color="primary"
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
                    <p style={{color: 'var(--section-text-color)'}}>{currency.toUpperCase()}</p>
                  </InputAdornment>
                ),
              },
            }}
          />
        <div style={{ marginTop: '20px' }}>
          {[50, 100, 200, 500].map((amount) => (
            <button
              key={amount}
              onClick={() => setValue(amount)}
              style={{
                margin: '5px',
                padding: '12px 24px',
                border: amount === value ? '2px solid #90caf9' : '2px solid #81d4fa',
                borderRadius: '10px',
                cursor: 'pointer',
                background: amount === value 
                  ? 'linear-gradient(135deg, #64b5f6 0%, #90caf9 100%)' 
                  : 'linear-gradient(135deg, rgba(100, 181, 246, 0.2) 0%, rgba(129, 212, 250, 0.2) 100%)',
                color: amount === value ? (document.body.classList.contains('light-theme') ? '#0a1929' : '#0a1929') : 'var(--section-heading-color)',
                fontWeight: '700',
                fontSize: '14px',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: amount === value 
                  ? '0 6px 20px rgba(100, 181, 246, 0.5), 0 0 15px rgba(100, 181, 246, 0.3)' 
                  : '0 4px 12px rgba(100, 181, 246, 0.2)',
              }}
              onMouseEnter={(e) => {
                if (amount !== value) {
                  e.currentTarget.style.transform = 'translateY(-2px) scale(1.05)';
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(100, 181, 246, 0.4) 0%, rgba(129, 212, 250, 0.4) 100%)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(100, 181, 246, 0.4)';
                }
              }}
              onMouseLeave={(e) => {
                if (amount !== value) {
                  e.currentTarget.style.transform = 'translateY(0) scale(1)';
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(100, 181, 246, 0.2) 0%, rgba(129, 212, 250, 0.2) 100%)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(100, 181, 246, 0.2)';
                }
              }}
            >
              {amount}
            </button>
          ))}
        </div>
        <div style={{display: 'flex', justifyContent: 'center'}}>
        <Button 
          sx={{
            width: '180px', 
            border: '2px solid #90caf9', 
            background: 'linear-gradient(135deg, #64b5f6 0%, #90caf9 100%)',
            color: 'var(--background-color)', 
            fontWeight: '700', 
            fontSize: '16px',
            margin: '15px',
            borderRadius: '10px',
            padding: '12px 24px',
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
          variant={'contained'} 
          onClick={createInvoice}
        >
          {t('topUpButton')}
        </Button>
        </div>
      </div>
      </>

    )}
    </Drawer>


   </>
  );
};

export default Deposit;