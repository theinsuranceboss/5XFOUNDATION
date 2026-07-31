"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Quote, ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { getSiteContent } from "@/lib/supabase";

interface Story {
  id: string;
  name: string;
  tag: string;
  journey: string;
  help: string;
  img: string;
}

// StorySlideshow component with transition support
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

      const gdriveFolderRegex = /(?:folders\/|id=)(1[a-zA-Z0-9_-]{32})/;
      const folderMatch = cleanSrc.match(gdriveFolderRegex);

      if (folderMatch) {
        const folderId = folderMatch[1];
        try {
          const res = await fetch(`/api/gdrive?folderId=${folderId}`);
          const data = await res.json();

          if (ignore) return;

          if (data.success && data.images && data.images.length > 0) {
            const resolved = data.images.map((imgUrl: string) => {
              const idMatch = imgUrl.match(/id=([a-zA-Z0-9_-]{20,})/);
              if (idMatch) return `https://lh3.googleusercontent.com/d/${idMatch[1]}=w800`;
              return imgUrl;
            });
            setResolvedImages(resolved);
            return;
          }
        } catch (err) {
          console.error("[StorySlideshow] Fetch failed:", err);
        }
      }

      const links = cleanSrc
        .split(/[\n,]/)
        .map(l => l.trim())
        .filter(l => l.length > 0 && !l.startsWith('transition:'))
        .map(l => {
          const proxyIdMatch = l.match(/\/api\/gdrive\/image\?id=([a-zA-Z0-9_-]{20,})/);
          if (proxyIdMatch) return `https://lh3.googleusercontent.com/d/${proxyIdMatch[1]}=w800`;
          const fileMatch = l.match(/(?:file\/d\/|id=)(1[a-zA-Z0-9_-]{20,})/);
          if (fileMatch) return `https://lh3.googleusercontent.com/d/${fileMatch[1]}=w800`;
          return l.includes('?') || l.startsWith('/') || l.startsWith('data:') || l.startsWith('http') ? l : `${l}?v=${v}`;
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

export default function ImpactPage() {
  const [stories, setStories] = useState<Story[]>([]);
  const [v, setV] = useState(0);

  useEffect(() => {
    async function loadData() {
      // 1. Immediate cache load for responsive loading of user edits
      const savedStories = localStorage.getItem('siteStories');
      if (savedStories) setStories(JSON.parse(savedStories));

      // 2. Fetch fresh data from Supabase
      try {
        const dbStories = await getSiteContent('siteStories');
        if (dbStories) {
          setStories(JSON.parse(dbStories));
          localStorage.setItem('siteStories', dbStories);
        }
      } catch (err) {
        console.error("Failed to load stories from Supabase:", err);
      }
      setV(Date.now());
    }
    loadData();
  }, []);

  return (
    <div className="py-24 px-6 bg-white min-h-screen">
      <div className="max-w-7xl mx-auto">
        <header className="mb-24 text-center md:text-left">
          <span className="text-xs font-black text-brand-blue uppercase tracking-[0.5em] mb-6 block">Real Stories</span>
          <h1 className="text-6xl md:text-9xl font-black tracking-tighter leading-none mb-10">
            WHO WE <br/> <span className="text-brand-blue">HELP</span>
          </h1>
          <p className="text-xl text-gray-500 max-w-2xl leading-relaxed">
            Every warrior has a story. Every donation builds a bridge to a better tomorrow.
          </p>
        </header>

        <div className="space-y-32">
          {stories.map((story, index) => (
            <motion.div
              key={story.id}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className={`flex flex-col ${index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'} items-center gap-16 md:gap-24`}
            >
              <div className="w-full md:w-1/2">
                <div className="relative aspect-[4/5] rounded-[3rem] overflow-hidden shadow-2xl group">
                  <div className="absolute inset-0 bg-brand-blue/10 group-hover:bg-transparent transition-all z-10" />
                  <StorySlideshow source={story.img} name={story.name} v={v} />
                </div>
              </div>

              <div className="w-full md:w-1/2 space-y-8">
                <Quote className="text-brand-blue/20" size={80} fill="currentColor" />
                <h3 className="text-4xl md:text-6xl font-black tracking-tight leading-tight">
                  "{story.journey}"
                </h3>
                <div className="pt-8 border-t border-gray-100 flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-black">{story.name}</p>
                    {story.tag && <p className="text-xs font-bold uppercase tracking-widest text-brand-blue mt-1">{story.tag}</p>}
                  </div>
                  <button className="p-4 bg-brand-gray rounded-full hover:bg-brand-blue hover:text-white transition-all group">
                    <ArrowRight size={24} className="group-hover:translate-x-2 transition-transform" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}

          {stories.length === 0 && (
            <div className="text-center py-20">
              <p className="text-gray-500">Loading stories...</p>
            </div>
          )}
        </div>

        {/* Call to Action */}
        <section className="mt-48 bg-brand-black rounded-[4rem] py-32 px-12 text-center text-white relative overflow-hidden">
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-brand-blue/10 blur-[100px]" />
          <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-brand-blue/10 blur-[100px]" />

          <div className="relative z-10">
            <h2 className="text-4xl md:text-7xl font-black tracking-tighter mb-10">Become Part of the <span className="text-brand-blue">Team</span></h2>
            <div className="flex flex-col sm:flex-row justify-center gap-6">
              <button className="bg-brand-blue text-white px-12 py-6 rounded-full font-black text-xs uppercase tracking-widest hover:scale-105 transition-transform shadow-xl shadow-brand-blue/20">
                Donate to the Cause
              </button>
              <button className="bg-white/5 text-white border border-white/10 px-12 py-6 rounded-full font-black text-xs uppercase tracking-widest hover:bg-white/10 transition-all">
                Share a Warrior Story
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
