// ВАРІАНТИ ДИЗАЙНУ ІКОНКИ MAXIMIZE
// Скопіюйте потрібний варіант в Header.jsx

// ============================================
// ВАРІАНТ 1: Шестикутна форма (поточний)
// ============================================
/*
<svg width="20" height="20" viewBox="0 0 24 24" fill="none">
  <path d="M12 2L18 5.5V10.5L18 13.5L12 17L6 13.5V10.5L6 5.5L12 2Z" 
        fill="currentColor" 
        opacity="0.1"/>
  <path d="M12 2L18 5.5V10.5L18 13.5L12 17L6 13.5V10.5L6 5.5L12 2Z" 
        stroke="currentColor" 
        strokeWidth="1.5"/>
  <path d="M12 6L14 8L12 10L10 8L12 6Z" 
        stroke="currentColor" 
        strokeWidth="1.5" 
        fill="none"/>
  <path d="M12 9L13 10L12 11L11 10L12 9Z" 
        stroke="currentColor" 
        strokeWidth="1.5" 
        fill="none"/>
</svg>
*/

// CSS:
/*
.header-icon-button {
  clip-path: polygon(30% 0%, 70% 0%, 100% 50%, 70% 100%, 30% 100%, 0% 50%);
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}
*/

// ============================================
// ВАРІАНТ 2: Кругла кнопка з градієнтом
// ============================================
/*
<svg width="20" height="20" viewBox="0 0 24 24" fill="none">
  <circle cx="12" cy="12" r="10" 
          stroke="currentColor" 
          strokeWidth="2"/>
  <path d="M8 8H16V16" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round"/>
</svg>
*/

// CSS:
/*
.header-icon-button {
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
}
.header-icon-button:hover {
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.5);
}
*/

// ============================================
// ВАРІАНТ 3: Квадрат з закругленими кутами
// ============================================
/*
<svg width="20" height="20" viewBox="0 0 24 24" fill="none">
  <rect x="4" y="4" width="16" height="16" rx="3" 
        stroke="currentColor" 
        strokeWidth="2"/>
  <path d="M8 8L16 16M16 8L8 16" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round"/>
</svg>
*/

// CSS:
/*
.header-icon-button {
  border-radius: 12px;
  background: rgba(102, 126, 234, 0.1);
  border: 2px solid #667eea;
  color: #667eea;
}
.header-icon-button:hover {
  background: rgba(102, 126, 234, 0.2);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}
*/

// ============================================
// ВАРІАНТ 4: Діамант (ромб)
// ============================================
/*
<svg width="20" height="20" viewBox="0 0 24 24" fill="none">
  <path d="M12 2L22 12L12 22L2 12L12 2Z" 
        stroke="currentColor" 
        strokeWidth="2" 
        fill="none"/>
  <path d="M12 6L16 10L12 14L8 10L12 6Z" 
        stroke="currentColor" 
        strokeWidth="1.5" 
        fill="none"/>
</svg>
*/

// CSS:
/*
.header-icon-button {
  clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  transform: rotate(45deg);
}
.header-icon-button svg {
  transform: rotate(-45deg);
}
*/

// ============================================
// ВАРІАНТ 5: Зірка
// ============================================
/*
<svg width="20" height="20" viewBox="0 0 24 24" fill="none">
  <path d="M12 2L14.5 8.5L21 10L14.5 11.5L12 18L9.5 11.5L3 10L9.5 8.5L12 2Z" 
        stroke="currentColor" 
        strokeWidth="2" 
        fill="none"/>
  <circle cx="12" cy="10" r="2" 
          fill="currentColor" 
          opacity="0.3"/>
</svg>
*/

// CSS:
/*
.header-icon-button {
  border-radius: 50%;
  background: radial-gradient(circle, #667eea 0%, #764ba2 100%);
  color: white;
  box-shadow: 0 0 20px rgba(102, 126, 234, 0.4);
}
.header-icon-button:hover {
  animation: pulse-star 1s ease-in-out infinite;
}
@keyframes pulse-star {
  0%, 100% { transform: scale(1); box-shadow: 0 0 20px rgba(102, 126, 234, 0.4); }
  50% { transform: scale(1.1); box-shadow: 0 0 30px rgba(102, 126, 234, 0.6); }
}
*/

// ============================================
// ВАРІАНТ 6: Октагон (восьмикутник)
// ============================================
/*
<svg width="20" height="20" viewBox="0 0 24 24" fill="none">
  <path d="M8 2L16 2L22 8L22 16L16 22L8 22L2 16L2 8L8 2Z" 
        stroke="currentColor" 
        strokeWidth="2" 
        fill="none"/>
  <rect x="8" y="8" width="8" height="8" rx="1" 
        stroke="currentColor" 
        strokeWidth="1.5" 
        fill="none"/>
</svg>
*/

// CSS:
/*
.header-icon-button {
  clip-path: polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%);
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}
*/

// ============================================
// ВАРІАНТ 7: Мінімалістична стрілка
// ============================================
/*
<svg width="20" height="20" viewBox="0 0 24 24" fill="none">
  <path d="M5 5H19V19H5V5Z" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round"/>
  <path d="M8 8H16V16" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round"/>
</svg>
*/

// CSS:
/*
.header-icon-button {
  border-radius: 8px;
  background: transparent;
  border: 2px solid currentColor;
  color: #667eea;
}
.header-icon-button:hover {
  background: #667eea;
  color: white;
  transform: rotate(90deg);
  transition: all 0.3s ease;
}
*/

// ============================================
// ВАРІАНТ 8: З неоновим ефектом
// ============================================
/*
<svg width="20" height="20" viewBox="0 0 24 24" fill="none">
  <path d="M8 3H5C3.89543 3 3 3.89543 3 5V8M21 8V5C21 3.89543 20.1046 3 19 3H16M16 21H19C20.1046 21 21 20.1046 21 19V16M3 16V19C3 20.1046 3.89543 21 5 21H8" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"/>
</svg>
*/

// CSS:
/*
.header-icon-button {
  border-radius: 8px;
  background: rgba(100, 181, 246, 0.1);
  border: 1px solid rgba(100, 181, 246, 0.5);
  color: #64b5f6;
  box-shadow: 0 0 10px rgba(100, 181, 246, 0.3);
}
.header-icon-button:hover {
  box-shadow: 0 0 20px rgba(100, 181, 246, 0.6);
  border-color: rgba(100, 181, 246, 0.8);
  background: rgba(100, 181, 246, 0.2);
}
*/

// ============================================
// ВАРІАНТ 9: З тінню та глибиною
// ============================================
/*
<svg width="20" height="20" viewBox="0 0 24 24" fill="none">
  <rect x="6" y="6" width="12" height="12" rx="2" 
        stroke="currentColor" 
        strokeWidth="2" 
        fill="none"/>
</svg>
*/

// CSS:
/*
.header-icon-button {
  border-radius: 12px;
  background: linear-gradient(145deg, #ffffff 0%, #f0f0f0 100%);
  color: #667eea;
  box-shadow: 4px 4px 8px rgba(0, 0, 0, 0.1),
              -4px -4px 8px rgba(255, 255, 255, 0.8);
}
.header-icon-button:hover {
  box-shadow: 2px 2px 4px rgba(0, 0, 0, 0.1),
              -2px -2px 4px rgba(255, 255, 255, 0.8);
  transform: translateY(1px);
}
body:not(.light-theme) .header-icon-button {
  background: linear-gradient(145deg, #2a2f45 0%, #1e2338 100%);
  box-shadow: 4px 4px 8px rgba(0, 0, 0, 0.3),
              -4px -4px 8px rgba(100, 181, 246, 0.1);
}
*/

// ============================================
// ВАРІАНТ 10: Прозора з обводкою
// ============================================
/*
<svg width="20" height="20" viewBox="0 0 24 24" fill="none">
  <rect x="4" y="4" width="16" height="16" rx="2" 
        stroke="currentColor" 
        strokeWidth="2" 
        fill="none"/>
  <path d="M8 8H16V16" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round"/>
</svg>
*/

// CSS:
/*
.header-icon-button {
  border-radius: 10px;
  background: rgba(102, 126, 234, 0.05);
  border: 2px solid rgba(102, 126, 234, 0.3);
  color: #667eea;
  backdrop-filter: blur(10px);
}
.header-icon-button:hover {
  background: rgba(102, 126, 234, 0.15);
  border-color: rgba(102, 126, 234, 0.5);
  transform: scale(1.05);
}
*/

