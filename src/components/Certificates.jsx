import React, { useState } from "react";
import { Dialog } from "@headlessui/react";
import one from "../assets/certificates/1.png";
import two from "../assets/certificates/2.png";
import three from "../assets/certificates/3.png";
import four from "../assets/certificates/4.png";
import fours from "../assets/certificates/4.5.png";
import five from "../assets/certificates/5.png";
import six from "../assets/certificates/6.png";
import seven from "../assets/certificates/7.png";
import eight from "../assets/certificates/8.png";


const Portfolio = () => {

  const [showLigthBox, setShowLightBox] = useState(false);
  const [selectedImages, setSelectedImages] = useState(null);
  
 
  const handleDemoClick = (demo) => {
    window.open(demo,'_blank')
  }


  const portfolios = [
    {
      id: 1,
      src: one,
      demo:'https://www.freecodecamp.org/certification/jdnifas/responsive-web-design',
    },
    {
      id: 2,
      src: two,
      demo:'https://www.freecodecamp.org/certification/jdnifas/javascript-algorithms-and-data-structures',
    },

    {
      id: 3,
      src: three,
      demo:'https://www.freecodecamp.org/certification/jdnifas/front-end-development-libraries',
    },
    
    {
      id: 4,
      src: four,
      demo:'https://www.freecodecamp.org/certification/jdnifas/back-end-development-and-apis',
    },
    
    {
      id: 5,
      src: fours,
      demo:'https://www.freecodecamp.org/certification/jdnifas/data-visualization',
    },
    {
      id: 6,
      src: five,
      demo:'https://www.coursera.org/account/accomplishments/verify/YP5V8RVBBHZUhttps://jdnp.netlify.app/',
    },
    {
      id: 7,
      src: six,
      demo:'https://www.coursera.org/account/accomplishments/verify/8ETC5KSTLHQL',
    },
    {
      id: 8,
      src: seven,
      demo:'https://www.coursera.org/account/accomplishments/verify/GJV9Y8XAPTMQ',
    },
    {
      id: 9,
      src: eight,
      demo:'https://www.credly.com/badges/a06939ef-9056-4613-88b0-8cfe498f94cf/public_url',
    },
    
  ];

  const  openLightBox = (src) => {
    setSelectedImages(src);
    setShowLightBox(true)
  }

  const closeLightBox = () => {
    setSelectedImages(null);
    setShowLightBox(false);
  }
  return (
    <div
      name="certificates"
      // bg-gradient-to-b from-black to-gray-800
      className="
       w-full md:h-screen"
    >
      <div className="max-w-screen-lg p-4 mx-auto flex flex-col justify-center w-full h-full">
        <div className="pb-8">
          <p className="text-4xl font-bold inline border-b-4 border-gray-500 capitalize">
            certificates
          </p>
          <p className="py-6">Here are my certification and achievements</p>
        </div>

        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 px:8 sm:px-0">
          {portfolios.map(({ id, src,demo, code }) => (
            <div key={id} className="shadow-md shadow-gray-600 rounded-lg">
              <img
                src={src}
                alt=""
                className="rounded-md hover:scale-105 duration-200"
                onClick={() => openLightBox(src)}
              />
              <div className="flex item-center justify-center ">
                <button onClick={() => handleDemoClick(demo)} className="w-1/2 px-6 py-3 m-2 duration-200 hover:scale-105">
                  Verify
                </button>
                
              </div>
            </div>
          ))} 

          <Dialog 
            open={showLigthBox}
            onClose={closeLightBox}
            className="fixed inset-0 z-10"
            >
            <Dialog.Overlay className="
              lightbox-overlay
              fixed
              inset-0
             
              opacity-80
            "/>
            <img
              src={selectedImages}
              alt=""
              className="lightbox-img max-w-full max-h-full mx-auto"
              
            />
          </Dialog>
        
        </div>
      </div>
    </div>
  );
};

export default Portfolio;
