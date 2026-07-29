"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingCart,
  ArrowLeft,
  Minus,
  Plus,
  Share2,
  Heart,
  ChevronRight,
  Info,
  ShieldCheck
} from "lucide-react";
import GlobalStyles from "@/components/GlobalStyles";
import { useCart } from "@/context/CartContext";
import { Product, ProductVariant, ProductImage } from "@/lib/store";

export default function ProductDetailPage({ params }: { params: any }) {
  const { addToCart } = useCart();
  const [id, setId] = useState<string>("");
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  // Interaction states
  const [selectedColor, setSelectedColor] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [v, setV] = useState(0);

  useEffect(() => {
    async function resolveParams() {
      const resolved = await params;
      if (resolved && resolved.id) {
        setId(resolved.id);
      }
    }
    resolveParams();
  }, [params]);

  useEffect(() => {
    if (!id) return;

    async function loadProduct() {
      setLoading(true);
      try {
        // Fetch products from Prisma database via API
        const res = await fetch('/api/products');
        if (!res.ok) throw new Error('Failed to fetch products');

        const products: Product[] = await res.json();

        // Find the matched product by slugified name
        const found = products.find(p => {
          const slug = p.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
          return slug === id;
        });

        if (found) {
          setProduct(found);

          // Set active image to first front image
          const frontImg = found.images.find((img: ProductImage) => img.type === 'front')?.url || found.images[0]?.url;
          setActiveImage(frontImg || '');

          // Set default color from first variant
          if (found.variants && found.variants.length > 0) {
            setSelectedColor(found.variants[0].color);
            setSelectedSize(found.variants[0].size);
          }
        }
      } catch (err) {
        console.error("Failed to load product details:", err);
      } finally {
        setLoading(false);
      }
      setV(Date.now());
    }

    loadProduct();
  }, [id]);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">Loading Product Details...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-white py-24 px-6">
        <div className="max-w-xl mx-auto text-center space-y-8">
          <h1 className="text-4xl font-black tracking-tighter uppercase italic">Product Not Found</h1>
          <p className="text-gray-500 font-medium">We couldn't find the product you're looking for. It might have been updated or removed.</p>
          <Link
            href="/merch"
            className="inline-flex items-center gap-3 bg-black text-white px-10 py-5 rounded-full font-black text-xs uppercase tracking-[0.2em] hover:bg-blue-600 transition-all shadow-xl"
          >
            <ArrowLeft size={16} /> Back to Catalog
          </Link>
        </div>
      </div>
    );
  }

  // Extract unique colors and sizes from variants
  const colorMap = new Map<string, { hex: string; name: string }>();
  product.variants.forEach((v: ProductVariant) => {
    const parts = v.color.split('|');
    const name = parts[0] || v.color;
    const hex = parts[1] || '#9ca3af';
    if (!colorMap.has(name)) {
      colorMap.set(name, { hex, name });
    }
  });
  const colors = Array.from(colorMap.keys());

  // Get sizes for selected color
  const sizesForSelectedColor = product.variants
    .filter((v: ProductVariant) => v.color.split('|')[0] === selectedColor)
    .map((v: ProductVariant) => v.size);
  const uniqueSizes = Array.from(new Set(sizesForSelectedColor));

  // Get images for selected color
  const colorParam = `color=${encodeURIComponent(selectedColor)}`;
  const imagesForColor = product.images
    .filter((img: ProductImage) => 
      img.url.includes(selectedColor) || 
      img.type === 'front' || 
      img.type === 'back' || 
      img.type === 'gallery'
    )
    .map((img: ProductImage) => ({
      ...img,
      url: img.url.startsWith('data:') || img.url.includes('?color=') ? img.url : `${img.url}?${colorParam}`
    }));

  const frontImage = activeImage || imagesForColor.find((img: ProductImage) => img.type === 'front')?.url || imagesForColor[0]?.url || product.images[0]?.url;
  const backImage = imagesForColor.find((img: ProductImage) => img.type === 'back')?.url || product.images.find((img: ProductImage) => img.type === 'back')?.url;

  return (
    <div className="min-h-screen bg-white text-black py-20 px-6 sm:px-12 lg:px-24">
      <GlobalStyles />

      <div className="max-w-7xl mx-auto">
        {/* Navigation Breadcrumbs & Back Button */}
        <div className="mb-12 flex justify-between items-center">
          <Link
            href="/merch"
            className="group inline-flex items-center gap-3 text-xs font-black uppercase tracking-[0.2em] text-gray-400 hover:text-black transition-colors"
          >
            <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
            <span>Volver a la Tienda</span>
          </Link>
          <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold uppercase tracking-wider">
            <span>Tienda</span>
            <ChevronRight size={10} />
            <span>{product.category?.name || 'Product'}</span>
            <ChevronRight size={10} />
            <span className="text-black font-black">{product.title}</span>
          </div>
        </div>

        {/* Product Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 xl:gap-24 mb-24">

          {/* LEFT COLUMN: Gallery & Images */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            <div className="relative aspect-square bg-gray-50 rounded-[3rem] overflow-hidden border border-gray-100 shadow-sm group">
              {/* Front Image */}
              <motion.img
                src={`${frontImage}?v=${v}`}
                alt={`${product.title} - Front`}
                className="absolute inset-0 h-full w-full object-contain p-12 group-hover:scale-105 transition-transform duration-700"
              />

              {/* Back Image on hover */}
              {backImage && backImage !== frontImage && (
                <motion.img
                  src={`${backImage}?v=${v}`}
                  alt={`${product.title} - Back`}
                  className="absolute inset-0 h-full w-full object-contain p-12 opacity-0 scale-105"
                  animate={{ opacity: 1, scale: 1.05 }}
                  transition={{ duration: 0.4, ease: 'easeInOut' }}
                />
              )}

              {/* Liked Badge */}
              <button
                onClick={() => setIsLiked(!isLiked)}
                className="absolute top-8 right-8 w-12 h-12 rounded-full bg-white shadow-xl flex items-center justify-center border border-gray-100 hover:scale-110 transition-transform active:scale-95"
              >
                <Heart size={20} className={isLiked ? "fill-red-500 text-red-500" : "text-gray-400"} />
              </button>

              {/* Tag Category Badge */}
              <div className="absolute top-8 left-8 bg-black text-white px-5 py-2.5 rounded-full font-black text-[9px] uppercase tracking-widest shadow-md">
                {product.category?.name || 'Product'}
              </div>
            </div>

            {/* Thumbnail previews */}
            <div className="flex gap-4 overflow-x-auto pb-2">
              {product.images.slice(0, 6).map((img: ProductImage, idx) => {
                const colorUrl = img.url.includes('?color=') ? img.url : `${img.url}?${colorParam}`;
                return (
                  <button
                    key={img.id}
                    onClick={() => setActiveImage(colorUrl)}
                    className={`w-24 h-24 rounded-2xl bg-gray-50 border-2 overflow-hidden p-2 shrink-0 transition-all ${
                      activeImage === colorUrl ? 'border-black shadow-md scale-95' : 'border-transparent hover:border-gray-200'
                    }`}
                  >
                    <img src={colorUrl} className="w-full h-full object-contain" alt={`Preview ${idx + 1}`} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* RIGHT COLUMN: Details & Purchase Interface */}
          <div className="lg:col-span-5 space-y-8 lg:sticky lg:top-8 h-fit">

            {/* Title & Price */}
            <div className="space-y-4">
              <h1 className="text-4xl sm:text-5xl font-black tracking-tighter uppercase italic leading-tight">
                {product.title}
              </h1>

              <div className="flex items-baseline gap-4">
                <span className="text-3xl font-black tracking-tight">${product.price.toFixed(2)} USD</span>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Impuestos incluidos</span>
              </div>

              <div className="text-xs text-gray-400 font-medium pb-4 border-b border-gray-100 flex items-center gap-2">
                <Info size={14} className="text-blue-600" />
                <span><span className="underline cursor-pointer">Shipping</span> calculated at checkout.</span>
              </div>
            </div>

            {/* Variant Selector: Color */}
            <div className="space-y-3">
              <div className="flex justify-between text-[10px] font-black uppercase tracking-wider text-gray-400">
                <span>Color</span>
                <span className="text-black">{selectedColor}</span>
              </div>
              <div className="flex flex-wrap gap-3">
                {colors.map((color) => {
                  const colorInfo = colorMap.get(color);
                  const hex = colorInfo?.hex || '#9ca3af';
                  return (
                    <button
                      key={color}
                      onClick={() => {
                        setSelectedColor(color);
                        setSelectedSize(''); // Reset size when color changes
                        // Update active image to show this color
                        const colorParam = `color=${encodeURIComponent(color)}`;
                        const frontImgForColor = product.images.find((img: ProductImage) => img.type === 'front');
                        if (frontImgForColor) {
                          const newUrl = frontImgForColor.url.includes('?color=')
                            ? frontImgForColor.url.replace(/color=[^&]*/, `color=${encodeURIComponent(color)}`)
                            : `${frontImgForColor.url}?${colorParam}`;
                          setActiveImage(newUrl);
                        }
                      }}
                      className={`px-8 py-3.5 rounded-xl text-[10px] font-black tracking-widest uppercase border-2 transition-all ${
                        selectedColor === color
                          ? 'bg-black text-white border-black shadow-lg scale-105'
                          : 'bg-white text-gray-400 border-gray-200 hover:border-black hover:text-black'
                      }`}
                      style={{ borderColor: selectedColor === color ? 'black' : 'transparent' }}
                    >
                      <span className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full border" style={{ backgroundColor: hex }} />
                        {color}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Variant Selector: Size */}
            <div className="space-y-3">
              <div className="flex justify-between text-[10px] font-black uppercase tracking-wider text-gray-400">
                <span>Size</span>
                <span className="text-black">{selectedSize || 'Select a color first'}</span>
              </div>
              <div className="flex flex-wrap gap-2.5">
                {uniqueSizes.length > 0 ? (
                  uniqueSizes.map((size: string) => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={`w-12 h-12 rounded-xl text-[10px] font-black tracking-widest uppercase border-2 transition-all ${
                        selectedSize === size
                          ? 'bg-black text-white border-black shadow-lg scale-105 z-10'
                          : 'bg-white text-gray-400 border-gray-200 hover:border-black hover:text-black'
                      }`}
                    >
                      {size}
                    </button>
                  ))
                ) : (
                  <span className="text-xs text-gray-400 self-center">Select a color to see available sizes</span>
                )}
              </div>
            </div>

            {/* Quantity Selector */}
            <div className="space-y-3 pb-6 border-b border-gray-100">
              <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400">Quantity</label>
              <div className="flex items-center bg-gray-50 border border-gray-250/60 rounded-xl w-36 px-4 py-2 justify-between">
                <button
                  onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
                  className="text-gray-400 hover:text-black transition-colors"
                >
                  <Minus size={14} />
                </button>
                <span className="font-black text-sm">{quantity}</span>
                <button
                  onClick={() => setQuantity(prev => prev + 1)}
                  className="text-gray-400 hover:text-black transition-colors"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            {/* Checkout Action Buttons */}
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => {
                  if (!selectedColor || !selectedSize) {
                    alert('Please select a color and size');
                    return;
                  }
                  // Find the variant for price/stock info
                  const variant = product.variants.find(
                    (v: ProductVariant) => v.color.split('|')[0] === selectedColor && v.size === selectedSize
                  );
                  addToCart({
                    productId: product.id,
                    name: product.title,
                    price: variant?.price || product.price,
                    color: selectedColor,
                    size: selectedSize,
                    quantity: quantity,
                    img: frontImage,
                    variantId: variant?.id,
                  });
                }}
                className="w-full bg-white text-black border-2 border-black py-5 rounded-2xl font-black text-xs uppercase tracking-[0.25em] hover:bg-black hover:text-white transition-all shadow-md active:scale-95 flex items-center justify-center gap-3"
              >
                <ShoppingCart size={16} />
                Añadir al Carrito
              </button>

              {/* Stripe and PayPal buttons - placeholder for now */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  disabled
                  className="flex items-center justify-center gap-2.5 w-full bg-gray-100 text-gray-400 py-4.5 rounded-2xl font-black text-[10px] uppercase tracking-widest cursor-not-allowed text-center"
                  title="Configure Stripe in Admin > Payments"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M13.93 10.09c0-.49-.41-.71-1.07-.71-.79 0-1.57.19-2.31.54L10 8.16c.86-.41 1.93-.65 2.96-.65 1.95 0 3.2 1.01 3.2 2.77 0 2.39-3.23 3-3.23 4.29 0 .42.33.59.88.59.82 0 1.54-.24 2.21-.61l.53 1.63c-.81.49-1.92.77-3.04.77-1.95 0-3.27-1-3.27-2.73 0-2.58 3.4-3.13 3.4-4.88zM24 12c0 6.63-5.37 12-12 12S0 18.63 0 12 5.37 0 12 0s12 5.37 12 12z" />
                  </svg>
                  Stripe
                </button>

                <button
                  disabled
                  className="flex items-center justify-center gap-2.5 w-full bg-gray-100 text-gray-400 py-4.5 rounded-2xl font-black text-[10px] uppercase tracking-widest cursor-not-allowed text-center"
                  title="Configure PayPal in Admin > Payments"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M20.08 7.02c-.22-1.63-1.39-2.91-3.32-3.31C15.54 3.46 13.9 3.4 12.21 3.4H6.75c-.47 0-.85.34-.92.8L4.05 18.57c-.05.34.21.65.55.65h3.69l.91-5.77c.07-.46.47-.8.94-.8h1.22c3.08 0 5.48-1.25 6.18-4.38.31-1.38.25-2.55-.46-3.25zm-3.31 3.99c-.39 1.76-1.78 1.76-3.29 1.76h-.85l.61-3.87h.85c1.4 0 2.27.06 2.68 1.91.02.07.01.14 0 .2z" />
                  </svg>
                  PayPal
                </button>
              </div>

              <p className="text-[10px] font-semibold text-gray-400 text-center uppercase tracking-wider">
                100% of proceeds directly cover care costs for cancer survivors.
              </p>
            </div>

            {/* Description Tab & Text */}
            <div className="pt-6 space-y-6 border-t border-gray-100">
              <div className="space-y-4 text-xs font-medium text-gray-600 leading-relaxed">
                <p>
                  {product.description}
                </p>

                <ul className="space-y-2 pl-4 list-disc text-gray-600">
                  <li>• Made-to-order by Printful</li>
                  <li>• Premium quality materials</li>
                  <li>• Directly supports cancer survivors</li>
                  <li>• Printed on demand to reduce waste</li>
                </ul>

                <p className="pt-4 font-semibold text-gray-500 border-t border-gray-150">
                  This product is made especially for you as soon as you place an order, which is why it takes us a bit longer to deliver it to you. Making products on demand instead of in bulk helps reduce overproduction, so thank you for making thoughtful purchasing decisions!
                </p>
              </div>
            </div>

            {/* Size Guide Collapsible / Details Section */}
            <div className="pt-8 border-t border-gray-100 space-y-6">
              <h4 className="text-sm font-black uppercase tracking-[0.2em] italic">Size Guide</h4>

              <div className="overflow-x-auto border border-gray-100 rounded-2xl shadow-inner bg-white">
                <table className="w-full text-left border-collapse font-sans text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100 text-[10px] font-black uppercase tracking-wider text-gray-400">
                      <th className="px-6 py-4">Size</th>
                      <th className="px-6 py-4">Length (inches)</th>
                      <th className="px-6 py-4">Width (inches)</th>
                      <th className="px-6 py-4">Sleeve Length (inches)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-gray-500 font-medium">
                    {uniqueSizes.length > 0 ? (
                      uniqueSizes.map((size: string) => (
                        <tr key={size} className={selectedSize === size ? "bg-blue-500/5 text-black font-bold" : ""}>
                          <td className="px-6 py-4 text-black font-black">{size}</td>
                          <td className="px-6 py-4">-</td>
                          <td className="px-6 py-4">-</td>
                          <td className="px-6 py-4">-</td>
                        </tr>
                      ))
                    ) : (
                      <>
                        <tr>
                          <td className="px-6 py-4 text-black font-black">S</td>
                          <td className="px-6 py-4">28</td>
                          <td className="px-6 py-4">18</td>
                          <td className="px-6 py-4">15 ⅝</td>
                        </tr>
                        <tr>
                          <td className="px-6 py-4 text-black font-black">M</td>
                          <td className="px-6 py-4">29</td>
                          <td className="px-6 py-4">20</td>
                          <td className="px-6 py-4">17</td>
                        </tr>
                        <tr>
                          <td className="px-6 py-4 text-black font-black">L</td>
                          <td className="px-6 py-4">30</td>
                          <td className="px-6 py-4">22</td>
                          <td className="px-6 py-4">18 ½</td>
                        </tr>
                        <tr>
                          <td className="px-6 py-4 text-black font-black">XL</td>
                          <td className="px-6 py-4">31</td>
                          <td className="px-6 py-4">24</td>
                          <td className="px-6 py-4">20</td>
                        </tr>
                        <tr>
                          <td className="px-6 py-4 text-black font-black">2XL</td>
                          <td className="px-6 py-4">32</td>
                          <td className="px-6 py-4">26</td>
                          <td className="px-6 py-4">21 ½</td>
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Trust & Guarantee Panel */}
            <div className="p-6 bg-gray-100/30 rounded-2xl border border-gray-150 flex items-start gap-4">
              <ShieldCheck className="text-blue-600 shrink-0 mt-0.5" size={20} />
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-black block">Five Time Guarantee</span>
                <p className="text-[10px] font-semibold text-gray-400 uppercase leading-relaxed">
                  Supportive community grounded in purpose. Reclaim mobility, confidence, and connection.
                </p>
              </div>
            </div>

            {/* Share and Social actions */}
            <div className="pt-6 border-t border-gray-100 flex items-center gap-6">
              <button
                onClick={handleShare}
                className="inline-flex items-center gap-2.5 text-[10px] font-black uppercase tracking-wider text-gray-400 hover:text-black transition-colors"
              >
                <Share2 size={14} />
                <span>{isCopied ? "Enlace Copiado!" : "Compartir este producto"}</span>
              </button>
            </div>

          </div>

        </div>

        {/* BOTTOM SECTION: Related Products Slider */}
        <div className="border-t border-gray-100 pt-20">
          <h3 className="text-2xl font-black uppercase tracking-tighter italic mb-12">También te podría gustar</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* We'll just show a placeholder since we don't have access to all products here easily */}
            <div className="text-center py-12 text-gray-400">
              <p className="text-sm">Productos relacionados se cargarán aquí</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}