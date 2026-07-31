"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence, useInView, useMotionValue, useTransform, animate } from "framer-motion";
import { Heart, Users, Calendar, Quote, ShoppingBag } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { getSiteContent } from "@/lib/supabase";
import { DonationCard } from "@/components/DonationCard";

function NativeDonateEmbed({ html }: { html: string }) {
  const containerId = "shopify-donate-container-home";

  useEffect(() => {
    const targetDiv = document.getElementById(containerId);
    if (!targetDiv) return;

    targetDiv.innerHTML = '';

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const bodyChildren = Array.from(doc.body.childNodes);
    bodyChildren.forEach(child => {
      if (child.nodeName !== 'SCRIPT') {
        targetDiv.appendChild(child.cloneNode(true));
      }
    });

    const headChildren = Array.from(doc.head.childNodes);
    headChildren.forEach(child => {
      if (child.nodeName !== 'SCRIPT') {
        targetDiv.appendChild(child.cloneNode(true));
      }
    });

    const scripts = Array.from(doc.querySelectorAll('script'));
    const injectedScripts: HTMLScriptElement[] = [];

    scripts.forEach(originalScript => {
      const script = document.createElement('script');
      script.type = originalScript.type || 'text/javascript';
      script.setAttribute('data-donate-injected', 'true');
      
      if (originalScript.src) {
        script.src = originalScript.src;
        script.async = true;
      } else {
        script.textContent = originalScript.textContent;
      }

      document.body.appendChild(script);
      injectedScripts.push(script);
    });

    return () => {
      injectedScripts.forEach(script => {
        try { script.remove(); } catch (e) {}
      });
      const target = document.getElementById(containerId);
      if (target) target.innerHTML = '';
    };
  }, [html]);

  return <div id={containerId} className="w-full min-h-[400px]" />;
}

function StatCounter({ value, suffix = "" }: { value: number, suffix?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => Math.round(latest).toLocaleString());

  useEffect(() => {
    if (isInView) {
      animate(count, value, { duration: 2, ease: "easeOut" });
    }
  }, [isInView, value, count]);

  return (
    <span ref={ref}>
      <motion.span>{rounded}</motion.span>
      {suffix}
    </span>
  );
}

function PaymentMethods() {
  const icons = [
    { name: 'Visa', src: 'https://cdn.svgporn.com/logos/visa.svg' },
    { name: 'Mastercard', src: 'https://cdn.svgporn.com/logos/mastercard.svg' },
    { name: 'Amex', src: 'https://cdn.svgporn.com/logos/amex.svg' },
    { name: 'Apple Pay', src: 'https://cdn.svgporn.com/logos/apple-pay.svg' },
    { name: 'Google Pay', src: 'https://cdn.svgporn.com/logos/google-pay-icon.svg' },
    { name: 'PayPal', src: 'https://cdn.svgporn.com/logos/paypal.svg' },
    { name: 'Discover', src: 'https://cdn.svgporn.com/logos/discover.svg' }
  ];
  return (
    <div className="flex flex-wrap items-center justify-center gap-4 opacity-40 grayscale hover:grayscale-0 transition-all duration-500">
      {icons.map((icon, i) => (
        <img key={i} src={icon.src} alt={icon.name} className="h-4 md:h-5 w-auto object-contain" />
      ))}
    </div>
  );
}

function StorySlideshow({ source, name, v }: { source: string; name: string; v: number }) {
  const [resolvedImages, setResolvedImages] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [transition, setTransition] = useState('fade');

  useEffect(() => {
    let ignore = false;

    async function resolveImages() {
      const src = source || "";
      if (!src.trim()) {
        setResolvedImages(["/placeholder.png"]);
        return;
      }

      let cleanSrc = src;
      const lines = src.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      if (lines.length > 0 && lines[0].startsWith('transition:')) {
        setTransition(lines[0].split(':')[1] || 'fade');
        cleanSrc = lines.slice(1).join('\n');
      } else {
        setTransition('fade');
      }

      // Check if it's a Google Drive folder link
      const gdriveFolderRegex = /(?:folders\/|id=)(1[a-zA-Z0-9_-]{32})/;
      const folderMatch = cleanSrc.match(gdriveFolderRegex);

      if (folderMatch) {
        const folderId = folderMatch[1];
        try {
          const res = await fetch(`/api/gdrive?folderId=${folderId}`);
          const data = await res.json();

          if (ignore) return;

          if (data.success && data.images && data.images.length > 0) {
            setResolvedImages(data.images);
            return;
          }
        } catch (err) {
          console.error("[StorySlideshow] Fetch failed:", err);
        }
      }

      // If it's a list of links (one per line or comma-separated)
      const links = cleanSrc
        .split(/[\n,]/)
        .map(l => l.trim())
        .filter(l => l.length > 0 && !l.startsWith('transition:'))
        .map(l => {
          const fileMatch = l.match(/(?:file\/d\/|id=)(1[a-zA-Z0-9_-]{32})/);
          if (fileMatch) {
            return `/api/gdrive/image?id=${fileMatch[1]}&v=3`;
          }
          return l.includes('?') || l.startsWith('/') || l.startsWith('data:') ? l : `${l}?v=${v}`;
        });

      if (links.length > 0) {
        if (ignore) return;
        setResolvedImages(links);
        return;
      }

      if (ignore) return;
      setResolvedImages(["/placeholder.png"]);
    }

    resolveImages();

    return () => {
      ignore = true;
    };
  }, [source, v]);

  useEffect(() => {
    if (resolvedImages.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % resolvedImages.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [resolvedImages.length]);

  if (resolvedImages.length === 0) {
    return <div className="w-full h-full bg-white/5 animate-pulse" />;
  }

  const getInitial = () => {
    switch (transition) {
      case 'slide-left': return { x: 100, opacity: 0 };
      case 'slide-up': return { y: 100, opacity: 0 };
      case 'zoom': return { scale: 1.3, opacity: 0 };
      default: return { opacity: 0 };
    }
  };

  const getAnimate = () => {
    switch (transition) {
      case 'slide-left': return { x: 0, opacity: 1 };
      case 'slide-up': return { y: 0, opacity: 1 };
      case 'zoom': return { scale: 1, opacity: 1 };
      default: return { opacity: 1 };
    }
  };

  const getExit = () => {
    switch (transition) {
      case 'slide-left': return { x: -100, opacity: 0 };
      case 'slide-up': return { y: -100, opacity: 0 };
      case 'zoom': return { scale: 0.8, opacity: 0 };
      default: return { opacity: 0 };
    }
  };

  return (
    <div className="w-full h-full relative overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.img
          key={currentIndex}
          src={resolvedImages[currentIndex]}
          alt={name}
          initial={getInitial()}
          animate={getAnimate()}
          exit={getExit()}
          transition={{ duration: 1.0, ease: "easeInOut" }}
          className="w-full h-full object-cover transition-all duration-700 group-hover:scale-105"
        />
      </AnimatePresence>
    </div>
  );
}

interface AdBannerProps {
  type: string;
  desktop: string;
  tablet: string;
  mobile: string;
  link: string;
  html: string;
  slotName: string;
  fit?: string;
  position?: string;
  textSize?: string;
  textColor?: string;
}

function AdBanner({ type, desktop, tablet, mobile, link, html, slotName, fit, position, textSize, textColor }: AdBannerProps) {
  const hasMedia = desktop?.trim() || tablet?.trim() || mobile?.trim();
  const hasHtml = html?.trim();

  if (type === "html" && !hasHtml) return null;
  if (type === "media" && !hasMedia) return null;

  if (type === "html") {
    return (
      <div className="w-full max-w-7xl mx-auto px-6 py-6 overflow-hidden flex justify-center items-center">
        <div 
          className="w-full overflow-hidden flex justify-center items-center" 
          dangerouslySetInnerHTML={{ __html: html }} 
        />
      </div>
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
      return (
        <video
          src={src}
          className={`${className} w-full h-full pointer-events-none`}
          style={styleObj}
          autoPlay
          muted
          loop
          playsInline
        />
      );
    }

    return (
      <img
        src={src}
        alt={`Promotional Advertisement Banner`}
        className={`${className} w-full h-full transition-transform duration-700 group-hover:scale-[1.02] pointer-events-none`}
        style={styleObj}
      />
    );
  };

  const textOverlayStyle: any = {
    fontSize: textSize ? `${textSize}px` : '14px',
    color: textColor || '#FFFFFF',
  };

  const bannerContent = (
    <div className="relative w-full overflow-hidden rounded-2xl shadow-lg border border-gray-100/50 bg-gray-50 flex items-center justify-center group cursor-pointer">
      {/* Vista Desktop */}
      <div className="hidden lg:block w-full aspect-[1200/250] relative">
        <MediaElement src={desktopSrc} className="rounded-2xl" />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={textOverlayStyle}>
          {slotName}
        </div>
      </div>
      
      {/* Vista Tablet */}
      <div className="hidden md:block lg:hidden w-full aspect-[768/200] relative">
        <MediaElement src={tabletSrc} className="rounded-2xl" />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={textOverlayStyle}>
          {slotName}
        </div>
      </div>

      {/* Vista Móvil */}
      <div className="block md:hidden w-full aspect-[320/150] relative">
        <MediaElement src={mobileSrc} className="rounded-2xl" />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={textOverlayStyle}>
          {slotName}
        </div>
      </div>
    </div>
  );
  
  const formattedLink = link?.trim() ? (
    /^(https?:\/\/|\/|#|mailto:|tel:)/i.test(link.trim()) ? link.trim() : `https://${link.trim()}`
  ) : "";

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="w-full max-w-7xl mx-auto px-6 py-8"
    >
      {formattedLink ? (
        <a 
          href={formattedLink} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="block w-full h-full cursor-pointer hover:shadow-xl transition-all duration-300 rounded-2xl"
        >
          {bannerContent}
        </a>
      ) : (
        bannerContent
      )}
    </motion.div>
  );
}

const fadeInUp: any = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.8, ease: "easeOut" }
};

export default function Home() {
  const [v, setV] = useState(0);
  const [amount, setAmount] = useState("$50");
  const [freq, setFreq] = useState("One-time");
  
  const [content, setContent] = useState({
    heroTitle: "FIVE TIME FOUNDATION",
    heroDesc: "We provide access to prosthetics, ease care-related costs, and build a strong, supportive community for those who have experienced limb loss.",
    missionTitle: "OUR MISSION",
    missionDesc: "Five Time Foundation™ empowers cancer warriors to reclaim mobility, confidence, and connection after limb loss. Founded by 6-time survivor Rich Canci.",
    storiesTitle: "SURVIVOR STORIES",
    fundraisingTitle: "How We Raise Funds",
    fundraisingDesc: "We raise funds through nightlife events, community gatherings, and merchandise sales, creating meaningful experiences while providing vital support to cancer patients and survivors who have experienced limb loss.",
    donationTitle: "FUEL THE FIGHT",
    donationDesc: "Your contribution directly funds prosthetics, covers care-related costs, and empowers cancer survivors to reclaim their lives.",
    donationHtml: "",
    donateHtml: "",
    donationAmounts: "$25, $50, $100, $250, $500, $ Other",
    logo: "/logo.png",
    hero_1: "/hero_1.png",
    hero_2: "/hero_2.png",
    hero_3: "/hero_3.png",
    hero_gdrive_link: "https://drive.google.com/drive/folders/1c46Rf9ajwya3DsUwNbVoLtsp09v42trD?usp=sharing",
    rich: "/rich.png",
    richType: "media",
    richDesktop: "",
    richTablet: "",
    richMobile: "",
    richLink: "",
    richHtml: "",
    richSize: "cover",
    richPosition: "center",
    richTextSize: "14",
    richTextColor: "#FFFFFF",
    richLayout: "full",
    richPlacement: "center",
    fundraisingBg: "",
    fundraisingBgType: "media",
    fundraisingBgDesktop: "",
    fundraisingBgTablet: "",
    fundraisingBgMobile: "",
    fundraisingBgLink: "",
    fundraisingBgHtml: "",
    fundraisingBgSize: "cover",
    fundraisingBgPosition: "center",
    fundraisingBgTextSize: "14",
    fundraisingBgTextColor: "#FFFFFF",
    fundraisingBgLayout: "full",
    fundraisingBgPlacement: "center",
    themeFontFamily: "Inter",
    themeHeadingCase: "uppercase",
    themeFontSize: "16",
    themeHeadingScale: "1.0",
    themeTextColor: "#4B5563",
    themeHeadingColor: "#000000",
    themeBrandColor: "#00A3FF",
    footerDesc: "Empowering cancer warriors to reclaim mobility, confidence, and connection after limb loss.",
    footerNavTitle: "Navigation",
    footerLinks: "HOME | /\nFOUNDER | /#founder\nSHOP | /merch\nEVENTS | /events\nDONATE | /donate",
    footerFb: "https://www.facebook.com/FiveTimeFoundation/",
    footerIg: "https://www.instagram.com/5xfoundation",
    footerX: "",
    footerYt: "",
    footerTiktok: "",
    footerLinkedin: "",
    footerBgColor: "#000000",
    footerTextColor: "#9CA3AF",
    footerLinkColor: "#FFFFFF",
    footerSize: "1.0",
    footerSocialShape: "rounded-xl",
    heroTitleColor: "#FFFFFF",
    heroDescColor: "#F3F4F6",
    heroTitleSize: "120",
    heroDescSize: "20",
    heroTitleAlign: "left",
    heroDescAlign: "left",
    heroTitleBold: true,
    heroDescBold: false,
    heroPlacement: "left",
    heroButtonScale: "1.0",
    heroHeight: "100vh",
    heroLayout: "split",
    missionTitleColor: "#000000",
    missionDescColor: "#000000",
    missionTitleSize: "40",
    missionDescSize: "24",
    missionTitleAlign: "center",
    missionDescAlign: "center",
    missionTitleBold: true,
    missionDescBold: false,
    philosophyTitleColor: "#FFFFFF",
    philosophyTitle: 'The "Five Time" Philosophy',
    philosophyDesc: 'Named after the sheer number of times Rich had to overcome the impossible, "Five Time" represents the moment when survival becomes second nature and Thriving becomes the only objective. We believe every amputee deserves the chance to thrive, not just survive.',
    philosophyBgColor: "#000000",
    philosophyBg: "",
    philosophyOverlay: "0.6",
    philosophyBgSize: "fill",
    philosophyBgPosition: "center",
    philosophyDescColor: "#E5E7EB",
    philosophyTitleSize: "48",
    philosophyDescSize: "20",
    philosophyTitleAlign: "center",
    philosophyDescAlign: "center",
    philosophyTitleBold: true,
    philosophyDescBold: false,
    founderTitleColor: "#000000",
    founderDescColor: "#000000",
    founderTitleSize: "60",
    founderDescSize: "18",
    founderTitleAlign: "left",
    founderDescAlign: "left",
    founderTitleBold: true,
    founderDescBold: true,
    storiesTitleColor: "#FFFFFF",
    storiesTitleSize: "64",
    storiesTitleAlign: "center",
    storiesTitleBold: true,
    storiesNameColor: "#FFFFFF",
    storiesNameSize: "48",
    storiesNameAlign: "left",
    storiesNameBold: true,
    storiesDescColor: "#FFFFFF",
    storiesDescSize: "20",
    storiesDescAlign: "left",
    storiesDescBold: false,
    fundraisingTitleColor: "#FFFFFF",
    fundraisingDescColor: "#9CA3AF",
    fundraisingTitleSize: "72",
    fundraisingDescSize: "20",
    fundraisingTitleAlign: "center",
    fundraisingDescAlign: "center",
    fundraisingTitleBold: true,
    fundraisingDescBold: false,
    donationTitleColor: "#000000",
    donationDescColor: "#000000",
    donationTitleSize: "64",
    donationDescSize: "18",
    donationTitleAlign: "center",
    donationDescAlign: "center",
    donationTitleBold: true,
    donationDescBold: false,
    adTopType: "media",
    adTopDesktop: "",
    adTopTablet: "",
    adTopMobile: "",
    adTopLink: "",
    adTopHtml: "",
    adTopSize: "fill",
    adTopPosition: "center",
    adTopTextSize: "14",
    adTopTextColor: "#FFFFFF",
    adMiddleType: "media",
    adMiddleDesktop: "",
    adMiddleTablet: "",
    adMiddleMobile: "",
    adMiddleLink: "",
    adMiddleHtml: "",
    adMiddleSize: "fill",
    adMiddlePosition: "center",
    adMiddleTextSize: "14",
    adMiddleTextColor: "#FFFFFF",
    adBottomType: "media",
    adBottomDesktop: "",
    adBottomTablet: "",
    adBottomMobile: "",
    adBottomLink: "",
    adBottomHtml: "",
    adBottomSize: "fill",
    adBottomPosition: "center",
    adBottomTextSize: "14",
    adBottomTextColor: "#FFFFFF",
  });

  const [stories, setStories] = useState([
    {
      id: 'connor',
      name: 'Connor Young',
      tag: '',
      journey: 'Connor is a courageous 5-year-old from Illinois battling Ewing Sarcoma, a rare and aggressive cancer. After 15+ rounds of chemotherapy and a life-changing rotationplasty surgery, Connor continues to fight with incredible strength.',
      help: 'Through the Five Time Foundation™, we’ve raised funds to bring Connor and his family to A Step Ahead Prosthetics, where he’ll receive a world-class prosthetic giving him the freedom to move, play, and just be a kid again.',
      img: `https://drive.google.com/drive/folders/1JQ0x7yNQZONjYHDjgOGgjah8srTl9Lpk?usp=sharing`
    }
  ]);

  useEffect(() => {
    async function loadData() {
      // 1. Immediate cache load for responsive loading of user edits
      const savedContent = localStorage.getItem('siteContent');
      if (savedContent) setContent(prev => ({ ...prev, ...JSON.parse(savedContent) }));
      const savedStories = localStorage.getItem('siteStories');
      if (savedStories) setStories(JSON.parse(savedStories));

      // 2. Fetch fresh data from Supabase
      try {
        const dbContent = await getSiteContent('siteContent');
        if (dbContent) {
          setContent(prev => ({ ...prev, ...JSON.parse(dbContent) }));
          localStorage.setItem('siteContent', dbContent);
        }

        const dbStories = await getSiteContent('siteStories');
        if (dbStories) {
          setStories(JSON.parse(dbStories));
          localStorage.setItem('siteStories', dbStories);
        }
      } catch (err) {
        console.error("Failed to load content from Supabase:", err);
      }
      setV(Date.now());
    }
    loadData();
  }, []);

  const [heroImages, setHeroImages] = useState<string[]>([]);
  const [currentHero, setCurrentHero] = useState(0);

  useEffect(() => {
    let ignore = false;

    async function resolveHeroImages() {
      const slideshowSource = (content as any).hero_slideshow_source || 'gdrive';

      if (slideshowSource === 'uploaded') {
        const uploadedStr = (content as any).hero_uploaded_images || '';
        const uploadedLinks = uploadedStr
          .split('\n')
          .map((l: string) => l.trim())
          .filter((l: string) => l.length > 0);
        
        if (uploadedLinks.length > 0) {
          if (ignore) return;
          console.log("[resolveHeroImages] Resolved uploaded images:", uploadedLinks);
          setHeroImages(uploadedLinks);
          return;
        }
      }

      const source = content.hero_gdrive_link || "";
      console.log("[resolveHeroImages] Resolving slideshow from source:", source);
      
      // Check if it's a Google Drive folder link
      const gdriveFolderRegex = /(?:folders\/|id=)(1[a-zA-Z0-9_-]{32})/;
      const folderMatch = source.match(gdriveFolderRegex);
      
      if (folderMatch) {
        const folderId = folderMatch[1];
        console.log("[resolveHeroImages] Detected Google Drive Folder ID:", folderId);
        try {
          const res = await fetch(`/api/gdrive?folderId=${folderId}`);
          const data = await res.json();
          
          if (ignore) {
            console.log("[resolveHeroImages] Stale fetch completed, ignoring to prevent race condition.");
            return;
          }
          
          if (data.success && data.images && data.images.length > 0) {
            console.log("[resolveHeroImages] Successfully resolved folder images:", data.images);
            setHeroImages(data.images);
            return;
          } else {
            console.warn("[resolveHeroImages] Google Drive scraper warning/error:", data.error);
          }
        } catch (err) {
          if (ignore) return;
          console.error("[resolveHeroImages] Fetch failed:", err);
        }
      }

      // If it's a list of links (one per line or comma-separated)
      if (source.trim().length > 0 && !folderMatch) {
        const links = source
          .split(/[\n,]/)
          .map(l => l.trim())
          .filter(l => l.length > 0)
          .map(l => {
            // Convert direct Google Drive file view links to direct image render links
            const fileMatch = l.match(/(?:file\/d\/|id=)(1[a-zA-Z0-9_-]{32})/);
            if (fileMatch) {
              return `/api/gdrive/image?id=${fileMatch[1]}&v=3`;
            }
            return l;
          });
        
        if (links.length > 0) {
          if (ignore) return;
          console.log("[resolveHeroImages] Resolved custom links list:", links);
          setHeroImages(links);
          return;
        }
      }

      if (ignore) return;
      // Backward compatibility / default fallback
      const fallbacks = [
        content.hero_1 || `/hero_1.png?v=${v}`,
        content.hero_2 || `/hero_2.png?v=${v}`,
        content.hero_3 || `/hero_3.png?v=${v}`,
      ].filter(Boolean) as string[];
      
      console.log("[resolveHeroImages] Using legacy/fallback slide images:", fallbacks);
      setHeroImages(fallbacks);
    }

    resolveHeroImages();

    return () => {
      ignore = true;
    };
  }, [(content as any).hero_slideshow_source, (content as any).hero_uploaded_images, content.hero_gdrive_link, content.hero_1, content.hero_2, content.hero_3, v]);

  useEffect(() => {
    if (heroImages.length === 0) return;
    const timer = setInterval(() => {
      setCurrentHero((prev) => (prev + 1) % heroImages.length);
    }, 6000); // 6 second slides
    return () => clearInterval(timer);
  }, [heroImages.length]);

  return (
    <div className="flex flex-col bg-white">
      {/* Dynamic Section Styles — !important override for all Tailwind color/font classes with fully responsive font size scaling */}
      {(() => {
        const s = (sizeStr: string | number, mobileFactor: number, minMobile: number, tabletFactor: number, minTablet: number, phoneFactor?: number, minPhone?: number) => {
          const size = parseInt(String(sizeStr)) || 16;
          const pFactor = phoneFactor !== undefined ? phoneFactor : mobileFactor * 0.85;
          const pMin = minPhone !== undefined ? minPhone : Math.max(12, Math.round(minMobile * 0.85));
          return {
            desktop: size,
            tablet: Math.max(minTablet, Math.round(size * tabletFactor)),
            mobile: Math.max(minMobile, Math.round(size * mobileFactor)),
            phone: Math.max(pMin, Math.round(size * pFactor))
          };
        };

        const heroTitleSizes = s(content.heroTitleSize || '120', 0.45, 36, 0.65, 48, 0.32, 28);
        const heroDescSizes = s(content.heroDescSize || '20', 0.8, 15, 0.9, 16, 0.7, 14);
        const missionTitleSizes = s(content.missionTitleSize || '40', 0.65, 28, 0.8, 32);
        const missionDescSizes = s(content.missionDescSize || '24', 0.75, 18, 0.9, 20);
        const philosophyTitleSizes = s(content.philosophyTitleSize || '48', 0.65, 28, 0.8, 36);
        const philosophyDescSizes = s(content.philosophyDescSize || '20', 0.8, 16, 0.9, 18);
        const founderTitleSizes = s(content.founderTitleSize || '60', 0.6, 32, 0.8, 44);
        const founderDescSizes = s(content.founderDescSize || '18', 0.85, 15, 0.95, 16);
        const storiesTitleSizes = s(content.storiesTitleSize || '64', 0.6, 32, 0.8, 48);
        const storiesNameSizes = s(content.storiesNameSize || '48', 0.55, 28, 0.75, 40);
        const storiesDescSizes = s(content.storiesDescSize || '20', 0.8, 15, 0.9, 16, 0.7, 14);
        const fundraisingTitleSizes = s(content.fundraisingTitleSize || '72', 0.5, 36, 0.75, 52);
        const fundraisingDescSizes = s(content.fundraisingDescSize || '20', 0.8, 16, 0.9, 18);
        const donationTitleSizes = s(content.donationTitleSize || '64', 0.6, 32, 0.8, 48);
        const donationDescSizes = s(content.donationDescSize || '18', 0.85, 15, 0.95, 16);

        return (
          <style dangerouslySetInnerHTML={{ __html: `
            /* Desktop Styles */
            .s-hero-title  { color: ${content.heroTitleColor || '#FFFFFF'} !important; font-size: ${heroTitleSizes.desktop}px !important; text-align: ${content.heroTitleAlign || (content as any).heroPlacement || 'left'} !important; font-weight: ${content.heroTitleBold !== false ? '900' : '400'} !important; }
            .s-hero-desc   { color: ${content.heroDescColor || '#F3F4F6'} !important; font-size: ${heroDescSizes.desktop}px !important; text-align: ${content.heroDescAlign || (content as any).heroPlacement || 'left'} !important; font-weight: ${content.heroDescBold ? '700' : '500'} !important; }
            .s-hero-buttons { justify-content: ${
              (content as any).heroPlacement === 'center' ? 'center' : 
              (content as any).heroPlacement === 'right' ? 'flex-end' : 'flex-start'
            } !important; }
            .s-mission-title { color: ${content.missionTitleColor || '#000000'} !important; font-size: ${missionTitleSizes.desktop}px !important; text-align: ${content.missionTitleAlign || 'center'} !important; font-weight: ${content.missionTitleBold !== false ? '900' : '400'} !important; }
            .s-mission-desc  { color: ${content.missionDescColor || '#000000'} !important; font-size: ${missionDescSizes.desktop}px !important; text-align: ${content.missionDescAlign || 'center'} !important; font-weight: ${content.missionDescBold ? '700' : '500'} !important; }
            .s-philosophy-title { color: ${content.philosophyTitleColor || '#FFFFFF'} !important; font-size: ${philosophyTitleSizes.desktop}px !important; text-align: ${content.philosophyTitleAlign || 'center'} !important; font-weight: ${content.philosophyTitleBold !== false ? '900' : '400'} !important; }
            .s-philosophy-desc  { color: ${content.philosophyDescColor || '#E5E7EB'} !important; font-size: ${philosophyDescSizes.desktop}px !important; text-align: ${content.philosophyDescAlign || 'center'} !important; font-weight: ${content.philosophyDescBold ? '700' : '500'} !important; }
            .s-founder-title { color: ${content.founderTitleColor || '#000000'} !important; font-size: ${founderTitleSizes.desktop}px !important; text-align: ${content.founderTitleAlign || 'left'} !important; font-weight: ${content.founderTitleBold !== false ? '900' : '400'} !important; }
            .s-founder-desc  { color: ${content.founderDescColor || '#4B5563'} !important; font-size: ${founderDescSizes.desktop}px !important; text-align: ${content.founderDescAlign || 'left'} !important; font-weight: ${content.founderDescBold ? '700' : '500'} !important; }
            .s-stories-title { color: ${content.storiesTitleColor || '#FFFFFF'} !important; font-size: ${storiesTitleSizes.desktop}px !important; text-align: ${content.storiesTitleAlign || 'center'} !important; font-weight: ${content.storiesTitleBold !== false ? '900' : '400'} !important; }
            .s-stories-name { color: ${content.storiesNameColor || '#FFFFFF'} !important; font-size: ${storiesNameSizes.desktop}px !important; text-align: ${content.storiesNameAlign || 'left'} !important; font-weight: ${content.storiesNameBold !== false ? '900' : '400'} !important; }
            .s-stories-desc { color: ${content.storiesDescColor || '#FFFFFF'} !important; font-size: ${storiesDescSizes.desktop}px !important; text-align: ${content.storiesDescAlign || 'left'} !important; font-weight: ${content.storiesDescBold ? '700' : '500'} !important; }
            .s-fundraising-title { color: ${content.fundraisingTitleColor || '#FFFFFF'} !important; font-size: ${fundraisingTitleSizes.desktop}px !important; text-align: ${content.fundraisingTitleAlign || 'center'} !important; font-weight: ${content.fundraisingTitleBold !== false ? '900' : '400'} !important; }
            .s-fundraising-desc  { color: ${content.fundraisingDescColor || '#9CA3AF'} !important; font-size: ${fundraisingDescSizes.desktop}px !important; text-align: ${content.fundraisingDescAlign || 'center'} !important; font-weight: ${content.fundraisingDescBold ? '700' : '500'} !important; }
            .s-donation-title { color: ${content.donationTitleColor || '#000000'} !important; font-size: ${donationTitleSizes.desktop}px !important; text-align: ${content.donationTitleAlign || 'center'} !important; font-weight: ${content.donationTitleBold !== false ? '900' : '400'} !important; }
            .s-donation-desc  { color: ${content.donationDescColor || '#000000'} !important; font-size: ${donationDescSizes.desktop}px !important; text-align: ${content.donationDescAlign || 'center'} !important; font-weight: ${content.donationDescBold ? '700' : '500'} !important; }

            /* Tablet Override */
            @media (max-width: 1024px) {
              .s-hero-title { font-size: ${heroTitleSizes.tablet}px !important; }
              .s-hero-desc { font-size: ${heroDescSizes.tablet}px !important; }
              .s-mission-title { font-size: ${missionTitleSizes.tablet}px !important; }
              .s-mission-desc { font-size: ${missionDescSizes.tablet}px !important; }
              .s-philosophy-title { font-size: ${philosophyTitleSizes.tablet}px !important; }
              .s-philosophy-desc { font-size: ${philosophyDescSizes.tablet}px !important; }
              .s-founder-title { font-size: ${founderTitleSizes.tablet}px !important; }
              .s-founder-desc { font-size: ${founderDescSizes.tablet}px !important; }
              .s-stories-title { font-size: ${storiesTitleSizes.tablet}px !important; }
              .s-stories-name { font-size: ${storiesNameSizes.tablet}px !important; }
              .s-stories-desc { font-size: ${storiesDescSizes.tablet}px !important; }
              .s-fundraising-title { font-size: ${fundraisingTitleSizes.tablet}px !important; }
              .s-fundraising-desc { font-size: ${fundraisingDescSizes.tablet}px !important; }
              .s-donation-title { font-size: ${donationTitleSizes.tablet}px !important; }
              .s-donation-desc { font-size: ${donationDescSizes.tablet}px !important; }
            }

            /* Mobile Override */
            @media (max-width: 767px) {
              .s-hero-title { font-size: ${heroTitleSizes.mobile}px !important; text-align: center !important; }
              .s-hero-desc { font-size: ${heroDescSizes.mobile}px !important; text-align: center !important; }
              .s-hero-buttons { justify-content: center !important; }
              .s-mission-title { font-size: ${missionTitleSizes.mobile}px !important; }
              .s-mission-desc { font-size: ${missionDescSizes.mobile}px !important; }
              .s-philosophy-title { font-size: ${philosophyTitleSizes.mobile}px !important; }
              .s-philosophy-desc { font-size: ${philosophyDescSizes.mobile}px !important; }
              .s-founder-title { font-size: ${founderTitleSizes.mobile}px !important; text-align: center !important; }
              .s-founder-desc { font-size: ${founderDescSizes.mobile}px !important; text-align: center !important; }
              .s-stories-title { font-size: ${storiesTitleSizes.mobile}px !important; }
              .s-stories-name { font-size: ${storiesNameSizes.mobile}px !important; }
              .s-stories-desc { font-size: ${storiesDescSizes.mobile}px !important; text-align: center !important; }
              .s-fundraising-title { font-size: ${fundraisingTitleSizes.mobile}px !important; }
              .s-fundraising-desc { font-size: ${fundraisingDescSizes.mobile}px !important; }
              .s-donation-title { font-size: ${donationTitleSizes.mobile}px !important; }
              .s-donation-desc { font-size: ${donationDescSizes.mobile}px !important; }
            }

            /* Phone Override */
            @media (max-width: 480px) {
              .s-hero-title { font-size: ${heroTitleSizes.phone}px !important; text-align: center !important; }
              .s-hero-desc { font-size: ${heroDescSizes.phone}px !important; text-align: center !important; }
              .s-hero-buttons { justify-content: center !important; }
              .s-stories-name { font-size: ${storiesNameSizes.phone}px !important; text-align: center !important; }
              .s-stories-desc { font-size: ${storiesDescSizes.phone}px !important; text-align: center !important; }
            }
          ` }} />
        );
      })()}
      {/* Hero Section - Carousel Edition */}
      {/* Hero Section - Switchable Layout */}
      {((content as any).heroLayout || 'split') === 'split' ? (
        <section 
          className="relative flex flex-col-reverse lg:flex-row w-full overflow-hidden bg-[#000000]"
          style={{
            minHeight: (content as any).heroHeight || '100vh',
          }}
        >
          {/* Left/Bottom Column: Text & Buttons */}
          {(() => {
            const btnScale = parseFloat((content as any).heroButtonScale || '1.0');
            const isCenter = (content as any).heroPlacement === 'center';
            const isRight = (content as any).heroPlacement === 'right';
            const alignClass = isCenter ? 'items-center text-center' : isRight ? 'items-end text-right' : 'items-start text-left';
            
            return (
              <div 
                className={`w-full lg:w-1/2 flex flex-col justify-center px-6 md:px-12 lg:px-24 py-16 md:py-20 lg:py-24 bg-[#000000] relative z-10`}
                style={{
                  textAlign: 
                    (content as any).heroPlacement === 'center' ? 'center' :
                    (content as any).heroPlacement === 'right' ? 'right' : 'left'
                }}
              >
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className={`flex flex-col ${alignClass} w-full max-w-xl mx-auto`}
                >
                  <h2 className="text-[10px] md:text-sm uppercase tracking-[0.6em] text-white font-black mb-6 md:mb-8 opacity-80">
                    Empowering Cancer Warriors
                  </h2>
                  <h1 className="s-hero-title tracking-[-0.04em] leading-[0.9] mb-6 md:mb-8 uppercase italic whitespace-pre-line">
                    {content.heroTitle}
                  </h1>
                  <p className={`s-hero-desc mb-8 md:mb-12 leading-relaxed opacity-90 ${isCenter ? 'mx-auto' : ''}`}>
                    {content.heroDesc}
                  </p>
                  <div 
                    className="s-hero-buttons flex flex-col sm:flex-row items-stretch sm:items-center gap-6 w-full"
                  >
                    <Link
                      href="/donate"
                      className="bg-brand-blue text-white font-black uppercase tracking-[0.2em] hover:bg-white hover:text-black transition-all flex items-center justify-center gap-4 group shrink-0"
                      style={{
                        fontSize: `${Math.round(20 * btnScale)}px`,
                        paddingTop: `${Math.round(24 * btnScale)}px`,
                        paddingBottom: `${Math.round(24 * btnScale)}px`,
                        paddingLeft: `${Math.round(36 * btnScale)}px`,
                        paddingRight: `${Math.round(36 * btnScale)}px`,
                      }}
                    >
                      <span>Donate Now</span>
                      <div 
                        className="bg-white group-hover:bg-brand-blue transition-colors" 
                        style={{ 
                          width: `${Math.round(12 * btnScale)}px`, 
                          height: `${Math.round(12 * btnScale)}px` 
                        }}
                      />
                    </Link>
                    <Link
                      href="/merch"
                      className="bg-white/10 backdrop-blur-md border-2 border-white/20 text-white font-black uppercase tracking-[0.2em] hover:bg-brand-blue hover:border-brand-blue transition-all flex items-center justify-center gap-4 group shrink-0"
                      style={{
                        fontSize: `${Math.round(20 * btnScale)}px`,
                        paddingTop: `${Math.round(24 * btnScale)}px`,
                        paddingBottom: `${Math.round(24 * btnScale)}px`,
                        paddingLeft: `${Math.round(36 * btnScale)}px`,
                        paddingRight: `${Math.round(36 * btnScale)}px`,
                      }}
                    >
                      <span>Shop Merch</span>
                      <div 
                        className="bg-brand-blue group-hover:bg-white transition-colors" 
                        style={{ 
                          width: `${Math.round(12 * btnScale)}px`, 
                          height: `${Math.round(12 * btnScale)}px` 
                        }}
                      />
                    </Link>
                  </div>
                </motion.div>
              </div>
            );
          })()}

          {/* Right/Top Column: Animated Background Carousel */}
          <div className="w-full lg:w-1/2 h-[40vh] sm:h-[45vh] md:h-[50vh] lg:h-auto relative overflow-hidden bg-black flex-1 self-stretch">
            <AnimatePresence mode="wait">
              <motion.div 
                key={currentHero}
                style={{
                  backgroundImage: heroImages[currentHero] ? `url(${heroImages[currentHero]})` : 'none',
                  backgroundSize:
                    (content as any).hero_fit === 'fit' ? 'contain' :
                    (content as any).hero_fit === 'stretch' ? '100% 100%' :
                    (content as any).hero_fit === 'tile' || (content as any).hero_fit === 'title' ? 'auto' : 'cover',
                  backgroundRepeat:
                    (content as any).hero_fit === 'tile' || (content as any).hero_fit === 'title' ? 'repeat' : 'no-repeat',
                  backgroundPosition:
                    (content as any).hero_fit === 'tile' || (content as any).hero_fit === 'title' ? 'top left' : 'center',
                }}
                initial={{ opacity: 0, scale: 1.05 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.5, ease: "easeInOut" }}
                className="w-full h-full absolute inset-0"
                aria-label="Foundation Hero Background"
              />
            </AnimatePresence>
            {/* Subtle overlay on the images */}
            <div className="absolute inset-0 bg-black/10 z-10" />
          </div>
        </section>
      ) : (
        <section 
          className="relative flex items-center px-6 md:px-12 lg:px-24 overflow-hidden bg-black"
          style={{
            height: (content as any).heroHeight || '100vh',
            justifyContent: 
              (content as any).heroPlacement === 'center' ? 'center' :
              (content as any).heroPlacement === 'right' ? 'flex-end' : 'flex-start',
            textAlign: 
              (content as any).heroPlacement === 'center' ? 'center' :
              (content as any).heroPlacement === 'right' ? 'right' : 'left'
          }}
        >
          {/* Animated Background Carousel (Full Overlay Mode) */}
          <div className="absolute inset-0 bg-black">
            <AnimatePresence mode="wait">
              <motion.div 
                key={currentHero}
                style={{
                  backgroundImage: heroImages[currentHero] ? `url(${heroImages[currentHero]})` : 'none',
                  backgroundSize:
                    (content as any).hero_fit === 'fit' ? 'contain' :
                    (content as any).hero_fit === 'stretch' ? '100% 100%' :
                    (content as any).hero_fit === 'tile' || (content as any).hero_fit === 'title' ? 'auto' : 'cover',
                  backgroundRepeat:
                    (content as any).hero_fit === 'tile' || (content as any).hero_fit === 'title' ? 'repeat' : 'no-repeat',
                  backgroundPosition:
                    (content as any).hero_fit === 'tile' || (content as any).hero_fit === 'title' ? 'top left' : 'center',
                }}
                initial={{ opacity: 0, scale: 1.1 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 2, ease: "circOut" }}
                className="w-full h-full absolute inset-0"
                aria-label="Foundation Hero Background"
              />
            </AnimatePresence>
            {/* Dark gradient for text readability in overlay mode */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/70 to-black/85 lg:bg-gradient-to-r lg:from-black/85 lg:via-black/40 lg:to-black/20 z-10" />
          </div>

          {(() => {
            const btnScale = parseFloat((content as any).heroButtonScale || '1.0');
            const isCenter = (content as any).heroPlacement === 'center';
            const isRight = (content as any).heroPlacement === 'right';
            const alignClass = isCenter ? 'items-center' : isRight ? 'items-end' : 'items-start';
            
            return (
              <div 
                className="max-w-7xl relative z-20 w-full"
                style={{
                  marginLeft: (content as any).heroPlacement === 'left' ? '0' : 'auto',
                  marginRight: (content as any).heroPlacement === 'right' ? '0' : 'auto',
                }}
              >
                <motion.div
                  initial={{ opacity: 0, x: isCenter ? 0 : isRight ? 50 : -50, y: isCenter ? 30 : 0 }}
                  animate={{ opacity: 1, x: 0, y: 0 }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className={`flex flex-col ${alignClass}`}
                >
                  <h2 className="text-[10px] md:text-sm uppercase tracking-[0.6em] text-white font-black mb-8 opacity-80">
                    Empowering Cancer Warriors
                  </h2>
                  <h1 className="s-hero-title tracking-[-0.04em] leading-[0.85] mb-8 md:mb-12 uppercase italic whitespace-pre-line">
                    {content.heroTitle}
                  </h1>
                  <p className={`s-hero-desc mb-10 md:mb-16 max-w-2xl leading-relaxed ${isCenter ? 'mx-auto' : ''}`}>
                    {content.heroDesc}
                  </p>
                  <div 
                    className="s-hero-buttons flex flex-col sm:flex-row items-stretch sm:items-center gap-6 w-full"
                  >
                    <Link
                      href="/donate"
                      className="bg-brand-blue text-white font-black uppercase tracking-[0.2em] hover:bg-white hover:text-black transition-all flex items-center justify-center gap-4 group shrink-0"
                      style={{
                        fontSize: `${Math.round(20 * btnScale)}px`,
                        paddingTop: `${Math.round(24 * btnScale)}px`,
                        paddingBottom: `${Math.round(24 * btnScale)}px`,
                        paddingLeft: `${Math.round(36 * btnScale)}px`,
                        paddingRight: `${Math.round(36 * btnScale)}px`,
                      }}
                    >
                      <span>Donate Now</span>
                      <div 
                        className="bg-white group-hover:bg-brand-blue transition-colors" 
                        style={{ 
                          width: `${Math.round(12 * btnScale)}px`, 
                          height: `${Math.round(12 * btnScale)}px` 
                        }}
                      />
                    </Link>
                    <Link
                      href="/merch"
                      className="bg-white/10 backdrop-blur-md border-2 border-white/20 text-white font-black uppercase tracking-[0.2em] hover:bg-brand-blue hover:border-brand-blue transition-all flex items-center justify-center gap-4 group shrink-0"
                      style={{
                        fontSize: `${Math.round(20 * btnScale)}px`,
                        paddingTop: `${Math.round(24 * btnScale)}px`,
                        paddingBottom: `${Math.round(24 * btnScale)}px`,
                        paddingLeft: `${Math.round(36 * btnScale)}px`,
                        paddingRight: `${Math.round(36 * btnScale)}px`,
                      }}
                    >
                      <span>Shop Merch</span>
                      <div 
                        className="bg-brand-blue group-hover:bg-white transition-colors" 
                        style={{ 
                          width: `${Math.round(12 * btnScale)}px`, 
                          height: `${Math.round(12 * btnScale)}px` 
                        }}
                      />
                    </Link>
                  </div>
                </motion.div>
              </div>
            );
          })()}
        </section>
      )}

      <AdBanner
        type={content.adTopType || "media"}
        desktop={content.adTopDesktop}
        tablet={content.adTopTablet}
        mobile={content.adTopMobile}
        link={content.adTopLink}
        html={content.adTopHtml}
        slotName="top"
        fit={content.adTopSize}
        position={content.adTopPosition}
        textSize={content.adTopTextSize}
        textColor={content.adTopTextColor}
      />

      {/* Our Mission Section */}
      <section id="mission" className="py-32 bg-white px-6 text-center border-b border-gray-100">
        <div className="max-w-4xl mx-auto">
          <motion.h2 {...fadeInUp} className="s-mission-title tracking-tight mb-8 md:mb-12">
            {content.missionTitle}
          </motion.h2>
          <motion.p {...fadeInUp} transition={{ delay: 0.1 }} className="s-mission-desc leading-relaxed px-4">
            {content.missionDesc}
          </motion.p>
        </div>
      </section>

      {/* Philosophy Section */}
      <section 
        id="philosophy" 
        className="py-32 text-white px-6 md:px-24 text-center relative overflow-hidden select-none border-b border-white/5 animate-none"
        style={{
          backgroundColor: content.philosophyBgColor || '#000000',
          backgroundImage: content.philosophyBg && content.philosophyBg !== "none" ? `url(${content.philosophyBg})` : 'none',
          backgroundSize: content.philosophyBgSize === 'centered' ? 'contain' : content.philosophyBgSize === 'stretch' ? '100% 100%' : 'cover',
          backgroundPosition: content.philosophyBgPosition || 'center',
        }}
      >
        {content.philosophyBg && content.philosophyBg !== "none" && (
          <div 
            className="absolute inset-0 bg-black pointer-events-none animate-none" 
            style={{ opacity: parseFloat(content.philosophyOverlay || '0.6') }} 
          />
        )}
        <div className="max-w-4xl mx-auto relative z-10">
          <motion.h2 
            {...fadeInUp} 
            className="s-philosophy-title tracking-tight mb-8 md:mb-10"
            style={{
              fontSize: content.philosophyTitleSize ? `${content.philosophyTitleSize}px` : undefined,
              color: content.philosophyTitleColor || '#FFFFFF',
              textAlign: (content.philosophyTitleAlign || 'center') as any,
              fontWeight: content.philosophyTitleBold ? '900' : 'normal'
            }}
          >
            {content.philosophyTitle || 'The "Five Time" Philosophy'}
          </motion.h2>
          <motion.p 
            {...fadeInUp} 
            transition={{ delay: 0.1 }} 
            className="s-philosophy-desc leading-loose max-w-3xl mx-auto font-medium"
            style={{
              fontSize: content.philosophyDescSize ? `${content.philosophyDescSize}px` : undefined,
              color: content.philosophyDescColor || '#E5E7EB',
              textAlign: (content.philosophyDescAlign || 'center') as any,
              fontWeight: content.philosophyDescBold ? '700' : 'normal'
            }}
          >
            {content.philosophyDesc || 'Named after the sheer number of times Rich had to overcome the impossible...'}
          </motion.p>
        </div>
      </section>


      {/* Meet Our Founder Section */}
      <section id="founder" className="py-32 bg-white px-6 md:px-24">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-start">
            {/* Founder Text */}
            <motion.div {...fadeInUp} className="space-y-10">
              <div className="space-y-4">
                <h4 className="text-[10px] uppercase tracking-[0.4em] text-gray-400 font-black">The Founder</h4>
                <h3 className="s-founder-title tracking-tighter">Rich Canci</h3>
              </div>

              {/* Quote Box */}
              <div className="bg-gray-50 border-l-[6px] border-[#4A5568] p-10 rounded-r-3xl">
                <p className="text-xl md:text-2xl italic text-[#2D3748] leading-relaxed font-medium">
                  "My journey with cancer didn't just test my body; it redefined my purpose. After six battles and losing a limb, I realized that the greatest medicine is community and the ability to move forward."
                </p>
              </div>

              <div className="s-founder-desc space-y-8 leading-relaxed">
                <p>
                  Rich Canci is a proud six-time cancer survivor and amputee who founded the Five Time Foundation™ in 2016. After facing the immense physical, emotional, and financial challenges that come with multi-stage cancer treatments and eventual limb loss, Rich dedicated his life to ensuring others don't have to walk that path alone.
                </p>
                <p>
                  His story is one of unwavering perseverance. From the first diagnosis to the final reclamation of his mobility with a prosthetic limb, Rich has embodied the "Five Time" spirit—a baseline of resilience that expects challenges but refuses to be defined by them.
                </p>
                <p>
                  Today, Rich personally oversees the foundation's efforts, connecting with warriors, sourcing high-end prosthetics, and advocating for amputee rights and accessibility across the globe.
                </p>
              </div>
            </motion.div>

            {/* Founder Image Container */}
            <motion.div {...fadeInUp} transition={{ delay: 0.2 }} className="relative">
              {(() => {
                const rType = content.richType || "media";
                const rDesktop = content.richDesktop?.trim() || content.rich?.trim() || "";
                const rTablet = content.richTablet?.trim() || rDesktop;
                const rMobile = content.richMobile?.trim() || rTablet;
                const rHasMedia = rDesktop || rTablet || rMobile;
                const rHasHtml = content.richHtml?.trim();
                const rLink = content.richLink?.trim();
                const formattedRLink = rLink ? (/^(https?:\/\/|\/|#|mailto:|tel:)/i.test(rLink) ? rLink : `https://${rLink}`) : "";

                if (rType === "html" && rHasHtml) {
                  return (
                    <div className="aspect-[4/5] rounded-[3rem] overflow-hidden bg-brand-gray shadow-2xl relative flex items-center justify-center" dangerouslySetInnerHTML={{ __html: content.richHtml }} />
                  );
                }

                const fitStyle = content.richSize === 'centered' ? 'contain' : content.richSize === 'stretch' ? 'fill' : 'cover';

                const imgContent = (
                  <div className="aspect-[4/5] rounded-[3rem] overflow-hidden bg-brand-gray shadow-2xl relative">
                    {rDesktop && <img src={rDesktop} alt="Rich Canci - 5X Cancer Foundation Founder" className="hidden lg:block w-full h-full transition-transform duration-700 hover:scale-105" style={{ objectFit: fitStyle as any, objectPosition: content.richPosition || 'center' }} />}
                    {rTablet && <img src={rTablet} alt="Rich Canci - 5X Cancer Foundation Founder" className="hidden md:block lg:hidden w-full h-full transition-transform duration-700 hover:scale-105" style={{ objectFit: fitStyle as any, objectPosition: content.richPosition || 'center' }} />}
                    {rMobile && <img src={rMobile} alt="Rich Canci - 5X Cancer Foundation Founder" className="block md:hidden w-full h-full transition-transform duration-700 hover:scale-105" style={{ objectFit: fitStyle as any, objectPosition: content.richPosition || 'center' }} />}
                    {formattedRLink ? <a href={formattedRLink} target="_blank" rel="noopener noreferrer" className="absolute inset-0 z-10" /> : null}
                  </div>
                );

                return imgContent;
              })()}
              {/* 6X Survivor Badge */}
              <div className="absolute bottom-[-20px] right-[-20px] bg-black text-white p-8 md:p-10 rounded-3xl shadow-2xl border-4 border-white transition-transform hover:scale-105">
                <div className="text-4xl md:text-5xl font-black mb-1">6X</div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <AdBanner
        type={content.adMiddleType || "media"}
        desktop={content.adMiddleDesktop}
        tablet={content.adMiddleTablet}
        mobile={content.adMiddleMobile}
        link={content.adMiddleLink}
        html={content.adMiddleHtml}
        slotName="middle"
        fit={content.adMiddleSize}
        position={content.adMiddlePosition}
        textSize={content.adMiddleTextSize}
        textColor={content.adMiddleTextColor}
      />

      {/* Survivor Stories Section */}
      <section id="stories" className="py-32 bg-black px-6 md:px-24 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <motion.h2 {...fadeInUp} className="s-stories-title tracking-tight mb-24 uppercase italic">{content.storiesTitle}</motion.h2>
          
          {/* Metrics Banner */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-40 bg-white/5 p-12 md:p-20 rounded-[4rem] shadow-2xl border border-white/10 relative overflow-hidden">
            <div className="absolute inset-0 bg-brand-blue/5 opacity-20 pointer-events-none" />
            {[
              { icon: <Heart size={40} />, val: 500, label: "Lives Impacted", suffix: "+" },
              { icon: <Users size={40} />, val: 2000, label: "Community Members", suffix: "+" },
              { icon: <Calendar size={40} />, val: 100, label: "Events Hosted", suffix: "+" }
            ].map((stat, i) => (
              <motion.div 
                key={i} 
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.8, ease: "easeOut" }}
                className="flex flex-col items-center justify-center text-center space-y-6 relative z-10"
              >
                <div className="text-white group-hover:opacity-100 transition-opacity">{stat.icon}</div>
                <div className="text-6xl md:text-8xl font-black tracking-tighter text-brand-blue italic">
                   <StatCounter value={stat.val} suffix={stat.suffix} />
                </div>
                <div className="text-[10px] md:text-xs uppercase font-black tracking-[0.5em] text-white/40">{stat.label}</div>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-24 md:gap-40">
            {stories.map((story, i) => (
              <div key={story.id || i} className={`flex flex-col ${i % 2 === 1 ? 'lg:flex-row-reverse' : 'lg:flex-row'} gap-12 md:gap-20 items-center`}>
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  className="w-full lg:w-2/5 aspect-[4/5] rounded-[3rem] overflow-hidden bg-white/5 shadow-2xl relative group border border-white/10"
                >
                  <StorySlideshow source={story.img} name={story.name} v={v} />
                   <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-10 flex flex-col justify-end">
                      {story.tag && <p className="text-brand-blue font-black text-xs uppercase tracking-widest">{story.tag}</p>}
                   </div>
                </motion.div>
                <motion.div {...fadeInUp} className="flex-1 space-y-8">
                  <div className="space-y-4">
                    <h4 className="text-[10px] uppercase tracking-[0.6em] text-brand-blue font-black">Success Story</h4>
                    <h3 className="s-stories-name text-5xl md:text-7xl font-black tracking-tighter italic leading-none">{story.name}</h3>
                  </div>
                  <div className="space-y-6 s-stories-desc text-lg md:text-xl leading-relaxed font-medium">
                    <p>{story.journey}</p>
                    <div className="bg-white/5 p-10 rounded-3xl border-l-[6px] border-brand-blue">
                      <p className="text-white font-bold leading-loose">{story.help}</p>
                    </div>
                  </div>
                </motion.div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How We Raise Funds Section */}
      {(() => {
        const fbType = content.fundraisingBgType || "media";
        const fbDesktop = content.fundraisingBgDesktop?.trim() || content.fundraisingBg?.trim() || "";
        const fbTablet = content.fundraisingBgTablet?.trim() || fbDesktop;
        const fbMobile = content.fundraisingBgMobile?.trim() || fbTablet;
        const fbHasMedia = fbDesktop || fbTablet || fbMobile;
        const fbHasHtml = content.fundraisingBgHtml?.trim();
        const fbLink = content.fundraisingBgLink?.trim();
        const formattedFbLink = fbLink ? (/^(https?:\/\/|\/|#|mailto:|tel:)/i.test(fbLink) ? fbLink : `https://${fbLink}`) : "";

        if (fbType === "html" && fbHasHtml) {
          return (
            <section className="py-32 bg-[#1A1C23] text-white px-6 md:px-24 relative overflow-hidden">
              <div className="w-full overflow-hidden flex justify-center items-center" dangerouslySetInnerHTML={{ __html: content.fundraisingBgHtml }} />
            </section>
          );
        }

        if (!fbHasMedia) {
          return (
            <section className="py-32 bg-[#1A1C23] text-white px-6 md:px-24 relative overflow-hidden">
              <div className="max-w-5xl mx-auto text-center space-y-12 relative z-10">
                <motion.h2 {...fadeInUp} className="s-fundraising-title tracking-tighter uppercase italic leading-none">{content.fundraisingTitle}</motion.h2>
                <motion.p {...fadeInUp} className="s-fundraising-desc leading-relaxed max-w-3xl mx-auto">{content.fundraisingDesc}</motion.p>
                <motion.div {...fadeInUp} className="pt-8 flex justify-center">
                  <Link href="/merch" className="bg-white/10 backdrop-blur-md border-2 border-white/20 text-white font-black text-xl uppercase tracking-[0.2em] px-16 py-8 hover:bg-brand-blue hover:border-brand-blue transition-all flex items-center justify-center gap-4 group">
                    <span>Shop Merchandise</span>
                    <div className="w-4 h-4 bg-brand-blue group-hover:bg-white transition-colors" />
                  </Link>
                </motion.div>
              </div>
            </section>
          );
        }

        const fbBgSize = content.fundraisingBgSize === 'centered' ? 'contain' : content.fundraisingBgSize === 'stretch' ? '100% 100%' : 'cover';
        const fbBgPosition = content.fundraisingBgPosition || 'center';

        const sectionContent = (
          <section className="py-32 bg-[#1A1C23] text-white px-6 md:px-24 relative overflow-hidden">
            {/* Desktop background */}
            <div className="hidden lg:block absolute inset-0" style={{ backgroundImage: `url(${fbDesktop})`, backgroundSize: fbBgSize, backgroundPosition: fbBgPosition, backgroundRepeat: 'no-repeat' }} />
            {/* Tablet background */}
            <div className="hidden md:block lg:hidden absolute inset-0" style={{ backgroundImage: `url(${fbTablet})`, backgroundSize: fbBgSize, backgroundPosition: fbBgPosition, backgroundRepeat: 'no-repeat' }} />
            {/* Mobile background */}
            <div className="block md:hidden absolute inset-0" style={{ backgroundImage: `url(${fbMobile})`, backgroundSize: fbBgSize, backgroundPosition: fbBgPosition, backgroundRepeat: 'no-repeat' }} />
            <div className="absolute inset-0 bg-black/75 z-0" />
            {formattedFbLink && (
              <a href={formattedFbLink} target="_blank" rel="noopener noreferrer" className="absolute inset-0 z-[1]" />
            )}
            <div className="max-w-5xl mx-auto text-center space-y-12 relative z-10">
              <motion.h2 {...fadeInUp} className="s-fundraising-title tracking-tighter uppercase italic leading-none">{content.fundraisingTitle}</motion.h2>
              <motion.p {...fadeInUp} className="s-fundraising-desc leading-relaxed max-w-3xl mx-auto">{content.fundraisingDesc}</motion.p>
              <motion.div {...fadeInUp} className="pt-8 flex justify-center">
                <Link href="/merch" className="bg-white/10 backdrop-blur-md border-2 border-white/20 text-white font-black text-xl uppercase tracking-[0.2em] px-16 py-8 hover:bg-brand-blue hover:border-brand-blue transition-all flex items-center justify-center gap-4 group">
                  <span>Shop Merchandise</span>
                  <div className="w-4 h-4 bg-brand-blue group-hover:bg-white transition-colors" />
                </Link>
              </motion.div>
            </div>
          </section>
        );

        return sectionContent;
      })()}

      {/* Fuel the Fight - Donation Section */}
      <section id="donate" className="py-32 bg-gray-50 px-6 md:px-24">
        <div className="max-w-7xl mx-auto text-center mb-16">
          <motion.h2 {...fadeInUp} className="s-donation-title mb-6 uppercase">{content.donationTitle}</motion.h2>
          <motion.p {...fadeInUp} transition={{ delay: 0.1 }} className="s-donation-desc max-w-2xl mx-auto leading-relaxed">
            {content.donationDesc}
          </motion.p>
        </div>

        <motion.div 
          {...fadeInUp} 
          transition={{ delay: 0.2 }}
          className="max-w-6xl mx-auto w-full"
        >
          <DonationCard />
        </motion.div>

      </section>

      <AdBanner
        type={content.adBottomType || "media"}
        desktop={content.adBottomDesktop}
        tablet={content.adBottomTablet}
        mobile={content.adBottomMobile}
        link={content.adBottomLink}
        html={content.adBottomHtml}
        slotName="bottom"
        fit={content.adBottomSize}
        position={content.adBottomPosition}
        textSize={content.adBottomTextSize}
        textColor={content.adBottomTextColor}
      />
    </div>
  );
}
