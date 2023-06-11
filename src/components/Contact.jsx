import React from "react";

const Contact = () => {
  return (
    <div name="contact" className="h-full w-full  p-4
  ">
      <div className="flex flex-col p-4 justify-center max-w-screen-lg mx-auto h-full">
        <div className="pb-8">
          <p className="text-4xl font-bold inline border-b-4 border-gray-500">Contact</p>
          <p className="py-6">Submit the form below to get in touch with me.</p>
        </div>
        <div className="flex justify-center items-center">
          <form action="https://getform.io/f/a646050b-6861-4df4-8b0d-c61f41b7205d"
                className="flex flex-col w-full md:w-1/2"
                method="POST">
            <input
              className="p-2 bg-transparent border-2 rounded-md text-white focus:outline-none"
              type="text"
              name="name"
              placeholder=" Enter your name"
            />
            <input
              className=" my-4 p-2 bg-transparent border-2 rounded-md text-white focus:outline-none"
              type="text"
              name="email"
              placeholder=" Enter your email"
            />
            <textarea
              name="message"
              rows="10"
              placeholder="Enter your message"
              className=" p-2 bg-transparent border-2 rounded-md focus:outline-none"
            ></textarea>

            <button className="text-white bg-gradient-to-b  from-cyan-500 to to-blue-500
            px-6 my-8 py-3 mx-auto flex items-center rounded-md  hover:scale-110 duration-300">
                Let's Talk
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Contact;
