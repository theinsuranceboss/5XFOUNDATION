"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ShoppingBag } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { getSiteContent } from "@/lib/supabase";
import { getDisplayUrl } from "@/lib/utils";
import { useStore } from "@/lib/store";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const navItems = [
  { name: "HOME", href: "/" },
  { name: "SHOP", href: "/merch" },
  { name: "EVENTS", href: "/events" },
  { name: "DONATE", href: "/donate" },
];


export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const [logoUrl, setLogoUrl] = useState("/logo.png");
  
  const setIsCartOpen = useStore((state) => state.setIsCartOpen);
  const cart = useStore((state) => state.cart);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const toggleCart = () => setIsCartOpen(true);

  useEffect(() => {
    async function fetchLogo() {
      try {
        const dbContent = await getSiteContent('siteContent');
        if (dbContent) {
          const parsed = JSON.parse(dbContent);
          if (parsed.logo) {
            setLogoUrl(parsed.logo);
          }
        }
      } catch (err) {
        console.error("Failed to load navigation logo from Supabase:", err);
        const cached = localStorage.getItem('siteContent');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.logo) setLogoUrl(parsed.logo);
        }
      }
    }
    fetchLogo();
  }, []);

  if (pathname?.startsWith("/admin")) return null;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-100 px-6 py-4 md:px-12">
      <div className="max-w-[1600px] mx-auto flex items-center justify-between">
        {/* Logo Home Button */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative w-12 h-12 md:w-16 md:h-16 rounded-full overflow-hidden transition-transform group-hover:scale-110 duration-300">
            <img 
              src={getDisplayUrl(logoUrl)} 
              alt="5X Cancer Foundation Logo" 
              className="w-full h-full object-contain"
            />
          </div>


          <span className="hidden sm:block text-xl font-black tracking-tighter text-black">
            5XFOUNDATION
          </span>
        </Link>

        {/* Desktop Links */}
        <div className="hidden lg:flex items-center gap-10">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "text-[10px] font-black tracking-[0.2em] transition-all hover:text-brand-blue",
                pathname === item.href ? "text-brand-blue" : "text-black"
              )}
            >
              {item.name}
            </Link>
          ))}
        </div>

        {/* Icons */}
        <div className="flex items-center gap-6">
          <button 
            onClick={toggleCart} 
            className="nav-cart-btn text-black hover:text-brand-blue transition-colors relative focus:outline-none p-1"
            aria-label="Ver carrito"
          >
            <ShoppingBag size={20} strokeWidth={2.5} />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-brand-blue text-white text-[8px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center border border-white shadow-sm">
                {cartCount}
              </span>
            )}
          </button>


          <button
            className="lg:hidden p-2 text-black"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="lg:hidden absolute top-full left-0 right-0 bg-white border-b border-gray-100 p-8 flex flex-col gap-6 shadow-xl"
          >
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className="text-sm font-black tracking-widest text-black"
              >
                {item.name}
              </Link>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
