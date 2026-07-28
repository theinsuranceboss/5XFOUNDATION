'use client';

import { useEffect, useState } from 'react';
import { useStore, getSessionId } from '@/lib/store';
import { ProductGrid } from '@/components/product-grid';
import { getSiteContent } from '@/lib/supabase';
import { ShoppingBag } from 'lucide-react';

export default function MerchPage() {
  const { setProducts, setCategories, setCart, setPaymentConfigs, cart, setIsCartOpen } = useStore();
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState<any>({
    shopTitle: '5XFOUNDATION MERCH',
    shopSubtitle: 'Wear your support. 100% of proceeds fund prosthetics and care-related costs for cancer survivors.',
    shopBanner: '/shop_banner.png',
    shopBannerHeight: '350',
    shopBannerOverlay: '0.4',
    shopBannerSize: 'fill',
    shopBannerPosition: 'center',
    shopTitleColor: '#FFFFFF',
    shopSubtitleColor: '#E5E7EB',
  });

  useEffect(() => {
    async function loadData() {
      try {
        // Step 1.5: Try loading cached dynamic configurations instantly
        try {
          const savedContent = localStorage.getItem('siteContent');
          if (savedContent) {
            setContent((prev: any) => ({ ...prev, ...JSON.parse(savedContent) }));
          }
        } catch (e) {}

        // Fetch fresh updates from Supabase
        try {
          const dbContent = await getSiteContent('siteContent');
          if (dbContent) {
            const parsed = JSON.parse(dbContent);
            setContent((prev: any) => ({ ...prev, ...parsed }));
            localStorage.setItem('siteContent', dbContent);
          }
        } catch (err) {
          console.error('Failed to load site dynamic configurations:', err);
        }

        // Step 2: Fetch products, categories, and payment gateway configs
        const [productsRes, categoriesRes, paymentRes] = await Promise.all([
          fetch('/api/products'),
          fetch('/api/categories'),
          fetch('/api/admin/payment-config'),
        ]);

        if (productsRes.ok) setProducts(await productsRes.json());
        if (categoriesRes.ok) setCategories(await categoriesRes.json());
        if (paymentRes.ok) setPaymentConfigs(await paymentRes.json());

        // Step 3: Fetch session-based database cart items
        const sessionId = getSessionId();
        const cartRes = await fetch(`/api/cart?sessionId=${sessionId}`);
        if (cartRes.ok) setCart(await cartRes.json());
      } catch (err) {
        console.error('Failed to load store data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [setProducts, setCategories, setCart, setPaymentConfigs]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">Loading Storefront...</p>
        </div>
      </div>
    );
  }

  const bannerImg = content.shopBanner || '/shop_banner.png';
  const hasBanner = bannerImg.trim() !== '' && bannerImg !== 'none';

  const isSplit = content.shopBannerLayout === 'split';
  const textPlacement = content.shopBannerPlacement || 'center'; // left | center | right

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

  const bannerHeight = `${content.shopBannerHeight || '350'}px`;

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
            <span className="text-[10px] font-black tracking-[0.3em] uppercase text-gray-400">Official Shop</span>
            <h1 
              className="text-3xl sm:text-4xl md:text-5xl font-black italic tracking-tighter uppercase leading-none"
              style={{ color: content.shopTitleColor || '#FFFFFF' }}
            >
              {content.shopTitle || '5XFOUNDATION MERCH'}
            </h1>
            <div className="w-12 h-1 bg-blue-500 rounded-full" />
            <p 
              className="text-xs sm:text-sm font-medium leading-relaxed"
              style={{ color: content.shopSubtitleColor || '#E5E7EB' }}
            >
              {content.shopSubtitle || 'Wear your support. 100% of proceeds fund prosthetics and care-related costs for cancer survivors.'}
            </p>
          </div>
          {/* Image Side */}
          <div 
            className="w-full lg:w-1/2 min-h-[220px] lg:min-h-full"
            style={{
              backgroundImage: `url(${bannerImg})`,
              backgroundSize: 
                content.shopBannerSize === 'fit' || content.shopBannerSize === 'centered' || content.shopBannerSize === 'contain' ? 'contain' : 
                content.shopBannerSize === 'stretch' ? '100% 100%' : 
                content.shopBannerSize === 'tile' || content.shopBannerSize === 'repeat' ? 'auto' : 'cover',
              backgroundRepeat: 
                content.shopBannerSize === 'tile' || content.shopBannerSize === 'repeat' ? 'repeat' : 'no-repeat',
              backgroundPosition: content.shopBannerPosition || 'center',
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
              content.shopBannerSize === 'fit' || content.shopBannerSize === 'centered' || content.shopBannerSize === 'contain' ? 'contain' : 
              content.shopBannerSize === 'stretch' ? '100% 100%' : 
              content.shopBannerSize === 'tile' || content.shopBannerSize === 'repeat' ? 'auto' : 'cover',
            backgroundRepeat: 
              content.shopBannerSize === 'tile' || content.shopBannerSize === 'repeat' ? 'repeat' : 'no-repeat',
            backgroundPosition: content.shopBannerPosition || 'center',
          }}
        >
          <div 
            className="absolute inset-0 bg-black transition-opacity duration-300" 
            style={{ opacity: parseFloat(content.shopBannerOverlay || '0.4') }} 
          />
          <div className={`relative z-10 px-8 py-12 flex flex-col space-y-4 w-full ${overlayAlignClasses}`}>
            <span className="text-[10px] font-black tracking-[0.3em] uppercase" style={{ color: content.shopSubtitleColor || '#E5E7EB' }}>Official Shop</span>
            <h1 
              className="text-4xl sm:text-5xl md:text-6xl font-black italic tracking-tighter uppercase leading-none"
              style={{ color: content.shopTitleColor || '#FFFFFF' }}
            >
              {content.shopTitle || '5XFOUNDATION MERCH'}
            </h1>
            <div className="w-12 h-1 bg-blue-500 rounded-full" />
            <p 
              className="text-sm font-medium leading-relaxed max-w-2xl"
              style={{ color: content.shopSubtitleColor || '#E5E7EB' }}
            >
              {content.shopSubtitle || 'Wear your support. 100% of proceeds fund prosthetics and care-related costs for cancer survivors.'}
            </p>
          </div>
        </div>
      )}
    </div>
  ) : (
    <div className="text-center max-w-2xl mx-auto space-y-4">
      <span className="text-[10px] font-black tracking-[0.3em] uppercase text-blue-600">Official Shop</span>
      <h1 className="text-5xl md:text-6xl font-black italic tracking-tighter uppercase leading-none">
        {content.shopTitle || '5XFOUNDATION MERCH'}
      </h1>
      <div className="w-12 h-1 bg-blue-600 mx-auto rounded-full" />
      <p className="text-gray-500 text-sm font-medium leading-relaxed">
        {content.shopSubtitle || 'Wear your support. 100% of proceeds directly fund access to high-end prosthetics, care-related costs, and empower cancer warriors.'}
      </p>
    </div>
  );

  const finalBanner = hasBanner && content.shopBannerLink ? (
    <a href={content.shopBannerLink} target="_blank" rel="noopener noreferrer" className="block hover:opacity-95 transition-opacity">
      {bannerContent}
    </a>
  ) : bannerContent;

  return (
    <div className="py-24 md:py-32 px-6 sm:px-12 bg-white text-black min-h-screen">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Store Header Banner */}
        {finalBanner}

        {/* Dynamic Product Grid & Filters */}
        <ProductGrid />
      </div>

      {/* Floating Cart Icon for Mobile/Desktop */}
      {cart.length > 0 && (
        <button 
          onClick={() => setIsCartOpen(true)}
          className="fixed bottom-6 right-6 z-50 bg-black text-white p-4 rounded-full shadow-2xl hover:scale-105 transition-transform border-2 border-white/20"
        >
          <div className="relative">
            <ShoppingBag className="w-6 h-6" />
            <span className="absolute -top-3 -right-3 bg-[#0052FF] text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border border-white">
              {cart.length}
            </span>
          </div>
        </button>
      )}
    </div>
  );
}
