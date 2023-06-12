import React from "react";
import { motion } from "framer-motion";
import { TiTick } from "react-icons/ti";

const Success = () => {
  return (
    <div>
      <motion.div
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="flex items-center justify-center"
      >
        <TiTick size={48} color="#00C853" />
      </motion.div>
      <h2 className="text-center text-2xl font-bold mt-4">Thank you for submitting the form!</h2>
      <p className=" text-center text-lg mt-2">I will get back to you soon.</p>
      {/* Add any additional content or components to display */}
    </div>
  );
};

export default Success;
