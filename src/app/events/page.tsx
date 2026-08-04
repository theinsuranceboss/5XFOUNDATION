"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Calendar, MapPin, Clock, ArrowRight, X } from "lucide-react";
import { useState, useEffect } from "react";
import { getSiteContent, updateSiteContent, addReservation } from "@/lib/supabase";
import AdBanner from "@/components/AdBanner";

export default function EventsPage() {
  const [v, setV] = useState(0);
  const [content, setContent] = useState<any>({
    eventTitleColor: '#000000',
    eventTitleFontFamily: 'Inter',
    eventBanner: '/shop_banner.png',
    eventBannerHeight: '350',
    eventBannerOverlay: '0.4',
    eventBannerSize: 'cover',
    eventBannerPosition: 'center',
    eventTitle: 'UPCOMING 5X EVENTS',
    eventSubtitle: 'Join us as we build a stronger network of warriors together.',
    eventBannerTitleColor: '#FFFFFF',
    eventBannerTitleSize: '48',
    eventBannerSubtitleColor: '#E5E7EB',
    eventBannerSubtitleSize: '16',
    eventRsvpBtnBg: '#000000',
    eventRsvpBtnTextColor: '#FFFFFF',
    eventAdTopType: 'media',
    eventAdTopDesktop: '',
    eventAdTopTablet: '',
    eventAdTopMobile: '',
    eventAdTopLink: '',
    eventAdTopHtml: '',
    eventAdBottomType: 'media',
    eventAdBottomDesktop: '',
    eventAdBottomTablet: '',
    eventAdBottomMobile: '',
    eventAdBottomLink: '',
    eventAdBottomHtml: '',
  });
  
  const [events, setEvents] = useState([
    {
      id: 'event_1',
      title: "Warrior Walk 2026",
      date: "May 15, 2026",
      time: "09:00 AM",
      loc: "Central Park, NY",
      desc: "Our annual community walk to raise awareness and funds for cancer warrior support.",
      img: "/event_1.png"
    },
    {
      id: 'event_2',
      title: "Symmetry Pop-up",
      date: "June 02, 2026",
      time: "11:00 AM",
      loc: "SoHo, NY",
      desc: "Connect with the community and snag exclusive 5X gear.",
      img: "/event_2.png"
    },
    {
      id: 'event_3',
      title: "Warrior Tech Expo",
      date: "July 20, 2026",
      time: "10:00 AM",
      loc: "Long Island City, NY",
      desc: "Presenting advancements in prosthetic tech for cancer survivors.",
      img: "/event_3.png"
    }
  ]);

  // RSVP Form state
  const [isRsvpOpen, setIsRsvpOpen] = useState(false);
  const [activeEvent, setActiveEvent] = useState<any>(null);
  const [rsvpName, setRsvpName] = useState("");
  const [rsvpEmail, setRsvpEmail] = useState("");
  const [rsvpPhone, setRsvpPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    async function loadData() {
      // Load fallback/cached content first to avoid layout shift
      const savedContent = localStorage.getItem('siteContent');
      if (savedContent) {
        try {
          setContent((prev: any) => ({ ...prev, ...JSON.parse(savedContent) }));
        } catch (e) {
          console.error("Failed to parse cached siteContent:", e);
        }
      }
      const savedEvents = localStorage.getItem('siteEvents');
      if (savedEvents) {
        try {
          setEvents(JSON.parse(savedEvents));
        } catch (e) {
          console.error("Failed to parse cached siteEvents:", e);
        }
      }

      // Fetch fresh siteContent
      try {
        const dbContent = await getSiteContent('siteContent');
        if (dbContent) {
          const parsed = JSON.parse(dbContent);
          setContent((prev: any) => ({ ...prev, ...parsed }));
          localStorage.setItem('siteContent', dbContent);
        }
      } catch (err) {
        console.error("Failed to load content from Supabase:", err);
      }

      // Fetch fresh siteEvents
      try {
        const dbEvents = await getSiteContent('siteEvents');
        if (dbEvents) {
          setEvents(JSON.parse(dbEvents));
          localStorage.setItem('siteEvents', dbEvents);
        }
      } catch (err) {
        console.error("Failed to load events from Supabase:", err);
      }
      setV(Date.now());
    }
    loadData();
  }, []);

  const handleRsvpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rsvpName || !rsvpEmail || !activeEvent) return;

    setIsSubmitting(true);
    try {
      await addReservation({
        name: rsvpName,
        email: rsvpEmail,
        phone: rsvpPhone || "",
        eventId: activeEvent.id,
        eventTitle: activeEvent.title,
      });

      setSubmitted(true);
      setRsvpName("");
      setRsvpEmail("");
      setRsvpPhone("");
    } catch (err) {
      console.error(err);
      alert("Failed to save reservation. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const bannerImg = content.eventBanner || '/shop_banner.png';
  const hasBanner = bannerImg.trim() !== '' && bannerImg !== 'none';

  const isSplit = content.eventBannerLayout === 'split';
  const textPlacement = content.eventBannerPlacement || 'center'; // left | center | right

  // Alignment classes for overlay mode
  const overlayAlignClasses = 
    textPlacement === 'left' ? 'text-left items-start' :
    textPlacement === 'right' ? 'text-right items-end ml-auto' :
    'text-center items-center mx-auto';

  // Alignment classes for split mode (desktop)
  const splitAlignClasses = 
    textPlacement === 'left' ? 'text-left items-start' :
    textPlacement === 'right' ? 'text-right items-end' :
    'text-center items-center';

  const bannerHeight = `${content.eventBannerHeight || '350'}px`;

  const bannerContent = hasBanner ? (
    <div className="relative w-full overflow-hidden rounded-2xl md:rounded-[2.5rem] shadow-2xl flex select-none">
      {isSplit ? (
        <div 
          className="flex flex-col-reverse lg:flex-row w-full bg-black text-white"
          style={{ minHeight: '350px', height: bannerHeight }}
        >
          {/* Text Side */}
          <div 
            className={`w-full lg:w-1/2 p-8 sm:p-12 flex flex-col justify-center space-y-4 ${splitAlignClasses}`}
          >
            <span className="text-[10px] font-black tracking-[0.3em] uppercase text-gray-400">Community Events</span>
            <h1 
              className="font-black italic tracking-tighter uppercase leading-none"
              style={{ color: content.eventBannerTitleColor || '#FFFFFF', fontSize: `${content.eventBannerTitleSize || 48}px` }}
            >
              {content.eventTitle || 'UPCOMING 5X EVENTS'}
            </h1>
            <div className="w-12 h-1 bg-blue-500 rounded-full" />
            <p 
              className="font-medium leading-relaxed"
              style={{ color: content.eventBannerSubtitleColor || '#E5E7EB', fontSize: `${content.eventBannerSubtitleSize || 16}px` }}
            >
              {content.eventSubtitle || 'Join us as we build a stronger network of warriors together.'}
            </p>
          </div>
          {/* Image Side */}
          <div 
            className="w-full lg:w-1/2 min-h-[220px] lg:min-h-full"
            style={{
              backgroundImage: `url(${bannerImg})`,
              backgroundSize: 
                content.eventBannerSize === 'fit' || content.eventBannerSize === 'centered' || content.eventBannerSize === 'contain' ? 'contain' : 
                content.eventBannerSize === 'stretch' ? '100% 100%' : 'cover',
              backgroundPosition: content.eventBannerPosition || 'center',
              backgroundRepeat: 'no-repeat',
            }}
          />
        </div>
      ) : (
        /* Full Overlay Layout */
        <div 
          className="relative w-full flex flex-col justify-center"
          style={{
            height: bannerHeight,
            maxHeight: '60vh',
            minHeight: '220px',
            backgroundImage: `url(${bannerImg})`,
            backgroundSize: 
              content.eventBannerSize === 'fit' || content.eventBannerSize === 'centered' || content.eventBannerSize === 'contain' ? 'contain' : 
              content.eventBannerSize === 'stretch' ? '100% 100%' : 'cover',
            backgroundPosition: content.eventBannerPosition || 'center',
            backgroundRepeat: 'no-repeat',
          }}
        >
          <div 
            className="absolute inset-0 bg-black transition-opacity duration-300" 
            style={{ opacity: parseFloat(content.eventBannerOverlay || '0.4') }} 
          />
          <div className={`relative z-10 px-8 py-12 flex flex-col space-y-4 w-full ${overlayAlignClasses}`}>
            <span className="text-[10px] font-black tracking-[0.3em] uppercase" style={{ color: content.eventBannerSubtitleColor || '#E5E7EB' }}>Community Events</span>
            <h1 
              className="font-black italic tracking-tighter uppercase leading-none"
              style={{ color: content.eventBannerTitleColor || '#FFFFFF', fontSize: `${content.eventBannerTitleSize || 48}px` }}
            >
              {content.eventTitle || 'UPCOMING 5X EVENTS'}
            </h1>
            <div className="w-12 h-1 bg-blue-500 rounded-full" />
            <p 
              className="font-medium leading-relaxed max-w-2xl"
              style={{ color: content.eventBannerSubtitleColor || '#E5E7EB', fontSize: `${content.eventBannerSubtitleSize || 16}px` }}
            >
              {content.eventSubtitle || 'Join us as we build a stronger network of warriors together.'}
            </p>
          </div>
        </div>
      )}
    </div>
  ) : (
    <div className="text-center max-w-2xl mx-auto space-y-4">
      <span className="text-[10px] font-black tracking-[0.3em] uppercase text-blue-600">Community Events</span>
      <h1 className="text-5xl md:text-6xl font-black italic tracking-tighter uppercase leading-none">
        {content.eventTitle || 'UPCOMING 5X EVENTS'}
      </h1>
      <div className="w-12 h-1 bg-blue-600 mx-auto rounded-full" />
      <p className="text-gray-500 text-sm font-medium leading-relaxed">
        {content.eventSubtitle || 'Join us as we build a stronger network of warriors together.'}
      </p>
    </div>
  );

  const finalBanner = hasBanner && content.eventBannerLink ? (
    <a href={content.eventBannerLink} target="_blank" rel="noopener noreferrer" className="block hover:opacity-95 transition-opacity mb-12">
      {bannerContent}
    </a>
  ) : (
    <div className="mb-12">
      {bannerContent}
    </div>
  );

  return (
    <div className="py-24 md:py-32 px-6 sm:px-12 bg-white text-black min-h-screen">
      <div className="max-w-5xl mx-auto space-y-12">
        {/* Events Header Banner */}
        {finalBanner}

        {/* Events Top Ad Banner */}
        <AdBanner
          type={content.eventAdTopType || 'media'}
          desktop={content.eventAdTopDesktop || ''}
          tablet={content.eventAdTopTablet || ''}
          mobile={content.eventAdTopMobile || ''}
          link={content.eventAdTopLink || ''}
          html={content.eventAdTopHtml || ''}
        />

        <div className="space-y-12">
          {events.map((event, index) => (
            <motion.div
              key={event.id || index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="bg-gray-50 rounded-[2.5rem] p-8 md:p-10 flex flex-col md:flex-row items-center gap-10 hover:shadow-2xl hover:bg-white transition-all group border border-transparent hover:border-black/5"
            >
              <div className="w-full md:w-1/3 aspect-square relative rounded-3xl overflow-hidden shadow-xl bg-gray-200">
                 <img src={`${event.img}?v=${v}`} alt={event.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                 <div className="absolute inset-0 bg-black/5 group-hover:bg-black/0 transition-colors" />
              </div>

              <div className="flex-1 w-full">
                <div className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 mb-4 flex items-center gap-2">
                  <Calendar size={14} className="text-black" /> {event.date}
                </div>
                <h3 
                  className="text-3xl md:text-4xl font-black mb-4 tracking-tight transition-all leading-none uppercase italic"
                  style={{
                    color: content.eventTitleColor || '#000000',
                    fontFamily: `${content.eventTitleFontFamily || 'Inter'}, sans-serif`
                  }}
                >
                  {event.title}
                </h3>
                <p className="text-gray-500 mb-8 leading-relaxed text-sm font-medium">{event.desc}</p>
                <div className="flex flex-wrap gap-8 text-[10px] font-black uppercase tracking-widest text-gray-400">
                  {event.time && <span className="flex items-center gap-2 text-black"><Clock size={16} /> {event.time}</span>}
                  <span className="flex items-center gap-2 text-black"><MapPin size={16} /> {event.loc}</span>
                </div>
              </div>
              
              <button 
                onClick={() => {
                  setActiveEvent(event);
                  setIsRsvpOpen(true);
                }}
                className="whitespace-nowrap px-10 py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-3 transition-all hover:scale-105 active:scale-95 shadow-md"
                style={{
                  backgroundColor: content.eventRsvpBtnBg || '#000000',
                  color: content.eventRsvpBtnTextColor || '#FFFFFF'
                }}
              >
                RSVP NOW <ArrowRight size={16} />
              </button>
            </motion.div>
          ))}
        </div>

        {/* Events Bottom Ad Banner */}
        <AdBanner
          type={content.eventAdBottomType || 'media'}
          desktop={content.eventAdBottomDesktop || ''}
          tablet={content.eventAdBottomTablet || ''}
          mobile={content.eventAdBottomMobile || ''}
          link={content.eventAdBottomLink || ''}
          html={content.eventAdBottomHtml || ''}
        />
      </div>

      {/* RSVP Modal Form */}
      <AnimatePresence>
        {isRsvpOpen && activeEvent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setIsRsvpOpen(false); setSubmitted(false); }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Modal Box */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[2.5rem] p-8 md:p-10 shadow-2xl z-10 text-black border border-gray-100"
            >
              <button 
                onClick={() => { setIsRsvpOpen(false); setSubmitted(false); }}
                className="absolute top-6 right-6 p-2 text-gray-400 hover:text-black transition-colors"
              >
                <X size={20} />
              </button>

              {!submitted ? (
                <div className="space-y-6">
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-[0.3em] text-blue-600 block mb-2">RSVP REGISTRATION</span>
                    <h3 className="text-2xl md:text-3xl font-black uppercase italic leading-none">{activeEvent.title}</h3>
                    <p className="text-xs text-gray-400 mt-2 font-medium">Please fill out this form to reserve your spot.</p>
                  </div>

                  <form onSubmit={handleRsvpSubmit} className="space-y-4">
                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2">First and Last Name *</label>
                      <input 
                        type="text" 
                        required
                        value={rsvpName}
                        onChange={(e) => setRsvpName(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl px-5 py-4 text-xs font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        placeholder="John Doe"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2">Email Address *</label>
                      <input 
                        type="email" 
                        required
                        value={rsvpEmail}
                        onChange={(e) => setRsvpEmail(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl px-5 py-4 text-xs font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        placeholder="john@example.com"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2">Phone Number (Optional)</label>
                      <input 
                        type="tel" 
                        value={rsvpPhone}
                        onChange={(e) => setRsvpPhone(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl px-5 py-4 text-xs font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        placeholder="123-456-7890"
                      />
                    </div>

                    <button 
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-5 rounded-2xl bg-black text-white font-black text-xs uppercase tracking-widest hover:bg-gray-800 transition-all shadow-md flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? "Submitting..." : "Confirm RSVP"}
                    </button>
                  </form>
                </div>
              ) : (
                <div className="text-center py-10 space-y-6">
                  <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-2xl font-black uppercase italic leading-none">Thank you!</h3>
                    <p className="text-xs text-gray-400 mt-2 font-medium">Your spot for <strong>{activeEvent.title}</strong> has been reserved successfully.</p>
                  </div>
                  <button 
                    onClick={() => { setIsRsvpOpen(false); setSubmitted(false); }}
                    className="px-8 py-4 bg-black text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-gray-800 transition-all shadow-sm"
                  >
                    Close
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
