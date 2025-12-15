import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { useI18n } from '../i18n/I18nContext';

const TransactionHistory = () => {
  const { t } = useI18n();
  const [withdraws, setWithdraws] = useState([]);
  const [deposits, setDeposits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'withdraws', 'deposits'
  const user = JSON.parse(localStorage.getItem('user'));

  useEffect(() => {
    if (user?.chat_id) {
      fetchHistory();
    }
  }, [user?.chat_id]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      // Завантажуємо виводи
      const { data: withdrawsData, error: withdrawsError } = await supabase
        .from('withdraws')
        .select('*')
        .eq('chat_id', user.chat_id)
        .order('created_at', { ascending: false });

      if (!withdrawsError && withdrawsData) {
        setWithdraws(withdrawsData);
      }

      // Завантажуємо депозити з таблиці invoices
      const { data: depositsData, error: depositsError } = await supabase
        .from('invoices')
        .select('*')
        .eq('chat_id', user.chat_id)
        .order('created_at', { ascending: false });

      if (!depositsError && depositsData) {
        setDeposits(depositsData);
      }
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatAmount = (amount, currency = 'RUB') => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount)) return '0.00';
    return numAmount.toFixed(2);
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'success':
      case 'approved':
        return '#4caf50';
      case 'pending':
      case 'processing':
        return '#ff9800';
      case 'rejected':
      case 'failed':
      case 'cancelled':
        return '#f44336';
      default:
        return '#90caf9';
    }
  };

  const getStatusText = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'success':
      case 'approved':
        return t('completed');
      case 'pending':
      case 'processing':
        return t('processing');
      case 'rejected':
      case 'failed':
      case 'cancelled':
        return t('rejected');
      default:
        return status || t('processing');
    }
  };

  const allTransactions = [
    ...withdraws.map(w => ({ ...w, type: 'withdraw' })),
    ...deposits.map(d => ({ ...d, type: 'deposit' }))
  ].sort((a, b) => {
    const dateA = new Date(a.created_at || 0);
    const dateB = new Date(b.created_at || 0);
    return dateB - dateA;
  });

  const filteredTransactions = activeTab === 'all' 
    ? allTransactions 
    : activeTab === 'withdraws' 
    ? withdraws.map(w => ({ ...w, type: 'withdraw' }))
    : deposits.map(d => ({ ...d, type: 'deposit' }));

  const getTransactionIcon = (type) => {
    switch (type) {
      case 'withdraw':
        return '📤';
      case 'deposit':
        return '📥';
      default:
        return '💳';
    }
  };

  const getTransactionTitle = (type) => {
    switch (type) {
      case 'withdraw':
        return t('withdraw');
      case 'deposit':
        return t('deposit');
      default:
        return t('transaction');
    }
  };

  if (loading) {
    return (
      <div className="section" style={{ textAlign: 'center', padding: '40px' }}>
        <div style={{
          display: 'inline-block',
          width: 40,
          height: 40,
          border: '3px solid rgba(100, 181, 246, 0.3)',
          borderTop: '3px solid #64b5f6',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <p style={{ marginTop: '20px', color: 'var(--section-text-color)' }}>{t('loadingHistory')}</p>
      </div>
    );
  }

  return (
    <div className="section">
      <h2 style={{ marginBottom: '20px', color: 'var(--section-heading-color)' }}>{t('transactionHistory')}</h2>
      
      {/* Вкладки */}
      <div style={{
        display: 'flex',
        gap: '10px',
        marginBottom: '20px',
        flexWrap: 'wrap'
      }}>
        {[
          { key: 'all', label: t('all'), count: allTransactions.length },
          { key: 'withdraws', label: t('withdraws'), count: withdraws.length },
          { key: 'deposits', label: t('deposits'), count: deposits.length }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: activeTab === tab.key ? '2px solid #90caf9' : '2px solid #64b5f6',
              background: activeTab === tab.key
                ? 'linear-gradient(135deg, #64b5f6 0%, #90caf9 100%)'
                : 'linear-gradient(135deg, rgba(100, 181, 246, 0.2) 0%, rgba(129, 212, 250, 0.2) 100%)',
              color: activeTab === tab.key ? (document.body.classList.contains('light-theme') ? '#0a1929' : '#0a1929') : 'var(--text-color)',
              fontWeight: '700',
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: activeTab === tab.key
                ? '0 4px 12px rgba(100, 181, 246, 0.4)'
                : '0 2px 8px rgba(100, 181, 246, 0.2)',
            }}
            onMouseEnter={(e) => {
              if (activeTab !== tab.key) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(100, 181, 246, 0.3)';
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== tab.key) {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(100, 181, 246, 0.2)';
              }
            }}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Список транзакцій */}
      {filteredTransactions.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '40px',
          color: 'var(--footer-hover-color)',
          fontSize: '16px'
        }}>
          <p>{t('transactionHistoryEmpty')}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredTransactions.map((transaction, index) => (
            <div
              key={transaction.id || index}
              style={{
                background: 'var(--section-background-color)',
                padding: '16px 20px',
                borderRadius: '12px',
                border: '2px solid rgba(100, 181, 246, 0.3)',
                boxShadow: '0 4px 12px rgba(100, 181, 246, 0.2)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
                overflow: 'hidden'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(100, 181, 246, 0.3)';
                e.currentTarget.style.borderColor = 'rgba(144, 202, 249, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(100, 181, 246, 0.2)';
                e.currentTarget.style.borderColor = 'rgba(100, 181, 246, 0.3)';
              }}
            >
              {/* Декоративний фон */}
              <div style={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: '100px',
                height: '100px',
                background: transaction.type === 'withdraw'
                  ? 'radial-gradient(circle, rgba(244, 67, 54, 0.1) 0%, transparent 70%)'
                  : 'radial-gradient(circle, rgba(76, 175, 80, 0.1) 0%, transparent 70%)',
                pointerEvents: 'none'
              }}></div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flex: 1 }}>
                  <div style={{
                    fontSize: '28px',
                    width: '50px',
                    height: '50px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: transaction.type === 'withdraw'
                      ? 'linear-gradient(135deg, rgba(244, 67, 54, 0.2) 0%, rgba(211, 47, 47, 0.2) 100%)'
                      : 'linear-gradient(135deg, rgba(76, 175, 80, 0.2) 0%, rgba(56, 142, 60, 0.2) 100%)',
                    borderRadius: '12px',
                    border: `2px solid ${transaction.type === 'withdraw' ? 'rgba(244, 67, 54, 0.4)' : 'rgba(76, 175, 80, 0.4)'}`
                  }}>
                    {getTransactionIcon(transaction.type)}
                  </div>
                  
                  <div style={{ flex: 1 }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      marginBottom: '4px'
                    }}>
                      <h3 style={{
                        margin: 0,
                        fontSize: '16px',
                        fontWeight: '700',
                        color: 'var(--text-color)'
                      }}>
                        {getTransactionTitle(transaction.type)}
                      </h3>
                      {transaction.status && (
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '600',
                          background: `${getStatusColor(transaction.status)}20`,
                          color: getStatusColor(transaction.status),
                          border: `1px solid ${getStatusColor(transaction.status)}`
                        }}>
                          {getStatusText(transaction.status)}
                        </span>
                      )}
                    </div>
                    
                    <div style={{
                      fontSize: '14px',
                      color: 'var(--footer-hover-color)',
                      marginBottom: '4px'
                    }}>
                      {formatDate(transaction.created_at)}
                    </div>
                    
                    {transaction.type === 'withdraw' && transaction.card_number && (
                      <div style={{
                        fontSize: '12px',
                        color: 'var(--section-heading-color)',
                        opacity: 0.8
                      }}>
                        {t('card')}: ****{transaction.card_number.slice(-4)}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{
                  textAlign: 'right',
                  minWidth: '120px'
                }}>
                  <div style={{
                    fontSize: '18px',
                    fontWeight: '700',
                    color: transaction.type === 'withdraw' ? '#f44336' : '#4caf50',
                    marginBottom: '4px'
                  }}>
                    {transaction.type === 'withdraw' ? '-' : '+'}
                    {formatAmount(transaction.amount, transaction.currency || 'RUB')}
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: 'var(--footer-hover-color)',
                    opacity: 0.8
                  }}>
                    {transaction.currency || 'RUB'}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TransactionHistory;

