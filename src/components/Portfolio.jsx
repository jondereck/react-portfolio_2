import React from "react";
import arrayDestruct from "../assets/portfolio/arrayDestruct.jpg";
import installNode from "../assets/portfolio/installNode.jpg";
import navbar from "../assets/portfolio/navbar.jpg";
import reactParallax from "../assets/portfolio/reactParallax.jpg";
import reactSmooth from "../assets/portfolio/reactSmooth.jpg";
import reactWeather from "../assets/portfolio/reactWeather.jpg";

const Portfolio = () => {

  const handleDemoClick = (demo) => {
    window.open(demo,'_blank')
  }

  const handleCodeClick = (code) => {
    window.open(code, '_blank')
  }

  const portfolios = [
    {
      id: 1,
      src: arrayDestruct,
      demo:'https://react-icons.github.io/react-icons/search?q=linked',
      code: 'https://react-icons.github.io/react-icons/search?q=linked'
    },
    {
      id: 2,
      src: installNode,
      demo:'https://react-icons.github.io/react-icons/search?q=linked',
      code: 'https://react-icons.github.io/react-icons/search?q=linked'
    },

    {
      id: 3,
      src: navbar,
      demo:'https://react-icons.github.io/react-icons/search?q=linked',
      code: 'https://react-icons.github.io/react-icons/search?q=linked'
    },
    {
      id: 4,
      src: reactParallax,
      demo:'https://react-icons.github.io/react-icons/search?q=linked',
      code: 'https://react-icons.github.io/react-icons/search?q=linked'
    },

    {
      id: 5,
      src: reactSmooth,
      demo:'https://react-icons.github.io/react-icons/search?q=linked',
      code: 'https://react-icons.github.io/react-icons/search?q=linked'
    },

    {
      id: 6,
      src: reactWeather,
      demo:'https://react-icons.github.io/react-icons/search?q=linked',
      code: 'https://react-icons.github.io/react-icons/search?q=linked'
    },
  ];
  return (
    <div
      name="portfolio"
      // bg-gradient-to-b from-black to-gray-800
      className="
       w-full md:h-screen"
    >
      <div className="max-w-screen-lg p-4 mx-auto flex flex-col justify-center w-full h-full">
        <div className="pb-8">
          <p className="text-4xl font-bold inline border-b-4 border-gray-500 capitalize">
            portfolio
          </p>
          <p className="py-6">Check out some of my work right here</p>
        </div>

        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 px:8 sm:px-0">
          {portfolios.map(({ id, src,demo, code }) => (
            <div key={id} className="shadow-md shadow-gray-600 rounded-lg">
              <img
                src={src}
                alt=""
                className="rounded-md hover:scale-105 duration-200"
              />
              <div className="flex item-center justify-center ">
                <button onClick={() => handleDemoClick(demo)} className="w-1/2 px-6 py-3 m-4 duration-200 hover:scale-105">
                  Demo
                </button>
                <button onClick={() => handleCodeClick(code)} className="w-1/2 px-6 py-3 m-4 duration-200 hover:scale-105">
                  Code
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Portfolio;
