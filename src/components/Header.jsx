import React, { useState, useEffect } from 'react';
import { useI18n } from '../i18n/I18nContext';
import { supabase } from '../supabase';

const Header = () => {
  const { t } = useI18n();
  const [user, setUser] = useState(null);
  const [balance, setBalance] = useState(0);
  const [showBalance, setShowBalance] = useState(true);

  useEffect(() => {
    const loadUser = () => {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          setUser(userData);
          // Calculate total balance in USD
          const usdtAmount = parseFloat(userData.usdt_amount || 0);
          const rubAmount = parseFloat(userData.rub_amount || 0) / 79; // Approximate RUB to USD conversion
          setBalance(usdtAmount + rubAmount);
        } catch (error) {
          console.error('Error parsing user data:', error);
        }
      }
    };

    loadUser();

    // Listen for storage changes (when user data is updated)
    const handleStorageChange = () => {
      loadUser();
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Also check periodically for updates
    const interval = setInterval(loadUser, 2000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  // Get first letter of username or chat_id for avatar
  const getInitial = () => {
    if (user?.username) {
      return user.username.charAt(0).toUpperCase();
    }
    if (user?.first_name) {
      return user.first_name.charAt(0).toUpperCase();
    }
    if (user?.chat_id) {
      return String(user.chat_id).charAt(0);
    }
    return 'U';
  };

  const getDisplayName = () => {
    if (user?.username) {
      return user.username;
    }
    if (user?.first_name) {
      return user.first_name;
    }
    return 'User';
  };

  return (
    <header className="app-header">
      {/* User profile pill */}
      <div className="header-profile-pill">
        <div className="header-profile-avatar">
          {getInitial()}
        </div>
        <span className="header-profile-name">{getDisplayName()}</span>
      </div>
    </header>
  );
};

export default Header;

