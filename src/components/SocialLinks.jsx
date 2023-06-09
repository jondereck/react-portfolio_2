import React from "react";
import { AiFillLinkedin, AiFillGithub, AiOutlineMail } from "react-icons/ai";
import { BsFileEarmarkPerson } from "react-icons/bs";
const SocialLinks = () => {

    const links = [
        {
            id: 1,
            child:(
                <>
                LinkedIn <AiFillLinkedin size={35}/>
                </>
            ),
            href: 'https://www.linkedin.com/in/jdnifas/',
            style: 'rounded-tr-md',
        },
        {
            id: 2,
            child:(
                <>
                Github <AiFillGithub size={35}/>
                </>
            ),
            href: 'https://github.com/jondereck',
        },
        {
            id: 1,
            child:(
                <>
                Email <AiOutlineMail size={35}/>
                </>
            ),
            href: 'mailto:jonderecknifas@gmail.com',
        },
        {
            id: 1,
            child:(
                <>
                Resume <BsFileEarmarkPerson size={35}/>
                </>
            ),
            href: '/resume.pdf',
            style: 'rounded-br-md',
            download: true
        }
    ]
  return (
    <div className="hidden lg:flex flex-col top-[35%] left-0 fixed">
      <ul>
        {links.map(({id,child,href,style,download}) => (
            <li key={id} className={`flex justify-between item-center w-40 h-14 bg-gray-500 px-4 ml-[-100px] hover:ml-[-10px] hover:rounded-md duration-300 ${style}`} >
             <a href={href}  
             target="_blank"
             rel="noreferrer"
             className="flex justify-between items-center w-full  text-white"
             download={download}>
                
              {child}
             </a>
           </li>

        ))}
        
      </ul>
    </div>
  );
};

export default SocialLinks;
