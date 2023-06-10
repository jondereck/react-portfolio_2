import React, { useState } from "react";
import { FaBars, FaTimes } from "react-icons/fa";
import { MdNightsStay, MdWbSunny} from 'react-icons/md'
import { Link } from "react-scroll";

const NavBar = ({darkMode, setDarkMode}) => {
  const [nav, setNav] = useState(false);
  const links = [
    {
      id: 1,
      name: "home",
    },
    {
      id: 2,
      name: "about",
    },
    {
      id: 3,
      name: "portfolio",
    },
    {
      id: 4,
      name: "experience",
    },
    {
      id: 5,
      name: "contact",
    },
  ];

  return (
    <div
      className="flex justify-between items-center w-full h-20
   px-4 text-black dark:text-white bg-white dark:duration-500 duration-500 dark:bg-black fixed"
    >
      <div>
        <h1 className="text-5xl font-signature ml-2">Jon</h1>
      </div>
      <ul className="hidden md:flex">
        {links.map(({ id, name }) => (
          <li
            key={id}
            className="px-4 cursor-pointer capitalize font-medium
        text-gray-800 dark:text-gray-400 hover:scale-105 duration-200"
          >
            <Link to={name} smooth duration={800}>
             {name}
            </Link>
          </li>
        ))}
      </ul>
      <div className="flex items-center">
      <div onClick={() => setDarkMode(!darkMode)}
      className="cursor-pointer pr-4 ">
       {darkMode 
       ? <MdWbSunny size={30} className="text-2xl cursor-pointer"/> 
       :  <MdNightsStay size={30} className="cursor-pointer"/>}
        
      </div>
 
      <div
        onClick={() => setNav(!nav)}
        className="cursor-pointer pr-4 z-10 text-gray-400 md:hidden"
      >
        {nav ? <FaTimes size={30} /> : <FaBars size={30} />}
      </div>
      </div>

      {nav && (
        <ul
          className="flex flex-col justify-center items-center
        absolute top-0 left-0 w-full h-screen bg-gradient-to-b from-black to-gray-800"
        >
          {links.map(({ id, name }) => (
            <li
              key={id}
              className="px-4 cursor-pointer capitalize py-6 text-4xl"
            >
            <Link onClick={() => setNav(false)} to={name} smooth duration={500}>
             {name}
            </Link>
            </li>
          ))}
        </ul>
      )}

      
    </div>
  );
};

export default NavBar;
