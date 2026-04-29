import React from "react";
import { AiFillLinkedin, AiFillGithub, AiOutlineMail } from "react-icons/ai";
import { BsFileEarmarkPerson } from "react-icons/bs";
import HideOnScroll from "./HideOnScroll";
const SocialLinks = () => {
    const links = [
        {
            id: 3,
            label: 'LinkedIn',
            icon: AiFillLinkedin,
            href: 'https://www.linkedin.com/in/jdnifas/',
        },
        {
            id: 2,
            label: 'GitHub',
            icon: AiFillGithub,
            href: 'https://github.com/jondereck',
        },
        {
            id: 4,
            label: 'Email',
            icon: AiOutlineMail,
            href: 'mailto:jonderecknifas@gmail.com',
        },
        {
            id: 1,
            label: 'Resume',
            icon: BsFileEarmarkPerson,
            href: '/resume.pdf',
            download: true
        }
    ]
  return (
    <HideOnScroll>
      <div className="fixed left-4 top-1/2 z-30 hidden -translate-y-1/2 md:block">
        <ul className="flex flex-col gap-3 rounded-full border border-slate-200/80 bg-white/85 p-2 shadow-xl shadow-slate-900/10 backdrop-blur dark:border-slate-700/80 dark:bg-slate-900/85">
          {links.map((item, index) => {
            const Icon = item.icon;

            return (
              <li key={`${item.id ?? 'link'}-${index}`} className="group relative">
                <a
                  href={item.href}
                  target={item.download ? undefined : "_blank"}
                  rel={item.download ? undefined : "noreferrer"}
                  className="flex h-11 w-11 items-center justify-center rounded-full text-slate-600 transition hover:bg-cyan-500 hover:text-white focus:bg-cyan-500 focus:text-white focus:outline-none focus:ring-2 focus:ring-cyan-300 dark:text-slate-200"
                  aria-label={item.label}
                  title={item.label}
                  download={item.download}
                >
                  <Icon size={item.label === 'Resume' ? 22 : 25} />
                </a>
                <span className="pointer-events-none absolute left-full top-1/2 ml-3 -translate-y-1/2 whitespace-nowrap rounded-full bg-slate-950 px-3 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition group-hover:opacity-100 group-focus-within:opacity-100 dark:bg-white dark:text-slate-950">
                  {item.label}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      <nav className="fixed inset-x-0 bottom-4 z-30 flex justify-center px-4 md:hidden" aria-label="Social links">
        <ul className="flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/90 px-3 py-2 shadow-lg shadow-slate-900/15 backdrop-blur dark:border-slate-700/80 dark:bg-slate-900/90">
          {links.map((item, index) => {
            const Icon = item.icon;

            return (
              <li key={`${item.id ?? 'mobile-link'}-${index}`}>
                <a
                  href={item.href}
                  target={item.download ? undefined : "_blank"}
                  rel={item.download ? undefined : "noreferrer"}
                  className="flex h-11 w-11 items-center justify-center rounded-full text-slate-700 transition hover:bg-cyan-500 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 dark:text-slate-100"
                  aria-label={item.label}
                  title={item.label}
                  download={item.download}
                >
                  <Icon size={item.label === 'Resume' ? 23 : 26} />
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
    </HideOnScroll>
  );
};

export default SocialLinks;
