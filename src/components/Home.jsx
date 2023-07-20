import React from "react";
import { AiOutlineArrowRight } from "react-icons/ai";
import heroImage from "../assets/heroImage.jpg";
import { Link } from "react-scroll";

const Home = () => {
  return (
    <div
      name="home"
      className="h-screen w-full
    "
    >
      <div
        className="max-w-screen-lg mx-auto flex flex-col
      items-center justify-center h-full px-4 md:flex-row"
      >
        
        <div className="flex flex-col justify-center items-center 
       md:mt-20 h-full md:py-auto">
          <div className=" text-4xl  md:text-5xl lg:text-7xl font-bold pt-10  ">
          <h2 className="pt-8">
          I'm a Front-End Developer
          </h2>
          </div>
          <p className="text-gray-500 py-4 max-w-md">
            Hello! I'm Jon Dereck Nifas, a Front End Developer specializing in
            HTML, CSS, JavaScript, Tailwind, and React. I also have knowledge in data
            analytics. I am passionate about crafting exceptional user
            experiences and delivering seamless web applications.
          </p>
          <div>
            <Link
              to="portfolio"
              smooth
              duration={500}
              className="group flex  text-white w-fit px-6 py-3 my-2 
            item-center rounded-md bg-gradient-to-r
             from-cyan-500 to to-blue-500 cursor-pointer "
            >
              Porfolio
              <span className="group-hover:rotate-90 duration-300 ">
                <AiOutlineArrowRight size={20} className="ml-1 my-1" />
              </span>
            </Link>
          </div>
        </div>
        <div>
          <img
            src={heroImage}
            alt="my profile"
            className="
            rounded-2xl mx-auto  w-3/4 md:w-2/3 hover:shadow-lg"
          />
        </div>
      </div>
    </div>
  );
};

export default Home;
