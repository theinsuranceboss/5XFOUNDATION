'use client';

import { useState, useEffect, useCallback } from 'react';
import { useStore, Product, getSessionId } from '@/lib/store';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Minus, Plus, ShoppingBag, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { getDisplayColor } from './product-card';
import { getDisplayUrl } from '@/lib/utils';

export function ProductDetail() {
  const { selectedProduct, setSelectedProduct, setIsCartOpen } = useStore();
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [viewType, setViewType] = useState<'front' | 'back' | 'male' | 'female'>('front');
  const [selectedThumbnail, setSelectedThumbnail] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [quantity, setQuantity] = useState<number>(1);

  const product = selectedProduct;

  useEffect(() => {
    if (product) {
      const colors = [...new Set(product.variants.map((v) => v.color))];
      setSelectedColor(colors[0] || '');
      const sizes = [...new Set(product.variants.filter((v) => v.color === (colors[0] || '')).map((v) => v.size))];
      setSelectedSize(sizes[0] || '');
      setQuantity(1);
      setViewType('front');
      setSelectedThumbnail(null);
    }
  }, [product]);

  const handleColorChange = useCallback((color: string) => {
    setSelectedColor(color);
    const sizes = [...new Set(product!.variants.filter((v) => v.color === color).map((v) => v.size))];
    if (!sizes.includes(selectedSize)) {
      setSelectedSize(sizes[0] || '');
    }
    setSelectedThumbnail(null); // Clear selected thumbnail when changing color
  }, [product, selectedSize]);

  if (!product) return null;

  const colors = [...new Set(product.variants.map((v) => v.color))];
  const sizes = [...new Set(product.variants.filter((v) => v.color === selectedColor).map((v) => v.size))];
  const currentVariant = product.variants.find((v) => v.color === selectedColor && v.size === selectedSize);
  const stockAvailable = currentVariant?.stock ?? 0;

  const selectedColorName = selectedColor.split('|')[0] || '';

  // Map the selected color to its corresponding image by substring matching URL or color query param
  const frontImage = product.images.find((img) => {
    if (img.type !== 'front') return false;
    try {
      const urlObj = new URL(img.url);
      const urlColor = urlObj.searchParams.get('color');
      if (urlColor && urlColor.toLowerCase() === selectedColorName.toLowerCase()) return true;
    } catch {}
    return img.url.toLowerCase().includes(selectedColorName.toLowerCase());
  })?.url || product.images.find((img) => img.type === 'front')?.url || product.images[0]?.url;

  const backImage = product.images.find((img) => {
    if (img.type !== 'back') return false;
    try {
      const urlObj = new URL(img.url);
      const urlColor = urlObj.searchParams.get('color');
      if (urlColor && urlColor.toLowerCase() === selectedColorName.toLowerCase()) return true;
    } catch {}
    return img.url.toLowerCase().includes(selectedColorName.toLowerCase());
  })?.url || product.images.find((img) => img.type === 'back')?.url;

  const maleImage = product.images.find((img) => {
    if (img.type !== 'male') return false;
    try {
      const urlObj = new URL(img.url);
      const urlColor = urlObj.searchParams.get('color');
      if (urlColor && urlColor.toLowerCase() === selectedColorName.toLowerCase()) return true;
    } catch {}
    return img.url.toLowerCase().includes(selectedColorName.toLowerCase());
  })?.url || product.images.find((img) => img.type === 'male')?.url;

  const femaleImage = product.images.find((img) => {
    if (img.type !== 'female') return false;
    try {
      const urlObj = new URL(img.url);
      const urlColor = urlObj.searchParams.get('color');
      if (urlColor && urlColor.toLowerCase() === selectedColorName.toLowerCase()) return true;
    } catch {}
    return img.url.toLowerCase().includes(selectedColorName.toLowerCase());
  })?.url || product.images.find((img) => img.type === 'female')?.url;

  let currentMainImage = frontImage;
  if (selectedThumbnail) {
    currentMainImage = selectedThumbnail;
  } else if (viewType === 'back' && backImage) {
    currentMainImage = backImage;
  } else if (viewType === 'male' && maleImage) {
    currentMainImage = maleImage;
  } else if (viewType === 'female' && femaleImage) {
    currentMainImage = femaleImage;
  }

  const handleAddToCart = async () => {
    if (!selectedColor || !selectedSize) {
      toast.error('Please select color and size');
      return;
    }
    if (stockAvailable < quantity) {
      toast.error('Not enough stock available');
      return;
    }

    setIsAdding(true);
    try {
      const sessionId = getSessionId();
      const res = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          productId: product.id,
          color: selectedColor,
          size: selectedSize,
          quantity,
        }),
      });

      if (res.ok) {
        toast.success(`${product.title} added to cart!`);
        // Refresh cart
        const cartRes = await fetch(`/api/cart?sessionId=${sessionId}`);
        if (cartRes.ok) {
          const items = await cartRes.json();
          useStore.getState().setCart(items);
        }
        setSelectedProduct(null);
        setIsCartOpen(true);
      } else {
        toast.error('Failed to add to cart');
      }
    } catch {
      toast.error('Failed to add to cart');
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <Dialog open={!!product} onOpenChange={(open) => !open && setSelectedProduct(null)}>
      <DialogContent className="max-w-7xl sm:max-w-6xl md:max-w-[85vw] lg:max-w-[80vw] w-[95vw] max-h-[90vh] overflow-hidden p-0 gap-0 bg-white border border-gray-150 rounded-[2.5rem] shadow-2xl flex flex-col">
        <div className="grid md:grid-cols-2 h-full min-h-0 divide-x divide-gray-100">
          {/* Image Section */}
          <div className="relative bg-gray-50/50 p-6 md:p-10 flex flex-col gap-6 overflow-y-auto select-none">
            {/* Image type toggle */}
            <div className="absolute top-4 right-4 z-10 flex flex-wrap gap-2 md:top-6 md:right-6">
              {/* Front/Back Toggle */}
              {backImage && (
                <div className="flex gap-1 rounded-lg bg-white/95 p-1 shadow-md backdrop-blur-sm">
                  <Button
                    variant={viewType === 'front' ? 'default' : 'ghost'}
                    size="sm"
                    className={viewType === 'front' ? 'bg-blue-600 hover:bg-blue-700 h-7 text-xs px-2.5 font-bold text-white' : 'h-7 text-xs px-2.5 text-gray-600'}
                    onClick={() => { setViewType('front'); setSelectedThumbnail(null); }}
                  >
                    Front
                  </Button>
                  <Button
                    variant={viewType === 'back' ? 'default' : 'ghost'}
                    size="sm"
                    className={viewType === 'back' ? 'bg-blue-600 hover:bg-blue-700 h-7 text-xs px-2.5 font-bold text-white' : 'h-7 text-xs px-2.5 text-gray-600'}
                    onClick={() => { setViewType('back'); setSelectedThumbnail(null); }}
                  >
                    Back
                  </Button>
                  {maleImage && (
                    <Button
                      variant={viewType === 'male' ? 'default' : 'ghost'}
                      size="sm"
                      className={viewType === 'male' ? 'bg-blue-600 hover:bg-blue-700 h-7 text-xs px-2.5 font-bold text-white' : 'h-7 text-xs px-2.5 text-gray-600'}
                      onClick={() => { setViewType('male'); setSelectedThumbnail(null); }}
                    >
                      Male
                    </Button>
                  )}
                  {femaleImage && (
                    <Button
                      variant={viewType === 'female' ? 'default' : 'ghost'}
                      size="sm"
                      className={viewType === 'female' ? 'bg-blue-600 hover:bg-blue-700 h-7 text-xs px-2.5 font-bold text-white' : 'h-7 text-xs px-2.5 text-gray-600'}
                      onClick={() => { setViewType('female'); setSelectedThumbnail(null); }}
                    >
                      Female
                    </Button>
                  )}
                </div>
              )}
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={viewType}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.25 }}
                className="relative flex-1 min-h-[300px] w-full overflow-hidden rounded-3xl bg-white border border-gray-100 flex items-center justify-center p-6 shadow-sm"
              >
                <img
                  src={getDisplayUrl(currentMainImage)}
                  alt={`${product.title} - ${viewType}`}
                  className="h-full w-full object-contain transition-all duration-300"
                />
              </motion.div>
            </AnimatePresence>

            {/* Thumbnail strip */}
            {product.images.length > 1 && (
              <div className="flex flex-wrap justify-center gap-3">
                {product.images.map((img) => {
                  const isSelected = selectedThumbnail ? selectedThumbnail === img.url : currentMainImage === img.url;
                  
                  return (
                    <button
                      key={img.id}
                      onClick={() => {
                        setSelectedThumbnail(img.url);
                        if (img.type === 'front' || img.type === 'back' || img.type === 'male' || img.type === 'female') {
                          setViewType(img.type);
                        }
                        // Try to auto-select color from the clicked thumbnail image url color parameter or path
                        try {
                          let imgColor: string | null = null;
                          try {
                            const urlObj = new URL(img.url);
                            imgColor = urlObj.searchParams.get('color');
                          } catch {}
                          
                          if (!imgColor) {
                            const lowercaseUrl = img.url.toLowerCase();
                            const matchedColor = colors.find(c => {
                              const cleanName = c.split('|')[0].toLowerCase();
                              return lowercaseUrl.includes(cleanName);
                            });
                            if (matchedColor) {
                              setSelectedColor(matchedColor);
                            }
                          } else {
                            const matchedColor = colors.find(c => c.split('|')[0].toLowerCase() === imgColor?.toLowerCase());
                            if (matchedColor) {
                              setSelectedColor(matchedColor);
                            }
                          }
                        } catch (err) {
                          console.error("Failed to sync color from thumbnail selection:", err);
                        }
                      }}
                      className={`h-16 w-16 md:h-20 md:w-20 flex-shrink-0 overflow-hidden rounded-xl border-2 transition-all bg-white ${
                        isSelected ? 'border-blue-600 shadow-md ring-2 ring-blue-600 ring-offset-1' : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                      }`}
                    >
                      <img src={getDisplayUrl(img.url)} alt="" className="h-full w-full object-contain p-1" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Info Section */}
          <div className="flex flex-col p-6 md:p-8 h-full overflow-y-auto">
            <div className="mb-1 flex items-start justify-between">
              <div>
                <Badge variant="secondary" className="mb-2 bg-blue-50 text-blue-700 text-xs">
                  {product.category?.name}
                </Badge>
                <h2 className="text-2xl font-bold text-gray-900">{product.title}</h2>
              </div>
            </div>

            {/* Price */}
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-gray-900">
                ${product.price.toFixed(2)} USD
              </span>
              {product.compareAt && (
                <span className="text-base text-gray-400 line-through">
                  ${product.compareAt.toFixed(2)} USD
                </span>
              )}
              {product.compareAt && (
                <Badge className="bg-red-500 text-white text-xs">
                  {Math.round((1 - product.price / product.compareAt) * 100)}% OFF
                </Badge>
              )}
            </div>

            {/* Color Selection */}
            <div className="mt-6">
              <label className="text-sm font-semibold text-gray-700">
                Color: <span className="font-normal text-gray-500">{getDisplayColor(selectedColor).name}</span>
              </label>
              <div className="mt-2 flex flex-wrap gap-2">
                {colors.map((color) => {
                  const displayColor = getDisplayColor(color);
                  return (
                    <button
                      key={color}
                      onClick={() => handleColorChange(color)}
                      className={`flex items-center gap-2 rounded-lg border-2 px-3 py-2 text-sm transition-all ${
                        selectedColor === color
                          ? 'border-blue-600 bg-blue-50 text-blue-700'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <span
                        className="h-4 w-4 rounded-full border border-gray-200"
                        style={{ backgroundColor: displayColor.hex }}
                      />
                      {displayColor.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Size Selection */}
            <div className="mt-5">
              <label className="text-sm font-semibold text-gray-700">Size</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {sizes.map((size) => {
                  const variant = product.variants.find((v) => v.color === selectedColor && v.size === size);
                  const outOfStock = (variant?.stock ?? 0) === 0;
                  return (
                    <button
                      key={size}
                      onClick={() => !outOfStock && setSelectedSize(size)}
                      disabled={outOfStock}
                      className={`rounded-lg border-2 px-4 py-2 text-sm font-medium transition-all ${
                        outOfStock
                          ? 'cursor-not-allowed border-gray-100 bg-gray-50 text-gray-300'
                          : selectedSize === size
                          ? 'border-blue-600 bg-blue-50 text-blue-700'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Stock info */}
            {selectedSize && (
              <p className="mt-2 text-xs text-gray-500">
                {stockAvailable > 0 ? (
                  <span className="text-blue-600">{stockAvailable} in stock</span>
                ) : (
                  <span className="text-red-500">Out of stock</span>
                )}
              </p>
            )}

            {/* Quantity */}
            <div className="mt-5">
              <label className="text-sm font-semibold text-gray-700">Quantity</label>
              <div className="mt-2 flex items-center gap-3">
                <div className="flex items-center rounded-lg border border-gray-200">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="h-10 w-10 rounded-none"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-10 text-center text-sm font-semibold">{quantity}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setQuantity(Math.min(stockAvailable, quantity + 1))}
                    className="h-10 w-10 rounded-none"
                    disabled={quantity >= stockAvailable}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Add to Cart */}
            <Button
              onClick={handleAddToCart}
              disabled={isAdding || stockAvailable === 0}
              className="mt-6 h-12 bg-blue-600 text-base font-semibold hover:bg-blue-700 disabled:opacity-50 text-white"
              size="lg"
            >
              {isAdding ? (
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Adding...
                </span>
              ) : stockAvailable === 0 ? (
                'Out of Stock'
              ) : (
                <>
                  <ShoppingBag className="mr-2 h-5 w-5" />
                  Add to Cart
                </>
              )}
            </Button>

            {/* Description */}
            <div className="mt-6 flex-1">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Description</h3>
              <p className="mt-4 text-sm text-gray-500 whitespace-pre-wrap prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: product.description }} />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function getColorHex(color: string): string {
  const map: Record<string, string> = {
    Black: '#1a1a1a',
    Navy: '#1e3a5f',
    'Forest Green': '#2d5a27',
    White: '#f5f5f5',
    Charcoal: '#36454f',
    Default: '#e5e7eb',
  };
  return map[color] || '#9ca3af';
}
