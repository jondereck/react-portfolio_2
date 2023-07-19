import React from "react";

const About = () => {
  return (
    <div
      name="about"
      className="md:h-screen w-full mt-10 "
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
          Hello! I'm an enthusiastic entry-level web developer eager to grow my skills and contribute to meaningful projects. I've been focusing on front-end development, where I've gained a solid foundation in HTML5, CSS3, and JavaScript, which are essential for building user interfaces and interactive web applications.
        </p>
        <br />
       <p className="text-xl">
        In my learning journey, I've also explored various modern CSS frameworks like Tailwind CSS, understanding their importance in creating visually appealing and responsive designs efficiently. I'm continuously working to improve my proficiency in these technologies to ensure I can deliver seamless and engaging user experiences.
      <br/>
        </p>
        <br />
       <p className="text-xl">
Recently, I've been excited to dive into the world of MERN (MongoDB, Express.js, React, and Node.js) and Next.js, as well as integrating Prisma and TypeScript into my projects. Although I'm still learning, these technologies offer exciting opportunities to build full-stack applications and enhance performance and scalability.
        </p> 
        <br />
        <p className="text-xl">
        Through my exploration of data analytics, I've realized its significance in making informed decisions, and I'm eager to further develop this skill to create data-driven applications that provide valuable insights.
 
        </p>
        <br />
        <p className="text-xl">
While I may be at the entry level, my passion for web development and dedication to learning new technologies drive me to continuously improve and take on new challenges. I'm eager to collaborate with experienced developers and contribute my skills to projects that make a positive impact.
        </p>
        <br />
        <p className="text-xl">

If you have any opportunities or projects that align with my skillset, I'd love to discuss how I can be a valuable asset to your team. Thank you for considering me!
        </p>
        <br />
      </div>
    </div>
  );
};

export default About;
