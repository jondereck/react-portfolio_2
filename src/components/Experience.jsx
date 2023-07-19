import React from "react";
import htmlImage from "../assets/html.png"; // eslint-disable-next-line
import css from '../assets/css.png'
import github from "../assets/github.png";
import javascript from "../assets/javascript.png";
import react from "../assets/react.png";
import tailwind from "../assets/tailwind.png";
import nextjs from "../assets/nextjs.png";
import prisma from "../assets/prisma.png";
import typescipt from "../assets/typescript.png";
// import mongodb from "../assets/mongodb.png";

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
      style: 'shadow-slate-500'
      
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
    {
      id: 7,
      src: typescipt,
      title: 'Typecript',
      style: 'shadow-sky-600'
    },
    {
      id: 8,
      src: prisma,
      title: 'Prisma',
      style: 'shadow-teal-500'
    },
    {
      id: 9,
      src: nextjs,
      title: 'Next.js',
      style: 'shadow-slate-500'
      
    },
    // {
    //   id: 10,
    //   src: mongodb,
    //   title: 'MongoDB',
    //   style: 'shadow-slate-600'
      
    // },
  ]
  return (
    <div
      name="experience"
      className="h-screen w-full "
    >
      <div
        className="max-w-screen-lg mx-auto p-4 flex flex-col 
      justify-center w-full h-full "
      >
        <div>
          <p className="text-4xl font-bold inline border-b-4 border-gray-500">
            Experience
          </p>
          <p className="py-8">These are the technologies I've worked with</p>
        </div>
        <div className="w-full grid grid-cols-2 lg:grid-cols-4 gap-8 text-center
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
