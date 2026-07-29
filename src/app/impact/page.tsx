"use client";

import { motion } from "framer-motion";
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

// StorySlideshow component copied from page.tsx
function StorySlideshow({ source, name, v }: { source: string; name: string; v: number }) {
  const [resolvedImages, setResolvedImages] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    let ignore = false;

    async function resolveImages() {
      const src = source || "";
      if (!src.trim()) {
        setResolvedImages(["/placeholder.png"]);
        return;
      }

      // Check if it's a Google Drive folder link
      const gdriveFolderRegex = /(?:folders\/|id=)(1[a-zA-Z0-9_-]{32})/;
      const folderMatch = src.match(gdriveFolderRegex);

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
      const links = src
        .split(/[\n,]/)
        .map(l => l.trim())
        .filter(l => l.length > 0)
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

  return (
    <div className="w-full h-full relative">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 1.2, ease: "easeInOut" }}
        className="w-full h-full object-cover transition-all duration-700 group-hover:scale-105"
      >
        <img
          src={resolvedImages[currentIndex]}
          alt={name}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
      </motion.div>
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
                  "{story.story}"
                </h3>
                <div className="pt-8 border-t border-gray-100 flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-black">{story.name}</p>
                    <p className="text-xs font-bold uppercase tracking-widest text-brand-blue mt-1">{story.tag}</p>
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
