"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getSiteContent } from "@/lib/supabase";
import { getDisplayUrl } from "@/lib/utils";

export default function Footer() {
  const pathname = usePathname();
  const currentYear = new Date().getFullYear();
  const [content, setContent] = useState({
    logo: "/logo.png",
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
    themeBrandColor: "#00A3FF"
  });

  useEffect(() => {
    async function loadData() {
      // 1. LocalStorage cached load
      const savedContent = localStorage.getItem('siteContent');
      if (savedContent) {
        try {
          setContent(prev => ({ ...prev, ...JSON.parse(savedContent) }));
        } catch(e) {}
      }

      // 2. Fetch fresh data from Supabase
      try {
        const dbContent = await getSiteContent('siteContent');
        if (dbContent) {
          setContent(prev => ({ ...prev, ...JSON.parse(dbContent) }));
          localStorage.setItem('siteContent', dbContent);
        }
      } catch (err) {
        console.error("Failed to load footer content from Supabase:", err);
      }
    }
    loadData();
  }, []);

  const parsedLinks = content.footerLinks
    ? content.footerLinks.split("\n").map(line => {
        const parts = line.split("|");
        return {
          name: parts[0]?.trim() || "",
          path: parts[1]?.trim() || ""
        };
      }).filter(link => link.name && link.path && link.name.toUpperCase() !== "FOUNDER" && link.path !== "/#founder" && link.path !== "#founder")
    : [];

  const footerScale = parseFloat(content.footerSize || "1.0");

  const socialIconShapeClass = content.footerSocialShape === "rounded-full"
    ? "rounded-full"
    : content.footerSocialShape === "rounded-none"
      ? "rounded-none"
      : "rounded-xl";

  if (pathname?.startsWith("/admin")) return null;

  return (
    <footer 
      style={{ 
        backgroundColor: content.footerBgColor || "#000000",
        color: content.footerTextColor || "#9CA3AF",
        fontSize: `${14 * footerScale}px`,
        paddingTop: `${96 * footerScale}px`,
        paddingBottom: `${96 * footerScale}px`,
      }} 
      className="px-6 border-t border-white/5 transition-all duration-300"
    >
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-20 mb-20">
        {/* Branding */}
        <div className="md:col-span-1">
          <Link href="/" className="flex items-center gap-4 mb-8 group">
            <div className="relative w-12 h-12 bg-white rounded-full overflow-hidden border-2 border-white/10 group-hover:border-brand-blue transition-all">
               <img src={getDisplayUrl(content.logo) || "/logo.png"} alt="5X Logo" className="w-full h-full object-cover" />
            </div>
            <span style={{ color: content.footerLinkColor || "#FFFFFF" }} className="text-2xl font-black tracking-tighter uppercase font-mono">5XFOUNDATION</span>
          </Link>
          <p className="max-w-md leading-relaxed mb-10 font-medium opacity-90">
            {content.footerDesc}
          </p>
          
          {/* Social Links */}
          <div className="flex flex-wrap gap-4">
            {content.footerFb && (
              <a href={content.footerFb} target="_blank" rel="noopener noreferrer" className={`p-3 bg-white/5 hover:bg-brand-blue hover:text-white transition-all flex items-center justify-center ${socialIconShapeClass}`} aria-label="Facebook">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
              </a>
            )}
            {content.footerIg && (
              <a href={content.footerIg} target="_blank" rel="noopener noreferrer" className={`p-3 bg-white/5 hover:bg-brand-blue hover:text-white transition-all flex items-center justify-center ${socialIconShapeClass}`} aria-label="Instagram">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
              </a>
            )}
            {content.footerX && (
              <a href={content.footerX} target="_blank" rel="noopener noreferrer" className={`p-3 bg-white/5 hover:bg-brand-blue hover:text-white transition-all flex items-center justify-center ${socialIconShapeClass}`} aria-label="X">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4l11.733 16h4.267l-11.733 -16z"/><path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772"/></svg>
              </a>
            )}
            {content.footerYt && (
              <a href={content.footerYt} target="_blank" rel="noopener noreferrer" className={`p-3 bg-white/5 hover:bg-brand-blue hover:text-white transition-all flex items-center justify-center ${socialIconShapeClass}`} aria-label="YouTube">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17z"/><path d="m10 15 5-3-5-3z"/></svg>
              </a>
            )}
            {content.footerTiktok && (
              <a href={content.footerTiktok} target="_blank" rel="noopener noreferrer" className={`p-3 bg-white/5 hover:bg-brand-blue hover:text-white transition-all flex items-center justify-center ${socialIconShapeClass}`} aria-label="TikTok">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"/></svg>
              </a>
            )}
            {content.footerLinkedin && (
              <a href={content.footerLinkedin} target="_blank" rel="noopener noreferrer" className={`p-3 bg-white/5 hover:bg-brand-blue hover:text-white transition-all flex items-center justify-center ${socialIconShapeClass}`} aria-label="LinkedIn">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/></svg>
              </a>
            )}
          </div>
        </div>

        {/* Quick Links */}
        <div className="flex flex-col">
          <div className="w-full">
            <h4 
              style={{ color: content.themeBrandColor || "#00A3FF" }}
              className="font-black text-[10px] uppercase tracking-[0.3em] mb-10 text-brand-blue"
            >
              {content.footerNavTitle || "Navigation"}
            </h4>
            {parsedLinks.length > 0 ? (
              <ul className="space-y-4 font-bold">
                {parsedLinks.map((link, i) => (
                  <li key={i}>
                    <Link 
                      href={link.path} 
                      style={{ color: content.footerLinkColor || "#FFFFFF" }}
                      className="hover:opacity-80 transition-colors"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 italic text-xs">No links defined.</p>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto pt-10 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
          © {currentYear} 5XFOUNDATION™. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

