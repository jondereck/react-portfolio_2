import React from "react";

const About = () => {
  return (
    <div
      name="about"
      className="h-screen w-full my-auto sm:mt-20"
    >
      <div
        className="mx-auto max-w-screen-lg p-4 flex flex-col justify-center
      w-full h-full "
      >
        <div>
          <p className="text-4xl font-bold inline border-b-4 border-gray-500">
            About Me
          </p>
        </div>
        <p className="text-xl mt-20 ">
          I have a strong foundation in front-end technologies and frameworks,
          including HTML5, CSS3, and JavaScript. I leverage the power of these
          languages to build intuitive and responsive user interfaces that
          deliver seamless interactions. 
          results.
        </p>
        <br />
        <p className="text-xl">
        Additionally, I am proficient in using
          modern CSS frameworks like Tailwind CSS to expedite the development
          process and ensure consistent and visually appealing designs. Beyond
          front-end development, I also possess knowledge and skills in data
          analytics. I can effectively analyze and interpret data to derive
          meaningful insights that drive informed decision-making. This unique
          combination of technical expertise allows me to create data-driven
          applications that not only look great but also deliver valuable
        </p>
        
      </div>
    </div>
  );
};

export default About;
