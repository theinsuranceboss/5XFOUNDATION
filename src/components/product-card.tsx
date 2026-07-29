'use client';

import { useState } from 'react';
import { Product } from '@/lib/store';
import { motion } from 'framer-motion';
import { getDisplayUrl } from '@/lib/utils';

interface ProductCardProps {
  product: Product;
  onClick: (product: Product) => void;
}

export function ProductCard({ product, onClick }: ProductCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const rawFront = product.images.find((img) => img.type === 'front')?.url || product.images[0]?.url;
  const rawBack = product.images.find((img) => img.type === 'back')?.url || rawFront;

  const frontImage = getDisplayUrl(rawFront);
  const backImage = getDisplayUrl(rawBack);

  const minPrice = product.compareAt ? `From $${product.price.toFixed(2)} USD` : `$${product.price.toFixed(2)} USD`;

  return (
    <motion.div
      className="group cursor-pointer"
      onClick={() => onClick(product)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
    >
      {/* Image Container with Flip Effect */}
      <div className="product-card-shadow relative aspect-square overflow-hidden rounded-xl bg-gray-50 border border-gray-100">
        {/* Front Image */}
        <motion.img
          src={frontImage}
          alt={`${product.title} - Front`}
          className="absolute inset-0 h-full w-full object-cover"
          animate={{
            opacity: isHovered && backImage !== frontImage ? 0 : 1,
            scale: isHovered ? 1.05 : 1,
          }}
          transition={{ duration: 0.4, ease: 'easeInOut' }}
        />
        {/* Back Image */}
        {backImage !== frontImage && (
          <motion.img
            src={backImage}
            alt={`${product.title} - Back`}
            className="absolute inset-0 h-full w-full object-cover"
            animate={{
              opacity: isHovered ? 1 : 0,
              scale: isHovered ? 1.05 : 1.05,
            }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
          />
        )}
        {/* Hover indicator */}
        {backImage !== frontImage && (
          <motion.div
            className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm"
            animate={{ opacity: isHovered ? 1 : 0, y: isHovered ? 0 : 8 }}
            transition={{ duration: 0.2 }}
          >
            View Back
          </motion.div>
        )}
        {/* Sale badge */}
        {product.compareAt && (
          <div className="absolute left-3 top-3 rounded-md bg-red-500 px-2 py-0.5 text-xs font-semibold text-white">
            Sale
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="mt-3 space-y-1 px-1">
        <h3 className="text-sm font-semibold text-gray-900 line-clamp-1 group-hover:text-blue-700 transition-colors">
          {product.title}
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-gray-900">
            {minPrice}
          </span>
          {product.compareAt && (
            <span className="text-xs text-gray-400 line-through">
              ${product.compareAt.toFixed(2)} USD
            </span>
          )}
        </div>
        {/* Color dots */}
        <div className="flex items-center gap-1 pt-1">
          {[...new Set(product.variants.map((v) => v.color))].map((color) => {
            const displayColor = getDisplayColor(color);
            return (
              <span
                key={color}
                className="h-3 w-3 rounded-full border border-gray-200"
                style={{ backgroundColor: displayColor.hex }}
                title={displayColor.name}
              />
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

export function getDisplayColor(color: string) {
  const parts = color.split('|');
  const name = parts[0] || 'Default';
  const hex = parts[1] || getColorHex(name);
  return { name, hex };
}

function getColorHex(color: string): string {
  if (color.startsWith('#')) return color;
  const map: Record<string, string> = {
    Black: '#1a1a1a',
    Navy: '#1e3a5f',
    'Forest Green': '#2d5a27',
    White: '#ffffff',
    Charcoal: '#36454f',
    Default: '#e5e7eb',
  };
  return map[color] || '#9ca3af';
}
