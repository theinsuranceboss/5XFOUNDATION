"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getSiteContent } from "@/lib/supabase";
import { DonationCard } from "@/components/DonationCard";
import AdBanner from "@/components/AdBanner";

export const dynamic = 'force-dynamic';

function NativeDonateEmbed({ html }: { html: string }) {
  const containerId = "shopify-donate-container";

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

  return (
    <div 
      id={containerId} 
      className="w-full min-h-[400px] py-4 md:py-8 px-2 md:px-4 mx-auto" 
      style={{ maxWidth: '1200px' }}
    />
  );
}

export default function DonatePage() {
  const [content, setContent] = useState<any>({
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
    donateAdTopType: "media",
    donateAdTopDesktop: "",
    donateAdTopTablet: "",
    donateAdTopMobile: "",
    donateAdTopLink: "",
    donateAdTopHtml: "",
    donateAdBottomType: "media",
    donateAdBottomDesktop: "",
    donateAdBottomTablet: "",
    donateAdBottomMobile: "",
    donateAdBottomLink: "",
    donateAdBottomHtml: "",
    donateHtml: `
<div class="text-center p-16 bg-gray-50 rounded-[2.5rem] border border-dashed border-gray-300 max-w-2xl mx-auto my-12 shadow-sm">
  <p class="text-gray-500 font-bold text-sm tracking-wider uppercase mb-2">Donation HTML Block</p>
  <p class="text-gray-400 text-xs">Configure donation HTML/Liquid code in the Admin Panel</p>
</div>
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
  });

  useEffect(() => {
    async function loadData() {
      // 1. Try loading cached data instantly
      try {
        const savedContent = localStorage.getItem('siteContent');
        if (savedContent) {
          const parsed = JSON.parse(savedContent);
          setContent((prev: any) => ({ ...prev, ...parsed }));
        }
      } catch (e) {}

      // 2. Fetch fresh updates from Supabase
      try {
        const dbContent = await getSiteContent('siteContent');
        if (dbContent) {
          const parsed = JSON.parse(dbContent);
          setContent((prev: any) => ({ ...prev, ...parsed }));
          localStorage.setItem('siteContent', dbContent);
        }
      } catch (err) {
        console.error("Failed to load data from Supabase for DonatePage:", err);
      }
    }
    loadData();
  }, []);

  const bannerImg = content.donateBanner || '/shop_banner.png';
  const hasBanner = bannerImg.trim() !== "" && bannerImg !== "none";

  const isSplit = content.donateBannerLayout === 'split';
  const textPlacement = content.donateBannerPlacement || 'center'; // left | center | right
  const bannerHeight = `${content.donateBannerHeight || '350'}px`;

  // Alignment classes for overlay mode
  const overlayAlignClasses =
    textPlacement === 'left' ? 'text-left items-start' :
    textPlacement === 'right' ? 'text-right items-end ml-auto' :
    'text-center items-center mx-auto';

  // Alignment classes for split mode
  const splitAlignClasses =
    textPlacement === 'left' ? 'text-left items-start' :
    textPlacement === 'right' ? 'text-right items-end' :
    'text-center items-center';

  const bannerContent = hasBanner ? (
    <div className="relative w-full overflow-hidden rounded-2xl md:rounded-[2.5rem] shadow-2xl flex select-none">
      {isSplit ? (
        <div
          className="flex flex-col-reverse lg:flex-row w-full bg-black text-white"
          style={{ minHeight: '350px', height: bannerHeight }}
        >
          {/* Text Side */}
          <div className={`w-full lg:w-1/2 p-8 sm:p-12 flex flex-col justify-center space-y-4 ${splitAlignClasses}`}>
            <span className="text-[10px] font-black tracking-[0.3em] uppercase text-gray-400">Donate</span>
            <h1
              className="text-3xl sm:text-4xl md:text-5xl font-black italic tracking-tighter uppercase leading-none"
              style={{ color: content.donateTitleColor || '#FFFFFF', fontFamily: `${content.donateTitleFontFamily || 'Inter'}, sans-serif`, fontWeight: content.donateTitleWeight || '900' }}
            >
              {content.donateTitle || 'FUEL THE FIGHT'}
            </h1>
            <div className="w-12 h-1 bg-blue-500 rounded-full" />
            <p
              className="text-xs sm:text-sm font-medium leading-relaxed"
              style={{ color: content.donateSubtitleColor || '#E5E7EB', fontFamily: `${content.donateSubtitleFontFamily || 'Inter'}, sans-serif` }}
            >
              {content.donateSubtitle || 'Your contribution directly funds prosthetics, covers care-related costs, and empowers cancer survivors to reclaim their lives.'}
            </p>
          </div>
          {/* Image Side */}
          <div
            className="w-full lg:w-1/2 min-h-[220px] lg:min-h-full"
            style={{
              backgroundImage: `url(${bannerImg})`,
              backgroundSize:
                content.donateBannerSize === 'fit' || content.donateBannerSize === 'centered' || content.donateBannerSize === 'contain' ? 'contain' :
                content.donateBannerSize === 'stretch' ? '100% 100%' : 'cover',
              backgroundPosition: content.donateBannerPosition || 'center',
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
              content.donateBannerSize === 'fit' || content.donateBannerSize === 'centered' || content.donateBannerSize === 'contain' ? 'contain' :
              content.donateBannerSize === 'stretch' ? '100% 100%' : 'cover',
            backgroundPosition: content.donateBannerPosition || 'center',
            backgroundRepeat: 'no-repeat',
          }}
        >
          <div
            className="absolute inset-0 bg-black transition-opacity duration-300"
            style={{ opacity: parseFloat(content.donateBannerOverlay || '0.4') }}
          />
          <div className={`relative z-10 px-8 py-12 flex flex-col space-y-4 w-full ${overlayAlignClasses}`}>
            <span className="text-[10px] font-black tracking-[0.3em] uppercase" style={{ color: content.donateSubtitleColor || '#E5E7EB' }}>Donate</span>
            <h1
              className="text-4xl sm:text-5xl md:text-6xl font-black italic tracking-tighter uppercase leading-none"
              style={{ color: content.donateTitleColor || '#FFFFFF', fontFamily: `${content.donateTitleFontFamily || 'Inter'}, sans-serif`, fontWeight: content.donateTitleWeight || '900' }}
            >
              {content.donateTitle || 'FUEL THE FIGHT'}
            </h1>
            <div className="w-12 h-1 bg-blue-500 rounded-full" />
            <p
              className="text-sm font-medium leading-relaxed max-w-2xl"
              style={{ color: content.donateSubtitleColor || '#E5E7EB', fontFamily: `${content.donateSubtitleFontFamily || 'Inter'}, sans-serif` }}
            >
              {content.donateSubtitle || 'Your contribution directly funds prosthetics, covers care-related costs, and empowers cancer survivors to reclaim their lives.'}
            </p>
          </div>
        </div>
      )}
    </div>
  ) : (
    <div className="text-center max-w-2xl mx-auto space-y-4">
      <span className="text-[10px] font-black tracking-[0.3em] uppercase text-blue-600">Donate</span>
      <h1 className="text-5xl md:text-6xl font-black italic tracking-tighter uppercase leading-none"
        style={{ color: content.donateTitleColor || '#000000', fontFamily: `${content.donateTitleFontFamily || 'Inter'}, sans-serif` }}
      >
        {content.donateTitle || 'FUEL THE FIGHT'}
      </h1>
      <div className="w-12 h-1 bg-blue-600 mx-auto rounded-full" />
      <p className="text-gray-500 text-sm font-medium leading-relaxed"
        style={{ color: content.donateSubtitleColor || '#4B5563', fontFamily: `${content.donateSubtitleFontFamily || 'Inter'}, sans-serif` }}
      >
        {content.donateSubtitle || 'Your contribution directly funds prosthetics, covers care-related costs, and empowers cancer survivors to reclaim their lives.'}
      </p>
    </div>
  );

  const finalBanner = hasBanner && content.donateBannerLink ? (
    <a href={content.donateBannerLink} target="_blank" rel="noopener noreferrer" className="block hover:opacity-95 transition-opacity mb-8 md:mb-12">
      {bannerContent}
    </a>
  ) : (
    <div className="mb-8 md:mb-12">
      {bannerContent}
    </div>
  );

  return (
    <div className="py-12 md:py-20 lg:py-24 px-4 md:px-8 lg:px-12 min-h-screen bg-white">
      <style dangerouslySetInnerHTML={{ __html: `
        .donate-diff-title {
          color: ${content.diffTitleColor || '#000000'} !important;
        }
        .donate-diff-desc {
          color: ${content.diffDescColor || '#4B5563'} !important;
        }
        .donate-impact-title {
          color: ${content.impactTitleColor || '#000000'} !important;
        }
        .donate-impact-amt {
          color: ${content.impactAmtColor || '#000000'} !important;
        }
        .donate-impact-desc {
          color: ${content.impactDescColor || '#4B5563'} !important;
        }
      ` }} />
      <div className="max-w-7xl mx-auto">
        {/* Header Banner */}
        {finalBanner}

        {/* Donate Top Ad Banner */}
        <AdBanner
          type={content.donateAdTopType || 'media'}
          desktop={content.donateAdTopDesktop || ''}
          tablet={content.donateAdTopTablet || ''}
          mobile={content.donateAdTopMobile || ''}
          link={content.donateAdTopLink || ''}
          html={content.donateAdTopHtml || ''}
        />

        {/* Make a Difference Today Section */}
        <div className="my-16 max-w-4xl mx-auto text-center px-4">
          <h2 
            className="mb-6 uppercase tracking-tight donate-diff-title"
            style={{
              fontSize: `${content.diffTitleSize || '48'}px`,
              color: content.diffTitleColor || '#000000',
              fontFamily: `${content.diffTitleFont || 'Inter'}, sans-serif`,
              textAlign: (content.diffTitleAlign || 'center') as any,
              fontWeight: content.diffTitleWeight || '700',
            }}
          >
            {content.diffTitle || "Make a Difference Today"}
          </h2>
          <p 
            className="leading-relaxed font-medium donate-diff-desc"
            style={{
              fontSize: `${content.diffDescSize || '16'}px`,
              color: content.diffDescColor || '#4B5563',
              fontFamily: `${content.diffDescFont || 'Inter'}, sans-serif`,
              textAlign: (content.diffDescAlign || 'center') as any,
            }}
          >
            {content.diffDesc || "Every donation directly supports cancer patients and survivors facing limb loss. Whether you choose a one-time gift or ongoing monthly support, your contribution helps us provide life-changing assistance to those who need it most."}
          </p>
        </div>

        <div className="mt-8 max-w-7xl mx-auto w-full flex justify-center px-4">
          <DonationCard />
        </div>

        {/* Your Impact Section */}
        <div className="my-24 max-w-7xl mx-auto px-4">
          <h3 
            className="mb-12 tracking-tight donate-impact-title"
            style={{
              fontSize: `${content.impactTitleSize || '32'}px`,
              color: content.impactTitleColor || '#000000',
              fontFamily: `${content.impactTitleFont || 'Inter'}, sans-serif`,
              textAlign: (content.impactTitleAlign || 'center') as any,
              fontWeight: content.impactTitleWeight || '700',
            }}
          >
            {content.impactTitle || "Your Impact"}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { amt: content.impactAmt1 || "25", desc: content.impactDesc1 || "Helps cover transportation costs for a patient's medical appointment" },
              { amt: content.impactAmt2 || "50", desc: content.impactDesc2 || "Provides essential daily living supplies for a week" },
              { amt: content.impactAmt3 || "100", desc: content.impactDesc3 || "Contributes toward prosthetic fitting and adjustment costs" },
              { amt: content.impactAmt4 || "500", desc: content.impactDesc4 || "Funds a significant portion of a prosthetic device for a cancer warrior" }
            ].map((card, i) => (
              <div 
                key={i} 
                className="bg-gray-50 border border-gray-150 rounded-3xl p-8 hover:shadow-xl transition-all duration-350 flex flex-col justify-between"
              >
                <div 
                  className="font-black mb-4 donate-impact-amt"
                  style={{
                    fontSize: `${content.impactAmtSize || '36'}px`,
                    color: content.impactAmtColor || '#000000',
                    fontFamily: `${content.impactAmtFont || 'Inter'}, sans-serif`
                  }}
                >
                  ${card.amt}
                </div>
                <p 
                  className="leading-relaxed font-medium donate-impact-desc"
                  style={{
                    fontSize: `${content.impactDescSize || '14'}px`,
                    color: content.impactDescColor || '#4B5563',
                    fontFamily: `${content.impactDescFont || 'Inter'}, sans-serif`
                  }}
                >
                  {card.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Every Dollar Counts Section */}
        <div 
          className="my-16 rounded-[2.5rem] p-12 md:p-16 text-center relative overflow-hidden select-none shadow-xl border border-gray-100"
          style={{
            backgroundColor: content.everyDollarBgColor || '#1A1C23',
            backgroundImage: content.everyDollarBgImage ? `url(${content.everyDollarBgImage})` : 'none',
            backgroundSize: content.everyDollarBgSize === 'centered' ? 'contain' : content.everyDollarBgSize === 'stretch' ? '100% 100%' : 'cover',
            backgroundPosition: content.everyDollarBgPosition || 'center',
          }}
        >
          {content.everyDollarBgImage && (
            <div className="absolute inset-0 bg-black/60 pointer-events-none" />
          )}
          
          <div className="relative z-10 max-w-3xl mx-auto space-y-6">
            <h3 
              className="tracking-tight font-black uppercase"
              style={{
                fontSize: `${content.everyDollarTitleSize || '36'}px`,
                color: content.everyDollarTitleColor || '#FFFFFF',
                fontFamily: `${content.everyDollarTitleFont || 'Inter'}, sans-serif`,
              }}
            >
              {content.everyDollarTitle || "Every Dollar Counts"}
            </h3>
            <p 
              className="leading-relaxed font-medium max-w-2xl mx-auto"
              style={{
                fontSize: `${content.everyDollarDescSize || '16'}px`,
                color: content.everyDollarDescColor || '#E5E7EB',
                fontFamily: `${content.everyDollarDescFont || 'Inter'}, sans-serif`,
              }}
            >
              {content.everyDollarDesc || "100% of donations go directly to supporting cancer warriors. Five Time Foundation™ is committed to making every dollar count."}
            </p>
            
            <div className="pt-6">
              <Link 
                href="/merch"
                className="inline-block px-12 py-5 rounded-full font-black uppercase tracking-[0.2em] transition-all hover:scale-105 active:scale-95 shadow-xl hover:opacity-90"
                style={{
                  fontSize: `${content.everyDollarBtnSize || '14'}px`,
                  color: content.everyDollarBtnColor || '#111827',
                  backgroundColor: content.everyDollarBtnBg || '#FFFFFF',
                  fontFamily: `${content.everyDollarBtnFont || 'Inter'}, sans-serif`,
                }}
              >
                {content.everyDollarBtnText || "SHOP MERCHANDISE"}
              </Link>
            </div>
          </div>
        </div>

        {/* Donate Bottom Ad Banner */}
        <AdBanner
          type={content.donateAdBottomType || 'media'}
          desktop={content.donateAdBottomDesktop || ''}
          tablet={content.donateAdBottomTablet || ''}
          mobile={content.donateAdBottomMobile || ''}
          link={content.donateAdBottomLink || ''}
          html={content.donateAdBottomHtml || ''}
        />

      </div>
    </div>
  );
}
