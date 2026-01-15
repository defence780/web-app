// ПРИКЛАДИ РІЗНИХ ВАРІАНТІВ ДИЗАЙНУ HEADER
// Скопіюйте код потрібного варіанту в Header.jsx

// ============================================
// ВАРІАНТ 1: Мінімалістичний з балансом
// ============================================
/*
  return (
    <header className="app-header header-variant-1">
      <button className="header-icon-button" onClick={handleFullscreen}>
        <svg>...</svg>
      </button>
      
      <div className="header-center-group">
        <div className="header-profile-pill">
          <div className="header-profile-avatar">{getInitial()}</div>
          <span className="header-profile-name">{getDisplayName()}</span>
        </div>
        {showBalance && (
          <div className="header-balance">
            ${balance.toFixed(2)}
          </div>
        )}
      </div>
    </header>
  );
*/

// CSS для варіанту 1:
/*
.header-variant-1 {
  padding: 10px 24px;
}

.header-center-group {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-balance {
  font-weight: 600;
  font-size: 16px;
  color: #667eea;
  padding: 6px 14px;
  background: rgba(102, 126, 234, 0.1);
  border-radius: 12px;
}
*/

// ============================================
// ВАРІАНТ 2: Градієнтний фон
// ============================================
/*
  return (
    <header className="app-header header-variant-2">
      <button className="header-icon-button header-icon-glow" onClick={handleFullscreen}>
        <svg>...</svg>
      </button>
      
      <div className="header-profile-pill header-profile-glow">
        <div className="header-profile-avatar">{getInitial()}</div>
        <span className="header-profile-name">{getDisplayName()}</span>
      </div>
    </header>
  );
*/

// CSS для варіанту 2:
/*
.header-variant-2 {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-bottom: none;
  box-shadow: 0 4px 20px rgba(102, 126, 234, 0.3);
}

.header-variant-2 .header-icon-button {
  color: white;
  background: rgba(255, 255, 255, 0.1);
}

.header-variant-2 .header-icon-button:hover {
  background: rgba(255, 255, 255, 0.2);
}

.header-profile-glow {
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.header-profile-glow:hover {
  background: rgba(255, 255, 255, 0.3);
}
*/

// ============================================
// ВАРІАНТ 3: З акцентом на профіль
// ============================================
/*
  return (
    <header className="app-header header-variant-3">
      <button className="header-icon-button" onClick={handleFullscreen}>
        <svg>...</svg>
      </button>
      
      <div className="header-profile-large">
        <div className="header-profile-avatar-large">{getInitial()}</div>
        <div className="header-profile-info">
          <span className="header-profile-name-large">{getDisplayName()}</span>
          {showBalance && (
            <span className="header-balance-small">${balance.toFixed(2)}</span>
          )}
        </div>
      </div>
    </header>
  );
*/

// CSS для варіанту 3:
/*
.header-variant-3 {
  padding: 16px 24px;
}

.header-profile-large {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 16px;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 24px;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.header-profile-avatar-large {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 18px;
}

.header-profile-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.header-profile-name-large {
  font-weight: 600;
  font-size: 16px;
}

.header-balance-small {
  font-size: 12px;
  color: #667eea;
  font-weight: 500;
}
*/

// ============================================
// ВАРІАНТ 4: Темна тема з неоновим ефектом
// ============================================
/*
  return (
    <header className="app-header header-variant-4">
      <button className="header-icon-button header-neon" onClick={handleFullscreen}>
        <svg>...</svg>
      </button>
      
      <div className="header-profile-pill header-neon-pill">
        <div className="header-profile-avatar">{getInitial()}</div>
        <span className="header-profile-name">{getDisplayName()}</span>
      </div>
    </header>
  );
*/

// CSS для варіанту 4:
/*
.header-variant-4 {
  background: rgba(15, 23, 42, 0.98);
  border-bottom: 1px solid rgba(100, 181, 246, 0.3);
  box-shadow: 0 0 20px rgba(100, 181, 246, 0.1);
}

.header-neon {
  color: #64b5f6;
  border: 1px solid rgba(100, 181, 246, 0.3);
  box-shadow: 0 0 10px rgba(100, 181, 246, 0.2);
}

.header-neon:hover {
  box-shadow: 0 0 20px rgba(100, 181, 246, 0.5);
  border-color: rgba(100, 181, 246, 0.6);
}

.header-neon-pill {
  background: rgba(100, 181, 246, 0.1);
  border: 1px solid rgba(100, 181, 246, 0.3);
  box-shadow: 0 0 15px rgba(100, 181, 246, 0.2);
}

.header-neon-pill:hover {
  box-shadow: 0 0 25px rgba(100, 181, 246, 0.4);
  background: rgba(100, 181, 246, 0.15);
}
*/

// ============================================
// ВАРІАНТ 5: З додатковими кнопками
// ============================================
/*
  return (
    <header className="app-header header-variant-5">
      <div className="header-left-group">
        <button className="header-icon-button" onClick={handleFullscreen}>
          <svg>...</svg>
        </button>
        <button className="header-icon-button" aria-label="Settings">
          <svg>...</svg>
        </button>
      </div>
      
      <div className="header-profile-pill">
        <div className="header-profile-avatar">{getInitial()}</div>
        <span className="header-profile-name">{getDisplayName()}</span>
      </div>
      
      <div className="header-right-group">
        {showBalance && (
          <div className="header-balance-badge">
            ${balance.toFixed(2)}
          </div>
        )}
        <button className="header-icon-button" aria-label="Notifications">
          <svg>...</svg>
        </button>
      </div>
    </header>
  );
*/

// CSS для варіанту 5:
/*
.header-variant-5 {
  padding: 12px 24px;
}

.header-left-group,
.header-right-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-balance-badge {
  padding: 6px 12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 12px;
  font-weight: 600;
  font-size: 14px;
  margin-right: 8px;
}
*/

// ============================================
// ВАРІАНТ 6: Компактний з іконками
// ============================================
/*
  return (
    <header className="app-header header-variant-6">
      <button className="header-icon-button header-icon-compact" onClick={handleFullscreen}>
        <svg>...</svg>
      </button>
      
      <div className="header-profile-compact">
        <div className="header-profile-avatar-compact">{getInitial()}</div>
        <div className="header-profile-text-compact">
          <span className="header-profile-name-compact">{getDisplayName()}</span>
          {showBalance && (
            <span className="header-balance-compact">${balance.toFixed(2)}</span>
          )}
        </div>
      </div>
    </header>
  );
*/

// CSS для варіанту 6:
/*
.header-variant-6 {
  padding: 8px 16px;
  height: 48px;
}

.header-icon-compact {
  width: 32px;
  height: 32px;
}

.header-profile-compact {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 10px;
}

.header-profile-avatar-compact {
  width: 24px;
  height: 24px;
  font-size: 12px;
}

.header-profile-text-compact {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.header-profile-name-compact {
  font-size: 13px;
  font-weight: 500;
}

.header-balance-compact {
  font-size: 11px;
  color: #667eea;
}
*/

