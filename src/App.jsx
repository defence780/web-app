import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Route, Routes, NavLink } from 'react-router-dom';
import Actives from './Actives';
import Trade from './Trade';
import './App.css';
import CandlestickChart from './TickerTrade';
import { useLocation } from 'react-router-dom';
import Deposit from './Deposit';
import { supabase } from './supabase';
import Exchange from './Exchange';
import Withdraw from './Withdraw';
import Staking from './Staking';
import Reviews from './Reviews';
import BinaryOptions from './BinaryOptions';
import Snowflakes from './components/Snowflakes';
import WinterDecorations from './components/WinterDecorations';
import Garland from './components/Garland';
import { ThemeProvider, useTheme } from './ThemeContext';
import { I18nProvider, useI18n } from './i18n/I18nContext';


const SettingsMenu = () => {
  const { isDark, toggleTheme } = useTheme();
  const { language, changeLanguage, t } = useI18n();
  const [isOpen, setIsOpen] = React.useState(false);
  const menuRef = React.useRef(null);

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const languages = [
    { code: 'ru', label: 'RU', name: t('russian') },
    { code: 'en', label: 'EN', name: t('english') },
    { code: 'kz', label: 'KZ', name: t('kazakh') }
  ];

  const currentLanguage = languages.find(lang => lang.code === language) || languages[0];
  
  return (
    <div ref={menuRef} style={{ position: 'fixed', top: '30px', right: '20px', zIndex: 1000 }}>
    <button
        onClick={() => setIsOpen(!isOpen)}
      style={{
        width: '50px',
        height: '50px',
          clipPath: 'polygon(30% 0%, 70% 0%, 100% 50%, 70% 100%, 30% 100%, 0% 50%)',
          border: '2px solid var(--active-link-color)',
          background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.3) 0%, rgba(118, 75, 162, 0.3) 100%)',
          color: 'var(--text-color)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '20px',
          fontWeight: 'bold',
          boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
          transition: 'all 0.3s ease',
          position: 'relative',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.1)';
          e.currentTarget.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.5)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)';
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L16 6L20 10L20 14L16 18L12 22L8 18L4 14L4 10L8 6L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" fill="none"/>
          <path d="M12 8L14 10L16 12L16 14L14 16L12 18L10 16L8 14L8 12L10 10L12 8Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" fill="none"/>
        </svg>
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '60px',
            right: '0',
            background: 'var(--section-background-color)',
            border: '2px solid var(--active-link-color)',
            borderRadius: '12px',
            padding: '12px',
            boxShadow: '0 8px 24px rgba(102, 126, 234, 0.4)',
            minWidth: '200px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
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
                    setIsOpen(false);
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
    </div>
  );
};

const Footer = () => {
  const location = useLocation();
  const { t } = useI18n();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const menuRef = React.useRef(null);

  // Закрываем меню при клике вне его
  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  const menuItems = [
    {
      path: '/actives',
      label: t('assets'),
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path stroke="currentColor" strokeWidth="2" d="M14 10.5C14 11.8807 11.7614 13 9 13C6.23858 13 4 11.8807 4 10.5M14 10.5C14 9.11929 11.7614 8 9 8C6.23858 8 4 9.11929 4 10.5M14 10.5V14.5M4 10.5V14.5M20 5.5C20 4.11929 17.7614 3 15 3C13.0209 3 11.3104 3.57493 10.5 4.40897M20 5.5C20 6.42535 18.9945 7.23328 17.5 7.66554M20 5.5V14C20 14.7403 18.9945 15.3866 17.5 15.7324M20 10C20 10.7567 18.9495 11.4152 17.3999 11.755M14 14.5C14 15.8807 11.7614 17 9 17C6.23858 17 4 15.8807 4 14.5M14 14.5V18.5C14 19.8807 11.7614 21 9 21C6.23858 21 4 19.8807 4 18.5V14.5" />
        </svg>
      )
    },
    {
      path: '/trade',
      label: t('trading'),
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" stroke="currentColor">
          <path d="M3 14.6C3 14.0399 3 13.7599 3.10899 13.546C3.20487 13.3578 3.35785 13.2049 3.54601 13.109C3.75992 13 4.03995 13 4.6 13H5.4C5.96005 13 6.24008 13 6.45399 13.109C6.64215 13.2049 6.79513 13.3578 6.89101 13.546C7 13.7599 7 14.0399 7 14.6V19.4C7 19.9601 7 20.2401 6.89101 20.454C6.79513 20.6422 6.64215 20.7951 6.45399 20.891C6.24008 21 5.96005 21 5.4 21H4.6C4.03995 21 3.75992 21 3.54601 20.891C3.35785 20.7951 3.20487 20.6422 3.10899 20.454C3 20.2401 3 19.9601 3 19.4V14.6Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M10 4.6C10 4.03995 10 3.75992 10.109 3.54601C10.2049 3.35785 10.3578 3.20487 10.546 3.10899C10.7599 3 11.0399 3 11.6 3H12.4C12.9601 3 13.2401 3 13.454 3.10899C13.6422 3.20487 13.7951 3.35785 13.891 3.54601C14 3.75992 14 4.03995 14 4.6V19.4C14 19.9601 14 20.2401 13.891 20.454C13.7951 20.6422 13.6422 20.7951 13.454 20.891C13.2401 21 12.9601 21 12.4 21H11.6C11.0399 21 10.7599 21 10.546 20.891C10.3578 20.7951 10.2049 20.6422 10.109 20.454C10 20.2401 10 19.9601 10 19.4V4.6Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M17 10.6C17 10.0399 17 9.75992 17.109 9.54601C17.2049 9.35785 17.3578 9.20487 17.546 9.10899C17.7599 9 18.0399 9 18.6 9H19.4C19.9601 9 20.2401 9 20.454 9.10899C20.6422 9.20487 20.7951 9.35785 20.891 9.54601C21 9.75992 21 10.0399 21 10.6V19.4C21 19.9601 21 20.2401 20.891 20.454C20.7951 20.6422 20.6422 20.7951 20.454 20.891C20.2401 21 19.9601 21 19.4 21H18.6C18.0399 21 17.7599 21 17.546 20.891C17.3578 20.7951 17.2049 20.6422 17.109 20.454C17 20.2401 17 19.9601 17 19.4V10.6Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )
    },
    {
      path: '/staking',
      label: t('staking'),
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )
    },
    {
      path: '/binary-options',
      label: t('binaryOptions'),
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )
    }
  ];

  const currentPath = location.pathname;
  const currentItem = menuItems.find(item => item.path === currentPath) || menuItems[0];

  return (
    <footer className="footer" ref={menuRef}>
      <button 
        className="footer-menu-button"
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        aria-label={t('openMenu')}
      >
        <div className="footer-menu-button-content">
          {currentItem.icon}
          <span>{currentItem.label}</span>
          <svg 
            width="16" 
            height="16" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2"
            className={`footer-menu-arrow ${isMenuOpen ? 'open' : ''}`}
          >
            <path d="M6 9L12 15L18 9" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </button>
      
      {isMenuOpen && (
        <div className="footer-menu-dropdown">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            if (item.inDevelopment) {
              return (
                <div
                  key={item.path}
                  className="footer-menu-item footer-menu-item-disabled"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                >
                  {item.icon}
                  <span>{item.label}</span>
                  <span className="footer-menu-badge">{t('inDevelopment')}</span>
                </div>
              );
            }
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`footer-menu-item ${isActive ? 'active-link' : ''}`}
                onClick={() => setIsMenuOpen(false)}
              >
                {item.icon}
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      )}
    </footer>
  )
}

const App = () => {
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'));
    if(user) {
      const fetchUser = async () => {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('chat_id', user.chat_id)
            .single();

        if (error) {
            console.error('Error fetching user:', error);
        } else {
            console.log('User data:', data);
        }
        if (data) {
            localStorage.setItem('user', JSON.stringify(data));
        }
    };

    if (user.chat_id) {
        fetchUser();  
    }
  }
  }, [])
  return (
    <I18nProvider>
    <ThemeProvider>
      <Router>
        <div className="container">
            <SettingsMenu />
          <Garland />
          <Snowflakes />
          <WinterDecorations />
          <Routes>
            <Route path="/actives" element={<Actives />} />
            <Route path="/trade" element={<Trade />} />
            <Route path="/" element={<Actives />} />
            <Route path="/trade/:ticker" element={<CandlestickChart />} />
            <Route path="/deposit" element={<Deposit />} />
            <Route path="/exchange" element={<Exchange />} />
            <Route path="/withdraw" element={<Withdraw />} />
            <Route path="/staking" element={<Staking />} />
            <Route path="/reviews" element={<Reviews />} />
            <Route path="/binary-options" element={<BinaryOptions />} />
          </Routes>
          <Footer />
        </div>
      </Router>
    </ThemeProvider>
    </I18nProvider>
  )
}

export default App;
