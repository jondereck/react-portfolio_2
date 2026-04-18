import React, { useEffect, useState } from 'react';

const HideOnScroll = ({ children, className = '' }) => {
  const [isScrolling, setIsScrolling] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      setIsScrolling(scrollTop > 0);
    };

    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    handleResize();
    handleScroll();
    window.addEventListener("scroll", handleScroll);
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div className={`${className} transition-opacity duration-500 ${isScrolling && isMobile ? 'pointer-events-none opacity-0' : 'opacity-100'}`}>
      {children}
    </div>
  );
};

export default HideOnScroll;
