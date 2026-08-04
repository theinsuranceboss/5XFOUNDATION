'use client';

import { motion } from 'framer-motion';

interface AdBannerProps {
  type: string;
  desktop: string;
  tablet: string;
  mobile: string;
  link: string;
  html: string;
  fit?: string;
  position?: string;
  textSize?: string;
  textColor?: string;
}

export default function AdBanner({ type, desktop, tablet, mobile, link, html, fit, position }: AdBannerProps) {
  const hasMedia = desktop?.trim() || tablet?.trim() || mobile?.trim();
  const hasHtml = html?.trim();

  if (type === "html" && !hasHtml) return null;
  if (type === "media" && !hasMedia) return null;

  const formattedLink = link?.trim() ? (
    /^(https?:\/\/|\/|#|mailto:|tel:)/i.test(link.trim()) ? link.trim() : `https://${link.trim()}`
  ) : "";

  if (type === "html") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-7xl mx-auto px-6 py-4"
      >
        {formattedLink ? (
          <a href={formattedLink} target="_blank" rel="noopener noreferrer" className="block w-full overflow-hidden rounded-2xl hover:shadow-xl transition-all duration-300">
            <div className="w-full overflow-hidden flex justify-center items-center" dangerouslySetInnerHTML={{ __html: html! }} />
          </a>
        ) : (
          <div className="w-full overflow-hidden rounded-2xl flex justify-center items-center" dangerouslySetInnerHTML={{ __html: html! }} />
        )}
      </motion.div>
    );
  }

  const desktopSrc = desktop?.trim() || "";
  const tabletSrc = tablet?.trim() || desktopSrc;
  const mobileSrc = mobile?.trim() || tabletSrc;
  const isVideo = (src: string) => src.toLowerCase().endsWith(".mp4");

  const MediaElement = ({ src, className }: { src: string; className: string }) => {
    if (!src) return null;
    const styleObj = {
      objectFit: (fit === 'centered' ? 'contain' : fit === 'stretch' ? 'fill' : 'cover') as any,
      objectPosition: position || 'center',
    };
    if (isVideo(src)) {
      return <video src={src} className={`${className} w-full h-full pointer-events-none`} style={styleObj} autoPlay muted loop playsInline />;
    }
    return <img src={src} alt="Promotional Banner" className={`${className} w-full h-full transition-transform duration-700 group-hover:scale-[1.02] pointer-events-none`} style={styleObj} />;
  };

  const bannerContent = (
    <div className="relative w-full overflow-hidden rounded-2xl shadow-lg border border-gray-100/50 bg-gray-50 flex items-center justify-center group cursor-pointer">
      <div className="hidden lg:block w-full aspect-[1200/250] relative">
        <MediaElement src={desktopSrc} className="rounded-2xl" />
      </div>
      <div className="hidden md:block lg:hidden w-full aspect-[768/200] relative">
        <MediaElement src={tabletSrc} className="rounded-2xl" />
      </div>
      <div className="block md:hidden w-full aspect-[320/150] relative">
        <MediaElement src={mobileSrc} className="rounded-2xl" />
      </div>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="w-full max-w-7xl mx-auto px-6 py-8"
    >
      {formattedLink ? (
        <a href={formattedLink} target="_blank" rel="noopener noreferrer" className="block w-full h-full cursor-pointer hover:shadow-xl transition-all duration-300 rounded-2xl">
          {bannerContent}
        </a>
      ) : bannerContent}
    </motion.div>
  );
}
