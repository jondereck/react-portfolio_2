import React, { useEffect, useRef, useState } from 'react';

const HideOnScroll = ({ children, className = '', showDelay = 5000 }) => {
  const [isHidden, setIsHidden] = useState(false);
  const showTimerRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsHidden(true);
      window.clearTimeout(showTimerRef.current);
      showTimerRef.current = window.setTimeout(() => {
        setIsHidden(false);
      }, showDelay);
    };

    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.clearTimeout(showTimerRef.current);
    };
  }, [showDelay]);

  return (
    <div className={`${className} transition-opacity duration-500 ${isHidden ? 'pointer-events-none opacity-0' : 'opacity-100'}`}>
      {children}
    </div>
  );
};

export default HideOnScroll;
