import React from "react";

const About = () => {
  return (
    <div
      name="about"
      className="h-screen w-full bg-gradient-to-b from-gray-800
    to bg-black text-white"
    >
      <div
        className="mx-auto max-w-screen-lg p-4 flex flex-col justify-center
      w-full h-full "
      >
        <div>
          <p className="text-4xl font-bold inline border-b-4 border-gray-500">
            About
          </p>
        </div>
        <p className="text-xl mt-20 ">
          Lorem ipsum dolor sit, amet consectetur adipisicing elit. Beatae, ea
          tempora animi perferendis aliquam ratione ut, odit pariatur facilis
          eum maxime tenetur expedita suscipit? Ex quae nostrum aliquam
          similique inventore.
        </p>
        <br />
        <p className="text-xl">
          Lorem ipsum dolor sit amet consectetur adipisicing elit. Provident,
          voluptates temporibus. Neque facere dolorum quibusdam beatae eum
          numquam quasi veniam, vel natus aspernatur magni architecto at error
          cum a tempore!
        </p>
      </div>
    </div>
  );
};

export default About;
