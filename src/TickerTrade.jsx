import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Form, NavLink, useParams } from 'react-router-dom';
import TockenCard from './components/TockenCard';
import { createChart, ColorType, CandlestickSeries, LineSeries, HistogramSeries } from 'lightweight-charts';
import axios from 'axios';
import { supabase } from './supabase';
import { Drawer, TextField, InputAdornment, FormControl, ButtonGroup, MenuItem, InputLabel, Button} from '@mui/material';
import { inputBaseClasses } from '@mui/material/InputBase';
import { notification, Typography } from 'antd';
import { useI18n } from './i18n/I18nContext';


const buy = {
  padding: '12px 24px',
  width: '100%',
  cursor: 'pointer',
  background: 'linear-gradient(135deg, #4caf50 0%, #388e3c 50%, #2e7d32 100%)',
  color: '#fff',
  border: '2px solid #66bb6a',
  borderRadius: '10px',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  fontWeight: '700',
  fontSize: '16px',
  boxShadow: '0 4px 15px rgba(76, 175, 80, 0.4), 0 2px 6px rgba(0, 0, 0, 0.2)',
  textTransform: 'none',
  position: 'relative',
  overflow: 'hidden',
}

const sell = {
  padding: '12px 24px',
  width: '100%',
  cursor: 'pointer',
  background: 'linear-gradient(135deg, #f44336 0%, #d32f2f 50%, #c62828 100%)',
  color: '#fff',
  border: '2px solid #ef5350',
  borderRadius: '10px',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  fontWeight: '700',
  fontSize: '16px',
  boxShadow: '0 4px 15px rgba(244, 67, 54, 0.4), 0 2px 6px rgba(0, 0, 0, 0.2)',
  textTransform: 'none',
  position: 'relative',
  overflow: 'hidden',
}

const binance = 'https://api.binance.com/api/v3/ticker/24hr?symbol=';
const killedPriceTime = 1000;

const CandlestickChart = () => {
  const { t } = useI18n();
  const [series, setSeries] = useState([]);
  const [amount, setAmount] = useState(0);
  const [time, setTime] = useState('1m');
  const [timeToFinish, setTimeToFinish] = useState('20s');
  const [currentTicker, setCurrentTicker] = useState({});
  const [trade,setTrade] = useState();
  const [user,setUser] = useState();
  const [currentTickerMath, setCurrentTickerMath] = useState({ price: null, priceChangePercent: 0 });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [trades, setTrades] = useState([]);
  const startKilled = useRef();
  const stopKilled = useRef();
  const sellPrice = useRef(0);
  const { ticker } = useParams();
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const candlestickSeriesRef = useRef(null);
  const lastFormattedDataRef = useRef(null);
  const [activeIndicators, setActiveIndicators] = useState({
    sma20: false,
    sma50: false,
    ema20: false,
    rsi: false,
    macd: false,
  });
  const indicatorsRefs = useRef({
    sma20: null,
    sma50: null,
    ema20: null,
    rsi: null,
    rsiPane: null,
    macd: null,
    macdSignal: null,
    macdHistogram: null,
    macdPane: null,
  });

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    
    // Спочатку встановлюємо user з localStorage для миттєвого відображення
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
      } catch (e) {
        console.error('Error parsing user from localStorage:', e);
      }
    }

    const fetchUser = async () => {
      if (!storedUser) return;
      
      try {
        const parsedStoredUser = JSON.parse(storedUser);
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('chat_id', parsedStoredUser.chat_id)
            .single();

        if (error) {
            console.error('Error fetching user:', error);
        } else if (data) {
            localStorage.setItem('user', JSON.stringify(data));
            setUser(data);
        }
      } catch (e) {
        console.error('Error in fetchUser:', e);
      }
    };

    // Завантажуємо user одразу при монтуванні
    if (storedUser) {
      fetchUser();
      
      // Потім оновлюємо кожні 10 секунд
      const interval = setInterval(() => {
        fetchUser();
      }, 10000);
      
      return () => clearInterval(interval);
    }
  }, [])

  useEffect(() => {
    let interval
    if (user) {
      // Викликаємо одразу при завантаженні
      fetchUserTrades(user);
      
      // Потім встановлюємо інтервал для оновлення кожні 5 секунд
      interval = setInterval(() => {
        fetchUserTrades(user);  
      }, 5000)
    }

    return () => clearInterval(interval);
  }, [user, ticker])

  const fetchUserTrades = async (user) => {
    const { data, error } = await supabase
      .from('trades')
      .select('*')
      .eq('chat_id', user.chat_id)
      .eq('token', ticker);
    if (error) {
      console.error('Error fetching user trades:', error);
    } else {
      setTrades(data);
      console.log(data);
    }
  };

  useEffect(() => {
    const fetchTicker = async () => {
      try {
        const { data, error } = await supabase
          .from('tokens')
          .select('*')
          .eq('ticker', ticker)
          .single();

        if (error) {
          console.error('Error fetching ticker:', error);
        } else if (data) {
          setCurrentTicker(data);
        }
      } catch (e) {
        console.error('Error in fetchTicker:', e);
      }
    };

    fetchTicker();
  }, [ticker]);

  // Ініціалізація TradingView-подібного чарта
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const updateTheme = () => {
      const isDark = document.body.classList.contains('dark-theme') || !document.body.classList.contains('light-theme');
      return isDark;
    };

    const isDark = updateTheme();
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
        vertLine: {
          color: isDark ? '#758696' : '#758696',
          width: 1,
          style: 0,
        },
        horzLine: {
          color: isDark ? '#758696' : '#758696',
          width: 1,
          style: 0,
        },
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
      height: 350,
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

    // Слухач змін теми
    const observer = new MutationObserver(() => {
      const newIsDark = updateTheme();
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

    return () => {
      observer.disconnect();
      chart.remove();
      chartRef.current = null;
      candlestickSeriesRef.current = null;
      // Очищаємо всі індикатори
      Object.keys(indicatorsRefs.current).forEach(key => {
        indicatorsRefs.current[key] = null;
      });
    };
  }, [ticker]);

  // Оновлення даних на чарті
  useEffect(() => {
    let isMounted = true;
    
    const fetchDataAndPrices = async () => {
      try {
        // Запускаємо обидва запити паралельно для швидшої загрузки
        const [candlestickData, priceResponse] = await Promise.all([
          fetchCandlestickData(ticker, time),
          fetch(`${binance}${ticker.toUpperCase()}USDT`).then(res => res.json())
        ]);

        if (!isMounted) return;

        if (stopKilled.current) {
          if (Date.now() > stopKilled.current) {
            if (candlestickData && candlestickData.length > 0) {
            candlestickData[candlestickData.length - 1].y[3] = sellPrice.current;
            }
            stopKilled.current = null;
            setCurrentTickerMath(prev => ({
              price: sellPrice.current,
              priceChangePercent: (((sellPrice.current - prev.prevClosePrice) / prev.prevClosePrice) * 100).toFixed(2),
            }));
          }
        } else {
          setCurrentTickerMath({
            price: priceResponse.lastPrice,
            priceChangePercent: priceResponse.priceChangePercent,
            prevClosePrice: priceResponse.prevClosePrice,
          });
        }

        // Оновлюємо дані на lightweight-charts
        if (candlestickSeriesRef.current && candlestickData && candlestickData.length > 0) {
          // Конвертуємо дані в формат lightweight-charts
          const formattedData = candlestickData.map((d) => ({
            time: Math.floor(d.x.getTime() / 1000),
            open: d.y[0],
            high: d.y[1],
            low: d.y[2],
            close: d.y[3],
          }));
          candlestickSeriesRef.current.setData(formattedData);
          lastFormattedDataRef.current = formattedData;
          
          // Оновлюємо індикатори якщо вони активні
          updateIndicators(formattedData);
          
          if (chartRef.current) {
            chartRef.current.timeScale().fitContent();
        }
        }

        // Зберігаємо для сумісності з іншими частинами коду
        setSeries([{ data: candlestickData }]);
      } catch (error) {
        console.error('Error fetching data and prices:', error);
      }
    };

    // Завантажуємо одразу
    fetchDataAndPrices();

    // Потім оновлюємо кожні 5 секунд
    const interval = setInterval(() => {
      fetchDataAndPrices();
    }, 5000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [time, ticker]);

  // Оновлення розміру чарта при зміні розміру вікна
  useEffect(() => {
    const handleResize = () => {
      if (chartRef.current && chartContainerRef.current) {
        chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);


  const handleIntervalChange = (event) => {
    setTime(event);
  };

  const updateIndicators = (formattedData) => {
    if (!formattedData || formattedData.length === 0) return;
    
    if (activeIndicators.sma20 && indicatorsRefs.current.sma20) {
      const sma20Data = calculateSMA(formattedData, 20);
      indicatorsRefs.current.sma20.setData(sma20Data);
    }
    if (activeIndicators.sma50 && indicatorsRefs.current.sma50) {
      const sma50Data = calculateSMA(formattedData, 50);
      indicatorsRefs.current.sma50.setData(sma50Data);
    }
    if (activeIndicators.ema20 && indicatorsRefs.current.ema20) {
      const ema20Data = calculateEMA(formattedData, 20);
      indicatorsRefs.current.ema20.setData(ema20Data);
    }
    if (activeIndicators.rsi && indicatorsRefs.current.rsi) {
      const rsiData = calculateRSI(formattedData, 14);
      indicatorsRefs.current.rsi.setData(rsiData);
    }
    if (activeIndicators.macd && indicatorsRefs.current.macd) {
      const macdData = calculateMACD(formattedData);
      indicatorsRefs.current.macd.setData(macdData.macdLine);
      if (indicatorsRefs.current.macdSignal) {
        indicatorsRefs.current.macdSignal.setData(macdData.signalLine);
      }
      if (indicatorsRefs.current.macdHistogram) {
        indicatorsRefs.current.macdHistogram.setData(macdData.histogram);
      }
    }
  };

  const toggleIndicator = (indicatorName) => {
    setActiveIndicators(prev => {
      const newState = { ...prev, [indicatorName]: !prev[indicatorName] };
      
      if (!chartRef.current || !candlestickSeriesRef.current) return newState;
      
      // Отримуємо останні дані
      const formattedData = lastFormattedDataRef.current;
      
      if (newState[indicatorName]) {
        // Створюємо індикатор
        const isDark = document.body.classList.contains('dark-theme') || !document.body.classList.contains('light-theme');
        
        if (indicatorName === 'sma20') {
          const smaSeries = chartRef.current.addSeries(LineSeries, {
            color: '#FF6B6B',
            lineWidth: 2,
            title: 'SMA 20',
            priceScaleId: 'right',
          });
          indicatorsRefs.current.sma20 = smaSeries;
          if (formattedData) {
            const sma20Data = calculateSMA(formattedData, 20);
            smaSeries.setData(sma20Data);
          }
        } else if (indicatorName === 'sma50') {
          const smaSeries = chartRef.current.addSeries(LineSeries, {
            color: '#4ECDC4',
            lineWidth: 2,
            title: 'SMA 50',
            priceScaleId: 'right',
          });
          indicatorsRefs.current.sma50 = smaSeries;
          if (formattedData) {
            const sma50Data = calculateSMA(formattedData, 50);
            smaSeries.setData(sma50Data);
          }
        } else if (indicatorName === 'ema20') {
          const emaSeries = chartRef.current.addSeries(LineSeries, {
            color: '#FFE66D',
            lineWidth: 2,
            title: 'EMA 20',
            priceScaleId: 'right',
          });
          indicatorsRefs.current.ema20 = emaSeries;
          if (formattedData) {
            const ema20Data = calculateEMA(formattedData, 20);
            emaSeries.setData(ema20Data);
          }
        } else if (indicatorName === 'rsi') {
          // RSI на окремій панелі
          const rsiPane = chartRef.current.addPane();
          const rsiSeries = rsiPane.addSeries(LineSeries, {
            color: '#9B59B6',
            lineWidth: 2,
            title: 'RSI',
            priceScaleId: 'rsi',
          });
          rsiSeries.priceScale().applyOptions({
            scaleMargins: { top: 0.1, bottom: 0.1 },
          });
          indicatorsRefs.current.rsi = rsiSeries;
          indicatorsRefs.current.rsiPane = rsiPane;
          if (formattedData) {
            const rsiData = calculateRSI(formattedData, 14);
            rsiSeries.setData(rsiData);
          }
        } else if (indicatorName === 'macd') {
          // MACD на окремій панелі
          const macdPane = chartRef.current.addPane();
          const macdLine = macdPane.addSeries(LineSeries, {
            color: '#3498DB',
            lineWidth: 2,
            title: 'MACD',
            priceScaleId: 'macd',
          });
          const signalLine = macdPane.addSeries(LineSeries, {
            color: '#E74C3C',
            lineWidth: 2,
            title: 'Signal',
            priceScaleId: 'macd',
          });
          const histogram = macdPane.addSeries(HistogramSeries, {
            color: '#95A5A6',
            priceFormat: {
              type: 'volume',
            },
            priceScaleId: 'macd',
          });
          indicatorsRefs.current.macd = macdLine;
          indicatorsRefs.current.macdSignal = signalLine;
          indicatorsRefs.current.macdHistogram = histogram;
          indicatorsRefs.current.macdPane = macdPane;
          if (formattedData) {
            const macdData = calculateMACD(formattedData);
            macdLine.setData(macdData.macdLine);
            signalLine.setData(macdData.signalLine);
            histogram.setData(macdData.histogram);
          }
        }
      } else {
        // Видаляємо індикатор
        if (indicatorName === 'rsi' && indicatorsRefs.current.rsi) {
          chartRef.current.removeSeries(indicatorsRefs.current.rsi);
          if (indicatorsRefs.current.rsiPane) {
            const panes = chartRef.current.panes();
            const paneIndex = panes.indexOf(indicatorsRefs.current.rsiPane);
            if (paneIndex !== -1) {
              chartRef.current.removePane(paneIndex);
            }
          }
          indicatorsRefs.current.rsi = null;
          indicatorsRefs.current.rsiPane = null;
        } else if (indicatorName === 'macd' && indicatorsRefs.current.macd) {
          chartRef.current.removeSeries(indicatorsRefs.current.macd);
          chartRef.current.removeSeries(indicatorsRefs.current.macdSignal);
          chartRef.current.removeSeries(indicatorsRefs.current.macdHistogram);
          if (indicatorsRefs.current.macdPane) {
            const panes = chartRef.current.panes();
            const paneIndex = panes.indexOf(indicatorsRefs.current.macdPane);
            if (paneIndex !== -1) {
              chartRef.current.removePane(paneIndex);
            }
          }
          indicatorsRefs.current.macd = null;
          indicatorsRefs.current.macdSignal = null;
          indicatorsRefs.current.macdHistogram = null;
          indicatorsRefs.current.macdPane = null;
        } else if (indicatorsRefs.current[indicatorName]) {
          chartRef.current.removeSeries(indicatorsRefs.current[indicatorName]);
          indicatorsRefs.current[indicatorName] = null;
        }
      }
      
      return newState;
    });
  };

  const handleBuyClick = (trade) => {
    if(!user.is_trading_enable) {
      notification.error({
        message: t('error'),
        description: t('tradingTemporarilyUnavailable'),
      })
      return 
    } 
    setDrawerOpen(true);
    setTrade(trade);
    
    if (trade === 'buy') {
      sellPrice.current = currentTickerMath.price * 1.005;
    } else {
      sellPrice.current = currentTickerMath.price * 0.995;
    }
    startKilled.current = Date.now();
    stopKilled.current = Date.now() + killedPriceTime;

    
  };

  const toggleDrawer = (open) => (event) => {
    if (event.type === 'keydown' && (event.key === 'Tab' || event.key === 'Shift')) {
      return;
    }
    setDrawerOpen(open);
  };

  const handeTimeChange = (time) => {
    setTimeToFinish(time);
  }

  async function startTrade() {
    const { data, error } = await supabase
    .from('trades')
    .select('*')
    .eq('chat_id', user.chat_id)

    if (data.some(trade => trade.isActive)) {
      notification.error({
        message: t('error'),
        description: t('youHaveActiveTrade'),
      })
      return
    }
    console.log('start trade');
    if (String(amount).startsWith('0')) {
      notification.error({
        message: t('error'),
        description: t('amountCannotStartWithZero'),
      })

      return
    }
    if (amount <= 0) {
      notification.error({
        message: t('error'),
        description: t('amountMustBeGreaterThanZero'),
      })

      return
    }

    if (amount < 30) {
      notification.error({
        message: t('error'),
        description: t('minimumAmount30'),
      })
      return
    }


    if (parseFloat(amount) > parseFloat(user.usdt_amount)) {
      notification.error({
        message: t('error'),
        description: t('insufficientFunds'),
      })
      return
    }
    // Перевірка та fallback для ticker
    const tickerValue = currentTicker?.ticker || ticker;
    if (!tickerValue) {
      notification.error({
        message: t('error'),
        description: 'Ticker не знайдено. Спробуйте оновити сторінку.',
      });
      return;
    }

    const formData = new FormData();
    formData.append('chat_id', user.chat_id);
    formData.append('ticker', tickerValue);
    formData.append('trade_type', trade);
    formData.append('price', currentTickerMath.price);
    formData.append('amount', amount);
    formData.append('time_to_finish', timeToFinish);
    try{
      const res = await axios.post('https://fyqwhjybwbugveyjpelg.supabase.co/functions/v1/create-trade', formData, {
        headers: {
        'Content-Type': 'multipart/form-data'
        }
      });
    } catch (e){
      console.log(e)
    }
    await fetchUserTrades(user);
    const newUsdtAmount = (parseFloat(user.usdt_amount) - parseFloat(amount)).toFixed(2);
    setUser({...user, usdt_amount: newUsdtAmount})
    localStorage.setItem('user', JSON.stringify({...user, usdt_amount: newUsdtAmount}));
    await supabase.from('users').update({usdt_amount: newUsdtAmount}).eq('chat_id', user.chat_id).select();

    setDrawerOpen(false);
  }

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', background: 'var(--background-color)', color: 'var(--text-color)', width: '100%', height:'1000px', boxSizing:'border-box', padding:'10px 10px 10px 10px' }}>
      
      <NavLink to='/trade'>
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

      {/* Блок з балансом та поточною ціною */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '15px',
        marginBottom: '20px',
        padding: '0 10px'
      }}>
        {/* Блок балансу */}
        <div style={{
          background: 'var(--section-background-color)',
          padding: '20px',
          borderRadius: '12px',
          border: '2px solid rgba(100, 181, 246, 0.4)',
          boxShadow: '0 8px 24px rgba(100, 181, 246, 0.3), 0 0 20px rgba(100, 181, 246, 0.1)',
          backdropFilter: 'blur(10px)',
          position: 'relative',
          overflow: 'hidden',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
        }}>
          {/* Декоративний фон */}
          <div style={{
            position: 'absolute',
            top: -50,
            right: -50,
            width: '150px',
            height: '150px',
            background: 'radial-gradient(circle, rgba(100, 181, 246, 0.2) 0%, transparent 70%)',
            borderRadius: '50%',
            pointerEvents: 'none'
          }}></div>
          
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '8px'
            }}>
              <span style={{
                color: 'var(--section-heading-color)',
                fontSize: '0.85rem',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>{t('balance')}</span>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: '8px',
              flexWrap: 'wrap'
            }}>
              <span style={{
                color: 'var(--text-color)',
                fontSize: '1.8rem',
                fontWeight: '700',
                textShadow: '0 0 15px rgba(100, 181, 246, 0.6)',
                lineHeight: '1.2'
              }}>
                {parseFloat(user?.usdt_amount || 0).toFixed(2)}
              </span>
              <span style={{
                color: 'var(--footer-hover-color)',
                fontSize: '1.2rem',
                fontWeight: '600',
                opacity: 0.9
              }}>USDT</span>
            </div>
          </div>
        </div>

        {/* Блок поточної ціни */}
        {currentTickerMath.price && (
          <div style={{
            background: 'var(--section-background-color)',
            padding: '20px',
            borderRadius: '12px',
            border: '2px solid rgba(100, 181, 246, 0.4)',
            boxShadow: '0 8px 24px rgba(100, 181, 246, 0.3), 0 0 20px rgba(100, 181, 246, 0.1)',
            backdropFilter: 'blur(10px)',
            position: 'relative',
            overflow: 'hidden',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
          }}>
            {/* Декоративний фон */}
            <div style={{
              position: 'absolute',
              top: -50,
              right: -50,
              width: '150px',
              height: '150px',
              background: 'radial-gradient(circle, rgba(129, 212, 250, 0.2) 0%, transparent 70%)',
              borderRadius: '50%',
              pointerEvents: 'none'
            }}></div>
            
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '8px'
              }}>
                <span style={{
                  color: 'var(--section-heading-color)',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>{t('currentPrice')}</span>
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: '10px',
                flexWrap: 'wrap'
              }}>
                <span style={{
                  color: 'var(--text-color)',
                  fontSize: '1.8rem',
                  fontWeight: '700',
                  textShadow: '0 0 15px rgba(100, 181, 246, 0.6)',
                  lineHeight: '1.2'
                }}>
                  {(() => {
                    const price = Number(currentTickerMath.price);
                    if (price < 0.0001) return price.toFixed(8);
                    if (price < 0.01) return price.toFixed(6);
                    if (price < 1) return price.toFixed(4);
                    return price.toFixed(2);
                  })()}
                </span>
                <span style={{
                  color: 'var(--footer-hover-color)',
                  fontSize: '1.2rem',
                  fontWeight: '600',
                  opacity: 0.9
                }}>USDT</span>
                {currentTickerMath.priceChangePercent && (
                  <span style={{
                    color: Number(currentTickerMath.priceChangePercent) > 0 ? '#4caf50' : '#f44336',
                    fontSize: '1rem',
                    fontWeight: '700',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    background: Number(currentTickerMath.priceChangePercent) > 0 
                      ? 'rgba(76, 175, 80, 0.2)' 
                      : 'rgba(244, 67, 54, 0.2)',
                    border: `1px solid ${Number(currentTickerMath.priceChangePercent) > 0 ? '#4caf50' : '#f44336'}`,
                    textShadow: Number(currentTickerMath.priceChangePercent) > 0 
                      ? '0 0 8px rgba(76, 175, 80, 0.5)' 
                      : '0 0 8px rgba(244, 67, 54, 0.5)'
                  }}>
                    {Number(currentTickerMath.priceChangePercent) > 0 ? '+' : ''}
                    {Number(currentTickerMath.priceChangePercent).toFixed(2)}%
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      <div style={{
        position: 'relative',
        background: '#ffffff',
        borderRadius: '12px',
        padding: '0',
        marginTop: '10px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
        border: '1px solid rgba(0, 0, 0, 0.1)',
        overflow: 'hidden'
      }}>
        {/* Декоративний фон з патерном */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: `
            radial-gradient(circle at 20% 30%, rgba(100, 181, 246, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 80% 70%, rgba(129, 212, 250, 0.1) 0%, transparent 50%),
            linear-gradient(135deg, transparent 0%, rgba(211, 47, 47, 0.05) 50%, transparent 100%)
          `,
          pointerEvents: 'none',
          zIndex: 0
        }}></div>
        
        {/* Сніжинки на фоні */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: 'none',
          zIndex: 0,
          opacity: 0.3
        }}>
          {Array.from({ length: 15 }, (_, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                fontSize: `${8 + Math.random() * 12}px`,
                color: 'var(--section-text-color)',
                animation: `float-snow ${10 + Math.random() * 10}s ease-in-out infinite`,
                animationDelay: `${Math.random() * 5}s`,
              }}
            >
              ❄
            </div>
          ))}
        </div>
        
        <div style={{ position: 'relative', zIndex: 1, padding: '0 20px', margin: '0 10px' }}>
          <div 
            ref={chartContainerRef}
            style={{ 
              width: '100%', 
              height: '350px',
              position: 'relative'
            }}
          />
        </div>
      </div>
      {currentTickerMath.price && currentTicker.ticker && (
          <TockenCard token={{ ...currentTicker, ...currentTickerMath }} />
      )}
      <div style={{ marginTop: '20px', marginBottom: '20px', display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '8px', padding: '0 10px' }}>
        {['1M', '5M', '30M', '1H', '1D'].map((interval) => {
          const intervalLower = interval.toLowerCase();
          const isActive = time === intervalLower;
          return (
            <button
              key={interval}
              onClick={() => handleIntervalChange(intervalLower)}
              style={{
                padding: '10px 20px',
                cursor: 'pointer',
                background: isActive 
                  ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                  : 'rgba(102, 126, 234, 0.1)',
                color: isActive ? '#ffffff' : 'var(--text-color)',
                border: isActive ? '1px solid #667eea' : '1px solid rgba(102, 126, 234, 0.3)',
                borderRadius: '8px',
                transition: 'all 0.2s ease',
                fontWeight: isActive ? '700' : '500',
                fontSize: '13px',
                boxShadow: isActive 
                  ? '0 4px 12px rgba(102, 126, 234, 0.4)' 
                  : '0 2px 4px rgba(0, 0, 0, 0.1)',
                minWidth: '50px',
                textAlign: 'center',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'rgba(102, 126, 234, 0.2)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 8px rgba(102, 126, 234, 0.3)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'rgba(102, 126, 234, 0.1)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
                }
              }}
            >
              {interval}
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '20px', gap: '15px' }}>
        <button
          onClick={() => handleBuyClick('buy')}
          style={buy}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-3px) scale(1.05)';
            e.currentTarget.style.boxShadow = '0 8px 25px rgba(76, 175, 80, 0.6), 0 0 25px rgba(76, 175, 80, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0) scale(1)';
            e.currentTarget.style.boxShadow = '0 4px 15px rgba(76, 175, 80, 0.4), 0 2px 6px rgba(0, 0, 0, 0.2)';
          }}
        >
          Купить
        </button>
        <button
          onClick={() => handleBuyClick('sell')}
          style={sell}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-3px) scale(1.05)';
            e.currentTarget.style.boxShadow = '0 8px 25px rgba(244, 67, 54, 0.6), 0 0 25px rgba(244, 67, 54, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0) scale(1)';
            e.currentTarget.style.boxShadow = '0 4px 15px rgba(244, 67, 54, 0.4), 0 2px 6px rgba(0, 0, 0, 0.2)';
          }}
        >
          Продать
        </button>
      </div>

      <Drawer anchor="bottom" open={drawerOpen} onClose={toggleDrawer(false)} style={{width: '100%', boxSizing: 'border-box' }}>
        <div
          role="presentation"
          style={{ width: '100%', boxSizing:'border-box', height: '400px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', backgroundColor: 'var(--section-background-color)', color: 'var(--text-color)', paddingBottom: '10px'}}
        >
         
          <div style={{padding: '10px'}}>
          <h2>{t('youAreBuying')} <span style={{color: 'var(--section-heading-color)', fontWeight: 600}}>{ticker}</span></h2>
          <TextField
            id="outlined-suffix-shrink"
            label={t('quantity')}
            variant="standard"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            color="primary"
            sx={{
              maxWidth: '200px',
              '& .MuiInputBase-root': {
                color: 'var(--text-color)',
              },
              '& .MuiInputLabel-root': {
                color: 'var(--text-color)',
              },
              '& .MuiOutlinedInput-root': {
                '& fieldset': {
                  borderColor: 'var(--text-color)',
                },
                '&:hover fieldset': {
                  borderColor: 'var(--text-color)',
                },
                '&.Mui-focused fieldset': {
                  borderColor: 'var(--text-color)',
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
                    <p style={{color: 'var(--section-text-color)'}}>USDT</p>
                  </InputAdornment>
                ),
              },
            }}
          />
          <p style={{color: 'var(--text-color)'}}>{t('available')}: {parseFloat(user?.usdt_amount || 0).toFixed(2)} USDT</p>
          <FormControl sx={{minWidth: 120}} required>
          <ButtonGroup
          sx={{display: 'flex', justifyContent: 'space-around', gap: '5px', flexWrap: 'wrap'}}
          labelId="demo-simple-select-label">
            {['20s','30s', '1m', '5m', '15m', '30m', '1h'].map((time) => (
              <Button
                key={time}
                value={time}
                onClick={() => handeTimeChange(time)}
                sx={{
                  backgroundColor: timeToFinish === time 
                    ? 'linear-gradient(135deg, #64b5f6 0%, #90caf9 100%)' 
                    : 'linear-gradient(135deg, rgba(100, 181, 246, 0.2) 0%, rgba(129, 212, 250, 0.2) 100%)',
                  background: timeToFinish === time 
                    ? 'linear-gradient(135deg, #64b5f6 0%, #90caf9 100%)' 
                    : 'linear-gradient(135deg, rgba(100, 181, 246, 0.2) 0%, rgba(129, 212, 250, 0.2) 100%)',
                  color: timeToFinish === time ? (document.body.classList.contains('light-theme') ? '#0a1929' : '#0a1929') : 'var(--text-color)',
                  border: timeToFinish === time ? '2px solid #90caf9' : '2px solid #64b5f6',
                  borderRadius: '10px',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  fontWeight: '700',
                  padding: '8px 16px',
                  boxShadow: timeToFinish === time 
                    ? '0 6px 20px rgba(100, 181, 246, 0.5), 0 0 15px rgba(100, 181, 246, 0.3)' 
                    : '0 4px 12px rgba(100, 181, 246, 0.2)',
                  '&:hover': {
                    transform: 'translateY(-2px) scale(1.05)',
                    boxShadow: '0 8px 25px rgba(100, 181, 246, 0.5)',
                    background: timeToFinish === time 
                      ? 'linear-gradient(135deg, #64b5f6 0%, #90caf9 100%)' 
                      : 'linear-gradient(135deg, rgba(100, 181, 246, 0.4) 0%, rgba(129, 212, 250, 0.4) 100%)',
                  }
                }}
              >
                {time}
              </Button>
            ))}
          </ButtonGroup>
          </FormControl>

          </div>

          <button style={{...(trade === 'buy' ? buy : sell), marginTop: '5px', width: '100vw'}} onClick={startTrade}>
            {trade === 'buy' ? 'Купить': 'Продать'}
          </button>

        </div>
      </Drawer>

      <div style={{display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '10px'}}>
        {trades.sort((a,b) => b.id - a.id).slice(0,5).map((trade) => (
          <div style={{padding: '4px',border: trade.isActive ? '1px solid var(--active-link-color)' : 'inherit', borderWidth: '1px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', borderRadius: '10px', backgroundColor: 'var(--section-background-color)'}}>
            <div style={{display: 'flex', flexDirection: 'column'}}>
            <Typography.Text style={{color: 'var(--text-color)'}}>{parseFloat(trade.amount || 0).toFixed(2)} USDT</Typography.Text>
            <Typography.Text style={{color: trade.trade_type === 'buy' ? 'var(--win-color)' : 'var(--loss-color)'}}>{trade.trade_type === 'buy' ? t('purchase') : t('sale')}</Typography.Text>
            </div>
            <div style={{display: 'flex', flexDirection: 'column'}}>
              <Typography.Text style={{color: trade.isWin ? 'var(--win-color)' : trade.isWin !== null ? 'var(--loss-color)' : 'var(--text-color)' }}>{trade.isWin ? '+' : trade.isWin !== null ? '-' : ''}{(parseFloat(trade.amount || 0) * 0.75).toFixed(2)} USDT</Typography.Text>
              <Typography.Text style={{color: 'var(--section-text-color)'}}>{ new Date(trade.created_at).toLocaleString('en-GB', {
              day: '2-digit',
              month: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            })}</Typography.Text>  
            
            </div>
          </div>
        ))}
      </div>
      {/* Відступ внизу замість блоку правил */}
      <div style={{marginTop: '50px', paddingBottom: '20px'}}></div>
    </div>
  );
};

export default CandlestickChart;

const fetchCandlestickData = async (ticker, interval = '1m') => {
  const response = await fetch(
    `https://api.binance.com/api/v3/klines?symbol=${ticker.toUpperCase()}USDT&interval=${interval}&limit=500`
  );
  const data = await response.json();

  return data.map((d) => ({
    x: new Date(d[0]),
    y: [parseFloat(d[1]), parseFloat(d[2]), parseFloat(d[3]), parseFloat(d[4])],
  }));
};

// Функції для розрахунку індикаторів
const calculateSMA = (data, period) => {
  const result = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push({ time: data[i].time });
    } else {
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += data[i - j].close;
      }
      result.push({ time: data[i].time, value: sum / period });
    }
  }
  return result;
};

const calculateEMA = (data, period) => {
  const result = [];
  const multiplier = 2 / (period + 1);
  let ema = null;

  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      ema = data[i].close;
    } else {
      ema = (data[i].close - ema) * multiplier + ema;
    }
    if (i < period - 1) {
      result.push({ time: data[i].time });
    } else {
      result.push({ time: data[i].time, value: ema });
    }
  }
  return result;
};

const calculateRSI = (data, period = 14) => {
  const result = [];
  let gains = [];
  let losses = [];

  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      result.push({ time: data[i].time });
      continue;
    }

    const change = data[i].close - data[i - 1].close;
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? Math.abs(change) : 0);

    if (i < period) {
      result.push({ time: data[i].time });
    } else {
      const avgGain = gains.slice(-period).reduce((a, b) => a + b, 0) / period;
      const avgLoss = losses.slice(-period).reduce((a, b) => a + b, 0) / period;
      
      if (avgLoss === 0) {
        result.push({ time: data[i].time, value: 100 });
      } else {
        const rs = avgGain / avgLoss;
        const rsi = 100 - (100 / (1 + rs));
        result.push({ time: data[i].time, value: rsi });
      }
    }
  }
  return result;
};

const calculateMACD = (data, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) => {
  const fastEMA = calculateEMA(data, fastPeriod);
  const slowEMA = calculateEMA(data, slowPeriod);
  
  const macdLine = [];
  for (let i = 0; i < data.length; i++) {
    if (fastEMA[i].value && slowEMA[i].value) {
      macdLine.push({
        time: data[i].time,
        value: fastEMA[i].value - slowEMA[i].value
      });
    } else {
      macdLine.push({ time: data[i].time });
    }
  }

  const signalLine = calculateEMA(macdLine.filter(d => d.value !== undefined).map(d => ({ close: d.value, time: d.time })), signalPeriod);
  const histogram = [];
  
  for (let i = 0; i < macdLine.length; i++) {
    const macdValue = macdLine[i].value;
    const signalValue = signalLine[i]?.value;
    
    if (macdValue !== undefined && signalValue !== undefined) {
      histogram.push({
        time: data[i].time,
        value: macdValue - signalValue,
        color: (macdValue - signalValue) >= 0 ? '#4caf50' : '#f44336',
      });
    } else {
      histogram.push({ time: data[i].time });
    }
  }

  return { macdLine, signalLine, histogram };
};
