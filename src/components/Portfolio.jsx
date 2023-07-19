import React from "react";
import Blog from "../assets/portfolio/Blog.jpg"
import RestApi from "../assets/portfolio/RestApi.jpg"
import Stay from "../assets/portfolio/Stay.jpg"

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
      src: RestApi,
      demo:'https://github.com/jondereck/blog_api',
      code: 'https://github.com/jondereck/blog_api'
    },
    {
      id: 2,
      src: Blog,
      demo:'https://jdnblog.netlify.app/',
      code: 'https://github.com/jondereck/blog_client'
    },

    {
      id: 3,
      src: Stay,
      demo:'https://stayc.netlify.app/',
      code: 'https://github.com/jondereck/stay'
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
