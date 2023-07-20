import React, { useState, useEffect } from "react";

const HideOnScroll = ({ children }) => {
  const [isScrolling, setIsScrolling] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      setIsScrolling(scrollTop > 0);
    };

    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <div
      className={`transition-opacity duration-500 ${
        isScrolling && window.innerWidth <= 768 ? "opacity-0" : "opacity-100"
      }`}
    >
      {children}
    </div>
  );
};

export default HideOnScroll;
