import React from "react";
import { useState } from "react";

const Contact = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
    errors: {} // Add the errors property to the initial state
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleTextArea = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const validateForm = () => {
    const { name, email, message } = formData;

    const nameRegex = /^[a-zA-Z\s]{3,}$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const errors = {};

    if (!name || name.trim() === "") {
      errors.name = "Please enter a name.";
    } else if (!name.match(nameRegex)) {
      errors.name = "Name must be at least 3 characters long.";
    }

    if (!email || email.trim() === "") {
      errors.email = "Please enter an email address.";
    } else if (!email.match(emailRegex)) {
      errors.email = "Please enter a valid email.";
    }

    if (!message || message.trim() === "") {
      errors.message = "Please enter a message.";
    } else if (message.length < 10) {
      errors.message = "Message must be at least 10 characters"
    }

    return errors;
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();

    const errors = validateForm();

    // Check if there are any errors
    if (Object.keys(errors).length === 0) {
      // Form submission logic
      // ...
      // If the form is valid, proceed with form submission or further processing
    } else {
      // Handle errors

      setFormData((prevData) => ({
        ...prevData,
        errors: { ...errors },
      }));
    }
  };
  return (
    <div
      name="contact"
      className="h-full w-full  p-4
  "
    >
      <div className="flex flex-col p-4 justify-center max-w-screen-lg mx-auto h-full">
        <div className="pb-8">
          <p className="text-4xl font-bold inline border-b-4 border-gray-500">
            Contact
          </p>
          <p className="py-6">Submit the form below to get in touch with me.</p>
        </div>
        <div className="flex justify-center items-center">
          <form
            action="https://getform.io/f/a646050b-6861-4df4-8b0d-c61f41b7205d"
            className="flex flex-col w-full md:w-1/2"
            method="POST"
            onSubmit={handleFormSubmit}
          >
            <input
              className="p-2 bg-transparent border-2 rounded-md focus:outline-none"
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder=" Enter your name"
            />
            {formData.errors && formData.errors.name && (
              <p className="text-red-500 text-sm">{formData.errors.name}</p>
            )}
            <input
              className=" my-4 p-2 bg-transparent border-2 rounded-md  focus:outline-none"
              type="text"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder=" Enter your email"
            />
            {
              formData.errors && formData.errors.email && (
                <p className="text-red-500 text-sm"> {formData.errors.email}</p>
              )
            }
            <textarea
              name="message"
              value={formData.message}
              onChange={handleTextArea}
              rows="10"
              placeholder="Enter your message"
              className=" p-2 bg-transparent border-2 rounded-md focus:outline-none"
            ></textarea>

              {
              formData.errors && formData.errors.message && (
                <p className="text-red-500 text-sm"> {formData.errors.message}</p>
              )
            }

            <button
              className="text-white bg-gradient-to-b  from-cyan-500 to to-blue-500
            px-6 my-8 py-3 mx-auto flex items-center rounded-md  hover:scale-110 duration-300"
            >
              Let's Talk
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Contact;
