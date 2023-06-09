import React from "react";
import htmlImage from "../assets/html.png"; // eslint-disable-next-line
import css from '../assets/css.png'
import github from "../assets/github.png";
import javascript from "../assets/javascript.png";
import react from "../assets/react.png";
import tailwind from "../assets/tailwind.png";

const Experience = () => {
// ...
  const exp = [
    {
      id: 1,
      src: htmlImage,
      title: 'HTML',
      style: 'shadow-orange-500'
    },
    {
      id: 2,
      src: css,
      title: 'CSS',
      style: 'shadow-blue-500'
    },
    {
      
      id: 4,
      src: javascript,
      title: 'JavaScript',
      style: 'shadow-yellow-500'
    },
    {
      id: 3,
      src: github,
      title: 'Github',
      style: 'shadow-gray-400'
      
    },
    {
      id: 5,
      src: react,
      title: 'React',
      style: 'shadow-blue-500'
    },
    {
      id: 6,
      src: tailwind,
      title: 'Tailwind',
      style: 'shadow-sky-500'
    },
  ]
  return (
    <div
      name="experience"
      className="h-screen w-full bg-gradient-to-b from-gray-800 to-black"
    >
      <div
        className="max-w-screen-lg mx-auto p-4 flex flex-col 
      justify-center w-full h-full  text-white"
      >
        <div>
          <p className="text-4xl font-bold inline border-b-4 border-gray-500">
            Experience
          </p>
          <p className="py-8">These are the technologies I've worked with</p>
        </div>
        <div className="w-full grid grid-cols-2 lg:grid-cols-3 gap-8 text-center
        py-8 px-12 sm:px-0">  
         {exp.map(({id, src, title, style})=> ( 
         <div 
         key={id} 
         className={`shadow-md hover:scale-110 duration-500 py-2 rounded-lg ${style}`}>
            <img src={src} alt=""  className="mx-auto w-20"/>
            <p className="mt-4">{title}</p>
          </div>
          
        ))}
         
        </div>
      </div>
    </div>
  );
};

export default Experience;
