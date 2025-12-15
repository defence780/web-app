import React from 'react';
import './ChristmasTree.css';

const ChristmasTree = ({ position = 'bottom-left', size = 'medium' }) => {
  return (
    <div className={`christmas-tree-container tree-${position} tree-${size}`}>
      <div className="christmas-tree">
        {/* Зірка на верхівці */}
        <div className="tree-star">
          <div className="star-shine"></div>
          ⭐
        </div>
        
        {/* Гілки ялинки з снігом */}
        <div className="tree-branch branch-1">
          <div className="branch-snow snow-1"></div>
          <div className="branch-snow snow-2"></div>
        </div>
        <div className="tree-branch branch-2">
          <div className="branch-snow snow-3"></div>
          <div className="branch-snow snow-4"></div>
        </div>
        <div className="tree-branch branch-3">
          <div className="branch-snow snow-5"></div>
          <div className="branch-snow snow-6"></div>
        </div>
        
        {/* Гірлянда */}
        <div className="tree-garland garland-1"></div>
        <div className="tree-garland garland-2"></div>
        
        {/* Червоні прикраси */}
        <div className="tree-ornament ornament-1 red">
          <div className="ornament-hook"></div>
          <div className="ornament-shine"></div>
        </div>
        <div className="tree-ornament ornament-2 red">
          <div className="ornament-hook"></div>
          <div className="ornament-shine"></div>
        </div>
        <div className="tree-ornament ornament-3 red">
          <div className="ornament-hook"></div>
          <div className="ornament-shine"></div>
        </div>
        <div className="tree-ornament ornament-4 red">
          <div className="ornament-hook"></div>
          <div className="ornament-shine"></div>
        </div>
        <div className="tree-ornament ornament-5 red">
          <div className="ornament-hook"></div>
          <div className="ornament-shine"></div>
        </div>
        <div className="tree-ornament ornament-6 red">
          <div className="ornament-hook"></div>
          <div className="ornament-shine"></div>
        </div>
        
        {/* Сині прикраси */}
        <div className="tree-ornament ornament-7 blue">
          <div className="ornament-hook"></div>
          <div className="ornament-shine"></div>
        </div>
        <div className="tree-ornament ornament-8 blue">
          <div className="ornament-hook"></div>
          <div className="ornament-shine"></div>
        </div>
        <div className="tree-ornament ornament-9 blue">
          <div className="ornament-hook"></div>
          <div className="ornament-shine"></div>
        </div>
        
        {/* Золоті прикраси */}
        <div className="tree-ornament ornament-10 gold">
          <div className="ornament-hook"></div>
          <div className="ornament-shine"></div>
        </div>
        <div className="tree-ornament ornament-11 gold">
          <div className="ornament-hook"></div>
          <div className="ornament-shine"></div>
        </div>
        
        {/* Ствол */}
        <div className="tree-trunk">
          <div className="trunk-bark"></div>
        </div>
        
        {/* Подарунки */}
        <div className="tree-gift gift-1"></div>
        <div className="tree-gift gift-2"></div>
        <div className="tree-gift gift-3"></div>
      </div>
    </div>
  );
};

export default ChristmasTree;

