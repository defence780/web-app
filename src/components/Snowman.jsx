import React from 'react';
import './Snowman.css';

const Snowman = ({ position = 'bottom-right' }) => {
  return (
    <div className={`snowman-container snowman-${position}`}>
      <div className="snowman">
        {/* Капелюх */}
        <div className="snowman-hat">
          <div className="hat-top"></div>
          <div className="hat-brim"></div>
          <div className="hat-band"></div>
        </div>
        
        {/* Голова */}
        <div className="snowman-head">
          <div className="snowman-eye left-eye">
            <div className="eye-pupil"></div>
          </div>
          <div className="snowman-eye right-eye">
            <div className="eye-pupil"></div>
          </div>
          <div className="snowman-nose">
            <div className="nose-shine"></div>
          </div>
          <div className="snowman-mouth">
            <div className="mouth-piece piece-1"></div>
            <div className="mouth-piece piece-2"></div>
            <div className="mouth-piece piece-3"></div>
            <div className="mouth-piece piece-4"></div>
            <div className="mouth-piece piece-5"></div>
          </div>
          <div className="snowman-cheek cheek-left"></div>
          <div className="snowman-cheek cheek-right"></div>
        </div>
        
        {/* Шарф */}
        <div className="snowman-scarf">
          <div className="scarf-end end-left"></div>
          <div className="scarf-end end-right"></div>
        </div>
        
        {/* Тіло */}
        <div className="snowman-body">
          <div className="snowman-button button1">
            <div className="button-shine"></div>
          </div>
          <div className="snowman-button button2">
            <div className="button-shine"></div>
          </div>
          <div className="snowman-button button3">
            <div className="button-shine"></div>
          </div>
        </div>
        
        {/* Основа */}
        <div className="snowman-base"></div>
        
        {/* Руки */}
        <div className="snowman-arm arm-left">
          <div className="arm-branch"></div>
        </div>
        <div className="snowman-arm arm-right">
          <div className="arm-branch"></div>
        </div>
        
        {/* Сніг навколо */}
        <div className="snowman-snow snow-1"></div>
        <div className="snowman-snow snow-2"></div>
        <div className="snowman-snow snow-3"></div>
        <div className="snowman-snow snow-4"></div>
      </div>
    </div>
  );
};

export default Snowman;

