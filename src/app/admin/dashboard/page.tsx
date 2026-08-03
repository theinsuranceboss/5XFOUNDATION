"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { 
  BarChart3, 
  FileEdit, 
  Image as ImageIcon, 
  Calendar, 
  Tag, 
  LogOut,
  Plus,
  Trash2,
  Save,
  Users,
  Upload,
  UserPlus,
  Monitor,
  Layout,
  Settings,
  ShieldCheck,
  Sliders,
  FolderOpen,
  Heart,
  Menu,
  X
} from "lucide-react";
import { getSiteContent, updateSiteContent, getReservations, deleteReservation } from "@/lib/supabase";
import { getDisplayUrl } from "@/lib/utils";
import { AdminPanel } from "@/components/admin-panel";


function parseStoryImg(raw: string): { transition: string; urls: string[] } {
  if (!raw) return { transition: 'fade', urls: [] };
  const lines = raw.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length > 0 && lines[0].startsWith('transition:')) {
    return { transition: lines[0].split(':')[1] || 'fade', urls: lines.slice(1) };
  }
  return { transition: 'fade', urls: lines };
}

function buildStoryImg(transition: string, urls: string[]): string {
  const filtered = urls.filter(u => u.trim().length > 0);
  if (filtered.length === 0) return '';
  return `transition:${transition}\n${filtered.join('\n')}`;
}

async function fetchDriveFolderImages(folderUrl: string): Promise<string[]> {
  const folderIdMatch = folderUrl.match(/(?:folders\/|id=)(1[a-zA-Z0-9_-]{32})/);
  if (!folderIdMatch) return [];
  try {
    const res = await fetch(`/api/gdrive?folderId=${folderIdMatch[1]}`);
    const data = await res.json();
    if (data.success && data.images && data.images.length > 0) {
      return data.images.slice(0, 5).map((imgUrl: string) => {
        const idMatch = imgUrl.match(/id=([a-zA-Z0-9_-]{20,})/);
        if (idMatch) return `https://lh3.googleusercontent.com/d/${idMatch[1]}=w800`;
        return imgUrl;
      });
    }
  } catch (err) {
    console.error('[fetchDriveFolderImages] Failed:', err);
  }
  return [];
}

function StoryImagePreview({ source, name }: { source: string; name: string }) {
  const [previewUrl, setPreviewUrl] = useState<string>("/placeholder.png");

  useEffect(() => {
    let ignore = false;
    async function resolvePreview() {
      const raw = source || "";
      if (!raw.trim()) { setPreviewUrl("/placeholder.png"); return; }

      const { urls } = parseStoryImg(raw);
      const firstUrl = urls.length > 0 ? urls[0] : raw;

      // Direct lh3 URL - use as-is
      if (firstUrl.includes('lh3.googleusercontent.com')) {
        if (!ignore) setPreviewUrl(firstUrl);
        return;
      }

      // Google Drive folder URL - fetch and get first image
      const gdriveFolderRegex = /(?:folders\/|id=)(1[a-zA-Z0-9_-]{32})/;
      const folderMatch = firstUrl.match(gdriveFolderRegex);
      if (folderMatch) {
        try {
          const res = await fetch(`/api/gdrive?folderId=${folderMatch[1]}`);
          const data = await res.json();
          if (ignore) return;
          if (data.success && data.images && data.images.length > 0) {
            const imgUrl = data.images[0];
            const idMatch = imgUrl.match(/id=([a-zA-Z0-9_-]{20,})/);
            if (idMatch) { setPreviewUrl(`https://lh3.googleusercontent.com/d/${idMatch[1]}=w400`); return; }
            setPreviewUrl(imgUrl);
            return;
          }
        } catch {}
      }

      // Google Drive file ID
      const fileMatch = firstUrl.match(/(?:file\/d\/|id=)(1[a-zA-Z0-9_-]{20,})/);
      if (fileMatch) { if (!ignore) setPreviewUrl(`https://lh3.googleusercontent.com/d/${fileMatch[1]}=w400`); return; }

      // Proxy URL from scraper - convert to lh3
      const proxyIdMatch = firstUrl.match(/\/api\/gdrive\/image\?id=([a-zA-Z0-9_-]{20,})/);
      if (proxyIdMatch) { if (!ignore) setPreviewUrl(`https://lh3.googleusercontent.com/d/${proxyIdMatch[1]}=w400`); return; }

      if (!ignore) setPreviewUrl(firstUrl);
    }

    resolvePreview();
    return () => { ignore = true; };
  }, [source]);

  return (
    <img
      src={previewUrl}
      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
      alt={name}
    />
  );
}

export default function AdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'content' | 'ads' | 'events' | 'merch' | 'who_we_help' | 'media' | 'theme' | 'donations' | 'rsvps'>('media');
  const [isSaving, setIsSaving] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [reservations, setReservations] = useState<any[]>([]);
  
  // Real paths that reflect what is on the server
  const [siteImages, setSiteImages] = useState([
    { id: 'logo', label: 'Site Branding (Logo)', page: 'Global', dims: '512x512', current: '/logo.png' },
    { id: 'hero_gdrive_link', label: 'Hero Slideshow Images (Google Drive Link or List of Image Links)', page: 'Home Carousel', dims: 'Dynamic Size', current: 'https://drive.google.com/drive/folders/1c46Rf9ajwya3DsUwNbVoLtsp09v42trD?usp=sharing' },
    { id: 'rich', label: 'Founder Portrait (Rich)', page: 'Home/About', dims: '800x1000', current: '/rich.png' },
    { id: 'fundraisingBg', label: 'Fundraising Background Banner', page: 'Home Section', dims: '1920x1080', current: '' },
  ]);

  const [content, setContent] = useState({
    heroTitle: "EMPOWERING CANCER WARRIORS.",
    heroDesc: "We provide access to prosthetics, ease care-related costs, and build a strong, supportive community for those who have experienced limb loss.",
    missionTitle: "OUR MISSION",
    missionDesc: "Five Time Foundation™ empowers cancer warriors to reclaim mobility, confidence, and connection after limb loss. Founded by 6-time survivor Rich Canci.",
    storiesTitle: "SURVIVOR STORIES",
    fundraisingTitle: "HOW WE RAISE FUNDS",
    fundraisingDesc: "We raise funds through nightlife events, community gatherings, and merchandise sales, creating meaningful experiences while providing vital support.",
    donationTitle: "FUEL THE FIGHT",
    donationDesc: "Your contribution directly funds prosthetics, covers care-related costs, and empowers cancer survivors to reclaim their lives.",
    donationHtml: "",
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
    themeBoxShadowEnabled: "true",
    themeBoxShadowColor: "#00A3FF",
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
    titleColor: "",
    titleAlign: "inherit",
    descColor: "",
    descFontSize: "16",
    descAlign: "inherit",
    useCustomShopHtml: false,
    customShopHtml: "",
    shopTitle: "Official Merch",
    shopTitleSize: "48",
    shopTitleColor: "#FFFFFF",
    shopTitleFontFamily: "Inter",
    shopTitleWeight: "900",
    shopTitleAlign: "center",
    shopSubtitle: "Wear your support. 100% of proceeds fund prosthetics and care-related costs for cancer survivors.",
    shopSubtitleSize: "16",
    shopSubtitleColor: "#E5E7EB",
    shopSubtitleFontFamily: "Inter",
    shopSubtitleWeight: "500",
    shopSubtitleAlign: "center",
    shopBanner: "/shop_banner.png",
    shopBannerHeight: "350",
    shopBannerOverlay: "0.4",
    shopBannerSize: "fill",
    shopBannerPosition: "center",
    shopBannerLayout: "full",
    shopBannerPlacement: "center",
    shopBannerLink: "",
    eventBanner: "/shop_banner.png",
    eventBannerHeight: "350",
    eventBannerOverlay: "0.4",
    eventBannerSize: "cover",
    eventBannerPosition: "center",
    eventTitle: "UPCOMING 5X EVENTS",
    eventSubtitle: "Join us as we build a stronger network of warriors together.",
    eventBannerTitleColor: "#FFFFFF",
    eventBannerTitleSize: "48",
    eventBannerSubtitleColor: "#E5E7EB",
    eventBannerSubtitleSize: "16",
    eventBannerLayout: "full",
    eventBannerPlacement: "center",
    eventBannerLink: "",
    donateBannerLayout: "full",
    donateBannerPlacement: "center",
    donateBannerLink: "",
    heroTitleColor: "#FFFFFF",
    heroDescColor: "#F3F4F6",
    heroTitleSize: "120",
    heroDescSize: "20",
    heroTitleAlign: "left",
    heroDescAlign: "left",
    heroTitleBold: true,
    heroDescBold: false,
    missionTitleColor: "#000000",
    missionDescColor: "#000000",
    missionTitleSize: "40",
    missionDescSize: "24",
    missionTitleAlign: "center",
    missionDescAlign: "center",
    missionTitleBold: true,
    missionDescBold: false,
    philosophyTitleColor: "#FFFFFF",
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
    donateTitle: "FUEL THE FIGHT",
    donateTitleSize: "48",
    donateTitleColor: "#FFFFFF",
    donateTitleFontFamily: "Inter",
    donateTitleWeight: "900",
    donateTitleAlign: "center",
    donateSubtitle: "Your contribution directly funds prosthetics, covers care-related costs, and empowers cancer survivors to reclaim their lives.",
    donateSubtitleSize: "16",
    donateSubtitleColor: "#E5E7EB",
    donateSubtitleFontFamily: "Inter",
    donateSubtitleWeight: "500",
    donateSubtitleAlign: "center",
    donateBanner: "/shop_banner.png",
    donateBannerHeight: "350",
    donateBannerOverlay: "0.4",
    donateBannerSize: "fill",
    donateBannerPosition: "center",
    donateHtml: `
<div class="fnd-product-section-light">
  <div class="fnd-product-grid">
    
    <div class="fnd-media-col">
      <div class="fnd-image-box-light">
        <img id="fnd-main-image" src="https://lifeinsuranceboss.com/wp-content/uploads/2026/05/Donatio.webp" alt="5X Foundation Donations">
      </div>
    </div>

    <div class="fnd-info-col">
      <p class="fnd-meta-vendor-light">5X Foundation</p>
      <h1 class="fnd-meta-title-light">Direct Foundation Donation</h1>
      
      <div class="fnd-meta-price-light" id="donation-display-amount">$5.00 USD</div>
      <div class="fnd-meta-notice-light">Your direct contribution explicitly helps fund continuous care programs and cancer patient treatment channels.</div>
      
      <hr class="fnd-separator-light">

      <form action="https://www.paypal.com/cgi-bin/webscr" method="post" target="_top" id="paypal-donation-form">
        <input type="hidden" id="fnd-paypal-cmd" name="cmd" value="_donations">
        <input type="hidden" name="business" value="rich.fivetime@gmail.com">
        <input type="hidden" id="fnd-paypal-item-name" name="item_name" value="General One-Time Donation - 5X Foundation">
        <input type="hidden" name="currency_code" value="USD">
        
        <input type="hidden" id="fnd-paypal-amount" name="amount" value="5.00">
        <input type="hidden" name="no_shipping" value="2">

        <input type="hidden" id="fnd-sub-a3" name="a3" value="">
        <input type="hidden" id="fnd-sub-p3" name="p3" value="">
        <input type="hidden" id="fnd-sub-t3" name="t3" value="">
        <input type="hidden" id="fnd-sub-src" name="src" value="">

        <input type="hidden" id="fnd-selected-variant" name="os0" value="Starter Support">
        <input type="hidden" name="on0" value="Donation Details">

        <div class="fnd-section-label-light">Donation Frequency</div>
        <div class="fnd-pills-layout-light">
          <input type="radio" id="freq_one_time" name="fnd_freq" value="once" checked onclick="setDonationFrequency('once')">
          <label for="freq_one_time" class="fnd-pill-item-light">One-time purchase</label>

          <input type="radio" id="freq_monthly" name="fnd_freq" value="monthly" onclick="setDonationFrequency('monthly')">
          <label for="freq_monthly" class="fnd-pill-item-light">Monthly Donation</label>
        </div>

        <div class="fnd-section-label-light">Select Donation Tier</div>
        <div class="fnd-pills-layout-light">
          <input type="radio" id="fnd_tier_5" name="fnd_tier" value="5.00" checked onclick="toggleCustomAmount(false); changeDonationAmount(this.value, 'Starter Support')">
          <label for="fnd_tier_5" class="fnd-pill-item-light">$5 USD</label>

          <input type="radio" id="fnd_tier_15" name="fnd_tier" value="15.00" onclick="toggleCustomAmount(false); changeDonationAmount(this.value, 'Bronze Support')">
          <label for="fnd_tier_15" class="fnd-pill-item-light">$15 USD</label>

          <input type="radio" id="fnd_tier_35" name="fnd_tier" value="35.00" onclick="toggleCustomAmount(false); changeDonationAmount(this.value, 'Copper Support')">
          <label for="fnd_tier_35" class="fnd-pill-item-light">$35 USD</label>

          <input type="radio" id="fnd_tier_75" name="fnd_tier" value="75.00" onclick="toggleCustomAmount(false); changeDonationAmount(this.value, 'Silver Support')">
          <label for="fnd_tier_75" class="fnd-pill-item-light">$75 USD</label>

          <input type="radio" id="fnd_tier_150" name="fnd_tier" value="150.00" onclick="toggleCustomAmount(false); changeDonationAmount(this.value, 'Gold Support')">
          <label for="fnd_tier_150" class="fnd-pill-item-light">$150 USD</label>

          <input type="radio" id="fnd_tier_custom" name="fnd_tier" value="custom" onclick="toggleCustomAmount(true)">
          <label for="fnd_tier_custom" class="fnd-pill-item-light">Other</label>
        </div>

        <div id="custom-amount-wrapper" class="fnd-custom-wrapper" style="display: none;">
          <div class="fnd-section-label-light">Enter Your Donation Amount ($)</div>
          <input type="number" id="fnd-custom-field" class="fnd-custom-input" min="5.00" step="1.00" placeholder="Minimum 5.00" oninput="handleCustomInput(this.value)">
        </div>

        <div class="fnd-section-label-light" id="multiplier-label">Multiply Your Impact</div>
        <div class="fnd-qty-container-light" id="multiplier-container">
          <button type="button" class="fnd-qty-btn-light" onclick="updateFndQty(-1)">−</button>
          <input type="number" id="fnd-input-qty" class="fnd-qty-field-light" min="1" value="1" readonly>
          <button type="button" class="fnd-qty-btn-light" onclick="updateFndQty(1)">+</button>
        </div>

        <button type="submit" class="fnd-btn-submit-light" id="fnd-main-cta-button">Donate Now</button>
      </form>
    </div>

  </div>
</div>

<style>
  .fnd-product-section-light {
    max-width: 1200px;
    margin: 0 auto;
    padding: 40px 20px;
    background-color: #ffffff !important;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
    box-sizing: border-box;
  }

  .fnd-product-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 40px;
  }

  @media (min-width: 750px) {
    .fnd-product-grid {
      grid-template-columns: 1.05fr 0.95fr;
      gap: 55px;
    }
  }

  .fnd-image-box-light {
    background-color: #f9fafb !important;
    border: 1px solid #e5e7eb;
    border-radius: 4px;
    width: 100%;
    aspect-ratio: 1 / 1;
    display: flex;
    justify-content: center;
    align-items: center;
    overflow: hidden;
  }

  .fnd-image-box-light img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  .fnd-meta-vendor-light {
    font-size: 0.85rem;
    font-weight: 600;
    line-height: 1.2;
    letter-spacing: 0.14em;
    color: #4b5563 !important;
    text-transform: uppercase;
    margin: 0 0 10px 0;
  }

  .fnd-meta-title-light {
    font-size: 2.5rem;
    font-weight: 700;
    line-height: 1.15;
    letter-spacing: -0.02em;
    color: #000000 !important;
    margin: 0 0 15px 0;
  }

  .fnd-meta-price-light {
    font-size: 2.2rem;
    font-weight: 700;
    line-height: 1.1;
    letter-spacing: -0.01em;
    color: #000000 !important;
    margin-bottom: 8px;
  }

  .fnd-meta-notice-light {
    font-size: 0.95rem;
    font-weight: 400;
    line-height: 1.55;
    color: #1f2937 !important;
    margin-bottom: 22px;
  }

  .fnd-separator-light {
    border: 0;
    border-top: 1px solid #d1d5db;
    margin: 25px 0;
  }

  .fnd-section-label-light {
    font-size: 0.85rem;
    font-weight: 700;
    line-height: 1.2;
    color: #374151 !important;
    margin-bottom: 14px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .fnd-pills-layout-light {
    display: flex !important;
    flex-wrap: wrap !important;
    gap: 12px;
    margin-bottom: 28px;
  }

  .fnd-pills-layout-light input[type="radio"] {
    display: none !important;
  }

  .fnd-pill-item-light {
    display: block !important;
    float: left;
    padding: 11px 24px;
    border: 1px solid #111827 !important;
    background-color: transparent;
    color: #000000 !important;
    font-size: 0.9rem;
    font-weight: 600;
    line-height: 1;
    border-radius: 24px;
    cursor: pointer;
    user-select: none;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .fnd-pill-item-light:hover {
    background-color: #000000 !important;
    color: #ffffff !important;
  }

  .fnd-pills-layout-light input[type="radio"]:checked + .fnd-pill-item-light {
    background-color: #000000 !important;
    color: #ffffff !important;
    border-color: #000000 !important;
  }

  .fnd-custom-wrapper {
    margin-bottom: 28px;
    animation: fadeIn 0.2s ease-in-out;
  }

  .fnd-custom-input {
    width: 100%;
    max-width: 240px;
    padding: 12px 16px;
    border: 2px solid #000000 !important;
    border-radius: 4px;
    font-size: 1.1rem;
    font-weight: 700;
    color: #000000 !important;
    background-color: #ffffff !important;
    outline: none;
  }

  .fnd-qty-container-light {
    display: flex;
    align-items: center;
    border: 1px solid #000000 !important;
    width: fit-content;
    border-radius: 4px;
    margin-bottom: 35px;
  }

  .fnd-qty-btn-light {
    background: none;
    border: none;
    color: #000000 !important;
    width: 42px;
    height: 42px;
    font-size: 1.2rem;
    font-weight: bold;
    cursor: pointer;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .fnd-qty-btn-light:hover {
    background-color: #e5e7eb;
  }

  .fnd-qty-field-light {
    width: 46px;
    height: 42px;
    border: none;
    background: none;
    color: #000000 !important;
    text-align: center;
    font-size: 1rem;
    font-weight: 700;
  }

  .fnd-btn-submit-light {
    background-color: #000000 !important;
    color: #ffffff !important;
    border: 1px solid #000000 !important;
    width: 100%;
    padding: 16px;
    font-size: 0.95rem;
    font-weight: 700;
    line-height: 1;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    border-radius: 0px;
    cursor: pointer;
    margin-top: 5px;
    transition: all 0.3s ease;
  }

  .fnd-btn-submit-light:hover {
    background-color: #ffffff !important;
    color: #000000 !important;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-4px); }
    to { opacity: 1; transform: translateY(0); }
  }
</style>

<script>
  let baseAmount = 5.00;
  let currentTierName = "Starter Support";
  let isCustomMode = false;
  let donationFrequency = "once";

  function changeDonationAmount(amount, tierName) {
    baseAmount = parseFloat(amount);
    currentTierName = tierName;
    recalculateTotal();
  }

  function setDonationFrequency(frequency) {
    donationFrequency = frequency;
    
    const cmdField = document.getElementById('fnd-paypal-cmd');
    const itemNameField = document.getElementById('fnd-paypal-item-name');
    const multiplierLabel = document.getElementById('multiplier-label');
    const multiplierContainer = document.getElementById('multiplier-container');
    const ctaButton = document.getElementById('fnd-main-cta-button');

    if (frequency === "monthly") {
      cmdField.value = "_xclick-subscriptions";
      itemNameField.value = "Monthly Foundation Support - 5X Foundation";
      ctaButton.innerText = "Subscribe Monthly";
      
      if (!isCustomMode) {
        multiplierLabel.style.display = 'none';
        multiplierContainer.style.display = 'none';
        document.getElementById('fnd-input-qty').value = 1;
      }
    } else {
      cmdField.value = "_donations";
      itemNameField.value = "General One-Time Donation - 5X Foundation";
      ctaButton.innerText = "Donate Now";
      
      if (!isCustomMode) {
        multiplierLabel.style.display = 'block';
        multiplierContainer.style.display = 'flex';
      }
    }
    recalculateTotal();
  }

  function toggleCustomAmount(showCustom) {
    isCustomMode = showCustom;
    const customWrapper = document.getElementById('custom-amount-wrapper');
    const multiplierLabel = document.getElementById('multiplier-label');
    const multiplierContainer = document.getElementById('multiplier-container');
    const customField = document.getElementById('fnd-custom-field');

    if (showCustom) {
      customWrapper.style.display = 'block';
      multiplierLabel.style.display = 'none';
      multiplierContainer.style.display = 'none';
      currentTierName = "Custom Support Amount";
      
      const currentInputValue = parseFloat(customField.value);
      baseAmount = (!isNaN(currentInputValue) && currentInputValue >= 5) ? currentInputValue : 5.00;
    } else {
      customWrapper.style.display = 'none';
      customField.value = '';
      
      if (donationFrequency === "once") {
        multiplierLabel.style.display = 'block';
        multiplierContainer.style.display = 'flex';
      }
    }
    recalculateTotal();
  }

  function handleCustomInput(rawAmount) {
    let parsed = parseFloat(rawAmount);
    baseAmount = (isNaN(parsed) || parsed < 5) ? 5.00 : parsed;
    recalculateTotal();
  }

  function updateFndQty(change) {
    if (isCustomMode || donationFrequency === "monthly") return;
    const qtyInput = document.getElementById('fnd-input-qty');
    let currentQty = parseInt(qtyInput.value) || 1;
    currentQty += change;
    if (currentQty < 1) currentQty = 1;
    qtyInput.value = currentQty;
    recalculateTotal();
  }

  function recalculateTotal() {
    const qty = (isCustomMode || donationFrequency === "monthly") ? 1 : (parseInt(document.getElementById('fnd-input-qty').value) || 1);
    const finalTotal = baseAmount * qty;
    
    const rateText = donationFrequency === "monthly" ? " / Month" : "";
    document.getElementById('donation-display-amount').innerText = '$' + finalTotal.toFixed(2) + ' USD' + rateText;
    
    if (donationFrequency === "monthly") {
      document.getElementById('fnd-paypal-amount').value = "";
      document.getElementById('fnd-sub-a3').value = finalTotal.toFixed(2);
      document.getElementById('fnd-sub-p3').value = "1";
      document.getElementById('fnd-sub-t3').value = "M";
      document.getElementById('fnd-sub-src').value = "1";
      document.getElementById('fnd-selected-variant').value = 'Monthly Sub: ' + currentTierName;
    } else {
      document.getElementById('fnd-sub-a3').value = "";
      document.getElementById('fnd-sub-p3').value = "";
      document.getElementById('fnd-sub-t3').value = "";
      document.getElementById('fnd-sub-src').value = "";
      
      document.getElementById('fnd-paypal-amount').value = finalTotal.toFixed(2);
      document.getElementById('fnd-selected-variant').value = isCustomMode ? currentTierName : currentTierName + ' (x' + qty + ')';
    }
  }
</script>
    `.trim(),
    diffTitle: "Make a Difference Today",
    diffTitleSize: "48",
    diffTitleColor: "#000000",
    diffTitleFont: "Inter",
    diffTitleWeight: "700",
    diffTitleAlign: "center",
    diffDesc: "Every donation directly supports cancer patients and survivors facing limb loss. Whether you choose a one-time gift or ongoing monthly support, your contribution helps us provide life-changing assistance to those who need it most.",
    diffDescSize: "16",
    diffDescColor: "#4B5563",
    diffDescFont: "Inter",
    diffDescAlign: "center",
    impactTitle: "Your Impact",
    impactTitleSize: "32",
    impactTitleColor: "#000000",
    impactTitleFont: "Inter",
    impactTitleWeight: "700",
    impactTitleAlign: "center",
    impactAmtColor: "#000000",
    impactAmtSize: "36",
    impactAmtFont: "Inter",
    impactDescColor: "#4B5563",
    impactDescSize: "14",
    impactDescFont: "Inter",
    impactAmt1: "25",
    impactDesc1: "Helps cover transportation costs for a patient's medical appointment",
    impactAmt2: "50",
    impactDesc2: "Provides essential daily living supplies for a week",
    impactAmt3: "100",
    impactDesc3: "Contributes toward prosthetic fitting and adjustment costs",
    impactAmt4: "500",
    impactDesc4: "Funds a significant portion of a prosthetic device for a cancer warrior",
    everyDollarTitle: "Every Dollar Counts",
    everyDollarTitleSize: "36",
    everyDollarTitleColor: "#FFFFFF",
    everyDollarTitleFont: "Inter",
    everyDollarDesc: "100% of donations go directly to supporting cancer warriors. Five Time Foundation™ is committed to making every dollar count.",
    everyDollarDescSize: "16",
    everyDollarDescColor: "#E5E7EB",
    everyDollarDescFont: "Inter",
    everyDollarBgColor: "#1A1C23",
    everyDollarBgImage: "",
    everyDollarBgSize: "fill",
    everyDollarBgPosition: "center",
    everyDollarBtnText: "SHOP MERCHANDISE",
    everyDollarBtnSize: "14",
    everyDollarBtnColor: "#111827",
    everyDollarBtnBg: "#FFFFFF",
    everyDollarBtnFont: "Inter",
    philosophyTitle: "The \"Five Time\" Philosophy",
    philosophyDesc: "Named after the sheer number of times Rich had to overcome the impossible, \"Five Time\" represents the moment when survival becomes second nature and Thriving becomes the only objective. We believe every amputee deserves the chance to thrive, not just survive.",
    philosophyBg: "",
    philosophyBgColor: "#000000",
    philosophyOverlay: "0.6",
    philosophyBgSize: "fill",
    philosophyBgPosition: "center"
  });

  const [stories, setStories] = useState<any[]>([
    {
      id: 'connor',
      name: 'Connor Young',
      tag: '',
      journey: 'Connor is a courageous 5-year-old from Illinois battling Ewing Sarcoma, a rare and aggressive cancer. After 15+ rounds of chemotherapy and a life-changing rotationplasty surgery, Connor continues to fight with incredible strength.',
      help: 'Through the Five Time Foundation™, we’ve raised funds to bring Connor and his family to A Step Ahead Prosthetics, where he’ll receive a world-class prosthetic giving him the freedom to move, play, and just be a kid again.',
      img: 'https://drive.google.com/drive/folders/1JQ0x7yNQZONjYHDjgOGgjah8srTl9Lpk?usp=sharing'
    }
  ]);

  const [categories, setCategories] = useState(['T-Shirt', 'Hoodie', 'Accessory']);
  const [merch, setMerch] = useState<any[]>([
    { id: 'tshirt_white', name: 'fckcncr Unisex T-Shirt', price: '30.00', inventory: '45', category: 'T-Shirt', sizes: ['S', 'M', 'L', 'XL'], desc: 'The signature fckcncr monochrome unisex t-shirt.', img: 'https://secret-mongoose-212.convex.cloud/api/storage/kg25kk7kdfgec3qtbzeh141n318br9pw', imgBack: 'https://secret-mongoose-212.convex.cloud/api/storage/kg22jehgy385g52nevhz0x268x8br2k1', stripeUrl: 'https://checkout.stripe.com/pay/placeholder', paypalUrl: 'https://paypal.me/placeholder', colors: 'White, Black' },
    { id: 'tshirt_green', name: 'fckcncr Unisex T-Shirt Green', price: '30.00', inventory: '12', category: 'T-Shirt', sizes: ['S', 'M', 'L'], desc: 'The signature fckcncr green edition unisex t-shirt.', img: 'https://secret-mongoose-212.convex.cloud/api/storage/kg21x8cxfvzb7g4kncnhx9fg6n8brj7r', imgBack: 'https://secret-mongoose-212.convex.cloud/api/storage/kg23atps553ct09k3pa75pfbq58brd5h', stripeUrl: 'https://checkout.stripe.com/pay/placeholder', paypalUrl: 'https://paypal.me/placeholder', colors: 'Green' },
    { id: 'tshirt_pink', name: 'fckcncr Unisex T-Shirt Pink', price: '30.00', inventory: '8', category: 'T-Shirt', sizes: ['S', 'M', 'L', 'XL'], desc: 'The signature fckcncr pink edition unisex t-shirt.', img: 'https://secret-mongoose-212.convex.cloud/api/storage/kg258zd8y4qycs1yrxkb440qpx8bs2p3', imgBack: 'https://secret-mongoose-212.convex.cloud/api/storage/kg29frmaevb2vs610mbnyn6xjn8br3jj', stripeUrl: 'https://checkout.stripe.com/pay/placeholder', paypalUrl: 'https://paypal.me/placeholder', colors: 'Pink' },
    { id: 'hoodie_red', name: 'Unisex Hoodie', price: '50.00', inventory: '20', category: 'Hoodie', sizes: ['M', 'L', 'XL'], desc: 'Premium heavy-weight unisex hoodie.', img: 'https://secret-mongoose-212.convex.cloud/api/storage/kg299fcmv98yy7102v92mefbdx8bs36y', imgBack: 'https://secret-mongoose-212.convex.cloud/api/storage/kg20xy988gg9sbkvm8sa0zsw8n8bry3e', stripeUrl: 'https://checkout.stripe.com/pay/placeholder', paypalUrl: 'https://paypal.me/placeholder', colors: 'Red' },
  ]);

  const [events, setEvents] = useState<any[]>([
    { id: 'event_1', title: 'Warrior Walk 2026', date: 'May 15, 2026', loc: 'Central Park, NY', desc: 'Our annual community walk to raise awareness and funds for cancer warrior support.', img: '/event_1.png' },
    { id: 'event_2', title: 'Symmetry Pop-up', date: 'June 02, 2026', loc: 'SoHo, NY', desc: 'Connect with the community and snag exclusive 5X gear.', img: '/event_2.png' },
    { id: 'event_3', title: 'Warrior Tech Expo', date: 'July 20, 2026', loc: 'Long Island City, NY', desc: 'Presenting advancements in prosthetic tech for cancer survivors.', img: '/event_3.png' },
  ]);

  useEffect(() => {
    const isAuth = localStorage.getItem("admin_auth");
    if (!isAuth) {
      router.push("/admin/login");
    }
  }, [router]);

  useEffect(() => {
    async function loadAllData() {
      // 1. Load from localStorage immediately so the UI is filled with cached changes
      const savedContent = localStorage.getItem('siteContent');
      if (savedContent) {
        const parsedContent = JSON.parse(savedContent);
        setContent(prev => ({ ...prev, ...parsedContent }));
        setSiteImages(prev => prev.map(img => {
          let dbVal = parsedContent[img.id];
          if (img.id === 'hero_gdrive_link' && !dbVal) {
            dbVal = parsedContent.hero_gdrive_link || parsedContent.hero_1 || "";
          }
          return dbVal ? { ...img, current: dbVal } : img;
        }));
      }
      const savedStories = localStorage.getItem('siteStories');
      if (savedStories) {
        const parsed = JSON.parse(savedStories);
        setStories(Array.isArray(parsed) ? parsed : [parsed]);
      }
      const savedCats = localStorage.getItem('siteCategories');
      if (savedCats) setCategories(JSON.parse(savedCats));
      const savedMerch = localStorage.getItem('siteMerch');
      if (savedMerch) setMerch(JSON.parse(savedMerch));
      const savedEvents = localStorage.getItem('siteEvents');
      if (savedEvents) setEvents(JSON.parse(savedEvents));

      // 2. Fetch fresh data from Supabase and synchronize
      try {
        const dbContent = await getSiteContent('siteContent');
        if (dbContent) {
          const parsedContent = JSON.parse(dbContent);
          setContent(prev => ({ ...prev, ...parsedContent }));
          setSiteImages(prev => prev.map(img => {
            let dbVal = parsedContent[img.id];
            if (img.id === 'hero_gdrive_link' && !dbVal) {
              dbVal = parsedContent.hero_gdrive_link || parsedContent.hero_1 || "";
            }
            return dbVal ? { ...img, current: dbVal } : img;
          }));
          localStorage.setItem('siteContent', dbContent);
        }

        const dbStories = await getSiteContent('siteStories');
        if (dbStories) {
          const parsedStories = JSON.parse(dbStories);
          setStories(Array.isArray(parsedStories) ? parsedStories : [parsedStories]);
          localStorage.setItem('siteStories', dbStories);
        }

        const dbCats = await getSiteContent('siteCategories');
        if (dbCats) {
          setCategories(JSON.parse(dbCats));
          localStorage.setItem('siteCategories', dbCats);
        }

        const dbMerch = await getSiteContent('siteMerch');
        if (dbMerch) {
          setMerch(JSON.parse(dbMerch));
          localStorage.setItem('siteMerch', dbMerch);
        }

        const dbEvents = await getSiteContent('siteEvents');
        if (dbEvents) {
          setEvents(JSON.parse(dbEvents));
          localStorage.setItem('siteEvents', dbEvents);
        }
      } catch (err) {
        console.error("Error loading dashboard data from Supabase:", err);
      }
    }
    loadAllData();
  }, []);

  useEffect(() => {
    getReservations().then(setReservations);
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, id: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    
    // Use unique name per upload: id + timestamp + original extension
    const fileExt = file.name.split('.').pop() || 'jpg';
    formData.append('name', `${id}-${Date.now()}.${fileExt}`);

    setIsSaving(true);
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        // Update the state with the raw hosted URL from Supabase Storage or local disk
        const returnedUrl = data.url;
        
        setSiteImages(prev => prev.map(img => 
          img.id === id ? { ...img, current: returnedUrl } : img
        ));

        // 1. Is it a global website asset?
        const contentKeys = [
          'logo', 'hero_gdrive_link', 'rich', 'richDesktop', 'richTablet', 'richMobile', 'fundraisingBg', 'fundraisingBgDesktop', 'fundraisingBgTablet', 'fundraisingBgMobile', 'shopBanner', 'donateBanner', 
          'philosophyBg', 'everyDollarBgImage', 'eventBanner',
          'adTopDesktop', 'adTopTablet', 'adTopMobile',
          'adMiddleDesktop', 'adMiddleTablet', 'adMiddleMobile',
          'adBottomDesktop', 'adBottomTablet', 'adBottomMobile',
          'adTopTextSize', 'adTopTextColor',
          'adMiddleTextSize', 'adMiddleTextColor',
          'adBottomTextSize', 'adBottomTextColor'
        ];

        if (contentKeys.includes(id)) {
          let updatedContentValue = returnedUrl;
          if (id === 'hero_gdrive_link') {
            const currentLinks = content.hero_gdrive_link || "";
            updatedContentValue = currentLinks.trim() ? `${currentLinks}\n${returnedUrl}` : returnedUrl;
            setSiteImages(sImg => sImg.map(img => 
              img.id === id ? { ...img, current: updatedContentValue } : img
            ));
          }
          
          const newContent = { ...content, [id]: updatedContentValue };
          setContent(newContent);
          await updateSiteContent('siteContent', JSON.stringify(newContent));
          localStorage.setItem('siteContent', JSON.stringify(newContent));
          window.dispatchEvent(new Event("siteContentUpdated"));
        }

        // 2. Is it a survivor story?
        if (stories.some(s => s.id === id)) {
          const newStories = stories.map(s => {
            if (s.id === id) {
              const { transition: t, urls } = parseStoryImg(s.img || "");
              if (urls.length >= 5) return s;
              const updatedImg = buildStoryImg(s.transition || t || 'fade', [...urls, returnedUrl]);
              return { ...s, img: updatedImg };
            }
            return s;
          });
          setStories(newStories);
          await updateSiteContent('siteStories', JSON.stringify(newStories));
          localStorage.setItem('siteStories', JSON.stringify(newStories));
        }

        // 3. Is it a merch product?
        const isProductBack = id.endsWith('_back');
        const targetProdId = isProductBack ? id.replace('_back', '') : id;
        if (merch.some(m => m.id === targetProdId)) {
          const newMerch = merch.map(m => {
            if (m.id === targetProdId) {
              return isProductBack ? { ...m, imgBack: returnedUrl } : { ...m, img: returnedUrl };
            }
            return m;
          });
          setMerch(newMerch);
          await updateSiteContent('siteMerch', JSON.stringify(newMerch));
          localStorage.setItem('siteMerch', JSON.stringify(newMerch));
        }

        // 4. Is it a scheduled event?
        if (events.some(ev => ev.id === id)) {
          const newEvents = events.map(ev => 
            ev.id === id ? { ...ev, img: returnedUrl } : ev
          );
          setEvents(newEvents);
          await updateSiteContent('siteEvents', JSON.stringify(newEvents));
          localStorage.setItem('siteEvents', JSON.stringify(newEvents));
        }

        alert(`${id.toUpperCase()} file successfully uploaded and synchronized to Supabase.`);
      } else {
        alert(`Error: ${data.error || 'Upload failed'}`);
      }
    } catch (e) {
      console.error(e);
      alert('Upload failed. Check server connection.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      const p1 = updateSiteContent('siteContent', JSON.stringify(content));
      const p2 = updateSiteContent('siteMerch', JSON.stringify(merch));
      const p3 = updateSiteContent('siteCategories', JSON.stringify(categories));
      const p4 = updateSiteContent('siteEvents', JSON.stringify(events));
      const p5 = updateSiteContent('siteStories', JSON.stringify(stories));
      
      const results = await Promise.all([p1, p2, p3, p4, p5]);
      
      // Also update localStorage as a robust cache layer
      localStorage.setItem('siteContent', JSON.stringify(content));
      localStorage.setItem('siteMerch', JSON.stringify(merch));
      localStorage.setItem('siteCategories', JSON.stringify(categories));
      localStorage.setItem('siteEvents', JSON.stringify(events));
      localStorage.setItem('siteStories', JSON.stringify(stories));
      window.dispatchEvent(new Event("siteContentUpdated"));
      
      const errors = results.filter(r => !r.success);
      if (errors.length > 0) {
        console.error("Some Supabase updates failed:", errors);
        alert('Warning: Some changes could not be saved to Supabase (check database connection). Local cache updated.');
      } else {
        alert('All changes successfully saved and published live to Supabase!');
      }
    } catch (err) {
      console.error("Failed to save to Supabase:", err);
      alert('Error saving to Supabase. Check network/config. Local cache updated.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col lg:flex-row">
      <style dangerouslySetInnerHTML={{ __html: `
        :root {
          --font-primary: ${content.themeFontFamily || 'Inter'}, sans-serif !important;
          --heading-case: ${content.themeHeadingCase || 'uppercase'} !important;
        }
        .text-brand-blue {
          color: ${content.themeBrandColor || '#00A3FF'} !important;
        }
        .bg-brand-blue {
          background-color: ${content.themeBrandColor || '#00A3FF'} !important;
        }
        .border-brand-blue {
          border-color: ${content.themeBrandColor || '#00A3FF'} !important;
        }
      ` }} />
      <input 
        id="image-upload" 
        type="file" 
        className="hidden" 
        accept="image/*"
        onChange={(e) => {
          const id = (e.target as any).dataset.currentId;
          handleFileChange(e, id);
        }}
      />

      {/* Mobile Sticky Header */}
      <div className="lg:hidden bg-brand-black text-white flex items-center justify-between p-6 sticky top-0 z-40 border-b border-white/5 w-full">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center overflow-hidden border-2 border-brand-blue">
            <img src="/logo.png" className="w-full h-full object-cover" alt="logo" />
          </div>
          <div className="font-black text-lg tracking-tighter uppercase font-mono italic">5XADMIN</div>
        </Link>
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="p-2 hover:bg-white/10 rounded-lg transition-all"
        >
          <Menu size={24} />
        </button>
      </div>

      {/* Backdrop for Mobile Sidebar Drawer */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar - sliding drawer on mobile, sticky sidebar on desktop */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-80 bg-brand-black text-white flex flex-col h-screen shadow-2xl transition-transform duration-305 lg:translate-x-0 lg:static lg:z-auto
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-10 flex items-center justify-between border-b border-white/5">
          <Link href="/" className="flex items-center gap-4 hover:opacity-90 active:scale-95 transition-all group">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center overflow-hidden border-2 border-brand-blue group-hover:scale-105 transition-transform duration-300">
              <img src="/logo.png" className="w-full h-full object-cover" alt="logo" />
            </div>
            <div className="font-black text-xl tracking-tighter uppercase font-mono italic">5XADMIN</div>
          </Link>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden p-2 hover:bg-white/10 rounded-lg transition-all text-white/70 hover:text-white"
          >
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 p-6 space-y-3 overflow-y-auto mt-6">
          {[
            { id: 'media', icon: <ImageIcon size={18} />, label: 'Image Manager' },
            { id: 'content', icon: <FileEdit size={18} />, label: 'Text Content' },
            { id: 'who_we_help', icon: <Users size={18} />, label: 'Who we help' },
            { id: 'events', icon: <Calendar size={18} />, label: 'Event Center' },
            { id: 'merch', icon: <Tag size={18} />, label: 'Shop Pricing' },
            { id: 'theme', icon: <Layout size={18} />, label: 'Theme Settings' },
            { id: 'ads', icon: <Sliders size={18} />, label: 'Advertisement' },
            { id: 'donations', icon: <Heart size={18} />, label: 'Donations' },
            { id: 'rsvps', icon: <UserPlus size={18} />, label: 'RSVPs' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                setIsSidebarOpen(false);
              }}
              className={`w-full flex items-center justify-between px-6 py-4 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all group ${activeTab === tab.id ? 'bg-brand-blue text-white shadow-xl shadow-brand-blue/20' : 'text-gray-500 hover:bg-white/5 hover:text-white'}`}
            >
              <div className="flex items-center gap-4">
                {tab.icon}
                {tab.label}
              </div>
            </button>
          ))}
        </nav>

        <div className="p-8 border-t border-white/5">
          <button 
            onClick={() => {
               localStorage.removeItem("admin_auth");
               router.push("/admin/login");
            }}
            className="w-full flex items-center gap-4 px-6 py-4 rounded-xl text-red-500 font-bold hover:bg-red-500/10 transition-all text-sm tracking-[0.2em] uppercase"
          >
            <LogOut size={20} /> Exit System
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 sm:p-8 lg:p-16 overflow-y-auto w-full max-w-full">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 mb-8 sm:mb-16">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-3 px-4 py-2 bg-brand-blue/10 text-brand-blue rounded-full">
              <div className="w-2 h-2 bg-brand-blue rounded-full animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest">Portal Online</span>
            </div>
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tighter capitalize">{activeTab.replace(/_/g, ' ')}</h1>
          </div>

          <button 
            onClick={handleSaveAll}
            disabled={isSaving}
            className="w-full sm:w-auto bg-brand-black text-white px-10 py-5 rounded-full font-black text-xs uppercase tracking-[0.3em] flex items-center justify-center gap-4 hover:bg-brand-blue transition-all disabled:opacity-50 shadow-2xl shrink-0"
          >
            <Save size={18} /> {isSaving ? "Working..." : "Save Changes"}
          </button>
        </header>

        <div className="bg-white rounded-[1.5rem] sm:rounded-[3rem] p-4 sm:p-8 lg:p-12 shadow-2xl border border-gray-100 min-h-[600px]">
          <AnimatePresence mode="wait">
            {activeTab === 'media' && (
              <motion.div
                key="media"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-8"
              >
                {siteImages.map((img) => {
                  const isGDriveSlider = img.id === 'hero_gdrive_link';
                  
                  return (
                    <div key={img.id} className={`p-8 bg-brand-gray/30 rounded-[2rem] border border-transparent hover:border-brand-blue/20 transition-all group ${isGDriveSlider || img.id === 'rich' || img.id === 'fundraisingBg' ? 'md:col-span-2' : ''}`}>
                       <div className="flex justify-between items-start mb-6">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-blue mb-1">{img.page}</p>
                          <h4 className="text-lg font-black tracking-tight">{img.label}</h4>
                        </div>
                        <span className="text-[10px] font-bold text-gray-400">{img.dims}</span>
                       </div>
                       
                       {isGDriveSlider ? (
                         <div className="space-y-6">
                           {/* Google Drive Slideshow Premium Info & Preview Panel */}
                           <div className="bg-brand-black text-white p-8 rounded-2xl flex flex-col md:flex-row gap-6 items-center justify-between shadow-lg relative overflow-hidden">
                             <div className="absolute right-0 bottom-0 translate-x-1/4 translate-y-1/4 opacity-5 pointer-events-none">
                               <Sliders size={200} />
                             </div>
                             
                             <div className="space-y-3 z-10 flex-1">
                               <div className="flex items-center gap-3">
                                 <div className="w-8 h-8 bg-brand-blue rounded-full flex items-center justify-center">
                                   <Sliders size={14} className="text-white animate-pulse" />
                                 </div>
                                 <span className="text-[10px] font-black tracking-widest uppercase text-brand-blue">Dynamic Background Slider</span>
                               </div>
                               <h5 className="text-xl font-bold tracking-tight">Active Slideshow Assets</h5>
                               <p className="text-xs text-gray-400 max-w-lg leading-relaxed">
                                 Paste a **Google Drive Folder link** (set sharing to <em>"Anyone with the link can view"</em>) or paste **direct image links (one per line)**. You can also upload local images below to host them on Supabase and append them to the slideshow!
                               </p>
                             </div>
                             
                             <button
                               type="button"
                               onClick={() => {
                                 const input = document.getElementById('image-upload') as any;
                                 input.dataset.currentId = img.id;
                                 input.click();
                               }}
                               className="bg-white/10 hover:bg-white/20 text-white border border-white/10 px-6 py-4 rounded-xl text-[10px] font-black tracking-[0.2em] uppercase transition-all flex items-center gap-3 z-10"
                             >
                               <Upload size={14} /> Upload & Append Image
                             </button>
                           </div>

                           {/* Real-time Fetch Tester */}
                           <GDriveFolderTester folderUrl={img.current} />
                           
                           <div className="space-y-2">
                             <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Google Drive Folder URL / Direct Image Links (One per line)</label>
                             <textarea 
                               rows={6}
                               className="w-full bg-white px-5 py-4 rounded-xl font-mono text-xs border border-gray-200 focus:ring-2 focus:ring-brand-blue focus:border-brand-blue transition-all"
                               value={img.current}
                               placeholder="Paste a Google Drive folder link OR multiple direct image URLs (one per line) here..."
                               onChange={(e) => {
                                 const val = e.target.value;
                                 // Update siteImages preview
                                 setSiteImages(prev => prev.map(item => 
                                   item.id === img.id ? { ...item, current: val } : item
                                 ));
                                 // Update content state
                                 setContent(prev => ({ ...prev, hero_gdrive_link: val }));
                               }}
                             />
                           </div>
                         </div>
                        ) : img.id === 'fundraisingBg' || img.id === 'rich' ? (
                          <>
                            <div className="space-y-5">
                              <div className="flex bg-gray-200/80 rounded-2xl p-1.5 w-fit">
                                {[
                                  { label: "Creative Asset", val: "media" },
                                  { label: "HTML / Script", val: "html" }
                                ].map((mode) => (
                                  <button
                                    type="button"
                                    key={mode.val}
                                    onClick={() => setContent(prev => ({ ...prev, [img.id === 'fundraisingBg' ? 'fundraisingBgType' : 'richType']: mode.val }))}
                                    className={`px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all ${
                                      (content[img.id === 'fundraisingBg' ? 'fundraisingBgType' : 'richType'] || "media") === mode.val
                                        ? "bg-black text-white shadow-md"
                                        : "text-gray-400 hover:text-black"
                                    }`}
                                  >
                                    {mode.label}
                                  </button>
                                ))}
                              </div>
                              {(content[img.id === 'fundraisingBg' ? 'fundraisingBgType' : 'richType'] || "media") === "html" ? (
                                <div>
                                  <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2">HTML / Embed Code</label>
                                  <textarea
                                    rows={4}
                                    className="w-full bg-white border border-gray-200 px-5 py-4 rounded-xl font-mono text-xs text-black"
                                    value={content[img.id === 'fundraisingBg' ? 'fundraisingBgHtml' : 'richHtml'] || ''}
                                    onChange={(e) => setContent(prev => ({ ...prev, [img.id === 'fundraisingBg' ? 'fundraisingBgHtml' : 'richHtml']: e.target.value }))}
                                    placeholder="<div>Your custom HTML here...</div>"
                                  />
                                </div>
                              ) : (
                                <div className="space-y-5">
                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    {["Desktop", "Tablet", "Mobile"].map((device) => {
                                      const contentKey = img.id === 'fundraisingBg' ? `fundraisingBg${device}` : `rich${device}`;
                                      return (
                                        <div key={device}>
                                          <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2">{device} URL</label>
                                          <div className="flex gap-2">
                                            <input
                                              type="text"
                                              className="flex-1 bg-white border border-gray-200 px-4 py-3 rounded-xl font-bold text-xs text-black"
                                              value={(content as any)[contentKey] || ''}
                                              onChange={(e) => setContent(prev => ({ ...prev, [contentKey]: e.target.value }))}
                                              placeholder="https://..."
                                            />
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const input = document.getElementById('image-upload') as any;
                                                input.dataset.currentId = contentKey;
                                                input.click();
                                              }}
                                              className="bg-brand-blue hover:bg-black text-white px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shrink-0"
                                            >Upload</button>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-3 border-t border-gray-150">
                                    <div>
                                      <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2">Banner Layout Mode</label>
                                      <select
                                        className="w-full bg-white border border-gray-200 px-4 py-3 rounded-xl font-bold text-xs text-black shadow-sm"
                                        value={content[img.id === 'fundraisingBg' ? 'fundraisingBgLayout' : 'richLayout'] || 'full'}
                                        onChange={(e) => setContent(prev => ({ ...prev, [img.id === 'fundraisingBg' ? 'fundraisingBgLayout' : 'richLayout']: e.target.value }))}
                                      >
                                        <option value="full">Full Overlay</option>
                                        <option value="split">Split Screen</option>
                                      </select>
                                    </div>
                                    <div>
                                      <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2">Text Placement</label>
                                      <select
                                        className="w-full bg-white border border-gray-200 px-4 py-3 rounded-xl font-bold text-xs text-black shadow-sm"
                                        value={content[img.id === 'fundraisingBg' ? 'fundraisingBgPlacement' : 'richPlacement'] || 'center'}
                                        onChange={(e) => setContent(prev => ({ ...prev, [img.id === 'fundraisingBg' ? 'fundraisingBgPlacement' : 'richPlacement']: e.target.value }))}
                                      >
                                        <option value="left">Left</option>
                                        <option value="center">Center</option>
                                        <option value="right">Right</option>
                                      </select>
                                    </div>
                                    <div>
                                      <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2">Banner Fit</label>
                                      <select
                                        className="w-full bg-white border border-gray-200 px-4 py-3 rounded-xl font-bold text-xs text-black shadow-sm"
                                        value={content[img.id === 'fundraisingBg' ? 'fundraisingBgSize' : 'richSize'] || 'cover'}
                                        onChange={(e) => setContent(prev => ({ ...prev, [img.id === 'fundraisingBg' ? 'fundraisingBgSize' : 'richSize']: e.target.value }))}
                                      >
                                        <option value="cover">Cover</option>
                                        <option value="centered">Contain</option>
                                        <option value="stretch">Stretch</option>
                                      </select>
                                    </div>
                                    <div>
                                      <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2">Position</label>
                                      <select
                                        className="w-full bg-white border border-gray-200 px-4 py-3 rounded-xl font-bold text-xs text-black shadow-sm"
                                        value={content[img.id === 'fundraisingBg' ? 'fundraisingBgPosition' : 'richPosition'] || 'center'}
                                        onChange={(e) => setContent(prev => ({ ...prev, [img.id === 'fundraisingBg' ? 'fundraisingBgPosition' : 'richPosition']: e.target.value }))}
                                      >
                                        <option value="center">Center</option>
                                        <option value="top">Top</option>
                                        <option value="bottom">Bottom</option>
                                        <option value="left">Left</option>
                                        <option value="right">Right</option>
                                      </select>
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-gray-150">
                                    <div>
                                      <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2">Link URL</label>
                                      <input
                                        type="text"
                                        className="w-full bg-white border border-gray-200 px-4 py-3 rounded-xl font-bold text-xs text-black"
                                        value={content[img.id === 'fundraisingBg' ? 'fundraisingBgLink' : 'richLink'] || ''}
                                        onChange={(e) => setContent(prev => ({ ...prev, [img.id === 'fundraisingBg' ? 'fundraisingBgLink' : 'richLink']: e.target.value }))}
                                        placeholder="https://..."
                                      />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                      <div>
                                        <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2">Text Size (px)</label>
                                        <input
                                          type="number"
                                          min="8"
                                          max="72"
                                          className="w-full bg-white border border-gray-200 px-4 py-3 rounded-xl font-bold text-xs text-black"
                                          value={content[img.id === 'fundraisingBg' ? 'fundraisingBgTextSize' : 'richTextSize'] || '14'}
                                          onChange={(e) => setContent(prev => ({ ...prev, [img.id === 'fundraisingBg' ? 'fundraisingBgTextSize' : 'richTextSize']: e.target.value }))}
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2">Text Color</label>
                                        <div className="flex gap-2">
                                          <input
                                            type="color"
                                            className="w-10 h-10 rounded-xl border border-gray-200 cursor-pointer"
                                            value={content[img.id === 'fundraisingBg' ? 'fundraisingBgTextColor' : 'richTextColor'] || '#FFFFFF'}
                                            onChange={(e) => setContent(prev => ({ ...prev, [img.id === 'fundraisingBg' ? 'fundraisingBgTextColor' : 'richTextColor']: e.target.value }))}
                                          />
                                          <input
                                            type="text"
                                            className="flex-1 bg-white border border-gray-200 px-3 py-2 rounded-xl font-bold text-[10px] text-black uppercase"
                                            value={content[img.id === 'fundraisingBg' ? 'fundraisingBgTextColor' : 'richTextColor'] || '#FFFFFF'}
                                            onChange={(e) => setContent(prev => ({ ...prev, [img.id === 'fundraisingBg' ? 'fundraisingBgTextColor' : 'richTextColor']: e.target.value }))}
                                            placeholder="#FFFFFF"
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                            {/* Live Preview */}
                            {(() => {
                              const pType = content[img.id === 'fundraisingBg' ? 'fundraisingBgType' : 'richType'] || "media";
                              const pDesktop = content[img.id === 'fundraisingBg' ? 'fundraisingBgDesktop' : 'richDesktop']?.trim() || img.current;
                              const pTablet = content[img.id === 'fundraisingBg' ? 'fundraisingBgTablet' : 'richTablet']?.trim() || pDesktop;
                              const pMobile = content[img.id === 'fundraisingBg' ? 'fundraisingBgMobile' : 'richMobile']?.trim() || pTablet;
                              const pHtml = content[img.id === 'fundraisingBg' ? 'fundraisingBgHtml' : 'richHtml']?.trim();
                              const pLink = content[img.id === 'fundraisingBg' ? 'fundraisingBgLink' : 'richLink']?.trim();
                              const isSplit = (content[img.id === 'fundraisingBg' ? 'fundraisingBgLayout' : 'richLayout'] || 'full') === 'split';
                              const pTextSize = content[img.id === 'fundraisingBg' ? 'fundraisingBgTextSize' : 'richTextSize'] || '14';
                              const pTextColor = content[img.id === 'fundraisingBg' ? 'fundraisingBgTextColor' : 'richTextColor'] || '#FFFFFF';
                              const pPosition = content[img.id === 'fundraisingBg' ? 'fundraisingBgPosition' : 'richPosition'] || 'center';
                              const pFit = content[img.id === 'fundraisingBg' ? 'fundraisingBgSize' : 'richSize'] || 'cover';
                              const isCenter = (content[img.id === 'fundraisingBg' ? 'fundraisingBgPlacement' : 'richPlacement'] || 'center') === 'center';
                              const isRight = (content[img.id === 'fundraisingBg' ? 'fundraisingBgPlacement' : 'richPlacement'] || 'center') === 'right';
                              const src = previewDevice === 'desktop' ? pDesktop : previewDevice === 'tablet' ? pTablet : pMobile;

                              if (pType === "html" && pHtml) {
                                return (
                                  <div className="mt-6 pt-6 border-t border-gray-150 space-y-3">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-brand-blue block">Live Preview</span>
                                    <div className="bg-white border border-gray-200 rounded-2xl p-6 overflow-hidden flex justify-center items-center min-h-[120px] text-xs text-gray-500" dangerouslySetInnerHTML={{ __html: pHtml }} />
                                  </div>
                                );
                              }

                              if (!src) return null;

                              const fitStyle = pFit === 'centered' ? 'contain' : pFit === 'stretch' ? '100% 100%' : 'cover';

                              return (
                                <div className="mt-6 pt-6 border-t border-gray-150 space-y-3">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-brand-blue block">Live Preview</span>
                                    <div className="flex items-center bg-gray-150 p-0.5 rounded-xl border border-gray-200 shadow-sm w-fit">
                                      {["desktop","tablet","mobile"].map((d) => (
                                        <button
                                          key={d}
                                          type="button"
                                          onClick={() => setPreviewDevice(d as any)}
                                          className={`px-2.5 py-1 rounded-lg text-[7px] font-black uppercase tracking-wider transition-all ${previewDevice === d ? 'bg-brand-blue text-white shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
                                        >
                                          {d === 'desktop' ? 'DT' : d === 'tablet' ? 'TB' : 'MB'}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                  <div className="bg-black rounded-xl overflow-hidden shadow-lg flex select-none" style={{ height: previewDevice === 'desktop' ? '120px' : previewDevice === 'tablet' ? '140px' : '160px' }}>
                                    {isSplit ? (
                                      <div className="flex w-full h-full">
                                        <div className="w-1/2 h-full flex flex-col justify-center p-3" style={{ textAlign: isCenter ? 'center' : isRight ? 'right' : 'left' }}>
                                          <span className="text-[6px] uppercase tracking-widest font-bold" style={{ color: pTextColor }}>Slot</span>
                                          <div style={{ fontSize: `${Math.min(parseInt(pTextSize) / 4, 12)}px`, color: pTextColor }} className="font-black italic leading-none">PREVIEW</div>
                                        </div>
                                        <div className="w-1/2 h-full" style={{ backgroundImage: `url(${src})`, backgroundSize: fitStyle, backgroundPosition: pPosition, backgroundRepeat: 'no-repeat' }} />
                                      </div>
                                    ) : (
                                      <div className="relative w-full h-full">
                                        <div className="absolute inset-0" style={{ backgroundImage: `url(${src})`, backgroundSize: fitStyle, backgroundPosition: pPosition, backgroundRepeat: 'no-repeat' }} />
                                        <div className="absolute inset-0 bg-black/40" />
                                        <div className="absolute inset-0 flex items-center justify-center" style={{ fontSize: `${Math.min(parseInt(pTextSize) / 3, 14)}px`, color: pTextColor }}>
                                          PREVIEW
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })()}
                          </>
                        ) : (
                          <>
                            <div 
                              onClick={() => {
                                const input = document.getElementById('image-upload') as any;
                                input.dataset.currentId = img.id;
                                input.click();
                              }}
                              className="aspect-video relative rounded-2xl overflow-hidden mb-4 bg-black cursor-pointer shadow-md"
                            >
                               <img src={getDisplayUrl(img.current)} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt={img.label} />
                               <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-all">
                                 <Upload className="text-white mb-2" size={32} />
                                 <span className="text-white text-[10px] font-black tracking-widest uppercase">Click to Replace</span>
                               </div>
                            </div>

                            <div className="mt-4 space-y-2">
                              <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Direct Link / URL</label>
                              <input 
                                type="text" 
                                className="w-full bg-white px-5 py-3 rounded-xl font-bold text-xs border border-gray-200 focus:ring-2 focus:ring-brand-blue focus:border-brand-blue transition-all"
                                value={img.current}
                                placeholder="Paste image link here (e.g. from Google Drive)..."
                                onChange={(e) => {
                                  const val = e.target.value;
                                  // Update siteImages preview
                                  setSiteImages(prev => prev.map(item => 
                                    item.id === img.id ? { ...item, current: val } : item
                                  ));
                                  // Update content state
                                  setContent(prev => ({ ...prev, [img.id]: val }));
                                }}
                                onBlur={async (e) => {
                                  const val = e.target.value.trim();
                                  if (val.includes('drive.google.com') || val.includes('googleusercontent.com')) {
                                    try {
                                      const res = await fetch('/api/upload', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ gdriveUrl: val })
                                      });
                                      const data = await res.json();
                                      const newUrl = data.url || (data.images && data.images[0]) || val;
                                      setSiteImages(prev => prev.map(item => 
                                        item.id === img.id ? { ...item, current: newUrl } : item
                                      ));
                                      setContent(prev => ({ ...prev, [img.id]: newUrl }));
                                      if (data.url || (data.images && data.images.length > 0)) {
                                        alert(`${img.label} procesado: imagen subida a Convex Storage con link permanente.`);
                                      }
                                    } catch (_) {}
                                  }
                                }}
                              />
                            </div>
                          </>
                        )}
                    </div>
                  );
                })}
              </motion.div>
            )}

            {activeTab === 'content' && (
               <motion.div
                key="text"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid grid-cols-1 lg:grid-cols-2 gap-12"
               >
                 <div className="space-y-12 lg:col-span-2">
                    <h3 className="text-2xl font-black italic tracking-tighter">Homepage Text Management</h3>
                    <p className="text-gray-400 text-sm">Edit the global text assets for your landing page below. Click "Save Changes" to publish your edits.</p>
                 </div>

                 {[
                    { label: "Hero Title", key: "heroTitle" },
                    { label: "Hero Description", key: "heroDesc" },
                    { label: "Mission Title", key: "missionTitle" },
                    { label: "Mission Description", key: "missionDesc" },
                    { label: "Stories Title", key: "storiesTitle" },
                    { label: "Fundraising Title", key: "fundraisingTitle" },
                    { label: "Fundraising Description", key: "fundraisingDesc" },
                    { label: "Donation Title", key: "donationTitle" },
                    { label: "Donation Description", key: "donationDesc" },
                    { label: "Donation Button Amounts (Comma-Separated)", key: "donationAmounts", type: "input" },
                    { label: "Custom Donation HTML Embed Code (Optional)", key: "donationHtml", type: "textarea", rows: 6 }
                  ].map((field) => (
                    <div key={field.key} className={`space-y-4 ${field.key === 'donationHtml' ? 'lg:col-span-2' : ''}`}>
                       <label className="block text-[10px] font-black uppercase tracking-[0.3em] text-brand-blue flex items-center gap-2">
                          {field.label}
                       </label>
                       {field.type === 'input' ? (
                         <input
                           type="text"
                           className="w-full bg-brand-gray/50 border-none rounded-3xl p-6 font-bold text-sm leading-relaxed focus:bg-white focus:ring-2 focus:ring-brand-blue transition-all"
                           value={(content as any)[field.key] || ''}
                           onChange={(e) => setContent({...content, [field.key]: e.target.value})}
                         />
                       ) : (
                         <textarea 
                           className={`w-full ${field.rows ? 'h-48' : 'h-32'} bg-brand-gray/50 border-none rounded-3xl p-6 font-bold text-sm leading-relaxed focus:bg-white focus:ring-2 focus:ring-brand-blue transition-all`}
                           value={(content as any)[field.key] || ''}
                           onChange={(e) => setContent({...content, [field.key]: e.target.value})}
                         />
                       )}
                    </div>
                  ))}
               </motion.div>
            )}
            {activeTab === 'merch' && (
              <motion.div
                key="merch"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6 bg-white p-8 rounded-[3.5rem] border border-gray-100 shadow-2xl shadow-black/5"
              >
                <AdminPanel />

                {/* Shop Banner Customizer */}
                <div className="bg-gray-50/50 p-8 rounded-[2.5rem] border border-gray-100 space-y-6 mt-8">
                  <div>
                    <h3 className="text-xl font-black italic tracking-tighter uppercase mb-1">Shop Banner Customization</h3>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Configure background image, layout, alignment, and title/subtitle for the shop page</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-brand-blue mb-2">Shop Title</label>
                        <input
                          type="text"
                          className="w-full bg-white px-5 py-3.5 rounded-xl font-bold text-xs border border-gray-255 focus:ring-2 focus:ring-brand-blue text-black"
                          value={content.shopTitle || ''}
                          onChange={(e) => setContent(prev => ({ ...prev, shopTitle: e.target.value }))}
                          placeholder="5XFOUNDATION MERCH"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-brand-blue mb-2">Banner Description</label>
                        <textarea
                          rows={3}
                          className="w-full bg-white px-5 py-3.5 rounded-xl font-semibold text-xs border border-gray-255 focus:ring-2 focus:ring-brand-blue text-black leading-relaxed"
                          value={content.shopSubtitle || ''}
                          onChange={(e) => setContent(prev => ({ ...prev, shopSubtitle: e.target.value }))}
                          placeholder="Wear your support. 100% of proceeds fund prosthetics and care-related costs..."
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-brand-blue mb-2">Background Banner Image (URL or Upload)</label>
                        <div className="flex gap-3">
                          <input
                            type="text"
                            className="flex-1 bg-white px-5 py-3.5 rounded-xl font-mono text-[10px] border border-gray-255 focus:ring-2 focus:ring-brand-blue text-black"
                            value={content.shopBanner || ''}
                            onChange={(e) => setContent(prev => ({ ...prev, shopBanner: e.target.value }))}
                            placeholder="/shop_banner.png"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const input = document.getElementById('image-upload') as any;
                              input.dataset.currentId = 'shopBanner';
                              input.click();
                            }}
                            className="bg-brand-blue hover:bg-black text-white px-5 py-3.5 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all flex items-center gap-2 shrink-0 shadow-lg shadow-brand-blue/15"
                          >
                            <Upload size={14} /> Upload
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-brand-blue mb-2">Title Color</label>
                          <div className="flex gap-2">
                            <input
                              type="color"
                              className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer overflow-hidden p-0 bg-transparent shrink-0"
                              value={content.shopTitleColor || '#FFFFFF'}
                              onChange={(e) => setContent(prev => ({ ...prev, shopTitleColor: e.target.value }))}
                            />
                            <input
                              type="text"
                              className="flex-1 bg-white px-3 py-2 rounded-lg font-mono text-[10px] border border-gray-200 text-black text-center"
                              value={content.shopTitleColor || '#FFFFFF'}
                              onChange={(e) => setContent(prev => ({ ...prev, shopTitleColor: e.target.value }))}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-brand-blue mb-2">Subtitle Color</label>
                          <div className="flex gap-2">
                            <input
                              type="color"
                              className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer overflow-hidden p-0 bg-transparent shrink-0"
                              value={content.shopSubtitleColor || '#E5E7EB'}
                              onChange={(e) => setContent(prev => ({ ...prev, shopSubtitleColor: e.target.value }))}
                            />
                            <input
                              type="text"
                              className="flex-1 bg-white px-3 py-2 rounded-lg font-mono text-[10px] border border-gray-200 text-black text-center"
                              value={content.shopSubtitleColor || '#E5E7EB'}
                              onChange={(e) => setContent(prev => ({ ...prev, shopSubtitleColor: e.target.value }))}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Sizing Fit & Alignment Position Controls */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4 border-t border-gray-150 text-black">
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-brand-blue">Banner Layout Mode</label>
                      <select 
                        className="w-full bg-white border border-gray-200 px-5 py-3.5 rounded-xl font-bold text-xs focus:ring-2 focus:ring-brand-blue text-black shadow-sm uppercase tracking-wider pr-8"
                        value={content.shopBannerLayout || 'full'}
                        onChange={(e) => setContent(prev => ({ ...prev, shopBannerLayout: e.target.value }))}
                      >
                        <option value="split">Split Screen</option>
                        <option value="full">Full Overlay</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-brand-blue">Text Placement / Alignment</label>
                      <select 
                        className="w-full bg-white border border-gray-200 px-5 py-3.5 rounded-xl font-bold text-xs focus:ring-2 focus:ring-brand-blue text-black shadow-sm uppercase tracking-wider pr-8"
                        value={content.shopBannerPlacement || 'center'}
                        onChange={(e) => setContent(prev => ({ ...prev, shopBannerPlacement: e.target.value }))}
                      >
                        <option value="left">Left</option>
                        <option value="center">Center</option>
                        <option value="right">Right</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-brand-blue">Click Hyperlink Redirect URL</label>
                      <input 
                        type="text"
                        className="w-full bg-white border border-gray-200 px-5 py-3.5 rounded-xl font-bold text-xs focus:ring-2 focus:ring-brand-blue text-black shadow-sm"
                        placeholder="https://example.com"
                        value={content.shopBannerLink || ''}
                        onChange={(e) => setContent(prev => ({ ...prev, shopBannerLink: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-brand-blue">Banner Fit Layout</label>
                      <select 
                        className="w-full bg-white border border-gray-200 px-5 py-3.5 rounded-xl font-bold text-xs focus:ring-2 focus:ring-brand-blue text-black shadow-sm uppercase tracking-wider pr-8"
                        value={content.shopBannerSize || 'fill'}
                        onChange={(e) => setContent(prev => ({ ...prev, shopBannerSize: e.target.value }))}
                      >
                        <option value="fill">Fill (Cover)</option>
                        <option value="fit">Fit (Contain)</option>
                        <option value="stretch">Stretch</option>
                        <option value="tile">Tile</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-brand-blue">Alignment / Position</label>
                      <select 
                        className="w-full bg-white border border-gray-200 px-5 py-3.5 rounded-xl font-bold text-xs focus:ring-2 focus:ring-brand-blue text-black shadow-sm uppercase tracking-wider pr-8"
                        value={content.shopBannerPosition || 'center'}
                        onChange={(e) => setContent(prev => ({ ...prev, shopBannerPosition: e.target.value }))}
                      >
                        <option value="center">Center</option>
                        <option value="top">Top</option>
                        <option value="bottom">Bottom</option>
                        <option value="left">Left</option>
                        <option value="right">Right</option>
                      </select>
                    </div>
                  </div>

                  {/* Live Interactive Preview for Shop Banner */}
                  {(() => {
                    const previewImg = content.shopBanner || '/shop_banner.png';
                    const isSplit = (content.shopBannerLayout || 'full') === 'split';
                    const isCenter = content.shopBannerPlacement === 'center';
                    const isRight = content.shopBannerPlacement === 'right';
                    
                    return (
                      <div className="space-y-3 pt-6 border-t border-gray-150 text-black">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="space-y-0.5">
                            <span className="text-[10px] font-black uppercase tracking-widest text-brand-blue block">Live Interactive Preview</span>
                            <p className="text-[9px] text-gray-500 font-medium">Select a device view to simulate how the banner adapts to different screen sizes.</p>
                          </div>
                          
                          {/* Device View Selector */}
                          <div className="flex items-center bg-gray-150 p-0.5 rounded-xl border border-gray-200 shadow-sm w-fit">
                            <button
                              type="button"
                              onClick={() => setPreviewDevice('desktop')}
                              className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all flex items-center gap-1 ${
                                previewDevice === 'desktop' ? 'bg-brand-blue text-white shadow-sm' : 'text-gray-500 hover:text-gray-800'
                              }`}
                            >
                              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                              Desktop
                            </button>
                            <button
                              type="button"
                              onClick={() => setPreviewDevice('tablet')}
                              className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all flex items-center gap-1 ${
                                previewDevice === 'tablet' ? 'bg-brand-blue text-white shadow-sm' : 'text-gray-500 hover:text-gray-800'
                              }`}
                            >
                              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                              Tablet
                            </button>
                            <button
                              type="button"
                              onClick={() => setPreviewDevice('mobile')}
                              className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all flex items-center gap-1 ${
                                previewDevice === 'mobile' ? 'bg-brand-blue text-white shadow-sm' : 'text-gray-500 hover:text-gray-800'
                              }`}
                            >
                              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                              Phone
                            </button>
                          </div>
                        </div>

                        {/* Simulated Viewport Screen */}
                        <div className="bg-gray-50 border border-gray-150 rounded-2xl p-4 flex items-center justify-center overflow-hidden min-h-[200px]">
                          <div 
                            className="bg-black rounded-xl border border-gray-800 shadow-2xl relative overflow-hidden transition-all duration-300 flex select-none"
                            style={{
                              width: 
                                previewDevice === 'desktop' ? '100%' :
                                previewDevice === 'tablet' ? '380px' : '220px',
                              height: 
                                previewDevice === 'desktop' ? '120px' :
                                previewDevice === 'tablet' ? '140px' : '160px',
                              flexDirection: 
                                isSplit
                                  ? (previewDevice === 'desktop' ? 'row' : 'column-reverse')
                                  : 'column'
                            }}
                          >
                            {isSplit ? (
                              <>
                                {/* Text Side */}
                                <div 
                                  className="bg-[#000000] p-4 flex flex-col justify-center relative z-10 overflow-hidden"
                                  style={{
                                    width: previewDevice === 'desktop' ? '50%' : '100%',
                                    height: previewDevice === 'desktop' ? '100%' : '50%',
                                    textAlign: 
                                      previewDevice === 'mobile' ? 'center' :
                                      isCenter ? 'center' : isRight ? 'right' : 'left',
                                    alignItems: 
                                      previewDevice === 'mobile' ? 'center' :
                                      isCenter ? 'center' : isRight ? 'flex-end' : 'flex-start'
                                  }}
                                >
                                  <span className="text-[5px] uppercase tracking-widest mb-0.5 font-bold" style={{ color: content.shopSubtitleColor || '#E5E7EB' }}>Official Shop</span>
                                  <h1 
                                    className="italic font-black mb-0.5 whitespace-pre-line leading-none tracking-tight"
                                    style={{
                                      fontSize: '12px',
                                      color: content.shopTitleColor || '#FFFFFF',
                                    }}
                                  >
                                    {content.shopTitle || '5XFOUNDATION MERCH'}
                                  </h1>
                                  <p 
                                    className="leading-relaxed opacity-95 line-clamp-1"
                                    style={{
                                      fontSize: '6px',
                                      color: content.shopSubtitleColor || '#E5E7EB',
                                    }}
                                  >
                                    {content.shopSubtitle}
                                  </p>
                                </div>

                                {/* Image Side */}
                                <div 
                                  className="relative bg-zinc-900 flex-1 overflow-hidden"
                                  style={{
                                    width: previewDevice === 'desktop' ? '50%' : '100%',
                                    height: previewDevice === 'desktop' ? '100%' : '50%',
                                    backgroundImage: `url(${previewImg})`,
                                    backgroundSize: 
                                      content.shopBannerSize === 'fit' || content.shopBannerSize === 'contain' ? 'contain' :
                                      content.shopBannerSize === 'stretch' ? '100% 100%' : 'cover',
                                    backgroundPosition: content.shopBannerPosition || 'center',
                                    backgroundRepeat: 'no-repeat'
                                  }}
                                />
                              </>
                            ) : (
                              <>
                                {/* Full Overlay Layout */}
                                <div 
                                  className="absolute inset-0 bg-zinc-900"
                                  style={{
                                    backgroundImage: `url(${previewImg})`,
                                    backgroundSize: 
                                      content.shopBannerSize === 'fit' || content.shopBannerSize === 'contain' ? 'contain' :
                                      content.shopBannerSize === 'stretch' ? '100% 100%' : 'cover',
                                    backgroundPosition: content.shopBannerPosition || 'center',
                                    backgroundRepeat: 'no-repeat'
                                  }}
                                />
                                {/* Overlay shadow */}
                                <div 
                                  className="absolute inset-0 z-10 bg-black"
                                  style={{ opacity: parseFloat(content.shopBannerOverlay || '0.4') }}
                                />
                                {/* Text Content */}
                                <div 
                                  className="absolute inset-0 p-4 flex flex-col justify-center z-20 overflow-hidden"
                                  style={{
                                    textAlign: 
                                      previewDevice === 'mobile' ? 'center' :
                                      isCenter ? 'center' : isRight ? 'right' : 'left',
                                    alignItems: 
                                      previewDevice === 'mobile' ? 'center' :
                                      isCenter ? 'center' : isRight ? 'flex-end' : 'flex-start'
                                  }}
                                >
                                  <span className="text-[5px] uppercase tracking-widest mb-0.5 font-bold" style={{ color: content.shopSubtitleColor || '#E5E7EB' }}>Official Shop</span>
                                  <h1 
                                    className="italic font-black mb-0.5 whitespace-pre-line leading-none tracking-tight"
                                    style={{
                                      fontSize: '12px',
                                      color: content.shopTitleColor || '#FFFFFF',
                                    }}
                                  >
                                    {content.shopTitle || '5XFOUNDATION MERCH'}
                                  </h1>
                                  <p 
                                    className="leading-relaxed opacity-95 line-clamp-1 max-w-[80%]"
                                    style={{
                                      fontSize: '6px',
                                      color: content.shopSubtitleColor || '#E5E7EB',
                                    }}
                                  >
                                    {content.shopSubtitle}
                                  </p>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                  
                  <div className="flex flex-col sm:flex-row justify-between items-center bg-white border border-gray-150 rounded-2xl p-4 gap-4">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">
                      Asegúrate de pulsar "Guardar Cambios" en la barra superior para publicar las actualizaciones del banner.
                    </p>
                    <button
                      onClick={handleSaveAll}
                      disabled={isSaving}
                      className="bg-brand-blue text-white px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-brand-blue/20 shrink-0"
                    >
                      {isSaving ? "Guardando..." : "Guardar Banner"}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'events' && (
              <motion.div
                key="events"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-12"
              >
                <div className="flex justify-between items-center mb-10">
                  <h3 className="text-2xl font-black italic">Upcoming Events</h3>
                  <button 
                    onClick={() => setEvents([...events, { id: `event_${Date.now()}`, title: 'New Event', date: 'Date TBD', loc: 'Location TBD', desc: '', img: '/placeholder.png' }])}
                    className="flex items-center gap-2 bg-brand-blue text-white px-6 py-3 rounded-full font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all"
                  >
                    <Plus size={14} /> Schedule Event
                  </button>
                </div>

                {/* Events Banner Customizer */}
                <div className="bg-white border border-gray-150 p-10 rounded-[3.5rem] shadow-2xl relative overflow-hidden text-black space-y-8">
                  <div>
                    <span className="text-[10px] font-black tracking-widest uppercase text-brand-blue block mb-1">Events Header</span>
                    <h3 className="text-2xl font-black italic uppercase tracking-tighter">Header Layout (Banner)</h3>
                    <p className="text-xs text-gray-500 font-medium">Customize the background banner, title, subtitle, and layout style of the events page at `/events`</p>
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                     {/* Column 1: Background Banner Configuration */}
                     <div className="space-y-6">
                       <h4 className="text-sm font-black uppercase tracking-wider text-gray-400">1. Background Banner</h4>
                       <div className="space-y-4">
                         <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-brand-blue">Banner Image (URL or Upload)</label>
                         <div className="flex gap-4">
                           <input 
                             type="text"
                             className="flex-1 bg-gray-50 px-6 py-4 rounded-2xl font-bold text-xs border border-gray-200 focus:ring-2 focus:ring-brand-blue text-black"
                             placeholder="Banner image URL (e.g. /shop_banner.png)"
                             value={content.eventBanner || ''}
                             onChange={(e) => setContent(prev => ({ ...prev, eventBanner: e.target.value }))}
                           />
                           <button 
                             type="button"
                             onClick={() => {
                               const input = document.getElementById('image-upload') as any;
                               input.dataset.currentId = 'eventBanner';
                               input.click();
                             }}
                             className="bg-black text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-brand-blue transition-all"
                           >
                             Upload Image
                           </button>
                         </div>
                       </div>

                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                         <div className="space-y-2">
                           <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-brand-blue">Banner Height (px)</label>
                           <input 
                             type="number"
                             className="w-full bg-gray-50 px-6 py-4 rounded-2xl font-bold text-xs border border-gray-200 focus:ring-2 focus:ring-brand-blue text-black"
                             placeholder="350"
                             value={content.eventBannerHeight || ''}
                             onChange={(e) => setContent(prev => ({ ...prev, eventBannerHeight: e.target.value }))}
                           />
                         </div>
                         <div className="space-y-2">
                           <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-brand-blue">Dark Overlay Opacity (0 to 1)</label>
                           <input 
                             type="number"
                             step="0.1"
                             min="0"
                             max="1"
                             className="w-full bg-gray-50 px-6 py-4 rounded-2xl font-bold text-xs border border-gray-200 focus:ring-2 focus:ring-brand-blue text-black"
                             placeholder="0.4"
                             value={content.eventBannerOverlay || ''}
                             onChange={(e) => setContent(prev => ({ ...prev, eventBannerOverlay: e.target.value }))}
                           />
                         </div>
                       </div>

                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                         <div className="space-y-2">
                           <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-brand-blue">Banner Fit</label>
                           <select 
                             className="w-full bg-gray-50 px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-gray-200 focus:ring-2 focus:ring-brand-blue text-black pr-8"
                             value={content.eventBannerSize || 'cover'}
                             onChange={(e) => setContent(prev => ({ ...prev, eventBannerSize: e.target.value }))}
                           >
                             <option value="cover">Fill (Cover)</option>
                             <option value="centered">Fit (Contain)</option>
                             <option value="stretch">Stretch</option>
                           </select>
                         </div>
                         <div className="space-y-2">
                           <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-brand-blue">Alignment / Position</label>
                           <select 
                             className="w-full bg-gray-50 px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-gray-200 focus:ring-2 focus:ring-brand-blue text-black pr-8"
                             value={content.eventBannerPosition || 'center'}
                             onChange={(e) => setContent(prev => ({ ...prev, eventBannerPosition: e.target.value }))}
                           >
                             <option value="center">Center</option>
                             <option value="top">Top</option>
                             <option value="bottom">Bottom</option>
                             <option value="left">Left</option>
                             <option value="right">Right</option>
                           </select>
                         </div>
                       </div>

                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-150">
                         <div className="space-y-2">
                           <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-brand-blue">Banner Layout Mode</label>
                           <select 
                             className="w-full bg-gray-50 px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-gray-200 focus:ring-2 focus:ring-brand-blue text-black pr-8"
                             value={content.eventBannerLayout || 'full'}
                             onChange={(e) => setContent(prev => ({ ...prev, eventBannerLayout: e.target.value }))}
                           >
                             <option value="split">Split Screen</option>
                             <option value="full">Full Overlay</option>
                           </select>
                         </div>
                         <div className="space-y-2">
                           <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-brand-blue">Text Placement / Alignment</label>
                           <select 
                             className="w-full bg-gray-50 px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-gray-200 focus:ring-2 focus:ring-brand-blue text-black pr-8"
                             value={content.eventBannerPlacement || 'center'}
                             onChange={(e) => setContent(prev => ({ ...prev, eventBannerPlacement: e.target.value }))}
                           >
                             <option value="left">Left</option>
                             <option value="center">Center</option>
                             <option value="right">Right</option>
                           </select>
                         </div>
                         <div className="space-y-2 sm:col-span-2">
                           <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-brand-blue">Click Hyperlink Redirect URL</label>
                           <input 
                             type="text"
                             className="w-full bg-gray-50 px-6 py-4 rounded-2xl font-bold text-xs border border-gray-200 focus:ring-2 focus:ring-brand-blue text-black"
                             placeholder="https://example.com"
                             value={content.eventBannerLink || ''}
                             onChange={(e) => setContent(prev => ({ ...prev, eventBannerLink: e.target.value }))}
                           />
                         </div>
                       </div>

                       <p className="text-[10px] text-gray-400 font-medium">Use "none" or leave the URL empty if you prefer a minimalist layout without a background banner image.</p>
                     </div>

                     {/* Column 2: Title Configuration */}
                     <div className="space-y-6">
                       <h4 className="text-sm font-black uppercase tracking-wider text-gray-400">2. Title Customization</h4>
                       <div className="space-y-4">
                         <div>
                           <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-brand-blue mb-2">Title Text</label>
                           <input 
                             type="text"
                             className="w-full bg-gray-50 px-6 py-4 rounded-2xl font-bold text-xs border border-gray-200 focus:ring-2 focus:ring-brand-blue text-black"
                             placeholder="UPCOMING 5X EVENTS"
                             value={content.eventTitle || ''}
                             onChange={(e) => setContent(prev => ({ ...prev, eventTitle: e.target.value }))}
                           />
                         </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-brand-blue mb-2">Title Color</label>
                             <div className="flex gap-2">
                               <input 
                                 type="color"
                                 className="w-12 h-12 rounded-xl border border-gray-200 cursor-pointer overflow-hidden p-0 bg-transparent animate-none"
                                 value={content.eventBannerTitleColor || '#FFFFFF'}
                                 onChange={(e) => setContent(prev => ({ ...prev, eventBannerTitleColor: e.target.value }))}
                               />
                               <input 
                                 type="text"
                                 className="flex-1 bg-gray-50 px-4 py-3 rounded-2xl font-mono text-[10px] font-bold border border-gray-200 focus:ring-2 focus:ring-brand-blue text-black"
                                 value={content.eventBannerTitleColor || ''}
                                 placeholder="#FFFFFF"
                                 onChange={(e) => setContent(prev => ({ ...prev, eventBannerTitleColor: e.target.value }))}
                               />
                             </div>
                           </div>
                           <div>
                             <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-brand-blue mb-2">Title Text Size (px)</label>
                             <input
                               type="number"
                               min="8"
                               max="200"
                               className="w-full bg-gray-50 px-6 py-4 rounded-2xl font-bold text-xs border border-gray-200 focus:ring-2 focus:ring-brand-blue text-black"
                               placeholder="48"
                               value={content.eventBannerTitleSize || '48'}
                               onChange={(e) => setContent(prev => ({ ...prev, eventBannerTitleSize: e.target.value }))}
                             />
                           </div>
                           <div>
                             <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-brand-blue mb-2">Subtitle Color</label>
                             <div className="flex gap-2">
                               <input 
                                 type="color"
                                 className="w-12 h-12 rounded-xl border border-gray-200 cursor-pointer overflow-hidden p-0 bg-transparent animate-none"
                                 value={content.eventBannerSubtitleColor || '#E5E7EB'}
                                 onChange={(e) => setContent(prev => ({ ...prev, eventBannerSubtitleColor: e.target.value }))}
                               />
                               <input 
                                 type="text"
                                 className="flex-1 bg-gray-50 px-4 py-3 rounded-2xl font-mono text-[10px] font-bold border border-gray-200 focus:ring-2 focus:ring-brand-blue text-black"
                                 value={content.eventBannerSubtitleColor || ''}
                                 placeholder="#E5E7EB"
                                 onChange={(e) => setContent(prev => ({ ...prev, eventBannerSubtitleColor: e.target.value }))}
                               />
                             </div>
                           </div>
                         </div>
                       </div>
                     </div>
                  </div>

                  {/* Bottom Row: Subtitle Config */}
                  <div className="border-t border-gray-150 pt-8 space-y-6">
                    <h4 className="text-sm font-black uppercase tracking-wider text-gray-400">3. Subtitle Customization</h4>
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-brand-blue mb-2">Subtitle Text / Support Tagline</label>
                          <textarea
                            rows={3}
                            className="w-full bg-gray-50 px-6 py-4 rounded-2xl font-medium text-xs border border-gray-200 focus:ring-2 focus:ring-brand-blue text-black"
                            placeholder="Join us as we build a stronger network..."
                            value={content.eventSubtitle || ''}
                            onChange={(e) => setContent(prev => ({ ...prev, eventSubtitle: e.target.value }))}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-brand-blue mb-2">Subtitle Text Size (px)</label>
                          <input
                            type="number"
                            min="8"
                            max="200"
                            className="w-full bg-gray-50 px-6 py-4 rounded-2xl font-bold text-xs border border-gray-200 focus:ring-2 focus:ring-brand-blue text-black"
                            placeholder="16"
                            value={content.eventBannerSubtitleSize || '16'}
                            onChange={(e) => setContent(prev => ({ ...prev, eventBannerSubtitleSize: e.target.value }))}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Live Interactive Preview for Events Banner */}
                  {(() => {
                    const previewImg = content.eventBanner || '/shop_banner.png';
                    const isSplit = (content.eventBannerLayout || 'full') === 'split';
                    const isCenter = content.eventBannerPlacement === 'center';
                    const isRight = content.eventBannerPlacement === 'right';
                    
                    return (
                      <div className="space-y-3 pt-6 border-t border-gray-150 text-black">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="space-y-0.5">
                            <span className="text-[10px] font-black uppercase tracking-widest text-brand-blue block mb-1">Live Interactive Preview</span>
                            <p className="text-[9px] text-gray-500 font-medium">Select a device view to simulate how the banner adapts to different screen sizes.</p>
                          </div>
                          
                          {/* Device View Selector */}
                          <div className="flex items-center bg-gray-150 p-0.5 rounded-xl border border-gray-200 shadow-sm w-fit">
                            <button
                              type="button"
                              onClick={() => setPreviewDevice('desktop')}
                              className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all flex items-center gap-1 ${
                                previewDevice === 'desktop' ? 'bg-brand-blue text-white shadow-sm' : 'text-gray-500 hover:text-gray-800'
                              }`}
                            >
                              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                              Desktop
                            </button>
                            <button
                              type="button"
                              onClick={() => setPreviewDevice('tablet')}
                              className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all flex items-center gap-1 ${
                                previewDevice === 'tablet' ? 'bg-brand-blue text-white shadow-sm' : 'text-gray-500 hover:text-gray-800'
                              }`}
                            >
                              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                              Tablet
                            </button>
                            <button
                              type="button"
                              onClick={() => setPreviewDevice('mobile')}
                              className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all flex items-center gap-1 ${
                                previewDevice === 'mobile' ? 'bg-brand-blue text-white shadow-sm' : 'text-gray-500 hover:text-gray-800'
                              }`}
                            >
                              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                              Phone
                            </button>
                          </div>
                        </div>

                        {/* Simulated Viewport Screen */}
                        <div className="bg-gray-50 border border-gray-150 rounded-2xl p-4 flex items-center justify-center overflow-hidden min-h-[200px]">
                          <div 
                            className="bg-black rounded-xl border border-gray-800 shadow-2xl relative overflow-hidden transition-all duration-300 flex select-none"
                            style={{
                              width: 
                                previewDevice === 'desktop' ? '100%' :
                                previewDevice === 'tablet' ? '380px' : '220px',
                              height: 
                                previewDevice === 'desktop' ? '120px' :
                                previewDevice === 'tablet' ? '140px' : '160px',
                              flexDirection: 
                                isSplit
                                  ? (previewDevice === 'desktop' ? 'row' : 'column-reverse')
                                  : 'column'
                            }}
                          >
                            {isSplit ? (
                              <>
                                {/* Text Side */}
                                <div 
                                  className="bg-[#000000] p-4 flex flex-col justify-center relative z-10 overflow-hidden"
                                  style={{
                                    width: previewDevice === 'desktop' ? '50%' : '100%',
                                    height: previewDevice === 'desktop' ? '100%' : '50%',
                                    textAlign: 
                                      previewDevice === 'mobile' ? 'center' :
                                      isCenter ? 'center' : isRight ? 'right' : 'left',
                                    alignItems: 
                                      previewDevice === 'mobile' ? 'center' :
                                      isCenter ? 'center' : isRight ? 'flex-end' : 'flex-start'
                                  }}
                                >
                                  <span className="text-[5px] uppercase tracking-widest mb-0.5 font-bold" style={{ color: content.eventBannerSubtitleColor || '#E5E7EB' }}>Community Events</span>
                                  <h1 
                                    className="italic font-black mb-0.5 whitespace-pre-line leading-none tracking-tight"
                                    style={{
                                      fontSize: '12px',
                                      color: content.eventBannerTitleColor || '#FFFFFF',
                                    }}
                                  >
                                    {content.eventTitle || 'UPCOMING 5X EVENTS'}
                                  </h1>
                                  <p 
                                    className="leading-relaxed opacity-95 line-clamp-1"
                                    style={{
                                      fontSize: '6px',
                                      color: content.eventBannerSubtitleColor || '#E5E7EB',
                                    }}
                                  >
                                    {content.eventSubtitle}
                                  </p>
                                </div>

                                {/* Image Side */}
                                <div 
                                  className="relative bg-zinc-900 flex-1 overflow-hidden"
                                  style={{
                                    width: previewDevice === 'desktop' ? '50%' : '100%',
                                    height: previewDevice === 'desktop' ? '100%' : '50%',
                                    backgroundImage: `url(${previewImg})`,
                                    backgroundSize: 
                                      content.eventBannerSize === 'centered' ? 'contain' :
                                      content.eventBannerSize === 'stretch' ? '100% 100%' : 'cover',
                                    backgroundPosition: content.eventBannerPosition || 'center',
                                    backgroundRepeat: 'no-repeat'
                                  }}
                                />
                              </>
                            ) : (
                              <>
                                {/* Full Overlay Layout */}
                                <div 
                                  className="absolute inset-0 bg-zinc-900"
                                  style={{
                                    backgroundImage: `url(${previewImg})`,
                                    backgroundSize: 
                                      content.eventBannerSize === 'centered' ? 'contain' :
                                      content.eventBannerSize === 'stretch' ? '100% 100%' : 'cover',
                                    backgroundPosition: content.eventBannerPosition || 'center',
                                    backgroundRepeat: 'no-repeat'
                                  }}
                                />
                                {/* Overlay shadow */}
                                <div 
                                  className="absolute inset-0 z-10 bg-black"
                                  style={{ opacity: parseFloat(content.eventBannerOverlay || '0.4') }}
                                />
                                {/* Text Content */}
                                <div 
                                  className="absolute inset-0 p-4 flex flex-col justify-center z-20 overflow-hidden"
                                  style={{
                                    textAlign: 
                                      previewDevice === 'mobile' ? 'center' :
                                      isCenter ? 'center' : isRight ? 'right' : 'left',
                                    alignItems: 
                                      previewDevice === 'mobile' ? 'center' :
                                      isCenter ? 'center' : isRight ? 'flex-end' : 'flex-start'
                                  }}
                                >
                                  <span className="text-[5px] uppercase tracking-widest mb-0.5 font-bold" style={{ color: content.eventBannerSubtitleColor || '#E5E7EB' }}>Community Events</span>
                                  <h1 
                                    className="italic font-black mb-0.5 whitespace-pre-line leading-none tracking-tight"
                                    style={{
                                      fontSize: '12px',
                                      color: content.eventBannerTitleColor || '#FFFFFF',
                                    }}
                                  >
                                    {content.eventTitle || 'UPCOMING 5X EVENTS'}
                                  </h1>
                                  <p 
                                    className="leading-relaxed opacity-95 line-clamp-1 max-w-[80%]"
                                    style={{
                                      fontSize: '6px',
                                      color: content.eventBannerSubtitleColor || '#E5E7EB',
                                    }}
                                  >
                                    {content.eventSubtitle}
                                  </p>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <div className="space-y-6">
                  {events.map((event, idx) => (
                    <div key={event.id} className="p-8 bg-gray-50 border border-gray-100 rounded-[2.5rem] flex flex-col lg:flex-row gap-10 items-center group relative">
                       <button 
                         onClick={() => setEvents(events.filter((_, i) => i !== idx))}
                         className="absolute top-6 right-6 p-2 text-gray-400 hover:text-red-500 transition-colors"
                       >
                         <Trash2 size={18} />
                       </button>
                       <div className="w-full lg:w-40 flex flex-col gap-3 shrink-0">
                         <div 
                           onClick={() => {
                             const input = document.getElementById('image-upload') as any;
                             input.dataset.currentId = event.id;
                             input.click();
                           }}
                           className="w-full aspect-square bg-gray-200 rounded-3xl overflow-hidden cursor-pointer relative shadow-inner"
                         >
                           <img src={event.img} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={event.title} />
                           <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-all">
                              <Upload className="text-white mb-2" size={20} />
                              <span className="text-white text-[8px] font-black uppercase tracking-widest">Swap Photo</span>
                           </div>
                         </div>
                         
                         <div className="space-y-1">
                           <label className="block text-[8px] font-black uppercase tracking-[0.2em] text-gray-400">Event Image Link</label>
                           <input 
                             type="text"
                             className="w-full bg-white px-4 py-2 rounded-xl font-bold text-[10px] border border-gray-100 focus:ring-2 focus:ring-brand-blue transition-all"
                             value={event.img}
                             placeholder="Paste image link..."
                             onChange={(e) => {
                               const val = e.target.value;
                               const newEvents = [...events];
                               newEvents[idx].img = val;
                               setEvents(newEvents);
                             }}
                           />
                         </div>
                       </div>
                       
                       <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                          <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-2">Event Title</label>
                            <input 
                              className="w-full bg-white px-6 py-4 rounded-xl font-bold text-sm border-none shadow-sm focus:ring-2 focus:ring-brand-blue" 
                              value={event.title} 
                              onChange={(e) => {
                                const newEvents = [...events];
                                newEvents[idx].title = e.target.value;
                                setEvents(newEvents);
                              }}
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-2">Date & Time</label>
                            <input 
                              className="w-full bg-white px-6 py-4 rounded-xl font-bold text-sm border-none shadow-sm focus:ring-2 focus:ring-brand-blue" 
                              value={event.date} 
                              onChange={(e) => {
                                const newEvents = [...events];
                                newEvents[idx].date = e.target.value;
                                setEvents(newEvents);
                              }}
                            />
                          </div>
                          <div>
                             <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-2">Location</label>
                             <input 
                               className="w-full bg-white px-6 py-4 rounded-xl font-bold text-sm border-none shadow-sm focus:ring-2 focus:ring-brand-blue" 
                               value={event.loc} 
                               onChange={(e) => {
                                 const newEvents = [...events];
                                 newEvents[idx].loc = e.target.value;
                                 setEvents(newEvents);
                               }}
                             />
                          </div>
                          <div>
                             <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-2">Event Text (Paragraph)</label>
                             <textarea 
                               className="w-full bg-white px-6 py-4 rounded-xl font-bold text-sm border-none shadow-sm focus:ring-2 focus:ring-brand-blue h-14" 
                               value={event.desc} 
                               onChange={(e) => {
                                 const newEvents = [...events];
                                 newEvents[idx].desc = e.target.value;
                                 setEvents(newEvents);
                               }}
                             />
                          </div>
                       </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'who_we_help' && (
              <motion.div
                key="who_we_help"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-12"
              >
                <div className="flex justify-between items-center mb-10">
                  <h3 className="text-2xl font-black italic">Survivor Stories (Who We Help)</h3>
                  <button
                    onClick={() => setStories([...stories, { id: `story_${Date.now()}`, name: 'New Survivor', tag: 'Legacy Member', journey: '', help: '', img: '', transition: 'fade' }])}
                    className="flex items-center gap-2 bg-brand-blue text-white px-6 py-3 rounded-full font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all"
                  >
                    <Plus size={14} /> Add Story
                  </button>
                </div>
                <div className="space-y-12">
                  {stories.map((story, idx) => {
                    const { transition: storyTransition, urls: storyImageUrls } = parseStoryImg(story.img || "");
                    const storyTransitionVal = story.transition || storyTransition || 'fade';
                    return (
                    <div key={story.id} className="p-12 bg-white border border-gray-100 rounded-[3rem] shadow-xl space-y-10 relative group">
                       <button
                         onClick={() => setStories(stories.filter((_, i) => i !== idx))}
                         className="absolute top-8 right-8 p-2 text-gray-400 hover:text-red-500 transition-colors"
                       >
                         <Trash2 size={18} />
                       </button>

                       <div className="flex flex-col lg:flex-row gap-12">
                          <div className="w-full lg:w-80 flex flex-col gap-3 shrink-0">
                            {/* Image Preview */}
                            <div
                              onClick={() => {
                                if (storyImageUrls.length >= 5) { alert('Maximum 5 images per story. Delete one before uploading more.'); return; }
                                const input = document.getElementById('image-upload') as any;
                                input.dataset.currentId = story.id;
                                input.click();
                              }}
                              className="w-full aspect-[4/5] bg-gray-100 rounded-[2rem] overflow-hidden cursor-pointer relative shadow-inner"
                            >
                              <StoryImagePreview source={story.img} name={story.name} />
                              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-all">
                                  <Upload className="text-white mb-2" size={24} />
                                  <span className="text-white text-[8px] font-black uppercase tracking-widest">{storyImageUrls.length >= 5 ? 'Max 5 Images' : 'Upload Photo'}</span>
                              </div>
                            </div>

                            {/* Upload Button */}
                            <button
                               type="button"
                               onClick={() => {
                                 if (storyImageUrls.length >= 5) { alert('Maximum 5 images per story. Delete one before uploading more.'); return; }
                                 const input = document.getElementById('image-upload') as any;
                                 input.dataset.currentId = story.id;
                                 input.click();
                               }}
                               disabled={storyImageUrls.length >= 5}
                               className="w-full bg-brand-blue text-white py-2.5 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-brand-blue/90 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                             >
                               <Upload size={12} /> {storyImageUrls.length >= 5 ? 'Max 5 Images Reached' : 'Upload Image to Convex'}
                             </button>

                            {/* Image Count */}
                            <div className="flex items-center justify-between px-1">
                              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">{storyImageUrls.length}/5 Images</span>
                              {storyImageUrls.length > 0 && (
                                <button
                                  type="button"
                                  title="Clear all images"
                                  onClick={() => {
                                    if (confirm('Clear all images for this story?')) {
                                      const updatedStories = stories.map(s =>
                                        s.id === story.id ? { ...s, img: '' } : s
                                      );
                                      setStories(updatedStories);
                                      updateSiteContent('siteStories', JSON.stringify(updatedStories));
                                      localStorage.setItem('siteStories', JSON.stringify(updatedStories));
                                    }
                                  }}
                                  className="text-[8px] text-red-400 hover:text-red-600 font-bold uppercase tracking-wider flex items-center gap-1 transition-colors"
                                >
                                  <Trash2 size={9} /> Clear All
                                </button>
                              )}
                            </div>

                            {/* Uploaded Images Grid with Delete */}
                            {storyImageUrls.length > 0 && (
                              <div className="grid grid-cols-3 gap-2">
                                {storyImageUrls.map((url, imgIdx) => (
                                  <div key={imgIdx} className="aspect-square relative bg-gray-100 rounded-lg overflow-hidden border border-gray-200 group/thumb">
                                    <img src={url} alt={`Slide ${imgIdx + 1}`} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.png'; }} />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const newUrls = storyImageUrls.filter((_, i) => i !== imgIdx);
                                        const updatedImg = buildStoryImg(storyTransitionVal, newUrls);
                                        const updatedStories = stories.map(s => s.id === story.id ? { ...s, img: updatedImg } : s);
                                        setStories(updatedStories);
                                        updateSiteContent('siteStories', JSON.stringify(updatedStories));
                                        localStorage.setItem('siteStories', JSON.stringify(updatedStories));
                                      }}
                                      className="absolute top-0.5 right-0.5 bg-red-600 text-white p-0.5 rounded-full opacity-0 group-hover/thumb:opacity-100 transition-opacity z-10"
                                    >
                                      <X size={10} />
                                    </button>
                                    <span className="absolute bottom-0 left-0 bg-black/60 text-white text-[7px] font-bold px-1 py-0.5 rounded-tr">{imgIdx + 1}</span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Slideshow Transition Selector */}
                            {storyImageUrls.length > 1 && (
                              <div className="space-y-1">
                                <label className="block text-[8px] font-black uppercase tracking-[0.2em] text-gray-400">Slideshow Transition</label>
                                <select
                                  value={storyTransitionVal}
                                  onChange={(e) => {
                                    const newTransition = e.target.value;
                                    const updatedImg = buildStoryImg(newTransition, storyImageUrls);
                                    const updatedStories = stories.map(s => s.id === story.id ? { ...s, img: updatedImg, transition: newTransition } : s);
                                    setStories(updatedStories);
                                    updateSiteContent('siteStories', JSON.stringify(updatedStories));
                                    localStorage.setItem('siteStories', JSON.stringify(updatedStories));
                                  }}
                                  className="w-full bg-gray-50 px-3 py-2 rounded-xl text-xs font-medium border border-gray-100 focus:ring-2 focus:ring-brand-blue transition-all"
                                >
                                  <option value="fade">Fade (Crossfade)</option>
                                  <option value="slide-left">Slide Left</option>
                                  <option value="slide-up">Slide Up</option>
                                  <option value="zoom">Zoom In/Out</option>
                                </select>
                              </div>
                            )}

                            {/* Google Drive Folder Fetch + Manual URL textarea */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <label className="block text-[8px] font-black uppercase tracking-[0.2em] text-gray-400">Image URLs or Google Drive Folder Link</label>
                              </div>
                              <textarea
                                rows={3}
                                data-story-id={story.id}
                                className="w-full bg-gray-50 px-4 py-2 rounded-xl font-medium text-xs border border-gray-100 focus:ring-2 focus:ring-brand-blue transition-all"
                                value={storyImageUrls.length > 0 ? storyImageUrls.join('\n') : (story.img || '').replace(/^transition:[^\n]*\n?/, '')}
                                placeholder="Paste a Google Drive folder link, or direct image URLs (one per line)..."
                                onChange={(e) => {
                                  const val = e.target.value;
                                  const newUrls = val.split('\n').map(l => l.trim()).filter(l => l.length > 0);
                                  const updatedImg = buildStoryImg(storyTransitionVal, newUrls);
                                  setStories(prev => prev.map(s =>
                                    s.id === story.id ? { ...s, img: updatedImg } : s
                                  ));
                                }}
                                onBlur={() => {
                                  const val = storyImageUrls.join('\n');
                                  const updatedImg = buildStoryImg(storyTransitionVal, storyImageUrls);
                                  const updatedStories = stories.map(s => s.id === story.id ? { ...s, img: updatedImg } : s);
                                  setStories(updatedStories);
                                  updateSiteContent('siteStories', JSON.stringify(updatedStories));
                                  localStorage.setItem('siteStories', JSON.stringify(updatedStories));
                                }}
                              />
                              <button
                                type="button"
                                onClick={async () => {
                                  const textarea = document.querySelector(`[data-story-id="${story.id}"]`) as HTMLTextAreaElement;
                                  const textVal = textarea ? textarea.value : storyImageUrls.join('\n');
                                  const allLines = textVal.split('\n').map(l => l.trim()).filter(l => l.length > 0);
                                  const driveLinks = allLines.filter(l => l.includes('drive.google.com'));
                                  const otherLinks = allLines.filter(l => !l.includes('drive.google.com') && !l.startsWith('transition:'));

                                  if (driveLinks.length === 0) {
                                    alert('Paste a Google Drive folder link first, then click this button to fetch images.');
                                    return;
                                  }

                                  let allImages: string[] = [];
                                  for (const link of driveLinks) {
                                    const images = await fetchDriveFolderImages(link);
                                    allImages = [...allImages, ...images];
                                  }
                                  allImages = [...new Set(allImages)].slice(0, 5);

                                  if (allImages.length === 0) {
                                    alert('Could not fetch images from the Google Drive link. Make sure sharing is set to "Anyone with the link can view".');
                                    return;
                                  }

                                  const finalUrls = [...otherLinks, ...allImages].slice(0, 5);
                                  const updatedImg = buildStoryImg(storyTransitionVal, finalUrls);
                                  const updatedStories = stories.map(s => s.id === story.id ? { ...s, img: updatedImg } : s);
                                  setStories(updatedStories);
                                  await updateSiteContent('siteStories', JSON.stringify(updatedStories));
                                  localStorage.setItem('siteStories', JSON.stringify(updatedStories));
                                }}
                                className="w-full bg-green-600 text-white py-2 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-green-700 transition-all shadow-sm"
                              >
                                <FolderOpen size={12} /> Fetch Images from Google Drive
                              </button>
                            </div>
                          </div>

                          <div className="flex-1 space-y-6">
                             <div className="grid grid-cols-2 gap-6">
                                <div>
                                   <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-2">Full Name</label>
                                   <input
                                     className="w-full bg-gray-50 px-6 py-4 rounded-xl font-bold text-lg border-none shadow-inner focus:ring-2 focus:ring-brand-blue"
                                     value={story.name}
                                     onChange={(e) => {
                                       const ns = [...stories];
                                       ns[idx].name = e.target.value;
                                       setStories(ns);
                                     }}
                                   />
                                </div>
                                <div>
                                   <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-2">Tagline / Role</label>
                                   <input
                                     className="w-full bg-gray-50 px-6 py-4 rounded-xl font-bold text-lg border-none shadow-inner focus:ring-2 focus:ring-brand-blue"
                                     value={story.tag}
                                     onChange={(e) => {
                                       const ns = [...stories];
                                       ns[idx].tag = e.target.value;
                                       setStories(ns);
                                     }}
                                   />
                                </div>
                             </div>

                             <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-2">The Journey</label>
                                <textarea
                                  className="w-full bg-gray-50 px-6 py-4 rounded-xl font-medium text-sm border-none shadow-inner focus:ring-2 focus:ring-brand-blue h-24"
                                  value={story.journey}
                                  onChange={(e) => {
                                    const ns = [...stories];
                                    ns[idx].journey = e.target.value;
                                    setStories(ns);
                                  }}
                                />
                             </div>

                             <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-2">How 5X Foundation Helped</label>
                                <textarea
                                  className="w-full bg-gray-50 px-6 py-4 rounded-xl font-bold text-sm border-none shadow-inner focus:ring-2 focus:ring-brand-blue h-24 text-brand-blue"
                                  value={story.help}
                                  onChange={(e) => {
                                    const ns = [...stories];
                                    ns[idx].help = e.target.value;
                                    setStories(ns);
                                  }}
                                />
                             </div>
                          </div>
                       </div>
                    </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {activeTab === 'theme' && (
              <motion.div
                key="theme"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-12"
              >
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">
                   {/* Column 1: Global Branding & Typography */}
                   <div className="bg-gray-50 rounded-[2.5rem] p-12 space-y-8 h-full text-black">
                      <h4 className="text-xl font-black mb-8 flex items-center gap-4 text-black">
                        <Monitor size={24} className="text-brand-blue" /> Theme & Global Typography
                      </h4>
                      
                      <div className="grid grid-cols-1 gap-8">
                        <div>
                          <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-4">Site-wide Font Family</label>
                          <select 
                            className="w-full bg-white px-8 py-5 rounded-2xl font-black text-xs border-none shadow-xl text-black focus:ring-2 focus:ring-brand-blue"
                            value={content.themeFontFamily || 'Inter'}
                            onChange={(e) => setContent(prev => ({ ...prev, themeFontFamily: e.target.value }))}
                          >
                            <option value="Inter">Inter (Sans-Serif)</option>
                            <option value="Roboto">Roboto</option>
                            <option value="Outfit">Outfit (Modern)</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-4">Heading Character Case</label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {['uppercase', 'normal'].map(c => (
                              <button 
                                type="button"
                                key={c} 
                                onClick={() => setContent(prev => ({ ...prev, themeHeadingCase: c }))}
                                className={`py-4 rounded-xl font-black text-[10px] border-2 transition-all uppercase tracking-widest ${
                                  (content.themeHeadingCase || 'uppercase') === c 
                                    ? 'bg-black text-white border-black' 
                                    : 'border-gray-200 bg-white text-gray-400 hover:border-black hover:text-black'
                                }`}
                              >
                                {c === 'uppercase' ? 'UPPERCASE' : 'Normal'}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Base Body Font Size (px)</label>
                            <span className="text-xs font-black text-brand-blue">{content.themeFontSize || '16'}px</span>
                          </div>
                          <input 
                            type="range" 
                            className="w-full accent-brand-blue" 
                            min="12" 
                            max="24" 
                            step="1" 
                            value={content.themeFontSize || '16'} 
                            onChange={(e) => setContent(prev => ({ ...prev, themeFontSize: e.target.value }))}
                          />
                        </div>

                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Heading Size Scale Factor</label>
                            <span className="text-xs font-black text-brand-blue">{content.themeHeadingScale || '1.0'}x</span>
                          </div>
                          <input 
                            type="range" 
                            className="w-full accent-brand-blue" 
                            min="0.5" 
                            max="2.0" 
                            step="0.1" 
                            value={content.themeHeadingScale || '1.0'} 
                            onChange={(e) => setContent(prev => ({ ...prev, themeHeadingScale: e.target.value }))}
                          />
                             {/* PREMIUM CUSTOM CONTROLS */}
                        <div className="pt-6 border-t border-gray-250/50 space-y-6">
                          <h5 className="text-xs font-black uppercase tracking-widest text-brand-blue">Global Font Layout Settings</h5>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                            <div>
                              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-2">Title Alignment</label>
                              <select 
                                className="w-full bg-white px-4 py-3.5 rounded-xl font-bold text-xs border border-gray-200 focus:ring-2 focus:ring-brand-blue"
                                value={content.titleAlign || 'inherit'}
                                onChange={(e) => setContent(prev => ({ ...prev, titleAlign: e.target.value }))}
                              >
                                <option value="inherit">Inherit (Default)</option>
                                <option value="left">Left</option>
                                <option value="center">Center</option>
                                <option value="right">Right</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-2">Description Alignment</label>
                              <select 
                                className="w-full bg-white px-4 py-3.5 rounded-xl font-bold text-xs border border-gray-200 focus:ring-2 focus:ring-brand-blue"
                                value={content.descAlign || 'inherit'}
                                onChange={(e) => setContent(prev => ({ ...prev, descAlign: e.target.value }))}
                              >
                                <option value="inherit">Inherit (Default)</option>
                                <option value="left">Left</option>
                                <option value="center">Center</option>
                                <option value="right">Right</option>
                                <option value="justify">Justified</option>
                              </select>
                            </div>
                            <div>
                              <div className="flex justify-between items-center mb-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Description Size</label>
                                <span className="text-xs font-black text-brand-blue">{content.descFontSize || content.themeFontSize || '16'}px</span>
                              </div>
                              <input 
                                type="range" 
                                className="w-full accent-brand-blue" 
                                min="12" 
                                max="32" 
                                step="1" 
                                value={content.descFontSize || content.themeFontSize || '16'} 
                                onChange={(e) => setContent(prev => ({ ...prev, descFontSize: e.target.value, themeFontSize: e.target.value }))}
                              />
                            </div>
                          </div>
                        </div>

                        {/* SECTION BY SECTION GRANULAR COLORS */}
                        <div className="pt-8 border-t border-gray-250/50 space-y-6">
                          <div className="space-y-1">
                            <h5 className="text-sm font-black uppercase tracking-widest text-brand-blue">Granular Text Colors (Section by Section)</h5>
                            <p className="text-xs text-gray-500 font-medium leading-relaxed">Configure unique, harmonious colors for each section of your homepage.</p>
                          </div>
                          
                          <div className="grid grid-cols-1 gap-8">
                            {/* Section 1: Hero Carousel */}
                            <div className="bg-white p-6 rounded-3xl border border-gray-150 shadow-sm space-y-4">
                              <h6 className="text-[10px] font-black uppercase tracking-wider text-brand-blue">1. Hero Section (Carousel Slideshow)</h6>
                              
                              {/* Title Customizer */}
                              <div className="space-y-3 pb-3 border-b border-gray-100">
                                <span className="text-[9px] font-black uppercase tracking-widest text-gray-500 block">Title Styling</span>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                  <div>
                                    <label className="text-[8px] font-black uppercase tracking-widest text-gray-400 block mb-1">Color</label>
                                    <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-xl border border-gray-100 shadow-sm">
                                      <input 
                                        type="color" 
                                        className="w-8 h-8 rounded cursor-pointer border-none bg-transparent" 
                                        value={content.heroTitleColor || '#FFFFFF'} 
                                        onChange={(e) => setContent(prev => ({ ...prev, heroTitleColor: e.target.value }))}
                                      />
                                      <span className="text-[9px] font-mono text-gray-500 uppercase">{content.heroTitleColor || '#FFFFFF'}</span>
                                    </div>
                                  </div>
                                  <div>
                                    <label className="text-[8px] font-black uppercase tracking-widest text-gray-400 block mb-1">Font Size ({content.heroTitleSize || '120'}px)</label>
                                    <input 
                                      type="range" 
                                      min="12" 
                                      max="160" 
                                      className="w-full accent-brand-blue mt-2" 
                                      value={content.heroTitleSize || '120'} 
                                      onChange={(e) => setContent(prev => ({ ...prev, heroTitleSize: e.target.value }))}
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[8px] font-black uppercase tracking-widest text-gray-400 block mb-1">Alignment</label>
                                    <select 
                                      className="w-full text-xs bg-gray-50 p-2 rounded-xl border border-gray-100 shadow-sm mt-1"
                                      value={content.heroTitleAlign || 'left'} 
                                      onChange={(e) => setContent(prev => ({ ...prev, heroTitleAlign: e.target.value }))}
                                    >
                                      <option value="left">Left</option>
                                      <option value="center">Center</option>
                                      <option value="right">Right</option>
                                      <option value="justify">Justify</option>
                                    </select>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 pt-1">
                                  <label className="text-[8px] font-black uppercase tracking-widest text-gray-400">Bold</label>
                                  <button
                                    type="button"
                                    onClick={() => setContent(prev => ({ ...prev, heroTitleBold: !prev.heroTitleBold }))}
                                    className={`px-3 py-1 rounded-lg text-xs font-black transition-all ${ content.heroTitleBold ? 'bg-brand-blue text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200' }`}
                                  >B</button>
                                </div>
                              </div>

                              {/* Description Customizer */}
                              <div className="space-y-3">
                                <span className="text-[9px] font-black uppercase tracking-widest text-gray-500 block">Description Styling</span>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                  <div>
                                    <label className="text-[8px] font-black uppercase tracking-widest text-gray-400 block mb-1">Color</label>
                                    <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-xl border border-gray-100 shadow-sm">
                                      <input 
                                        type="color" 
                                        className="w-8 h-8 rounded cursor-pointer border-none bg-transparent" 
                                        value={content.heroDescColor || '#F3F4F6'} 
                                        onChange={(e) => setContent(prev => ({ ...prev, heroDescColor: e.target.value }))}
                                      />
                                      <span className="text-[9px] font-mono text-gray-500 uppercase">{content.heroDescColor || '#F3F4F6'}</span>
                                    </div>
                                  </div>
                                  <div>
                                    <label className="text-[8px] font-black uppercase tracking-widest text-gray-400 block mb-1">Font Size ({content.heroDescSize || '20'}px)</label>
                                    <input 
                                      type="range" 
                                      min="12" 
                                      max="80" 
                                      className="w-full accent-brand-blue mt-2" 
                                      value={content.heroDescSize || '20'} 
                                      onChange={(e) => setContent(prev => ({ ...prev, heroDescSize: e.target.value }))}
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[8px] font-black uppercase tracking-widest text-gray-400 block mb-1">Alignment</label>
                                    <select 
                                      className="w-full text-xs bg-gray-50 p-2 rounded-xl border border-gray-100 shadow-sm mt-1"
                                      value={content.heroDescAlign || 'left'} 
                                      onChange={(e) => setContent(prev => ({ ...prev, heroDescAlign: e.target.value }))}
                                    >
                                      <option value="left">Left</option>
                                      <option value="center">Center</option>
                                      <option value="right">Right</option>
                                      <option value="justify">Justify</option>
                                    </select>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 pt-1">
                                  <label className="text-[8px] font-black uppercase tracking-widest text-gray-400">Bold</label>
                                  <button
                                    type="button"
                                    onClick={() => setContent(prev => ({ ...prev, heroDescBold: !prev.heroDescBold }))}
                                    className={`px-3 py-1 rounded-lg text-xs font-black transition-all ${ content.heroDescBold ? 'bg-brand-blue text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200' }`}
                                  >B</button>
                                </div>
                              </div>
                            </div>

                            {/* Section 2: Mission Section */}
                            <div className="bg-white p-6 rounded-3xl border border-gray-150 shadow-sm space-y-4">
                              <h6 className="text-[10px] font-black uppercase tracking-wider text-brand-blue">2. Mission Section (Our Mission)</h6>
                              
                              {/* Title Customizer */}
                              <div className="space-y-3 pb-3 border-b border-gray-100">
                                <span className="text-[9px] font-black uppercase tracking-widest text-gray-500 block">Title Styling</span>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                  <div>
                                    <label className="text-[8px] font-black uppercase tracking-widest text-gray-400 block mb-1">Color</label>
                                    <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-xl border border-gray-100 shadow-sm">
                                      <input 
                                        type="color" 
                                        className="w-8 h-8 rounded cursor-pointer border-none bg-transparent" 
                                        value={content.missionTitleColor || '#000000'} 
                                        onChange={(e) => setContent(prev => ({ ...prev, missionTitleColor: e.target.value }))}
                                      />
                                      <span className="text-[9px] font-mono text-gray-500 uppercase">{content.missionTitleColor || '#000000'}</span>
                                    </div>
                                  </div>
                                  <div>
                                    <label className="text-[8px] font-black uppercase tracking-widest text-gray-400 block mb-1">Font Size ({content.missionTitleSize || '40'}px)</label>
                                    <input 
                                      type="range" 
                                      min="12" 
                                      max="160" 
                                      className="w-full accent-brand-blue mt-2" 
                                      value={content.missionTitleSize || '40'} 
                                      onChange={(e) => setContent(prev => ({ ...prev, missionTitleSize: e.target.value }))}
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[8px] font-black uppercase tracking-widest text-gray-400 block mb-1">Alignment</label>
                                    <select 
                                      className="w-full text-xs bg-gray-50 p-2 rounded-xl border border-gray-100 shadow-sm mt-1"
                                      value={content.missionTitleAlign || 'center'} 
                                      onChange={(e) => setContent(prev => ({ ...prev, missionTitleAlign: e.target.value }))}
                                    >
                                      <option value="left">Left</option>
                                      <option value="center">Center</option>
                                      <option value="right">Right</option>
                                      <option value="justify">Justify</option>
                                    </select>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 pt-1">
                                  <label className="text-[8px] font-black uppercase tracking-widest text-gray-400">Bold</label>
                                  <button
                                    type="button"
                                    onClick={() => setContent(prev => ({ ...prev, missionTitleBold: !prev.missionTitleBold }))}
                                    className={`px-3 py-1 rounded-lg text-xs font-black transition-all ${ content.missionTitleBold ? 'bg-brand-blue text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200' }`}
                                  >B</button>
                                </div>
                              </div>

                              {/* Description Customizer */}
                              <div className="space-y-3">
                                <span className="text-[9px] font-black uppercase tracking-widest text-gray-500 block">Description Styling</span>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                  <div>
                                    <label className="text-[8px] font-black uppercase tracking-widest text-gray-400 block mb-1">Color</label>
                                    <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-xl border border-gray-100 shadow-sm">
                                      <input 
                                        type="color" 
                                        className="w-8 h-8 rounded cursor-pointer border-none bg-transparent" 
                                        value={content.missionDescColor || '#000000'} 
                                        onChange={(e) => setContent(prev => ({ ...prev, missionDescColor: e.target.value }))}
                                      />
                                      <span className="text-[9px] font-mono text-gray-500 uppercase">{content.missionDescColor || '#000000'}</span>
                                    </div>
                                  </div>
                                  <div>
                                    <label className="text-[8px] font-black uppercase tracking-widest text-gray-400 block mb-1">Font Size ({content.missionDescSize || '24'}px)</label>
                                    <input 
                                      type="range" 
                                      min="12" 
                                      max="80" 
                                      className="w-full accent-brand-blue mt-2" 
                                      value={content.missionDescSize || '24'} 
                                      onChange={(e) => setContent(prev => ({ ...prev, missionDescSize: e.target.value }))}
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[8px] font-black uppercase tracking-widest text-gray-400 block mb-1">Alignment</label>
                                    <select 
                                      className="w-full text-xs bg-gray-50 p-2 rounded-xl border border-gray-100 shadow-sm mt-1"
                                      value={content.missionDescAlign || 'center'} 
                                      onChange={(e) => setContent(prev => ({ ...prev, missionDescAlign: e.target.value }))}
                                    >
                                      <option value="left">Left</option>
                                      <option value="center">Center</option>
                                      <option value="right">Right</option>
                                      <option value="justify">Justify</option>
                                    </select>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 pt-1">
                                  <label className="text-[8px] font-black uppercase tracking-widest text-gray-400">Bold</label>
                                  <button
                                    type="button"
                                    onClick={() => setContent(prev => ({ ...prev, missionDescBold: !prev.missionDescBold }))}
                                    className={`px-3 py-1 rounded-lg text-xs font-black transition-all ${ content.missionDescBold ? 'bg-brand-blue text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200' }`}
                                  >B</button>
                                </div>
                              </div>
                            </div>

                            <div className="bg-white p-6 rounded-3xl border border-gray-150 shadow-sm space-y-6">
                              <h6 className="text-[10px] font-black uppercase tracking-wider text-brand-blue">3. "Five Time" Philosophy Section</h6>
                              
                              {/* Content Editor */}
                              <div className="space-y-4 pb-4 border-b border-gray-100">
                                <span className="text-[9px] font-black uppercase tracking-widest text-gray-500 block">Philosophy Content</span>
                                <div className="space-y-3">
                                  <div>
                                    <label className="text-[8px] font-black uppercase tracking-widest text-gray-400 block mb-1">Title Text</label>
                                    <input 
                                      type="text" 
                                      className="w-full text-xs bg-gray-50 p-3 rounded-xl border border-gray-100 shadow-sm text-black font-medium" 
                                      value={content.philosophyTitle || ''} 
                                      onChange={(e) => setContent(prev => ({ ...prev, philosophyTitle: e.target.value }))}
                                      placeholder='The "Five Time" Philosophy'
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[8px] font-black uppercase tracking-widest text-gray-400 block mb-1">Description Text</label>
                                    <textarea 
                                      rows={4}
                                      className="w-full text-xs bg-gray-50 p-3 rounded-xl border border-gray-100 shadow-sm text-black font-medium" 
                                      value={content.philosophyDesc || ''} 
                                      onChange={(e) => setContent(prev => ({ ...prev, philosophyDesc: e.target.value }))}
                                      placeholder='Named after the sheer number of times Rich had to overcome the impossible...'
                                    />
                                  </div>
                                </div>
                              </div>

                              {/* Background Customizer */}
                              <div className="space-y-4 pb-4 border-b border-gray-100">
                                <span className="text-[9px] font-black uppercase tracking-widest text-gray-500 block">Background & Filter Settings</span>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-2 2xl:grid-cols-3 gap-6">
                                  <div>
                                    <label className="text-[8px] font-black uppercase tracking-widest text-gray-400 block mb-1">Background Color</label>
                                    <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-xl border border-gray-100 shadow-sm">
                                      <input 
                                        type="color" 
                                        className="w-8 h-8 rounded cursor-pointer border-none bg-transparent" 
                                        value={content.philosophyBgColor || '#000000'} 
                                        onChange={(e) => setContent(prev => ({ ...prev, philosophyBgColor: e.target.value }))}
                                      />
                                      <span className="text-[9px] font-mono text-gray-500 uppercase">{content.philosophyBgColor || '#000000'}</span>
                                    </div>
                                  </div>
                                  <div>
                                    <label className="text-[8px] font-black uppercase tracking-widest text-gray-400 block mb-1">Dark Filter Overlay ({content.philosophyOverlay || '0.6'})</label>
                                    <input 
                                      type="range" 
                                      min="0" 
                                      max="1" 
                                      step="0.05"
                                      className="w-full accent-brand-blue mt-2" 
                                      value={content.philosophyOverlay || '0.6'} 
                                      onChange={(e) => setContent(prev => ({ ...prev, philosophyOverlay: e.target.value }))}
                                    />
                                  </div>
                                  <div className="sm:col-span-2 md:col-span-1 xl:col-span-2 2xl:col-span-1">
                                    <label className="text-[8px] font-black uppercase tracking-widest text-gray-400 block mb-1">Background Image</label>
                                    <div className="flex gap-2">
                                      <input 
                                        type="text" 
                                        className="flex-1 text-[10px] bg-gray-50 p-2 rounded-xl border border-gray-100 text-black font-medium" 
                                        placeholder="Image URL"
                                        value={content.philosophyBg || ''}
                                        onChange={(e) => setContent(prev => ({ ...prev, philosophyBg: e.target.value }))}
                                      />
                                      <button 
                                        type="button" 
                                        onClick={() => {
                                          const input = document.getElementById('image-upload') as any;
                                          input.dataset.currentId = 'philosophyBg';
                                          input.click();
                                        }}
                                        className="bg-black hover:bg-brand-blue text-white px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shrink-0"
                                      >
                                        Upload
                                      </button>
                                    </div>
                                  </div>
                                  <div>
                                    <label className="text-[8px] font-black uppercase tracking-widest text-gray-400 block mb-1">Banner Fit (Ajuste)</label>
                                    <select 
                                      className="w-full bg-gray-50 p-2.5 rounded-xl border border-gray-100 text-black text-[10px] font-black uppercase tracking-widest focus:ring-1 focus:ring-brand-blue"
                                      value={content.philosophyBgSize || 'fill'}
                                      onChange={(e) => setContent(prev => ({ ...prev, philosophyBgSize: e.target.value }))}
                                    >
                                      <option value="fill">Fill (Rellenar)</option>
                                      <option value="centered">Centered (Centrar)</option>
                                      <option value="stretch">Stretch (Estirar)</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label className="text-[8px] font-black uppercase tracking-widest text-gray-400 block mb-1">Alineación / Posición</label>
                                    <select 
                                      className="w-full bg-gray-50 p-2.5 rounded-xl border border-gray-100 text-black text-[10px] font-black uppercase tracking-widest focus:ring-1 focus:ring-brand-blue"
                                      value={content.philosophyBgPosition || 'center'}
                                      onChange={(e) => setContent(prev => ({ ...prev, philosophyBgPosition: e.target.value }))}
                                    >
                                      <option value="center">Centro</option>
                                      <option value="top">Arriba</option>
                                      <option value="bottom">Abajo</option>
                                      <option value="left">Izquierda</option>
                                      <option value="right">Derecha</option>
                                    </select>
                                  </div>
                                </div>
                              </div>

                              {/* Title Styling Customizer */}
                              <div className="space-y-3 pb-3 border-b border-gray-100">
                                <span className="text-[9px] font-black uppercase tracking-widest text-gray-500 block">Title Styling</span>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                  <div>
                                    <label className="text-[8px] font-black uppercase tracking-widest text-gray-400 block mb-1">Color</label>
                                    <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-xl border border-gray-100 shadow-sm">
                                      <input 
                                        type="color" 
                                        className="w-8 h-8 rounded cursor-pointer border-none bg-transparent" 
                                        value={content.philosophyTitleColor || '#FFFFFF'} 
                                        onChange={(e) => setContent(prev => ({ ...prev, philosophyTitleColor: e.target.value }))}
                                      />
                                      <span className="text-[9px] font-mono text-gray-500 uppercase">{content.philosophyTitleColor || '#FFFFFF'}</span>
                                    </div>
                                  </div>
                                  <div>
                                    <label className="text-[8px] font-black uppercase tracking-widest text-gray-400 block mb-1">Font Size ({content.philosophyTitleSize || '48'}px)</label>
                                    <input 
                                      type="range" 
                                      min="12" 
                                      max="160" 
                                      className="w-full accent-brand-blue mt-2" 
                                      value={content.philosophyTitleSize || '48'} 
                                      onChange={(e) => setContent(prev => ({ ...prev, philosophyTitleSize: e.target.value }))}
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[8px] font-black uppercase tracking-widest text-gray-400 block mb-1">Alignment</label>
                                    <select 
                                      className="w-full text-xs bg-gray-50 p-2 rounded-xl border border-gray-100 shadow-sm mt-1 text-black font-medium"
                                      value={content.philosophyTitleAlign || 'center'} 
                                      onChange={(e) => setContent(prev => ({ ...prev, philosophyTitleAlign: e.target.value }))}
                                    >
                                      <option value="left">Left</option>
                                      <option value="center">Center</option>
                                      <option value="right">Right</option>
                                      <option value="justify">Justify</option>
                                    </select>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 pt-1">
                                  <label className="text-[8px] font-black uppercase tracking-widest text-gray-400">Bold</label>
                                  <button
                                    type="button"
                                    onClick={() => setContent(prev => ({ ...prev, philosophyTitleBold: !prev.philosophyTitleBold }))}
                                    className={`px-3 py-1 rounded-lg text-xs font-black transition-all ${ content.philosophyTitleBold ? 'bg-brand-blue text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200' }`}
                                  >B</button>
                                </div>
                              </div>

                              {/* Description Styling Customizer */}
                              <div className="space-y-3">
                                <span className="text-[9px] font-black uppercase tracking-widest text-gray-500 block">Description Styling</span>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                  <div>
                                    <label className="text-[8px] font-black uppercase tracking-widest text-gray-400 block mb-1">Color</label>
                                    <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-xl border border-gray-100 shadow-sm">
                                      <input 
                                        type="color" 
                                        className="w-8 h-8 rounded cursor-pointer border-none bg-transparent" 
                                        value={content.philosophyDescColor || '#E5E7EB'} 
                                        onChange={(e) => setContent(prev => ({ ...prev, philosophyDescColor: e.target.value }))}
                                      />
                                      <span className="text-[9px] font-mono text-gray-500 uppercase">{content.philosophyDescColor || '#E5E7EB'}</span>
                                    </div>
                                  </div>
                                  <div>
                                    <label className="text-[8px] font-black uppercase tracking-widest text-gray-400 block mb-1">Font Size ({content.philosophyDescSize || '20'}px)</label>
                                    <input 
                                      type="range" 
                                      min="12" 
                                      max="80" 
                                      className="w-full accent-brand-blue mt-2" 
                                      value={content.philosophyDescSize || '20'} 
                                      onChange={(e) => setContent(prev => ({ ...prev, philosophyDescSize: e.target.value }))}
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[8px] font-black uppercase tracking-widest text-gray-400 block mb-1">Alignment</label>
                                    <select 
                                      className="w-full text-xs bg-gray-50 p-2 rounded-xl border border-gray-100 shadow-sm mt-1 text-black font-medium"
                                      value={content.philosophyDescAlign || 'center'} 
                                      onChange={(e) => setContent(prev => ({ ...prev, philosophyDescAlign: e.target.value }))}
                                    >
                                      <option value="left">Left</option>
                                      <option value="center">Center</option>
                                      <option value="right">Right</option>
                                      <option value="justify">Justify</option>
                                    </select>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 pt-1">
                                  <label className="text-[8px] font-black uppercase tracking-widest text-gray-400">Bold</label>
                                  <button
                                    type="button"
                                    onClick={() => setContent(prev => ({ ...prev, philosophyDescBold: !prev.philosophyDescBold }))}
                                    className={`px-3 py-1 rounded-lg text-xs font-black transition-all ${ content.philosophyDescBold ? 'bg-brand-blue text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200' }`}
                                  >B</button>
                                </div>
                              </div>
                            </div>


                            {/* Section 4: Founder Section */}
                            <div className="bg-white p-6 rounded-3xl border border-gray-150 shadow-sm space-y-4">
                              <h6 className="text-[10px] font-black uppercase tracking-wider text-brand-blue">4. Founder Section (Rich Canci)</h6>

                              {/* Portrait Image Controls */}
                              <div className="space-y-3 pb-3 border-b border-gray-100">
                                <span className="text-[9px] font-black uppercase tracking-widest text-gray-500 block">Portrait Image</span>
                                <div className="flex bg-gray-200/80 rounded-2xl p-1.5 self-stretch md:self-auto w-fit">
                                  {[
                                    { label: "Creative Asset", val: "media" },
                                    { label: "HTML / Script", val: "html" }
                                  ].map((mode) => (
                                    <button
                                      type="button"
                                      key={mode.val}
                                      onClick={() => setContent(prev => ({ ...prev, richType: mode.val }))}
                                      className={`px-4 py-2 rounded-xl font-black text-[8px] uppercase tracking-wider transition-all ${
                                        (content.richType || "media") === mode.val
                                          ? "bg-black text-white shadow-md"
                                          : "text-gray-400 hover:text-black"
                                      }`}
                                    >
                                      {mode.label}
                                    </button>
                                  ))}
                                </div>
                                {(content.richType || "media") === "html" ? (
                                  <div>
                                    <label className="text-[8px] font-black uppercase tracking-widest text-gray-400 block mb-1">HTML / Embed Code</label>
                                    <textarea
                                      rows={4}
                                      className="w-full bg-white border border-gray-200 px-4 py-3 rounded-xl font-mono text-xs text-black"
                                      value={content.richHtml || ''}
                                      onChange={(e) => setContent(prev => ({ ...prev, richHtml: e.target.value }))}
                                      placeholder="<div>Your custom HTML here...</div>"
                                    />
                                  </div>
                                ) : (
                                  <div className="space-y-3">
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                      <div>
                                        <label className="text-[8px] font-black uppercase tracking-widest text-gray-400 block mb-1">Desktop URL</label>
                                        <div className="flex gap-1">
                                          <input
                                            type="text"
                                            className="flex-1 bg-white border border-gray-200 px-3 py-2 rounded-xl font-bold text-[10px] text-black"
                                            value={content.richDesktop || ''}
                                            onChange={(e) => setContent(prev => ({ ...prev, richDesktop: e.target.value }))}
                                            placeholder="https://..."
                                          />
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const input = document.getElementById('image-upload') as any;
                                              input.dataset.currentId = 'richDesktop';
                                              input.click();
                                            }}
                                            className="bg-brand-blue hover:bg-black text-white px-2 py-1 rounded-lg text-[7px] font-black uppercase"
                                          >Upload</button>
                                        </div>
                                      </div>
                                      <div>
                                        <label className="text-[8px] font-black uppercase tracking-widest text-gray-400 block mb-1">Tablet URL</label>
                                        <div className="flex gap-1">
                                          <input
                                            type="text"
                                            className="flex-1 bg-white border border-gray-200 px-3 py-2 rounded-xl font-bold text-[10px] text-black"
                                            value={content.richTablet || ''}
                                            onChange={(e) => setContent(prev => ({ ...prev, richTablet: e.target.value }))}
                                            placeholder="https://..."
                                          />
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const input = document.getElementById('image-upload') as any;
                                              input.dataset.currentId = 'richTablet';
                                              input.click();
                                            }}
                                            className="bg-brand-blue hover:bg-black text-white px-2 py-1 rounded-lg text-[7px] font-black uppercase"
                                          >Upload</button>
                                        </div>
                                      </div>
                                      <div>
                                        <label className="text-[8px] font-black uppercase tracking-widest text-gray-400 block mb-1">Mobile URL</label>
                                        <div className="flex gap-1">
                                          <input
                                            type="text"
                                            className="flex-1 bg-white border border-gray-200 px-3 py-2 rounded-xl font-bold text-[10px] text-black"
                                            value={content.richMobile || ''}
                                            onChange={(e) => setContent(prev => ({ ...prev, richMobile: e.target.value }))}
                                            placeholder="https://..."
                                          />
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const input = document.getElementById('image-upload') as any;
                                              input.dataset.currentId = 'richMobile';
                                              input.click();
                                            }}
                                            className="bg-brand-blue hover:bg-black text-white px-2 py-1 rounded-lg text-[7px] font-black uppercase"
                                          >Upload</button>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                      <div>
                                        <label className="text-[8px] font-black uppercase tracking-widest text-gray-400 block mb-1">Link URL</label>
                                        <input
                                          type="text"
                                          className="w-full bg-white border border-gray-200 px-3 py-2 rounded-xl font-bold text-[10px] text-black"
                                          value={content.richLink || ''}
                                          onChange={(e) => setContent(prev => ({ ...prev, richLink: e.target.value }))}
                                          placeholder="https://..."
                                        />
                                      </div>
                                      <div className="grid grid-cols-2 gap-2">
                                        <div>
                                          <label className="text-[8px] font-black uppercase tracking-widest text-gray-400 block mb-1">Fit</label>
                                          <select
                                            className="w-full bg-white border border-gray-200 px-2 py-2 rounded-xl font-bold text-[10px] text-black"
                                            value={content.richSize || 'cover'}
                                            onChange={(e) => setContent(prev => ({ ...prev, richSize: e.target.value }))}
                                          >
                                            <option value="cover">Cover</option>
                                            <option value="centered">Contain</option>
                                            <option value="stretch">Stretch</option>
                                          </select>
                                        </div>
                                        <div>
                                          <label className="text-[8px] font-black uppercase tracking-widest text-gray-400 block mb-1">Position</label>
                                          <select
                                            className="w-full bg-white border border-gray-200 px-2 py-2 rounded-xl font-bold text-[10px] text-black"
                                            value={content.richPosition || 'center'}
                                            onChange={(e) => setContent(prev => ({ ...prev, richPosition: e.target.value }))}
                                          >
                                            <option value="center">Center</option>
                                            <option value="top">Top</option>
                                            <option value="bottom">Bottom</option>
                                            <option value="left">Left</option>
                                            <option value="right">Right</option>
                                          </select>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                      <div>
                                        <label className="text-[8px] font-black uppercase tracking-widest text-gray-400 block mb-1">Text Size (px)</label>
                                        <input
                                          type="number"
                                          min="8"
                                          max="72"
                                          className="w-full bg-white border border-gray-200 px-3 py-2 rounded-xl font-bold text-[10px] text-black"
                                          value={content.richTextSize || '14'}
                                          onChange={(e) => setContent(prev => ({ ...prev, richTextSize: e.target.value }))}
                                        />
                                      </div>
                                      <div>
                                        <label className="text-[8px] font-black uppercase tracking-widest text-gray-400 block mb-1">Text Color</label>
                                        <div className="flex gap-1">
                                          <input
                                            type="color"
                                            className="w-8 h-8 rounded-xl border border-gray-200 cursor-pointer"
                                            value={content.richTextColor || '#FFFFFF'}
                                            onChange={(e) => setContent(prev => ({ ...prev, richTextColor: e.target.value }))}
                                          />
                                          <input
                                            type="text"
                                            className="flex-1 bg-white border border-gray-200 px-2 py-1 rounded-xl font-bold text-[10px] text-black uppercase"
                                            value={content.richTextColor || '#FFFFFF'}
                                            onChange={(e) => setContent(prev => ({ ...prev, richTextColor: e.target.value }))}
                                            placeholder="#FFFFFF"
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                              
                              {/* Title Customizer */}
                              <div className="space-y-3 pb-3 border-b border-gray-100">
                                <span className="text-[9px] font-black uppercase tracking-widest text-gray-500 block">Title Styling</span>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                  <div>
                                    <label className="text-[8px] font-black uppercase tracking-widest text-gray-400 block mb-1">Color</label>
                                    <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-xl border border-gray-100 shadow-sm">
                                      <input 
                                        type="color" 
                                        className="w-8 h-8 rounded cursor-pointer border-none bg-transparent" 
                                        value={content.founderTitleColor || '#000000'} 
                                        onChange={(e) => setContent(prev => ({ ...prev, founderTitleColor: e.target.value }))}
                                      />
                                      <span className="text-[9px] font-mono text-gray-500 uppercase">{content.founderTitleColor || '#000000'}</span>
                                    </div>
                                  </div>
                                  <div>
                                    <label className="text-[8px] font-black uppercase tracking-widest text-gray-400 block mb-1">Font Size ({content.founderTitleSize || '60'}px)</label>
                                    <input 
                                      type="range" 
                                      min="12" 
                                      max="160" 
                                      className="w-full accent-brand-blue mt-2" 
                                      value={content.founderTitleSize || '60'} 
                                      onChange={(e) => setContent(prev => ({ ...prev, founderTitleSize: e.target.value }))}
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[8px] font-black uppercase tracking-widest text-gray-400 block mb-1">Alignment</label>
                                    <select 
                                      className="w-full text-xs bg-gray-50 p-2 rounded-xl border border-gray-100 shadow-sm mt-1"
                                      value={content.founderTitleAlign || 'left'} 
                                      onChange={(e) => setContent(prev => ({ ...prev, founderTitleAlign: e.target.value }))}
                                    >
                                      <option value="left">Left</option>
                                      <option value="center">Center</option>
                                      <option value="right">Right</option>
                                      <option value="justify">Justify</option>
                                    </select>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 pt-1">
                                  <label className="text-[8px] font-black uppercase tracking-widest text-gray-400">Bold</label>
                                  <button
                                    type="button"
                                    onClick={() => setContent(prev => ({ ...prev, founderTitleBold: !prev.founderTitleBold }))}
                                    className={`px-3 py-1 rounded-lg text-xs font-black transition-all ${ content.founderTitleBold ? 'bg-brand-blue text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200' }`}
                                  >B</button>
                                </div>
                              </div>

                              {/* Description Customizer */}
                              <div className="space-y-3">
                                <span className="text-[9px] font-black uppercase tracking-widest text-gray-500 block">Description Styling</span>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                  <div>
                                    <label className="text-[8px] font-black uppercase tracking-widest text-gray-400 block mb-1">Color</label>
                                    <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-xl border border-gray-100 shadow-sm">
                                      <input 
                                        type="color" 
                                        className="w-8 h-8 rounded cursor-pointer border-none bg-transparent" 
                                        value={content.founderDescColor || '#4B5563'} 
                                        onChange={(e) => setContent(prev => ({ ...prev, founderDescColor: e.target.value }))}
                                      />
                                      <span className="text-[9px] font-mono text-gray-500 uppercase">{content.founderDescColor || '#4B5563'}</span>
                                    </div>
                                  </div>
                                  <div>
                                    <label className="text-[8px] font-black uppercase tracking-widest text-gray-400 block mb-1">Font Size ({content.founderDescSize || '18'}px)</label>
                                    <input 
                                      type="range" 
                                      min="12" 
                                      max="80" 
                                      className="w-full accent-brand-blue mt-2" 
                                      value={content.founderDescSize || '18'} 
                                      onChange={(e) => setContent(prev => ({ ...prev, founderDescSize: e.target.value }))}
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[8px] font-black uppercase tracking-widest text-gray-400 block mb-1">Alignment</label>
                                    <select 
                                      className="w-full text-xs bg-gray-50 p-2 rounded-xl border border-gray-100 shadow-sm mt-1"
                                      value={content.founderDescAlign || 'left'} 
                                      onChange={(e) => setContent(prev => ({ ...prev, founderDescAlign: e.target.value }))}
                                    >
                                      <option value="left">Left</option>
                                      <option value="center">Center</option>
                                      <option value="right">Right</option>
                                      <option value="justify">Justify</option>
                                    </select>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 pt-1">
                                  <label className="text-[8px] font-black uppercase tracking-widest text-gray-400">Bold</label>
                                  <button
                                    type="button"
                                    onClick={() => setContent(prev => ({ ...prev, founderDescBold: !prev.founderDescBold }))}
                                    className={`px-3 py-1 rounded-lg text-xs font-black transition-all ${ content.founderDescBold ? 'bg-brand-blue text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200' }`}
                                  >B</button>
                                </div>
                              </div>
                            </div>

                            {/* Section 5: Stories Section */}
                            <div className="bg-white p-6 rounded-3xl border border-gray-150 shadow-sm space-y-4">
                              <h6 className="text-[10px] font-black uppercase tracking-wider text-brand-blue">5. Survivor Stories Section</h6>
                              
                              {/* Title Customizer */}
                              <div className="space-y-3">
                                <span className="text-[9px] font-black uppercase tracking-widest text-gray-500 block">Title Styling</span>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                  <div>
                                    <label className="text-[8px] font-black uppercase tracking-widest text-gray-400 block mb-1">Color</label>
                                    <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-xl border border-gray-100 shadow-sm">
                                      <input 
                                        type="color" 
                                        className="w-8 h-8 rounded cursor-pointer border-none bg-transparent" 
                                        value={content.storiesTitleColor || '#FFFFFF'} 
                                        onChange={(e) => setContent(prev => ({ ...prev, storiesTitleColor: e.target.value }))}
                                      />
                                      <span className="text-[9px] font-mono text-gray-500 uppercase">{content.storiesTitleColor || '#FFFFFF'}</span>
                                    </div>
                                  </div>
                                  <div>
                                    <label className="text-[8px] font-black uppercase tracking-widest text-gray-400 block mb-1">Font Size ({content.storiesTitleSize || '64'}px)</label>
                                    <input 
                                      type="range" 
                                      min="12" 
                                      max="160" 
                                      className="w-full accent-brand-blue mt-2" 
                                      value={content.storiesTitleSize || '64'} 
                                      onChange={(e) => setContent(prev => ({ ...prev, storiesTitleSize: e.target.value }))}
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[8px] font-black uppercase tracking-widest text-gray-400 block mb-1">Alignment</label>
                                    <select 
                                      className="w-full text-xs bg-gray-50 p-2 rounded-xl border border-gray-100 shadow-sm mt-1"
                                      value={content.storiesTitleAlign || 'center'} 
                                      onChange={(e) => setContent(prev => ({ ...prev, storiesTitleAlign: e.target.value }))}
                                    >
                                      <option value="left">Left</option>
                                      <option value="center">Center</option>
                                      <option value="right">Right</option>
                                      <option value="justify">Justify</option>
                                    </select>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 pt-1">
                                  <label className="text-[8px] font-black uppercase tracking-widest text-gray-400">Bold</label>
                                  <button
                                    type="button"
                                    onClick={() => setContent(prev => ({ ...prev, storiesTitleBold: !prev.storiesTitleBold }))}
                                    className={`px-3 py-1 rounded-lg text-xs font-black transition-all ${ content.storiesTitleBold ? 'bg-brand-blue text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200' }`}
                                  >B</button>
                                </div>
                              </div>
                            </div>

                            {/* Name Customizer */}
                            <div className="space-y-3 pt-3 border-t border-gray-100">
                              <span className="text-[9px] font-black uppercase tracking-widest text-gray-500 block">Name Styling</span>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                  <label className="text-[8px] font-black uppercase tracking-widest text-gray-400 block mb-1">Color</label>
                                  <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-xl border border-gray-100 shadow-sm">
                                    <input
                                      type="color"
                                      className="w-8 h-8 rounded cursor-pointer border-none bg-transparent"
                                      value={content.storiesNameColor || '#FFFFFF'}
                                      onChange={(e) => setContent(prev => ({ ...prev, storiesNameColor: e.target.value }))}
                                    />
                                    <span className="text-[9px] font-mono text-gray-500 uppercase">{content.storiesNameColor || '#FFFFFF'}</span>
                                  </div>
                                </div>
                                <div>
                                  <label className="text-[8px] font-black uppercase tracking-widest text-gray-400 block mb-1">Font Size ({content.storiesNameSize || '48'}px)</label>
                                  <input
                                    type="range"
                                    min="12"
                                    max="160"
                                    className="w-full accent-brand-blue mt-2"
                                    value={content.storiesNameSize || '48'}
                                    onChange={(e) => setContent(prev => ({ ...prev, storiesNameSize: e.target.value }))}
                                  />
                                </div>
                                <div>
                                  <label className="text-[8px] font-black uppercase tracking-widest text-gray-400 block mb-1">Alignment</label>
                                  <select
                                    className="w-full text-xs bg-gray-50 p-2 rounded-xl border border-gray-100 shadow-sm mt-1"
                                    value={content.storiesNameAlign || 'left'}
                                    onChange={(e) => setContent(prev => ({ ...prev, storiesNameAlign: e.target.value }))}
                                  >
                                    <option value="left">Left</option>
                                    <option value="center">Center</option>
                                    <option value="right">Right</option>
                                    <option value="justify">Justify</option>
                                  </select>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 pt-1">
                                <label className="text-[8px] font-black uppercase tracking-widest text-gray-400">Bold</label>
                                <button
                                  type="button"
                                  onClick={() => setContent(prev => ({ ...prev, storiesNameBold: !prev.storiesNameBold }))}
                                  className={`px-3 py-1 rounded-lg text-xs font-black transition-all ${ content.storiesNameBold ? 'bg-brand-blue text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200' }`}
                                >B</button>
                              </div>
                            </div>

                            {/* Description Customizer */}
                            <div className="space-y-3 pt-3 border-t border-gray-100">
                              <span className="text-[9px] font-black uppercase tracking-widest text-gray-500 block">Description Styling</span>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                  <label className="text-[8px] font-black uppercase tracking-widest text-gray-400 block mb-1">Color</label>
                                  <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-xl border border-gray-100 shadow-sm">
                                    <input
                                      type="color"
                                      className="w-8 h-8 rounded cursor-pointer border-none bg-transparent"
                                      value={content.storiesDescColor || '#FFFFFF'}
                                      onChange={(e) => setContent(prev => ({ ...prev, storiesDescColor: e.target.value }))}
                                    />
                                    <span className="text-[9px] font-mono text-gray-500 uppercase">{content.storiesDescColor || '#FFFFFF'}</span>
                                  </div>
                                </div>
                                <div>
                                  <label className="text-[8px] font-black uppercase tracking-widest text-gray-400 block mb-1">Font Size ({content.storiesDescSize || '20'}px)</label>
                                  <input
                                    type="range"
                                    min="12"
                                    max="64"
                                    className="w-full accent-brand-blue mt-2"
                                    value={content.storiesDescSize || '20'}
                                    onChange={(e) => setContent(prev => ({ ...prev, storiesDescSize: e.target.value }))}
                                  />
                                </div>
                                <div>
                                  <label className="text-[8px] font-black uppercase tracking-widest text-gray-400 block mb-1">Alignment</label>
                                  <select
                                    className="w-full text-xs bg-gray-50 p-2 rounded-xl border border-gray-100 shadow-sm mt-1"
                                    value={content.storiesDescAlign || 'left'}
                                    onChange={(e) => setContent(prev => ({ ...prev, storiesDescAlign: e.target.value }))}
                                  >
                                    <option value="left">Left</option>
                                    <option value="center">Center</option>
                                    <option value="right">Right</option>
                                    <option value="justify">Justify</option>
                                  </select>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 pt-1">
                                <label className="text-[8px] font-black uppercase tracking-widest text-gray-400">Bold</label>
                                <button
                                  type="button"
                                  onClick={() => setContent(prev => ({ ...prev, storiesDescBold: !prev.storiesDescBold }))}
                                  className={`px-3 py-1 rounded-lg text-xs font-black transition-all ${ content.storiesDescBold ? 'bg-brand-blue text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200' }`}
                                >B</button>
                              </div>
                            </div>
                          </div>

                            {/* Section 6: Fundraising Section */}
                            <div className="bg-white p-6 rounded-3xl border border-gray-150 shadow-sm space-y-4">
                              <h6 className="text-[10px] font-black uppercase tracking-wider text-brand-blue">6. Fundraising Section</h6>

                              {/* Background Banner Controls */}
                              <div className="space-y-3 pb-3 border-b border-gray-100">
                                <span className="text-[9px] font-black uppercase tracking-widest text-gray-500 block">Background Banner</span>
                                <div className="flex bg-gray-200/80 rounded-2xl p-1.5 self-stretch md:self-auto w-fit">
                                  {[
                                    { label: "Creative Asset", val: "media" },
                                    { label: "HTML / Script", val: "html" }
                                  ].map((mode) => (
                                    <button
                                      type="button"
                                      key={mode.val}
                                      onClick={() => setContent(prev => ({ ...prev, fundraisingBgType: mode.val }))}
                                      className={`px-4 py-2 rounded-xl font-black text-[8px] uppercase tracking-wider transition-all ${
                                        (content.fundraisingBgType || "media") === mode.val
                                          ? "bg-black text-white shadow-md"
                                          : "text-gray-400 hover:text-black"
                                      }`}
                                    >
                                      {mode.label}
                                    </button>
                                  ))}
                                </div>
                                {(content.fundraisingBgType || "media") === "html" ? (
                                  <div>
                                    <label className="text-[8px] font-black uppercase tracking-widest text-gray-400 block mb-1">HTML / Embed Code</label>
                                    <textarea
                                      rows={4}
                                      className="w-full bg-white border border-gray-200 px-4 py-3 rounded-xl font-mono text-xs text-black"
                                      value={content.fundraisingBgHtml || ''}
                                      onChange={(e) => setContent(prev => ({ ...prev, fundraisingBgHtml: e.target.value }))}
                                      placeholder="<div>Your custom HTML here...</div>"
                                    />
                                  </div>
                                ) : (
                                  <div className="space-y-3">
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                      <div>
                                        <label className="text-[8px] font-black uppercase tracking-widest text-gray-400 block mb-1">Desktop URL</label>
                                        <div className="flex gap-1">
                                          <input
                                            type="text"
                                            className="flex-1 bg-white border border-gray-200 px-3 py-2 rounded-xl font-bold text-[10px] text-black"
                                            value={content.fundraisingBgDesktop || ''}
                                            onChange={(e) => setContent(prev => ({ ...prev, fundraisingBgDesktop: e.target.value }))}
                                            placeholder="https://..."
                                          />
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const input = document.getElementById('image-upload') as any;
                                              input.dataset.currentId = 'fundraisingBgDesktop';
                                              input.click();
                                            }}
                                            className="bg-brand-blue hover:bg-black text-white px-2 py-1 rounded-lg text-[7px] font-black uppercase"
                                          >Upload</button>
                                        </div>
                                      </div>
                                      <div>
                                        <label className="text-[8px] font-black uppercase tracking-widest text-gray-400 block mb-1">Tablet URL</label>
                                        <div className="flex gap-1">
                                          <input
                                            type="text"
                                            className="flex-1 bg-white border border-gray-200 px-3 py-2 rounded-xl font-bold text-[10px] text-black"
                                            value={content.fundraisingBgTablet || ''}
                                            onChange={(e) => setContent(prev => ({ ...prev, fundraisingBgTablet: e.target.value }))}
                                            placeholder="https://..."
                                          />
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const input = document.getElementById('image-upload') as any;
                                              input.dataset.currentId = 'fundraisingBgTablet';
                                              input.click();
                                            }}
                                            className="bg-brand-blue hover:bg-black text-white px-2 py-1 rounded-lg text-[7px] font-black uppercase"
                                          >Upload</button>
                                        </div>
                                      </div>
                                      <div>
                                        <label className="text-[8px] font-black uppercase tracking-widest text-gray-400 block mb-1">Mobile URL</label>
                                        <div className="flex gap-1">
                                          <input
                                            type="text"
                                            className="flex-1 bg-white border border-gray-200 px-3 py-2 rounded-xl font-bold text-[10px] text-black"
                                            value={content.fundraisingBgMobile || ''}
                                            onChange={(e) => setContent(prev => ({ ...prev, fundraisingBgMobile: e.target.value }))}
                                            placeholder="https://..."
                                          />
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const input = document.getElementById('image-upload') as any;
                                              input.dataset.currentId = 'fundraisingBgMobile';
                                              input.click();
                                            }}
                                            className="bg-brand-blue hover:bg-black text-white px-2 py-1 rounded-lg text-[7px] font-black uppercase"
                                          >Upload</button>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                      <div>
                                        <label className="text-[8px] font-black uppercase tracking-widest text-gray-400 block mb-1">Link URL</label>
                                        <input
                                          type="text"
                                          className="w-full bg-white border border-gray-200 px-3 py-2 rounded-xl font-bold text-[10px] text-black"
                                          value={content.fundraisingBgLink || ''}
                                          onChange={(e) => setContent(prev => ({ ...prev, fundraisingBgLink: e.target.value }))}
                                          placeholder="https://..."
                                        />
                                      </div>
                                      <div className="grid grid-cols-2 gap-2">
                                        <div>
                                          <label className="text-[8px] font-black uppercase tracking-widest text-gray-400 block mb-1">Fit</label>
                                          <select
                                            className="w-full bg-white border border-gray-200 px-2 py-2 rounded-xl font-bold text-[10px] text-black"
                                            value={content.fundraisingBgSize || 'cover'}
                                            onChange={(e) => setContent(prev => ({ ...prev, fundraisingBgSize: e.target.value }))}
                                          >
                                            <option value="cover">Cover</option>
                                            <option value="centered">Contain</option>
                                            <option value="stretch">Stretch</option>
                                          </select>
                                        </div>
                                        <div>
                                          <label className="text-[8px] font-black uppercase tracking-widest text-gray-400 block mb-1">Position</label>
                                          <select
                                            className="w-full bg-white border border-gray-200 px-2 py-2 rounded-xl font-bold text-[10px] text-black"
                                            value={content.fundraisingBgPosition || 'center'}
                                            onChange={(e) => setContent(prev => ({ ...prev, fundraisingBgPosition: e.target.value }))}
                                          >
                                            <option value="center">Center</option>
                                            <option value="top">Top</option>
                                            <option value="bottom">Bottom</option>
                                            <option value="left">Left</option>
                                            <option value="right">Right</option>
                                          </select>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                      <div>
                                        <label className="text-[8px] font-black uppercase tracking-widest text-gray-400 block mb-1">Text Size (px)</label>
                                        <input
                                          type="number"
                                          min="8"
                                          max="72"
                                          className="w-full bg-white border border-gray-200 px-3 py-2 rounded-xl font-bold text-[10px] text-black"
                                          value={content.fundraisingBgTextSize || '14'}
                                          onChange={(e) => setContent(prev => ({ ...prev, fundraisingBgTextSize: e.target.value }))}
                                        />
                                      </div>
                                      <div>
                                        <label className="text-[8px] font-black uppercase tracking-widest text-gray-400 block mb-1">Text Color</label>
                                        <div className="flex gap-1">
                                          <input
                                            type="color"
                                            className="w-8 h-8 rounded-xl border border-gray-200 cursor-pointer"
                                            value={content.fundraisingBgTextColor || '#FFFFFF'}
                                            onChange={(e) => setContent(prev => ({ ...prev, fundraisingBgTextColor: e.target.value }))}
                                          />
                                          <input
                                            type="text"
                                            className="flex-1 bg-white border border-gray-200 px-2 py-1 rounded-xl font-bold text-[10px] text-black uppercase"
                                            value={content.fundraisingBgTextColor || '#FFFFFF'}
                                            onChange={(e) => setContent(prev => ({ ...prev, fundraisingBgTextColor: e.target.value }))}
                                            placeholder="#FFFFFF"
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                              
                              {/* Title Customizer */}
                              <div className="space-y-3 pb-3 border-b border-gray-100">
                                <span className="text-[9px] font-black uppercase tracking-widest text-gray-500 block">Title Styling</span>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                  <div>
                                    <label className="text-[8px] font-black uppercase tracking-widest text-gray-400 block mb-1">Color</label>
                                    <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-xl border border-gray-100 shadow-sm">
                                      <input 
                                        type="color" 
                                        className="w-8 h-8 rounded cursor-pointer border-none bg-transparent" 
                                        value={content.fundraisingTitleColor || '#FFFFFF'} 
                                        onChange={(e) => setContent(prev => ({ ...prev, fundraisingTitleColor: e.target.value }))}
                                      />
                                      <span className="text-[9px] font-mono text-gray-500 uppercase">{content.fundraisingTitleColor || '#FFFFFF'}</span>
                                    </div>
                                  </div>
                                  <div>
                                    <label className="text-[8px] font-black uppercase tracking-widest text-gray-400 block mb-1">Font Size ({content.fundraisingTitleSize || '72'}px)</label>
                                    <input 
                                      type="range" 
                                      min="12" 
                                      max="160" 
                                      className="w-full accent-brand-blue mt-2" 
                                      value={content.fundraisingTitleSize || '72'} 
                                      onChange={(e) => setContent(prev => ({ ...prev, fundraisingTitleSize: e.target.value }))}
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[8px] font-black uppercase tracking-widest text-gray-400 block mb-1">Alignment</label>
                                    <select 
                                      className="w-full text-xs bg-gray-50 p-2 rounded-xl border border-gray-100 shadow-sm mt-1"
                                      value={content.fundraisingTitleAlign || 'center'} 
                                      onChange={(e) => setContent(prev => ({ ...prev, fundraisingTitleAlign: e.target.value }))}
                                    >
                                      <option value="left">Left</option>
                                      <option value="center">Center</option>
                                      <option value="right">Right</option>
                                      <option value="justify">Justify</option>
                                    </select>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 pt-1">
                                  <label className="text-[8px] font-black uppercase tracking-widest text-gray-400">Bold</label>
                                  <button
                                    type="button"
                                    onClick={() => setContent(prev => ({ ...prev, fundraisingTitleBold: !prev.fundraisingTitleBold }))}
                                    className={`px-3 py-1 rounded-lg text-xs font-black transition-all ${ content.fundraisingTitleBold ? 'bg-brand-blue text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200' }`}
                                  >B</button>
                                </div>
                              </div>
                              
                              {/* Description Customizer */}
                              <div className="space-y-3">
                                <span className="text-[9px] font-black uppercase tracking-widest text-gray-500 block">Description Styling</span>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                  <div>
                                    <label className="text-[8px] font-black uppercase tracking-widest text-gray-400 block mb-1">Color</label>
                                    <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-xl border border-gray-100 shadow-sm">
                                      <input 
                                        type="color" 
                                        className="w-8 h-8 rounded cursor-pointer border-none bg-transparent" 
                                        value={content.fundraisingDescColor || '#9CA3AF'} 
                                        onChange={(e) => setContent(prev => ({ ...prev, fundraisingDescColor: e.target.value }))}
                                      />
                                      <span className="text-[9px] font-mono text-gray-500 uppercase">{content.fundraisingDescColor || '#9CA3AF'}</span>
                                    </div>
                                  </div>
                                  <div>
                                    <label className="text-[8px] font-black uppercase tracking-widest text-gray-400 block mb-1">Font Size ({content.fundraisingDescSize || '20'}px)</label>
                                    <input 
                                      type="range" 
                                      min="12" 
                                      max="80" 
                                      className="w-full accent-brand-blue mt-2" 
                                      value={content.fundraisingDescSize || '20'} 
                                      onChange={(e) => setContent(prev => ({ ...prev, fundraisingDescSize: e.target.value }))}
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[8px] font-black uppercase tracking-widest text-gray-400 block mb-1">Alignment</label>
                                    <select 
                                      className="w-full text-xs bg-gray-50 p-2 rounded-xl border border-gray-100 shadow-sm mt-1"
                                      value={content.fundraisingDescAlign || 'center'} 
                                      onChange={(e) => setContent(prev => ({ ...prev, fundraisingDescAlign: e.target.value }))}
                                    >
                                      <option value="left">Left</option>
                                      <option value="center">Center</option>
                                      <option value="right">Right</option>
                                      <option value="justify">Justify</option>
                                    </select>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 pt-1">
                                  <label className="text-[8px] font-black uppercase tracking-widest text-gray-400">Bold</label>
                                  <button
                                    type="button"
                                    onClick={() => setContent(prev => ({ ...prev, fundraisingDescBold: !prev.fundraisingDescBold }))}
                                    className={`px-3 py-1 rounded-lg text-xs font-black transition-all ${ content.fundraisingDescBold ? 'bg-brand-blue text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200' }`}
                                  >B</button>
                                </div>
                              </div>
                            </div>

                            {/* Section 7: Donation Section */}
                            <div className="bg-white p-6 rounded-3xl border border-gray-150 shadow-sm space-y-4">
                              <h6 className="text-[10px] font-black uppercase tracking-wider text-brand-blue">7. Donation Section (Fuel The Fight)</h6>
                              
                              {/* Title Customizer */}
                              <div className="space-y-3 pb-3 border-b border-gray-100">
                                <span className="text-[9px] font-black uppercase tracking-widest text-gray-500 block">Title Styling</span>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                  <div>
                                    <label className="text-[8px] font-black uppercase tracking-widest text-gray-400 block mb-1">Color</label>
                                    <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-xl border border-gray-100 shadow-sm">
                                      <input 
                                        type="color" 
                                        className="w-8 h-8 rounded cursor-pointer border-none bg-transparent" 
                                        value={content.donationTitleColor || '#000000'} 
                                        onChange={(e) => setContent(prev => ({ ...prev, donationTitleColor: e.target.value }))}
                                      />
                                      <span className="text-[9px] font-mono text-gray-500 uppercase">{content.donationTitleColor || '#000000'}</span>
                                    </div>
                                  </div>
                                  <div>
                                    <label className="text-[8px] font-black uppercase tracking-widest text-gray-400 block mb-1">Font Size ({content.donationTitleSize || '64'}px)</label>
                                    <input 
                                      type="range" 
                                      min="12" 
                                      max="160" 
                                      className="w-full accent-brand-blue mt-2" 
                                      value={content.donationTitleSize || '64'} 
                                      onChange={(e) => setContent(prev => ({ ...prev, donationTitleSize: e.target.value }))}
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[8px] font-black uppercase tracking-widest text-gray-400 block mb-1">Alignment</label>
                                    <select 
                                      className="w-full text-xs bg-gray-50 p-2 rounded-xl border border-gray-100 shadow-sm mt-1"
                                      value={content.donationTitleAlign || 'center'} 
                                      onChange={(e) => setContent(prev => ({ ...prev, donationTitleAlign: e.target.value }))}
                                    >
                                      <option value="left">Left</option>
                                      <option value="center">Center</option>
                                      <option value="right">Right</option>
                                      <option value="justify">Justify</option>
                                    </select>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 pt-1">
                                  <label className="text-[8px] font-black uppercase tracking-widest text-gray-400">Bold</label>
                                  <button
                                    type="button"
                                    onClick={() => setContent(prev => ({ ...prev, donationTitleBold: !prev.donationTitleBold }))}
                                    className={`px-3 py-1 rounded-lg text-xs font-black transition-all ${ content.donationTitleBold ? 'bg-brand-blue text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200' }`}
                                  >B</button>
                                </div>
                              </div>

                              {/* Description Customizer */}
                              <div className="space-y-3">
                                <span className="text-[9px] font-black uppercase tracking-widest text-gray-500 block">Description Styling</span>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                  <div>
                                    <label className="text-[8px] font-black uppercase tracking-widest text-gray-400 block mb-1">Color</label>
                                    <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-xl border border-gray-100 shadow-sm">
                                      <input 
                                        type="color" 
                                        className="w-8 h-8 rounded cursor-pointer border-none bg-transparent" 
                                        value={content.donationDescColor || '#000000'} 
                                        onChange={(e) => setContent(prev => ({ ...prev, donationDescColor: e.target.value }))}
                                      />
                                      <span className="text-[9px] font-mono text-gray-500 uppercase">{content.donationDescColor || '#000000'}</span>
                                    </div>
                                  </div>
                                  <div>
                                    <label className="text-[8px] font-black uppercase tracking-widest text-gray-400 block mb-1">Font Size ({content.donationDescSize || '18'}px)</label>
                                    <input 
                                      type="range" 
                                      min="12" 
                                      max="80" 
                                      className="w-full accent-brand-blue mt-2" 
                                      value={content.donationDescSize || '18'} 
                                      onChange={(e) => setContent(prev => ({ ...prev, donationDescSize: e.target.value }))}
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[8px] font-black uppercase tracking-widest text-gray-400 block mb-1">Alignment</label>
                                    <select 
                                      className="w-full text-xs bg-gray-50 p-2 rounded-xl border border-gray-100 shadow-sm mt-1"
                                      value={content.donationDescAlign || 'center'} 
                                      onChange={(e) => setContent(prev => ({ ...prev, donationDescAlign: e.target.value }))}
                                    >
                                      <option value="left">Left</option>
                                      <option value="center">Center</option>
                                      <option value="right">Right</option>
                                      <option value="justify">Justify</option>
                                    </select>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 pt-1">
                                  <label className="text-[8px] font-black uppercase tracking-widest text-gray-400">Bold</label>
                                  <button
                                    type="button"
                                    onClick={() => setContent(prev => ({ ...prev, donationDescBold: !prev.donationDescBold }))}
                                    className={`px-3 py-1 rounded-lg text-xs font-black transition-all ${ content.donationDescBold ? 'bg-brand-blue text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200' }`}
                                  >B</button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>                     </div>

                        {/* Colors */}
                        <div className="space-y-4 pt-4 border-t border-gray-150">
                          <h5 className="text-xs font-black uppercase tracking-widest text-gray-400">Site-wide Color Palette</h5>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                            <div>
                              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-2">Body Text</label>
                              <div className="flex items-center gap-2 bg-white p-2 rounded-xl shadow-md border border-gray-150">
                                <input 
                                  type="color" 
                                  className="w-8 h-8 rounded cursor-pointer border-none bg-transparent" 
                                  value={content.themeTextColor || '#4B5563'} 
                                  onChange={(e) => setContent(prev => ({ ...prev, themeTextColor: e.target.value }))}
                                />
                                <span className="text-[10px] font-mono text-gray-500 uppercase">{content.themeTextColor || '#4B5563'}</span>
                              </div>
                            </div>
                            
                            <div>
                              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-2">Headings</label>
                              <div className="flex items-center gap-2 bg-white p-2 rounded-xl shadow-md border border-gray-150">
                                <input 
                                  type="color" 
                                  className="w-8 h-8 rounded cursor-pointer border-none bg-transparent" 
                                  value={content.themeHeadingColor || '#000000'} 
                                  onChange={(e) => setContent(prev => ({ ...prev, themeHeadingColor: e.target.value }))}
                                />
                                <span className="text-[10px] font-mono text-gray-500 uppercase">{content.themeHeadingColor || '#000000'}</span>
                              </div>
                            </div>

                            <div>
                              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-2">Brand Accent</label>
                              <div className="flex items-center gap-2 bg-white p-2 rounded-xl shadow-md border border-gray-150">
                                <input 
                                  type="color" 
                                  className="w-8 h-8 rounded cursor-pointer border-none bg-transparent" 
                                  value={content.themeBrandColor || '#00A3FF'} 
                                  onChange={(e) => setContent(prev => ({ ...prev, themeBrandColor: e.target.value }))}
                                />
                                <span className="text-[10px] font-mono text-gray-500 uppercase">{content.themeBrandColor || '#00A3FF'}</span>
                              </div>
                            </div>
                          </div>

                          {/* Box Shadow Config */}
                          <div className="pt-8 border-t border-gray-250/50 space-y-6">
                            <div className="space-y-1">
                              <h5 className="text-xs font-black uppercase tracking-widest text-brand-blue">Box Shadow (Storefront Cards)</h5>
                              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider leading-relaxed">Añade una sombra luminosa con el color de acento a las cajas de productos en la tienda virtual.</p>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                              <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-2">Box Shadow Estado</label>
                                <select 
                                  className="w-full bg-white px-4 py-3.5 rounded-xl font-bold text-xs border border-gray-200 focus:ring-2 focus:ring-brand-blue text-black"
                                  value={content.themeBoxShadowEnabled ?? 'true'}
                                  onChange={(e) => setContent(prev => ({ ...prev, themeBoxShadowEnabled: e.target.value }))}
                                >
                                  <option value="true">Activado (Enabled)</option>
                                  <option value="false">Desactivado (Disabled)</option>
                                </select>
                              </div>

                              <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-2">Box Shadow Color</label>
                                <div className="flex items-center gap-2 bg-white p-2 rounded-xl shadow-md border border-gray-150">
                                  <input 
                                    type="color" 
                                    className="w-8 h-8 rounded cursor-pointer border-none bg-transparent" 
                                    value={content.themeBoxShadowColor || '#00A3FF'} 
                                    onChange={(e) => setContent(prev => ({ ...prev, themeBoxShadowColor: e.target.value }))}
                                  />
                                  <span className="text-[10px] font-mono text-gray-500 uppercase">{content.themeBoxShadowColor || '#00A3FF'}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                   </div>

                   {/* Column 2: Footer Settings */}
                   <div className="bg-black text-white rounded-[2.5rem] p-12 space-y-8 h-full">
                      <h4 className="text-xl font-black mb-8 text-brand-blue flex items-center gap-4">
                        <Settings size={24} /> Footer & Navigation Settings
                      </h4>
                      
                      <div className="grid grid-cols-1 gap-8">
                         <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-2">Navigation Group Title</label>
                            <input 
                              type="text"
                              className="w-full bg-white/5 border border-white/10 px-6 py-4 rounded-xl font-bold text-sm focus:border-brand-blue text-white focus:ring-0" 
                              value={content.footerNavTitle || 'Navigation'} 
                              onChange={(e) => setContent(prev => ({ ...prev, footerNavTitle: e.target.value }))}
                            />
                         </div>

                         <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-2">Footer Description</label>
                            <textarea 
                              className="w-full bg-white/5 border border-white/10 px-6 py-4 rounded-xl font-bold text-sm focus:border-brand-blue text-white focus:ring-0 h-20" 
                              value={content.footerDesc || ''} 
                              onChange={(e) => setContent(prev => ({ ...prev, footerDesc: e.target.value }))}
                            />
                         </div>

                         <div>
                            <div className="flex justify-between items-center mb-2">
                              <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Quick Links (Name | Path)</label>
                              <span className="text-[9px] text-gray-400 font-mono">One per line, e.g. Home | /</span>
                            </div>
                            <textarea 
                              placeholder="Shop Merch | /merch"
                              className="w-full bg-white/5 border border-white/10 px-6 py-4 rounded-xl font-mono text-sm focus:border-brand-blue text-white focus:ring-0 h-28" 
                              value={content.footerLinks || ''} 
                              onChange={(e) => setContent(prev => ({ ...prev, footerLinks: e.target.value }))}
                            />
                         </div>

                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <div>
                              <div className="flex justify-between items-center mb-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Footer Size Scaling</label>
                                <span className="text-xs font-black text-brand-blue">{content.footerSize || '1.0'}x</span>
                              </div>
                              <input 
                                type="range" 
                                className="w-full accent-brand-blue" 
                                min="0.8" 
                                max="1.5" 
                                step="0.1" 
                                value={content.footerSize || '1.0'} 
                                onChange={(e) => setContent(prev => ({ ...prev, footerSize: e.target.value }))}
                              />
                           </div>

                           <div>
                              <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-2">Social Buttons Shape</label>
                              <select 
                                className="w-full bg-white/5 border border-white/10 px-6 py-4 rounded-xl font-bold text-sm focus:border-brand-blue text-white focus:ring-0 text-white"
                                value={content.footerSocialShape || 'rounded-xl'}
                                onChange={(e) => setContent(prev => ({ ...prev, footerSocialShape: e.target.value }))}
                              >
                                <option value="rounded-xl" className="bg-black text-white">Rounded Corners (Default)</option>
                                <option value="rounded-full" className="bg-black text-white">Circular (Pill)</option>
                                <option value="rounded-none" className="bg-black text-white">Sharp Square</option>
                              </select>
                           </div>
                         </div>

                         {/* Footer Colors */}
                         <div className="space-y-4 pt-4 border-t border-white/10">
                           <h5 className="text-xs font-black uppercase tracking-widest text-gray-500">Footer Color Palette</h5>
                           <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                             <div>
                               <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-2">Background</label>
                               <div className="flex items-center gap-2 bg-white/5 p-2 rounded-xl shadow-md border border-white/10">
                                 <input 
                                   type="color" 
                                   className="w-8 h-8 rounded cursor-pointer border-none bg-transparent" 
                                   value={content.footerBgColor || '#000000'} 
                                   onChange={(e) => setContent(prev => ({ ...prev, footerBgColor: e.target.value }))}
                                 />
                                 <span className="text-[9px] font-mono text-gray-300 uppercase">{content.footerBgColor || '#000000'}</span>
                               </div>
                             </div>

                             <div>
                               <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-2">Paragraph Text</label>
                               <div className="flex items-center gap-2 bg-white/5 p-2 rounded-xl shadow-md border border-white/10">
                                 <input 
                                   type="color" 
                                   className="w-8 h-8 rounded cursor-pointer border-none bg-transparent" 
                                   value={content.footerTextColor || '#9CA3AF'} 
                                   onChange={(e) => setContent(prev => ({ ...prev, footerTextColor: e.target.value }))}
                                 />
                                 <span className="text-[9px] font-mono text-gray-300 uppercase">{content.footerTextColor || '#9CA3AF'}</span>
                               </div>
                             </div>

                             <div>
                               <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-2">Links & Title</label>
                               <div className="flex items-center gap-2 bg-white/5 p-2 rounded-xl shadow-md border border-white/10">
                                 <input 
                                   type="color" 
                                   className="w-8 h-8 rounded cursor-pointer border-none bg-transparent" 
                                   value={content.footerLinkColor || '#FFFFFF'} 
                                   onChange={(e) => setContent(prev => ({ ...prev, footerLinkColor: e.target.value }))}
                                 />
                                 <span className="text-[9px] font-mono text-gray-300 uppercase">{content.footerLinkColor || '#FFFFFF'}</span>
                               </div>
                             </div>
                           </div>
                         </div>

                         {/* Footer Social Profiles */}
                         <div className="space-y-4 pt-4 border-t border-white/10">
                           <h5 className="text-xs font-black uppercase tracking-widest text-gray-500">Social Media Profile URLs</h5>
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <div>
                               <label className="text-[9px] font-black uppercase tracking-widest text-gray-500 block mb-1">Facebook URL</label>
                               <input 
                                 type="text" 
                                 className="w-full bg-white/5 border border-white/10 px-4 py-3 rounded-lg font-bold text-xs focus:border-brand-blue text-white focus:ring-0" 
                                 value={content.footerFb || ''} 
                                 onChange={(e) => setContent(prev => ({ ...prev, footerFb: e.target.value }))}
                               />
                             </div>
                             <div>
                               <label className="text-[9px] font-black uppercase tracking-widest text-gray-500 block mb-1">Instagram URL</label>
                               <input 
                                 type="text" 
                                 className="w-full bg-white/5 border border-white/10 px-4 py-3 rounded-lg font-bold text-xs focus:border-brand-blue text-white focus:ring-0" 
                                 value={content.footerIg || ''} 
                                 onChange={(e) => setContent(prev => ({ ...prev, footerIg: e.target.value }))}
                               />
                             </div>
                             <div>
                               <label className="text-[9px] font-black uppercase tracking-widest text-gray-500 block mb-1">Twitter / X URL</label>
                               <input 
                                 type="text" 
                                 className="w-full bg-white/5 border border-white/10 px-4 py-3 rounded-lg font-bold text-xs focus:border-brand-blue text-white focus:ring-0" 
                                 value={content.footerX || ''} 
                                 onChange={(e) => setContent(prev => ({ ...prev, footerX: e.target.value }))}
                               />
                             </div>
                             <div>
                               <label className="text-[9px] font-black uppercase tracking-widest text-gray-500 block mb-1">YouTube URL</label>
                               <input 
                                 type="text" 
                                 className="w-full bg-white/5 border border-white/10 px-4 py-3 rounded-lg font-bold text-xs focus:border-brand-blue text-white focus:ring-0" 
                                 value={content.footerYt || ''} 
                                 onChange={(e) => setContent(prev => ({ ...prev, footerYt: e.target.value }))}
                               />
                             </div>
                             <div>
                               <label className="text-[9px] font-black uppercase tracking-widest text-gray-500 block mb-1">TikTok URL</label>
                               <input 
                                 type="text" 
                                 className="w-full bg-white/5 border border-white/10 px-4 py-3 rounded-lg font-bold text-xs focus:border-brand-blue text-white focus:ring-0" 
                                 value={content.footerTiktok || ''} 
                                 onChange={(e) => setContent(prev => ({ ...prev, footerTiktok: e.target.value }))}
                               />
                             </div>
                             <div>
                               <label className="text-[9px] font-black uppercase tracking-widest text-gray-500 block mb-1">LinkedIn URL</label>
                               <input 
                                 type="text" 
                                 className="w-full bg-white/5 border border-white/10 px-4 py-3 rounded-lg font-bold text-xs focus:border-brand-blue text-white focus:ring-0" 
                                 value={content.footerLinkedin || ''} 
                                 onChange={(e) => setContent(prev => ({ ...prev, footerLinkedin: e.target.value }))}
                               />
                             </div>
                           </div>
                         </div>
                      </div>
                   </div>
              </motion.div>
            )}

            {activeTab === 'donations' && (
              <motion.div
                key="donations"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-16 animate-none"
              >
                {/* Donations HTML Integration Card */}
                <div className="bg-black text-white p-10 rounded-[3.5rem] shadow-2xl relative overflow-hidden">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 pb-6 border-b border-white/10">
                    <div>
                      <span className="text-[10px] font-black tracking-widest uppercase text-brand-blue block mb-1">Donations Integration</span>
                      <h3 className="text-2xl font-black italic uppercase tracking-tighter">Custom Code Block</h3>
                      <p className="text-xs text-gray-400 font-medium">Insert the donation HTML/Liquid code provided by Shopify, Stripe, or any other platform.</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="block text-[10px] font-black uppercase tracking-[0.3em] text-brand-blue">
                      HTML Integration Code (Shopify featured product, iframe, liquid, etc.)
                    </label>
                    <textarea
                      rows={12}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 font-mono text-xs text-white focus:border-brand-blue focus:ring-0"
                      placeholder="Paste your donation HTML/script/embed code here..."
                      value={content.donateHtml || ''}
                      onChange={(e) => setContent(prev => ({ ...prev, donateHtml: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Donation Header Layout (Banner, Title & Subtitle) */}
                <div className="bg-white border border-gray-150 p-10 rounded-[3.5rem] shadow-2xl relative overflow-hidden text-black space-y-8">
                  <div>
                    <span className="text-[10px] font-black tracking-widest uppercase text-brand-blue block mb-1">Donation Header</span>
                    <h3 className="text-2xl font-black italic uppercase tracking-tighter">Header Layout (Banner)</h3>
                    <p className="text-xs text-gray-500 font-medium">Customize the background banner, title, and subtitle of the donation page at `/donate`</p>
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                     {/* Column 1: Background Banner Configuration */}
                     <div className="space-y-6">
                       <h4 className="text-sm font-black uppercase tracking-wider text-gray-400">1. Background Banner</h4>
                       <div className="space-y-4">
                         <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-brand-blue">Banner Image (URL or Upload)</label>
                         <div className="flex gap-4">
                           <input 
                             type="text"
                             className="flex-1 bg-gray-50 px-6 py-4 rounded-2xl font-bold text-xs border border-gray-200 focus:ring-2 focus:ring-brand-blue text-black"
                             placeholder="Banner image URL (e.g. /shop_banner.png)"
                             value={content.donateBanner || ''}
                             onChange={(e) => setContent(prev => ({ ...prev, donateBanner: e.target.value }))}
                           />
                           <button 
                             type="button"
                             onClick={() => {
                               const input = document.getElementById('image-upload') as any;
                               input.dataset.currentId = 'donateBanner';
                               input.click();
                             }}
                             className="bg-black text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-brand-blue transition-all"
                           >
                             Upload Image
                           </button>
                         </div>
                       </div>

                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                         <div className="space-y-2">
                           <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-brand-blue">Banner Height (px)</label>
                           <input 
                             type="number"
                             className="w-full bg-gray-50 px-6 py-4 rounded-2xl font-bold text-xs border border-gray-200 focus:ring-2 focus:ring-brand-blue text-black"
                             placeholder="350"
                             value={content.donateBannerHeight || ''}
                             onChange={(e) => setContent(prev => ({ ...prev, donateBannerHeight: e.target.value }))}
                           />
                         </div>
                         <div className="space-y-2">
                           <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-brand-blue">Dark Overlay Opacity (0 to 1)</label>
                           <input 
                             type="number"
                             step="0.1"
                             min="0"
                             max="1"
                             className="w-full bg-gray-50 px-6 py-4 rounded-2xl font-bold text-xs border border-gray-200 focus:ring-2 focus:ring-brand-blue text-black"
                             placeholder="0.4"
                             value={content.donateBannerOverlay || ''}
                             onChange={(e) => setContent(prev => ({ ...prev, donateBannerOverlay: e.target.value }))}
                           />
                         </div>
                       </div>

                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                          <div className="space-y-2">
                            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-brand-blue">Banner Fit (Ajuste)</label>
                            <select 
                              className="w-full bg-gray-50 px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-gray-200 focus:ring-2 focus:ring-brand-blue text-black"
                              value={content.donateBannerSize || 'fill'}
                              onChange={(e) => setContent(prev => ({ ...prev, donateBannerSize: e.target.value }))}
                            >
                              <option value="fill">Fill (Rellenar)</option>
                              <option value="centered">Centered (Centrar)</option>
                              <option value="stretch">Stretch (Estirar)</option>
                            </select>
                          </div>
                          <div className="space-y-2">
                            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-brand-blue">Alineación / Posición</label>
                            <select 
                              className="w-full bg-gray-50 px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-gray-200 focus:ring-2 focus:ring-brand-blue text-black"
                              value={content.donateBannerPosition || 'center'}
                              onChange={(e) => setContent(prev => ({ ...prev, donateBannerPosition: e.target.value }))}
                            >
                              <option value="center">Centro</option>
                              <option value="top">Arriba</option>
                              <option value="bottom">Abajo</option>
                              <option value="left">Izquierda</option>
                              <option value="right">Derecha</option>
                            </select>
                          </div>
                        </div>

                       <p className="text-[10px] text-gray-400 font-medium">Use "none" or leave the URL empty if you prefer a minimalist layout without a background banner image.</p>
                     </div>

                     {/* Column 2: Title Configuration */}
                     <div className="space-y-6">
                       <h4 className="text-sm font-black uppercase tracking-wider text-gray-400">2. Title Customization</h4>
                       <div className="space-y-4">
                         <div>
                           <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-brand-blue mb-2">Title Text</label>
                           <input 
                             type="text"
                             className="w-full bg-gray-50 px-6 py-4 rounded-2xl font-bold text-xs border border-gray-200 focus:ring-2 focus:ring-brand-blue text-black"
                             placeholder="FUEL THE FIGHT"
                             value={content.donateTitle || ''}
                             onChange={(e) => setContent(prev => ({ ...prev, donateTitle: e.target.value }))}
                           />
                         </div>

                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                           <div>
                             <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-brand-blue mb-2">Size (px)</label>
                             <input 
                               type="number"
                               className="w-full bg-gray-50 px-6 py-4 rounded-2xl font-bold text-xs border border-gray-200 focus:ring-2 focus:ring-brand-blue text-black"
                               placeholder="48"
                               value={content.donateTitleSize || ''}
                               onChange={(e) => setContent(prev => ({ ...prev, donateTitleSize: e.target.value }))}
                             />
                           </div>
                           <div>
                             <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-brand-blue mb-2">Title Color</label>
                             <div className="flex gap-2">
                               <input 
                                 type="color"
                                 className="w-12 h-12 rounded-xl border border-gray-200 cursor-pointer overflow-hidden p-0 bg-transparent animate-none"
                                 value={content.donateTitleColor || '#FFFFFF'}
                                 onChange={(e) => setContent(prev => ({ ...prev, donateTitleColor: e.target.value }))}
                               />
                               <input 
                                 type="text"
                                 className="flex-1 bg-gray-50 px-4 py-3 rounded-2xl font-mono text-[10px] font-bold border border-gray-200 focus:ring-2 focus:ring-brand-blue text-black"
                                 value={content.donateTitleColor || ''}
                                 placeholder="#FFFFFF"
                                 onChange={(e) => setContent(prev => ({ ...prev, donateTitleColor: e.target.value }))}
                               />
                             </div>
                           </div>
                         </div>

                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                           <div>
                             <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-brand-blue mb-2">Title Alignment</label>
                             <select 
                               className="w-full bg-gray-50 px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-gray-200 focus:ring-2 focus:ring-brand-blue text-black"
                               value={content.donateTitleAlign || 'center'}
                               onChange={(e) => setContent(prev => ({ ...prev, donateTitleAlign: e.target.value }))}
                             >
                               <option value="left">Left</option>
                               <option value="center">Center</option>
                               <option value="right">Right</option>
                             </select>
                           </div>
                           <div>
                             <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-brand-blue mb-2">Title Font</label>
                             <select 
                               className="w-full bg-gray-50 px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-gray-200 focus:ring-2 focus:ring-brand-blue text-black"
                               value={content.donateTitleFontFamily || 'Inter'}
                               onChange={(e) => setContent(prev => ({ ...prev, donateTitleFontFamily: e.target.value }))}
                             >
                               <option value="Inter">Inter (Global)</option>
                               <option value="Roboto">Roboto</option>
                               <option value="Outfit">Outfit</option>
                             </select>
                           </div>
                         </div>
                       </div>
                     </div>
                  </div>

                  {/* Bottom Row: Subtitle Config */}
                  <div className="border-t border-gray-150 pt-8 space-y-6">
                    <h4 className="text-sm font-black uppercase tracking-wider text-gray-400">3. Subtitle Customization</h4>
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-brand-blue mb-2">Subtitle Text / Support Tagline</label>
                          <textarea
                            rows={3}
                            className="w-full bg-gray-50 px-6 py-4 rounded-2xl font-medium text-xs border border-gray-200 focus:ring-2 focus:ring-brand-blue text-black"
                            placeholder="Your contribution directly funds prosthetics..."
                            value={content.donateSubtitle || ''}
                            onChange={(e) => setContent(prev => ({ ...prev, donateSubtitle: e.target.value }))}
                          />
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-brand-blue mb-2">Text Size (px)</label>
                            <input 
                              type="number"
                              className="w-full bg-gray-50 px-6 py-4 rounded-2xl font-bold text-xs border border-gray-200 focus:ring-2 focus:ring-brand-blue text-black"
                              placeholder="16"
                              value={content.donateSubtitleSize || ''}
                              onChange={(e) => setContent(prev => ({ ...prev, donateSubtitleSize: e.target.value }))}
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-brand-blue mb-2">Subtitle Color</label>
                            <div className="flex gap-2">
                              <input 
                                type="color"
                                className="w-12 h-12 rounded-xl border border-gray-200 cursor-pointer overflow-hidden p-0 bg-transparent animate-none"
                                value={content.donateSubtitleColor || '#E5E7EB'}
                                onChange={(e) => setContent(prev => ({ ...prev, donateSubtitleColor: e.target.value }))}
                              />
                              <input 
                                type="text"
                                className="flex-1 bg-gray-50 px-4 py-3 rounded-2xl font-mono text-[10px] font-bold border border-gray-200 focus:ring-2 focus:ring-brand-blue text-black"
                                value={content.donateSubtitleColor || ''}
                                placeholder="#E5E7EB"
                                onChange={(e) => setContent(prev => ({ ...prev, donateSubtitleColor: e.target.value }))}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-brand-blue mb-2">Subtitle Alignment</label>
                            <select 
                              className="w-full bg-gray-50 px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-gray-200 focus:ring-2 focus:ring-brand-blue text-black"
                              value={content.donateSubtitleAlign || 'center'}
                              onChange={(e) => setContent(prev => ({ ...prev, donateSubtitleAlign: e.target.value }))}
                            >
                              <option value="left">Left</option>
                              <option value="center">Center</option>
                              <option value="right">Right</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-brand-blue mb-2">Subtitle Font</label>
                            <select 
                              className="w-full bg-gray-50 px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-gray-200 focus:ring-2 focus:ring-brand-blue text-black"
                              value={content.donateSubtitleFontFamily || 'Inter'}
                              onChange={(e) => setContent(prev => ({ ...prev, donateSubtitleFontFamily: e.target.value }))}
                            >
                              <option value="Inter">Inter (Global)</option>
                              <option value="Roboto">Roboto</option>
                              <option value="Outfit">Outfit</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Live Interactive Preview for Donate Banner */}
                  {(() => {
                    const previewImg = content.donateBanner || '/shop_banner.png';
                    const isSplit = (content.donateBannerLayout || 'full') === 'split';
                    const isCenter = content.donateBannerPlacement === 'center';
                    const isRight = content.donateBannerPlacement === 'right';
                    
                    return (
                      <div className="space-y-3 pt-6 border-t border-gray-150 text-black">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="space-y-0.5">
                            <span className="text-[10px] font-black uppercase tracking-widest text-brand-blue block mb-1">Live Interactive Preview</span>
                            <p className="text-[9px] text-gray-500 font-medium">Select a device view to simulate how the banner adapts to different screen sizes.</p>
                          </div>
                          
                          {/* Device View Selector */}
                          <div className="flex items-center bg-gray-150 p-0.5 rounded-xl border border-gray-200 shadow-sm w-fit">
                            <button
                              type="button"
                              onClick={() => setPreviewDevice('desktop')}
                              className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all flex items-center gap-1 ${
                                previewDevice === 'desktop' ? 'bg-brand-blue text-white shadow-sm' : 'text-gray-500 hover:text-gray-800'
                              }`}
                            >
                              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                              Desktop
                            </button>
                            <button
                              type="button"
                              onClick={() => setPreviewDevice('tablet')}
                              className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all flex items-center gap-1 ${
                                previewDevice === 'tablet' ? 'bg-brand-blue text-white shadow-sm' : 'text-gray-500 hover:text-gray-800'
                              }`}
                            >
                              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                              Tablet
                            </button>
                            <button
                              type="button"
                              onClick={() => setPreviewDevice('mobile')}
                              className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all flex items-center gap-1 ${
                                previewDevice === 'mobile' ? 'bg-brand-blue text-white shadow-sm' : 'text-gray-500 hover:text-gray-800'
                              }`}
                            >
                              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                              Phone
                            </button>
                          </div>
                        </div>

                        {/* Simulated Viewport Screen */}
                        <div className="bg-gray-50 border border-gray-150 rounded-2xl p-4 flex items-center justify-center overflow-hidden min-h-[200px]">
                          <div 
                            className="bg-black rounded-xl border border-gray-800 shadow-2xl relative overflow-hidden transition-all duration-300 flex select-none"
                            style={{
                              width: 
                                previewDevice === 'desktop' ? '100%' :
                                previewDevice === 'tablet' ? '380px' : '220px',
                              height: 
                                previewDevice === 'desktop' ? '120px' :
                                previewDevice === 'tablet' ? '140px' : '160px',
                              flexDirection: 
                                isSplit
                                  ? (previewDevice === 'desktop' ? 'row' : 'column-reverse')
                                  : 'column'
                            }}
                          >
                            {isSplit ? (
                              <>
                                {/* Text Side */}
                                <div 
                                  className="bg-[#000000] p-4 flex flex-col justify-center relative z-10 overflow-hidden"
                                  style={{
                                    width: previewDevice === 'desktop' ? '50%' : '100%',
                                    height: previewDevice === 'desktop' ? '100%' : '50%',
                                    textAlign: 
                                      previewDevice === 'mobile' ? 'center' :
                                      isCenter ? 'center' : isRight ? 'right' : 'left',
                                    alignItems: 
                                      previewDevice === 'mobile' ? 'center' :
                                      isCenter ? 'center' : isRight ? 'flex-end' : 'flex-start'
                                  }}
                                >
                                  <span className="text-[5px] uppercase tracking-widest mb-0.5 font-bold" style={{ color: content.donateSubtitleColor || '#E5E7EB' }}>FUEL THE FIGHT</span>
                                  <h1 
                                    className="italic font-black mb-0.5 whitespace-pre-line leading-none tracking-tight"
                                    style={{
                                      fontSize: '12px',
                                      color: content.donateTitleColor || '#FFFFFF',
                                    }}
                                  >
                                    {content.donateTitle || 'FUEL THE FIGHT'}
                                  </h1>
                                  <p 
                                    className="leading-relaxed opacity-95 line-clamp-1"
                                    style={{
                                      fontSize: '6px',
                                      color: content.donateSubtitleColor || '#E5E7EB',
                                    }}
                                  >
                                    {content.donateSubtitle}
                                  </p>
                                </div>

                                {/* Image Side */}
                                <div 
                                  className="relative bg-zinc-900 flex-1 overflow-hidden"
                                  style={{
                                    width: previewDevice === 'desktop' ? '50%' : '100%',
                                    height: previewDevice === 'desktop' ? '100%' : '50%',
                                    backgroundImage: `url(${previewImg})`,
                                    backgroundSize: 
                                      content.donateBannerSize === 'centered' ? 'contain' :
                                      content.donateBannerSize === 'stretch' ? '100% 100%' : 'cover',
                                    backgroundPosition: content.donateBannerPosition || 'center',
                                    backgroundRepeat: 'no-repeat'
                                  }}
                                />
                              </>
                            ) : (
                              <>
                                {/* Full Overlay Layout */}
                                <div 
                                  className="absolute inset-0 bg-zinc-900"
                                  style={{
                                    backgroundImage: `url(${previewImg})`,
                                    backgroundSize: 
                                      content.donateBannerSize === 'centered' ? 'contain' :
                                      content.donateBannerSize === 'stretch' ? '100% 100%' : 'cover',
                                    backgroundPosition: content.donateBannerPosition || 'center',
                                    backgroundRepeat: 'no-repeat'
                                  }}
                                />
                                {/* Overlay shadow */}
                                <div 
                                  className="absolute inset-0 z-10 bg-black"
                                  style={{ opacity: parseFloat(content.donateBannerOverlay || '0.4') }}
                                />
                                {/* Text Content */}
                                <div 
                                  className="absolute inset-0 p-4 flex flex-col justify-center z-20 overflow-hidden"
                                  style={{
                                    textAlign: 
                                      previewDevice === 'mobile' ? 'center' :
                                      isCenter ? 'center' : isRight ? 'right' : 'left',
                                    alignItems: 
                                      previewDevice === 'mobile' ? 'center' :
                                      isCenter ? 'center' : isRight ? 'flex-end' : 'flex-start'
                                  }}
                                >
                                  <span className="text-[5px] uppercase tracking-widest mb-0.5 font-bold" style={{ color: content.donateSubtitleColor || '#E5E7EB' }}>FUEL THE FIGHT</span>
                                  <h1 
                                    className="italic font-black mb-0.5 whitespace-pre-line leading-none tracking-tight"
                                    style={{
                                      fontSize: '12px',
                                      color: content.donateTitleColor || '#FFFFFF',
                                    }}
                                  >
                                    {content.donateTitle || 'FUEL THE FIGHT'}
                                  </h1>
                                  <p 
                                    className="leading-relaxed opacity-95 line-clamp-1 max-w-[80%]"
                                    style={{
                                      fontSize: '6px',
                                      color: content.donateSubtitleColor || '#E5E7EB',
                                    }}
                                  >
                                    {content.donateSubtitle}
                                  </p>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Make a Difference Today Section */}
                <div className="bg-white border border-gray-150 p-10 rounded-[3.5rem] shadow-2xl relative overflow-hidden text-black space-y-6">
                  <div>
                    <span className="text-[10px] font-black tracking-widest uppercase text-brand-blue block mb-1">Intro Section</span>
                    <h3 className="text-2xl font-black italic uppercase tracking-tighter">"Make a Difference Today" Section</h3>
                    <p className="text-xs text-gray-500 font-medium">Style and customize the introductory content block shown above the donation widget.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-gray-100">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-brand-blue mb-2">Title Text</label>
                        <input 
                          type="text"
                          className="w-full bg-gray-50 px-6 py-4 rounded-2xl font-bold text-xs border border-gray-200 focus:ring-2 focus:ring-brand-blue text-black"
                          value={content.diffTitle || ''}
                          onChange={(e) => setContent(prev => ({ ...prev, diffTitle: e.target.value }))}
                          placeholder="Make a Difference Today"
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-brand-blue mb-2">Title Size (px)</label>
                          <input 
                            type="number"
                            className="w-full bg-gray-50 px-6 py-4 rounded-2xl font-bold text-xs border border-gray-200 focus:ring-2 focus:ring-brand-blue text-black"
                            value={content.diffTitleSize || ''}
                            onChange={(e) => setContent(prev => ({ ...prev, diffTitleSize: e.target.value }))}
                            placeholder="48"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-brand-blue mb-2">Title Color</label>
                          <div className="flex gap-2">
                            <input 
                              type="color"
                              className="w-12 h-12 rounded-xl border border-gray-200 cursor-pointer overflow-hidden p-0 bg-transparent animate-none"
                              value={content.diffTitleColor || '#000000'}
                              onChange={(e) => setContent(prev => ({ ...prev, diffTitleColor: e.target.value }))}
                            />
                            <input 
                              type="text"
                              className="flex-1 bg-gray-50 px-4 py-3 rounded-2xl font-mono text-[10px] font-bold border border-gray-200 focus:ring-2 focus:ring-brand-blue text-black"
                              value={content.diffTitleColor || ''}
                              onChange={(e) => setContent(prev => ({ ...prev, diffTitleColor: e.target.value }))}
                              placeholder="#000000"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-brand-blue mb-2">Title Alignment</label>
                          <select 
                            className="w-full bg-gray-50 px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-gray-200 focus:ring-2 focus:ring-brand-blue text-black"
                            value={content.diffTitleAlign || 'center'}
                            onChange={(e) => setContent(prev => ({ ...prev, diffTitleAlign: e.target.value }))}
                          >
                            <option value="left">Left</option>
                            <option value="center">Center</option>
                            <option value="right">Right</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-brand-blue mb-2">Title Font</label>
                          <select 
                            className="w-full bg-gray-50 px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-gray-200 focus:ring-2 focus:ring-brand-blue text-black"
                            value={content.diffTitleFont || 'Inter'}
                            onChange={(e) => setContent(prev => ({ ...prev, diffTitleFont: e.target.value }))}
                          >
                            <option value="Inter">Inter (Global)</option>
                            <option value="Roboto">Roboto</option>
                            <option value="Outfit">Outfit</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-brand-blue mb-2">Description Text</label>
                        <textarea
                          rows={4}
                          className="w-full bg-gray-50 px-6 py-4 rounded-2xl font-medium text-xs border border-gray-200 focus:ring-2 focus:ring-brand-blue text-black"
                          value={content.diffDesc || ''}
                          onChange={(e) => setContent(prev => ({ ...prev, diffDesc: e.target.value }))}
                          placeholder="Every donation directly supports cancer patients..."
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-brand-blue mb-2">Description Size (px)</label>
                          <input 
                            type="number"
                            className="w-full bg-gray-50 px-6 py-4 rounded-2xl font-bold text-xs border border-gray-200 focus:ring-2 focus:ring-brand-blue text-black"
                            value={content.diffDescSize || ''}
                            onChange={(e) => setContent(prev => ({ ...prev, diffDescSize: e.target.value }))}
                            placeholder="16"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-brand-blue mb-2">Description Color</label>
                          <div className="flex gap-2">
                            <input 
                              type="color"
                              className="w-12 h-12 rounded-xl border border-gray-200 cursor-pointer overflow-hidden p-0 bg-transparent animate-none"
                              value={content.diffDescColor || '#4B5563'}
                              onChange={(e) => setContent(prev => ({ ...prev, diffDescColor: e.target.value }))}
                            />
                            <input 
                              type="text"
                              className="flex-1 bg-gray-50 px-4 py-3 rounded-2xl font-mono text-[10px] font-bold border border-gray-200 focus:ring-2 focus:ring-brand-blue text-black"
                              value={content.diffDescColor || ''}
                              onChange={(e) => setContent(prev => ({ ...prev, diffDescColor: e.target.value }))}
                              placeholder="#4B5563"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Your Impact Grid Section */}
                <div className="bg-white border border-gray-150 p-10 rounded-[3.5rem] shadow-2xl relative overflow-hidden text-black space-y-8">
                  <div>
                    <span className="text-[10px] font-black tracking-widest uppercase text-brand-blue block mb-1">Impact Cards</span>
                    <h3 className="text-2xl font-black italic uppercase tracking-tighter">"Your Impact" Section Grid</h3>
                    <p className="text-xs text-gray-500 font-medium">Style the impact heading and individual impact card items displayed below the widget.</p>
                  </div>

                  {/* Impact Heading Styles */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-4 border-t border-gray-100">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-brand-blue mb-2">Section Title Text</label>
                      <input 
                        type="text"
                        className="w-full bg-gray-50 px-6 py-4 rounded-2xl font-bold text-xs border border-gray-200 focus:ring-2 focus:ring-brand-blue text-black"
                        value={content.impactTitle || ''}
                        onChange={(e) => setContent(prev => ({ ...prev, impactTitle: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-brand-blue mb-2">Section Title Size (px)</label>
                      <input 
                        type="number"
                        className="w-full bg-gray-50 px-6 py-4 rounded-2xl font-bold text-xs border border-gray-200 focus:ring-2 focus:ring-brand-blue text-black"
                        value={content.impactTitleSize || ''}
                        onChange={(e) => setContent(prev => ({ ...prev, impactTitleSize: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-brand-blue mb-2">Section Title Color</label>
                      <div className="flex gap-2">
                        <input 
                          type="color"
                          className="w-10 h-10 rounded-xl border border-gray-200 cursor-pointer overflow-hidden p-0 bg-transparent animate-none"
                          value={content.impactTitleColor || '#000000'}
                          onChange={(e) => setContent(prev => ({ ...prev, impactTitleColor: e.target.value }))}
                        />
                        <input 
                          type="text"
                          className="flex-1 bg-gray-50 px-3 py-2 rounded-xl font-mono text-[9px] font-bold border border-gray-200 text-black"
                          value={content.impactTitleColor || ''}
                          onChange={(e) => setContent(prev => ({ ...prev, impactTitleColor: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-brand-blue mb-2">Section Title Align</label>
                      <select 
                        className="w-full bg-gray-50 px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-gray-200 text-black"
                        value={content.impactTitleAlign || 'center'}
                        onChange={(e) => setContent(prev => ({ ...prev, impactTitleAlign: e.target.value }))}
                      >
                        <option value="left">Left</option>
                        <option value="center">Center</option>
                        <option value="right">Right</option>
                      </select>
                    </div>
                  </div>

                  {/* Impact Global Card Styles */}
                  <div className="bg-gray-50 p-6 rounded-3xl space-y-4">
                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-500 block">Card Global Typography</span>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[8px] font-black uppercase tracking-widest text-gray-400 mb-1">Amount Size (px)</label>
                          <input 
                            type="number"
                            className="w-full bg-white px-4 py-3 rounded-xl font-bold text-xs border border-gray-200 text-black"
                            value={content.impactAmtSize || ''}
                            onChange={(e) => setContent(prev => ({ ...prev, impactAmtSize: e.target.value }))}
                          />
                        </div>
                        <div>
                          <label className="block text-[8px] font-black uppercase tracking-widest text-gray-400 mb-1">Amount Color</label>
                          <input 
                            type="color"
                            className="w-full h-10 rounded-xl cursor-pointer border border-gray-200 bg-transparent p-0 animate-none"
                            value={content.impactAmtColor || '#000000'}
                            onChange={(e) => setContent(prev => ({ ...prev, impactAmtColor: e.target.value }))}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[8px] font-black uppercase tracking-widest text-gray-400 mb-1">Desc Size (px)</label>
                          <input 
                            type="number"
                            className="w-full bg-white px-4 py-3 rounded-xl font-bold text-xs border border-gray-200 text-black"
                            value={content.impactDescSize || ''}
                            onChange={(e) => setContent(prev => ({ ...prev, impactDescSize: e.target.value }))}
                          />
                        </div>
                        <div>
                          <label className="block text-[8px] font-black uppercase tracking-widest text-gray-400 mb-1">Desc Color</label>
                          <input 
                            type="color"
                            className="w-full h-10 rounded-xl cursor-pointer border border-gray-200 bg-transparent p-0 animate-none"
                            value={content.impactDescColor || '#4B5563'}
                            onChange={(e) => setContent(prev => ({ ...prev, impactDescColor: e.target.value }))}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[8px] font-black uppercase tracking-widest text-gray-400 mb-1">Card Font Family</label>
                        <select 
                          className="w-full bg-white px-4 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest border border-gray-200 text-black"
                          value={content.impactAmtFont || 'Inter'}
                          onChange={(e) => setContent(prev => ({ ...prev, impactAmtFont: e.target.value, impactDescFont: e.target.value }))}
                        >
                          <option value="Inter">Inter (Global)</option>
                          <option value="Roboto">Roboto</option>
                          <option value="Outfit">Outfit</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Impact Cards Content Editor */}
                  <div className="space-y-6 pt-4">
                    <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">Card Grid Contents</span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Card 1 */}
                      <div className="bg-gray-50/50 p-6 rounded-3xl border border-gray-100 space-y-3">
                        <span className="text-[9px] font-black uppercase tracking-widest text-brand-blue">Card 1 (Leftmost)</span>
                        <div className="grid grid-cols-4 gap-2">
                          <div className="col-span-1">
                            <label className="block text-[8px] font-black text-gray-400 mb-1">Amount ($)</label>
                            <input 
                              type="text"
                              className="w-full bg-white px-3 py-2 rounded-xl text-xs font-bold border border-gray-200 text-black"
                              value={content.impactAmt1 || ''}
                              onChange={(e) => setContent(prev => ({ ...prev, impactAmt1: e.target.value }))}
                            />
                          </div>
                          <div className="col-span-3">
                            <label className="block text-[8px] font-black text-gray-400 mb-1">Impact Description</label>
                            <input 
                              type="text"
                              className="w-full bg-white px-3 py-2 rounded-xl text-xs border border-gray-200 text-black"
                              value={content.impactDesc1 || ''}
                              onChange={(e) => setContent(prev => ({ ...prev, impactDesc1: e.target.value }))}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Card 2 */}
                      <div className="bg-gray-50/50 p-6 rounded-3xl border border-gray-100 space-y-3">
                        <span className="text-[9px] font-black uppercase tracking-widest text-brand-blue">Card 2</span>
                        <div className="grid grid-cols-4 gap-2">
                          <div className="col-span-1">
                            <label className="block text-[8px] font-black text-gray-400 mb-1">Amount ($)</label>
                            <input 
                              type="text"
                              className="w-full bg-white px-3 py-2 rounded-xl text-xs font-bold border border-gray-200 text-black"
                              value={content.impactAmt2 || ''}
                              onChange={(e) => setContent(prev => ({ ...prev, impactAmt2: e.target.value }))}
                            />
                          </div>
                          <div className="col-span-3">
                            <label className="block text-[8px] font-black text-gray-400 mb-1">Impact Description</label>
                            <input 
                              type="text"
                              className="w-full bg-white px-3 py-2 rounded-xl text-xs border border-gray-200 text-black"
                              value={content.impactDesc2 || ''}
                              onChange={(e) => setContent(prev => ({ ...prev, impactDesc2: e.target.value }))}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Card 3 */}
                      <div className="bg-gray-50/50 p-6 rounded-3xl border border-gray-100 space-y-3">
                        <span className="text-[9px] font-black uppercase tracking-widest text-brand-blue">Card 3</span>
                        <div className="grid grid-cols-4 gap-2">
                          <div className="col-span-1">
                            <label className="block text-[8px] font-black text-gray-400 mb-1">Amount ($)</label>
                            <input 
                              type="text"
                              className="w-full bg-white px-3 py-2 rounded-xl text-xs font-bold border border-gray-200 text-black"
                              value={content.impactAmt3 || ''}
                              onChange={(e) => setContent(prev => ({ ...prev, impactAmt3: e.target.value }))}
                            />
                          </div>
                          <div className="col-span-3">
                            <label className="block text-[8px] font-black text-gray-400 mb-1">Impact Description</label>
                            <input 
                              type="text"
                              className="w-full bg-white px-3 py-2 rounded-xl text-xs border border-gray-200 text-black"
                              value={content.impactDesc3 || ''}
                              onChange={(e) => setContent(prev => ({ ...prev, impactDesc3: e.target.value }))}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Card 4 */}
                      <div className="bg-gray-50/50 p-6 rounded-3xl border border-gray-150 space-y-3">
                        <span className="text-[9px] font-black uppercase tracking-widest text-brand-blue">Card 4 (Rightmost)</span>
                        <div className="grid grid-cols-4 gap-2">
                          <div className="col-span-1">
                            <label className="block text-[8px] font-black text-gray-400 mb-1">Amount ($)</label>
                            <input 
                              type="text"
                              className="w-full bg-white px-3 py-2 rounded-xl text-xs font-bold border border-gray-200 text-black"
                              value={content.impactAmt4 || ''}
                              onChange={(e) => setContent(prev => ({ ...prev, impactAmt4: e.target.value }))}
                            />
                          </div>
                          <div className="col-span-3">
                            <label className="block text-[8px] font-black text-gray-400 mb-1">Impact Description</label>
                            <input 
                              type="text"
                              className="w-full bg-white px-3 py-2 rounded-xl text-xs border border-gray-200 text-black"
                              value={content.impactDesc4 || ''}
                              onChange={(e) => setContent(prev => ({ ...prev, impactDesc4: e.target.value }))}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Every Dollar Counts Section */}
                <div className="bg-white border border-gray-150 p-10 rounded-[3.5rem] shadow-2xl relative overflow-hidden text-black space-y-8">
                  <div>
                    <span className="text-[10px] font-black tracking-widest uppercase text-brand-blue block mb-1">Promo Banner</span>
                    <h3 className="text-2xl font-black italic uppercase tracking-tighter">"Every Dollar Counts" Promo Banner</h3>
                    <p className="text-xs text-gray-500 font-medium">Configure background colors, image fills, titles, descriptions, and the redirect CTA button.</p>
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 pt-4 border-t border-gray-100">
                    {/* Background Settings */}
                    <div className="space-y-6">
                      <h4 className="text-sm font-black uppercase tracking-wider text-gray-400">1. Banner Background</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-brand-blue mb-1">Background Color</label>
                          <div className="flex gap-2">
                            <input 
                              type="color"
                              className="w-12 h-12 rounded-xl border border-gray-200 cursor-pointer overflow-hidden p-0 bg-transparent animate-none"
                              value={content.everyDollarBgColor || '#1A1C23'}
                              onChange={(e) => setContent(prev => ({ ...prev, everyDollarBgColor: e.target.value }))}
                            />
                            <input 
                              type="text"
                              className="flex-1 bg-gray-50 px-4 py-3 rounded-2xl font-mono text-[10px] font-bold border border-gray-200 text-black"
                              value={content.everyDollarBgColor || ''}
                              onChange={(e) => setContent(prev => ({ ...prev, everyDollarBgColor: e.target.value }))}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-brand-blue mb-1">Background Image</label>
                          <div className="flex gap-2">
                            <input 
                              type="text"
                              className="flex-1 bg-gray-50 px-4 py-3 rounded-2xl text-xs border border-gray-200 text-black"
                              placeholder="Image URL"
                              value={content.everyDollarBgImage || ''}
                              onChange={(e) => setContent(prev => ({ ...prev, everyDollarBgImage: e.target.value }))}
                            />
                            <button 
                              type="button"
                              onClick={() => {
                                const input = document.getElementById('image-upload') as any;
                                input.dataset.currentId = 'everyDollarBgImage';
                                input.click();
                              }}
                              className="bg-black hover:bg-brand-blue text-white px-4 py-2 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all"
                            >
                              Upload
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-brand-blue mb-1">Banner Fit (Ajuste)</label>
                          <select 
                            className="w-full bg-gray-50 px-4 py-3 rounded-2xl text-xs border border-gray-200 text-black font-black uppercase tracking-wider"
                            value={content.everyDollarBgSize || 'fill'}
                            onChange={(e) => setContent(prev => ({ ...prev, everyDollarBgSize: e.target.value }))}
                          >
                            <option value="fill">Fill (Rellenar)</option>
                            <option value="centered">Centered (Centrar)</option>
                            <option value="stretch">Stretch (Estirar)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-brand-blue mb-1">Alineación / Posición</label>
                          <select 
                            className="w-full bg-gray-50 px-4 py-3 rounded-2xl text-xs border border-gray-200 text-black font-black uppercase tracking-wider"
                            value={content.everyDollarBgPosition || 'center'}
                            onChange={(e) => setContent(prev => ({ ...prev, everyDollarBgPosition: e.target.value }))}
                          >
                            <option value="center">Centro</option>
                            <option value="top">Arriba</option>
                            <option value="bottom">Abajo</option>
                            <option value="left">Izquierda</option>
                            <option value="right">Derecha</option>
                          </select>
                        </div>
                      </div>

                      {/* Button Customizer */}
                      <h4 className="text-sm font-black uppercase tracking-wider text-gray-400 pt-4">2. CTA Button Customization</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-brand-blue mb-1">Button Text</label>
                          <input 
                            type="text"
                            className="w-full bg-gray-50 px-6 py-4 rounded-2xl font-bold text-xs border border-gray-200 text-black"
                            value={content.everyDollarBtnText || ''}
                            onChange={(e) => setContent(prev => ({ ...prev, everyDollarBtnText: e.target.value }))}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-brand-blue mb-1">Button Font Size (px)</label>
                          <input 
                            type="number"
                            className="w-full bg-gray-50 px-6 py-4 rounded-2xl font-bold text-xs border border-gray-200 text-black"
                            value={content.everyDollarBtnSize || ''}
                            onChange={(e) => setContent(prev => ({ ...prev, everyDollarBtnSize: e.target.value }))}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-brand-blue mb-1">Button Color</label>
                          <input 
                            type="color"
                            className="w-full h-10 rounded-xl cursor-pointer border border-gray-200 bg-transparent p-0 animate-none"
                            value={content.everyDollarBtnColor || '#111827'}
                            onChange={(e) => setContent(prev => ({ ...prev, everyDollarBtnColor: e.target.value }))}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-brand-blue mb-1">Button Background</label>
                          <input 
                            type="color"
                            className="w-full h-10 rounded-xl cursor-pointer border border-gray-200 bg-transparent p-0 animate-none"
                            value={content.everyDollarBtnBg || '#FFFFFF'}
                            onChange={(e) => setContent(prev => ({ ...prev, everyDollarBtnBg: e.target.value }))}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Title and Description */}
                    <div className="space-y-6">
                      <h4 className="text-sm font-black uppercase tracking-wider text-gray-400">3. Texts and Fonts</h4>
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-brand-blue mb-2">Title Text</label>
                        <input 
                          type="text"
                          className="w-full bg-gray-50 px-6 py-4 rounded-2xl font-bold text-xs border border-gray-200 text-black"
                          value={content.everyDollarTitle || ''}
                          onChange={(e) => setContent(prev => ({ ...prev, everyDollarTitle: e.target.value }))}
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-brand-blue mb-2">Title Size (px)</label>
                          <input 
                            type="number"
                            className="w-full bg-gray-50 px-6 py-4 rounded-2xl font-bold text-xs border border-gray-200 text-black"
                            value={content.everyDollarTitleSize || ''}
                            onChange={(e) => setContent(prev => ({ ...prev, everyDollarTitleSize: e.target.value }))}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-brand-blue mb-2">Title Color</label>
                          <input 
                            type="color"
                            className="w-full h-10 rounded-xl cursor-pointer border border-gray-200 bg-transparent p-0 animate-none"
                            value={content.everyDollarTitleColor || '#FFFFFF'}
                            onChange={(e) => setContent(prev => ({ ...prev, everyDollarTitleColor: e.target.value }))}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-brand-blue mb-2">Description Text</label>
                        <textarea
                          rows={3}
                          className="w-full bg-gray-50 px-6 py-4 rounded-2xl font-medium text-xs border border-gray-200 text-black"
                          value={content.everyDollarDesc || ''}
                          onChange={(e) => setContent(prev => ({ ...prev, everyDollarDesc: e.target.value }))}
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-brand-blue mb-2">Description Size (px)</label>
                          <input 
                            type="number"
                            className="w-full bg-gray-50 px-6 py-4 rounded-2xl font-bold text-xs border border-gray-200 text-black"
                            value={content.everyDollarDescSize || ''}
                            onChange={(e) => setContent(prev => ({ ...prev, everyDollarDescSize: e.target.value }))}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-brand-blue mb-2">Description Color</label>
                          <input 
                            type="color"
                            className="w-full h-10 rounded-xl cursor-pointer border border-gray-200 bg-transparent p-0 animate-none"
                            value={content.everyDollarDescColor || '#E5E7EB'}
                            onChange={(e) => setContent(prev => ({ ...prev, everyDollarDescColor: e.target.value }))}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

              </motion.div>
            )}

            {activeTab === 'ads' && (
              <motion.div
                key="ads"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-12"
              >
                {/* Intro & Guideline Banner */}
                <div className="bg-gradient-to-r from-brand-blue to-purple-600 rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent)] pointer-events-none" />
                  <div className="relative z-10 space-y-6 max-w-4xl">
                    <span className="bg-white/10 px-6 py-2 rounded-full font-black text-[9px] uppercase tracking-[0.2em] inline-block backdrop-blur-md">
                      🚀 Responsive Advertisement Engine
                    </span>
                    <h2 className="text-4xl md:text-5xl font-black tracking-tight leading-none">
                      PROMOTE & SPONSOR DYNAMICALLY
                    </h2>
                    <p className="text-sm text-white/80 font-medium leading-relaxed">
                      Manage promotional spaces across the website to display ads, store features, nightlife tickets, or third-party sponsorship. Each slot dynamically adapts across Desktop, Tablet, and Mobile viewport aspects.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4 border-t border-white/10">
                      <div className="space-y-1">
                        <div className="text-[10px] uppercase font-black tracking-widest text-white/50">💻 Desktop Aspect Ratio</div>
                        <div className="text-lg font-black font-mono">1200 x 250 px</div>
                        <div className="text-[9px] text-white/60">Aspect Ratio 24:5</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-[10px] uppercase font-black tracking-widest text-white/50">📟 Tablet Aspect Ratio</div>
                        <div className="text-lg font-black font-mono">768 x 200 px</div>
                        <div className="text-[9px] text-white/60">Aspect Ratio 96:25</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-[10px] uppercase font-black tracking-widest text-white/50">📱 Mobile Aspect Ratio</div>
                        <div className="text-lg font-black font-mono">320 x 150 px</div>
                        <div className="text-[9px] text-white/60">Aspect Ratio 64:30</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Banner Slots Form */}
                <div className="grid grid-cols-1 gap-12 text-black">
                  {[
                    {
                      id: "Top",
                      title: "1. Top Promotional Slot",
                      desc: "Rendered below the Hero slideshow and above the 'Our Mission' section.",
                      typeKey: "adTopType",
                      desktopKey: "adTopDesktop",
                      tabletKey: "adTopTablet",
                      mobileKey: "adTopMobile",
                      linkKey: "adTopLink",
                      htmlKey: "adTopHtml",
                      sizeKey: "adTopSize",
                      positionKey: "adTopPosition",
                      textSizeKey: "adTopTextSize",
                      textColorKey: "adTopTextColor",
                      suggestedDems: { d: "1200x250", t: "768x200", m: "320x150" }
                    },
                    {
                      id: "Middle",
                      title: "2. Middle Promotional Slot",
                      desc: "Rendered between the 'Meet Our Founder' section and 'Survivor Stories' section.",
                      typeKey: "adMiddleType",
                      desktopKey: "adMiddleDesktop",
                      tabletKey: "adMiddleTablet",
                      mobileKey: "adMiddleMobile",
                      linkKey: "adMiddleLink",
                      htmlKey: "adMiddleHtml",
                      sizeKey: "adMiddleSize",
                      positionKey: "adMiddlePosition",
                      textSizeKey: "adMiddleTextSize",
                      textColorKey: "adMiddleTextColor",
                      suggestedDems: { d: "1200x250", t: "768x200", m: "320x150" }
                    },
                    {
                      id: "Bottom",
                      title: "3. Bottom Promotional Slot",
                      desc: "Rendered above the footer, immediately following the 'Fuel the Fight' donation section.",
                      typeKey: "adBottomType",
                      desktopKey: "adBottomDesktop",
                      tabletKey: "adBottomTablet",
                      mobileKey: "adBottomMobile",
                      linkKey: "adBottomLink",
                      htmlKey: "adBottomHtml",
                      sizeKey: "adBottomSize",
                      positionKey: "adBottomPosition",
                      textSizeKey: "adBottomTextSize",
                      textColorKey: "adBottomTextColor",
                      suggestedDems: { d: "1200x250", t: "768x200", m: "320x150" }
                    }
                  ].map((slot) => {
                    const isMediaMode = (content as any)[slot.typeKey] === "media" || !(content as any)[slot.typeKey];

                    return (
                      <div key={slot.id} className="bg-gray-50 rounded-[2.5rem] p-10 md:p-12 border border-gray-100 shadow-sm space-y-8">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-6 border-b border-gray-200/60">
                          <div className="space-y-2">
                            <h3 className="text-2xl font-black tracking-tight">{slot.title}</h3>
                            <p className="text-xs text-gray-500 font-medium">{slot.desc}</p>
                          </div>

                          {/* Toggle Mode */}
                          <div className="flex bg-gray-200/80 rounded-2xl p-1.5 self-stretch md:self-auto">
                            {[
                              { label: "Creative Asset", val: "media" },
                              { label: "HTML / Script", val: "html" }
                            ].map((mode) => (
                              <button
                                type="button"
                                key={mode.val}
                                onClick={() => setContent(prev => ({ ...prev, [slot.typeKey]: mode.val }))}
                                className={`flex-1 md:flex-none px-6 py-3 rounded-xl font-black text-[9px] uppercase tracking-wider transition-all ${
                                  ((content as any)[slot.typeKey] || "media") === mode.val
                                    ? "bg-black text-white shadow-md"
                                    : "text-gray-400 hover:text-black"
                                }`}
                              >
                                {mode.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Inputs Container */}
                        <div className="space-y-6">
                          {isMediaMode ? (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              {/* Desktop */}
                              <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Desktop View URL</label>
                                  <span className="text-[9px] font-black text-brand-blue uppercase bg-brand-blue/10 px-2 py-0.5 rounded">
                                    {slot.suggestedDems.d}
                                  </span>
                                </div>
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    placeholder="https://.../banner_desktop.png"
                                    className="flex-1 bg-white border border-gray-200 px-5 py-4 rounded-xl font-bold text-xs text-black shadow-sm"
                                    value={(content as any)[slot.desktopKey] || ""}
                                    onChange={(e) => setContent(prev => ({ ...prev, [slot.desktopKey]: e.target.value }))}
                                  />
                                  <button 
                                    type="button"
                                    onClick={() => {
                                      const input = document.getElementById('image-upload') as any;
                                      input.dataset.currentId = slot.desktopKey;
                                      input.click();
                                    }}
                                    className="bg-brand-blue hover:bg-black text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shrink-0 flex items-center gap-1.5 shadow-sm"
                                  >
                                    <Upload size={12} /> Upload
                                  </button>
                                </div>
                              </div>

                              {/* Tablet */}
                              <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Tablet View URL</label>
                                  <span className="text-[9px] font-black text-brand-blue uppercase bg-brand-blue/10 px-2 py-0.5 rounded">
                                    {slot.suggestedDems.t}
                                  </span>
                                </div>
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    placeholder="https://.../banner_tablet.png"
                                    className="flex-1 bg-white border border-gray-200 px-5 py-4 rounded-xl font-bold text-xs text-black shadow-sm"
                                    value={(content as any)[slot.tabletKey] || ""}
                                    onChange={(e) => setContent(prev => ({ ...prev, [slot.tabletKey]: e.target.value }))}
                                  />
                                  <button 
                                    type="button"
                                    onClick={() => {
                                      const input = document.getElementById('image-upload') as any;
                                      input.dataset.currentId = slot.tabletKey;
                                      input.click();
                                    }}
                                    className="bg-brand-blue hover:bg-black text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shrink-0 flex items-center gap-1.5 shadow-sm"
                                  >
                                    <Upload size={12} /> Upload
                                  </button>
                                </div>
                              </div>

                              {/* Mobile */}
                              <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Mobile View URL</label>
                                  <span className="text-[9px] font-black text-brand-blue uppercase bg-brand-blue/10 px-2 py-0.5 rounded">
                                    {slot.suggestedDems.m}
                                  </span>
                                </div>
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    placeholder="https://.../banner_mobile.png"
                                    className="flex-1 bg-white border border-gray-200 px-5 py-4 rounded-xl font-bold text-xs text-black shadow-sm"
                                    value={(content as any)[slot.mobileKey] || ""}
                                    onChange={(e) => setContent(prev => ({ ...prev, [slot.mobileKey]: e.target.value }))}
                                  />
                                  <button 
                                    type="button"
                                    onClick={() => {
                                      const input = document.getElementById('image-upload') as any;
                                      input.dataset.currentId = slot.mobileKey;
                                      input.click();
                                    }}
                                    className="bg-brand-blue hover:bg-black text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shrink-0 flex items-center gap-1.5 shadow-sm"
                                  >
                                    <Upload size={12} /> Upload
                                  </button>
                                </div>
                              </div>

                              {/* Redirect Link (Takes whole span) */}
                              <div className="md:col-span-3 space-y-2 pt-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block">Click Hyperlink Redirect URL</label>
                                <input
                                  type="text"
                                  placeholder="https://shop.5xfoundation.org/special-offer"
                                  className="w-full bg-white border border-gray-200 px-5 py-4 rounded-xl font-bold text-xs text-black shadow-sm"
                                  value={(content as any)[slot.linkKey] || ""}
                                  onChange={(e) => setContent(prev => ({ ...prev, [slot.linkKey]: e.target.value }))}
                                />
                              </div>
                              
                              {/* Asset Size & Alignment */}
                              <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-gray-150">
                                <div className="space-y-2">
                                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block">Banner Fit (Ajuste)</label>
                                  <select 
                                    className="w-full bg-white border-2 border-gray-100 focus:border-brand-blue px-5 py-4 rounded-xl font-bold text-xs focus:ring-0 text-black shadow-sm uppercase tracking-wider"
                                    value={(content as any)[slot.sizeKey] || 'fill'}
                                    onChange={(e) => setContent(prev => ({ ...prev, [slot.sizeKey]: e.target.value }))}
                                  >
                                    <option value="fill">Fill (Rellenar)</option>
                                    <option value="centered">Centered (Centrar)</option>
                                    <option value="stretch">Stretch (Estirar)</option>
                                  </select>
                                </div>
                                <div className="space-y-2">
                                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block">Alineación / Posición</label>
                                  <select 
                                    className="w-full bg-white border-2 border-gray-100 focus:border-brand-blue px-5 py-4 rounded-xl font-bold text-xs focus:ring-0 text-black shadow-sm uppercase tracking-wider"
                                    value={(content as any)[slot.positionKey] || 'center'}
                                    onChange={(e) => setContent(prev => ({ ...prev, [slot.positionKey]: e.target.value }))}
                                  >
                                    <option value="center">Centro</option>
                                    <option value="top">Arriba</option>
                                    <option value="bottom">Abajo</option>
                                    <option value="left">Izquierda</option>
                                    <option value="right">Derecha</option>
                                  </select>
                                </div>
                                <div className="space-y-2">
                                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block">Text Size (px)</label>
                                  <input
                                    type="number"
                                    min="8"
                                    max="72"
                                    className="w-full bg-white border-2 border-gray-100 focus:border-brand-blue px-5 py-4 rounded-xl font-bold text-xs focus:ring-0 text-black shadow-sm"
                                    value={(content as any)[slot.textSizeKey] || '14'}
                                    onChange={(e) => setContent(prev => ({ ...prev, [slot.textSizeKey]: e.target.value }))}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block">Text Color</label>
                                  <div className="flex gap-2">
                                    <input
                                      type="color"
                                      className="w-12 h-12 rounded-xl border-2 border-gray-100 cursor-pointer"
                                      value={(content as any)[slot.textColorKey] || '#FFFFFF'}
                                      onChange={(e) => setContent(prev => ({ ...prev, [slot.textColorKey]: e.target.value }))}
                                    />
                                    <input
                                      type="text"
                                      className="flex-1 bg-white border-2 border-gray-100 focus:border-brand-blue px-5 py-4 rounded-xl font-bold text-xs focus:ring-0 text-black shadow-sm uppercase"
                                      value={(content as any)[slot.textColorKey] || '#FFFFFF'}
                                      onChange={(e) => setContent(prev => ({ ...prev, [slot.textColorKey]: e.target.value }))}
                                      placeholder="#FFFFFF"
                                    />
                                  </div>
                                </div>
                              </div>

                              <div className="md:col-span-3">
                                <div className="text-[10px] text-gray-400 font-medium flex items-center gap-1.5 mt-2 bg-white/50 p-3 rounded-lg border border-gray-100">
                                  <span>💡</span>
                                  <span>Supports images (.jpg, .png, .webp), animated files (.gif), and looping videos (.mp4). Leave views empty to collapse slot. If Tablet or Mobile is blank, it defaults to the Desktop asset.</span>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block">Custom HTML / Script Block</label>
                              <textarea
                                rows={8}
                                placeholder="<!-- Paste your iframe, custom script, or Adsense code here -->&#10;<div style='text-align: center;'><a href='...'><img src='...' /></a></div>"
                                className="w-full bg-brand-black border border-white/10 px-5 py-5 rounded-2xl font-mono text-xs focus:border-brand-blue text-white focus:ring-0 shadow-lg"
                                value={(content as any)[slot.htmlKey] || ""}
                                onChange={(e) => setContent(prev => ({ ...prev, [slot.htmlKey]: e.target.value }))}
                              />
                              <div className="text-[10px] text-amber-600 bg-amber-50 border border-amber-100 p-4 rounded-xl font-medium leading-relaxed">
                                ⚠️ <strong>Important Note:</strong> Ensure your custom HTML does not include malformed tags, as it could disrupt page layout parsing. Make sure the container limits its sizing properly.
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {activeTab === 'rsvps' && (
              <motion.div
                key="rsvps"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8"
              >
                <div className="bg-brand-gray/40 border border-gray-200/50 rounded-2xl p-6 sm:p-10">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h3 className="text-xl font-black tracking-tight">Event RSVPs</h3>
                      <p className="text-sm text-gray-500 font-medium mt-1">{reservations.length} total reservation(s)</p>
                    </div>
                    <button
                      onClick={async () => {
                        const fresh = await getReservations();
                        setReservations(fresh);
                      }}
                      className="bg-brand-blue text-white px-5 py-3 rounded-xl text-[10px] font-black tracking-widest uppercase hover:bg-brand-blue/90 transition-all"
                    >
                      Refresh
                    </button>
                  </div>

                  {reservations.length === 0 ? (
                    <div className="text-center py-20 text-gray-400">
                      <UserPlus size={48} className="mx-auto mb-4 opacity-30" />
                      <p className="font-bold text-lg">No RSVPs yet</p>
                      <p className="text-sm">Reservations will appear here once people RSVP to events.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-gray-200 text-[10px] font-black uppercase tracking-widest text-gray-400">
                            <th className="pb-4 pr-4">Name</th>
                            <th className="pb-4 pr-4">Email</th>
                            <th className="pb-4 pr-4">Phone</th>
                            <th className="pb-4 pr-4">Event</th>
                            <th className="pb-4 pr-4">Date</th>
                            <th className="pb-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reservations.map((res: any) => (
                            <tr key={res._id} className="border-b border-gray-100 last:border-0">
                              <td className="py-4 pr-4 font-bold text-sm">{res.name}</td>
                              <td className="py-4 pr-4 text-sm text-gray-600">{res.email}</td>
                              <td className="py-4 pr-4 text-sm text-gray-600">{res.phone || '—'}</td>
                              <td className="py-4 pr-4 text-sm text-gray-600">{res.eventTitle}</td>
                              <td className="py-4 pr-4 text-sm text-gray-600">{new Date(res.createdAt).toLocaleDateString()}</td>
                              <td className="py-4 text-right">
                                <button
                                  onClick={async () => {
                                    if (!confirm('Delete this RSVP?')) return;
                                    await deleteReservation(res._id);
                                    setReservations(prev => prev.filter(r => r._id !== res._id));
                                  }}
                                  className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-all"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>




        </div>
      </main>
    </div>
  );
}

function GDriveFolderTester({ 
  folderUrl, 
  onRemoveImage 
}: { 
  folderUrl: string; 
  onRemoveImage?: (index: number, url: string) => void;
}) {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; images?: string[]; error?: string } | null>(null);

  const handleTest = useCallback(async () => {
    if (!folderUrl || !folderUrl.trim()) {
      setResult(null);
      return;
    }
    setTesting(true);

    const folderIdMatch = folderUrl.match(/(?:folders\/|id=)(1[a-zA-Z0-9_-]{32})/);
    let driveImages: string[] = [];

    if (folderIdMatch) {
      const folderId = folderIdMatch[1];
      try {
        const res = await fetch(`/api/gdrive?folderId=${folderId}`);
        const data = await res.json();
        if (data.success && data.images && data.images.length > 0) {
          driveImages = data.images;
        }
      } catch (err: any) {
        console.warn("[GDriveFolderTester] Fetch error:", err);
      }
    }

    const manualLinks = folderUrl
      .split(/[\n,]/)
      .map(l => l.trim())
      .filter(l => l.length > 0 && !l.includes('drive.google.com/drive/folders'))
      .map(l => {
        const fileMatch = l.match(/(?:file\/d\/|id=)(1[a-zA-Z0-9_-]{32})/);
        if (fileMatch) {
          return `/api/gdrive/image?id=${fileMatch[1]}&v=3`;
        }
        return l;
      });

    const combinedImages = Array.from(new Set([...driveImages, ...manualLinks]));

    if (combinedImages.length > 0) {
      setResult({ success: true, images: combinedImages });
    } else if (folderIdMatch) {
      setResult({ success: false, error: "Could not auto-fetch images from Google Drive folder link. Please ensure sharing is set to 'Anyone with the link can view' or use direct image links/file uploads." });
    } else {
      setResult({ success: false, error: "Please enter a valid Google Drive Folder URL or direct image URLs." });
    }
    setTesting(false);
  }, [folderUrl]);

  // NOTE: No auto-load on mount. Images only load when user clicks "Refresh Images".

  return (
    <div className="bg-brand-gray/40 border border-gray-200/50 rounded-2xl p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="space-y-1">
          <h6 className="text-xs font-black uppercase tracking-wider text-gray-500">Live Integration & Image Manager</h6>
          <p className="text-[10px] text-gray-400 font-medium">View, manage, and delete story images in real time.</p>
        </div>
        <button
          type="button"
          onClick={handleTest}
          disabled={testing}
          className="bg-brand-blue text-white px-5 py-3 rounded-xl text-[10px] font-black tracking-widest uppercase hover:bg-brand-blue/90 transition-all disabled:opacity-50 flex items-center gap-2 self-start sm:self-auto shadow-sm"
        >
          {testing ? "Refreshing..." : "Refresh Images"}
        </button>
      </div>

      {result && (
        <div className="border-t border-gray-100 pt-4 space-y-3">
          {result.success ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-green-600 font-bold text-xs">
                <span className="w-2 h-2 bg-green-500 rounded-full" />
                Successfully loaded {result.images?.length || 0} slide images!
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {result.images?.map((url, i) => (
                  <div key={i} className="aspect-square relative bg-gray-900 rounded-xl overflow-hidden border border-gray-200 group/thumb shadow-sm">
                    <img src={url} alt={`Slide ${i + 1}`} className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform duration-300" />
                    {onRemoveImage && (
                      <button
                        type="button"
                        onClick={() => onRemoveImage(i, url)}
                        title="Delete Image"
                        className="absolute top-1.5 right-1.5 bg-red-600 hover:bg-red-700 text-white p-1.5 rounded-full shadow-lg opacity-90 sm:opacity-0 group-hover/thumb:opacity-100 transition-all hover:scale-110 z-20 cursor-pointer"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-red-500 font-medium text-xs bg-red-50 border border-red-100 p-4 rounded-xl space-y-2">
              <div className="font-bold flex items-center gap-2">
                <span className="w-2 h-2 bg-red-500 rounded-full" />
                Connection Error
              </div>
              <p className="text-[11px] leading-relaxed text-red-600">{result.error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
