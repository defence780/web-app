import React from 'react';
import './Garland.css';
import { getWinterThemeEnabled } from '../utils';

const Garland = () => {
  if (!getWinterThemeEnabled()) {
    return null;
  }

  return (
    <div className="garland-container">
      <div className="garland-line">
        {Array.from({ length: 20 }, (_, i) => (
          <div
            key={i}
            className={`garland-bulb bulb-${i % 4}`}
            style={{
              animationDelay: `${i * 0.2}s`,
            }}
          >
            <div className="bulb-inner"></div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Garland;

