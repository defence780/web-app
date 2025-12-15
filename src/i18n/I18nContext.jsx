import React, { createContext, useContext, useState, useEffect } from 'react';
import ruTranslations from './ru.js';
import enTranslations from './en.js';
import kzTranslations from './kz.js';

const I18nContext = createContext();

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return context;
};

const translations = {
  ru: ruTranslations,
  en: enTranslations,
  kz: kzTranslations,
};

export const I18nProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    // Проверяем сохраненный язык
    const savedLanguage = localStorage.getItem('language');
    if (savedLanguage && translations[savedLanguage]) {
      return savedLanguage;
    }
    // По умолчанию русский язык
    return 'ru';
  });

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  const t = (key, params = {}) => {
    let translation = translations[language]?.[key] || key;
    
    // Заменяем параметры в переводе (поддерживаем оба формата: {param} и {{param}})
    Object.keys(params).forEach(paramKey => {
      translation = translation.replace(new RegExp(`\\{\\{${paramKey}\\}\\}`, 'g'), params[paramKey]);
      translation = translation.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), params[paramKey]);
    });
    
    return translation;
  };

  const changeLanguage = (lang) => {
    if (translations[lang]) {
      setLanguage(lang);
    }
  };

  return (
    <I18nContext.Provider value={{ t, language, changeLanguage }}>
      {children}
    </I18nContext.Provider>
  );
};
