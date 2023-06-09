import React from "react";
import { AiOutlineArrowRight } from "react-icons/ai";
import heroImage from "../assets/heroImage.jpg";
import {Link} from 'react-scroll'

const Home = () => {

  return (
    <div
      name="home"
      className="h-screen w-full bg-gradient-to-b from-black via-black
     to-gray-800 
    "
    >
      <div
        className="max-w-screen-lg mx-auto flex flex-col
      items-center justify-center h-full px-4 md:flex-row"
      >
        <div className="flex flex-col justify-center h-full">
          <h2 className="text-white text-4xl sm:text-7xl font-bold ">
            I'm a Front end Developer
          </h2>
          <p className="text-gray-500 py-4 max-w-md">
            I'm a Frontend Developer with 3 years of experience. Lorem ipsum
            dolor sit amet consectetur adipisicing elit. Excepturi, voluptas
            laborum suscipit iusto libero consequuntur facere corrupti cum ut,
            laboriosam maxime beatae provident doloremque ea qui autem. Rerum,
            nemo amet!
          </p>
          <div>
            <Link to="portfolio" smooth duration={500}
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
