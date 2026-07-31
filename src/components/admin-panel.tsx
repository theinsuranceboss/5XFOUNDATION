'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useStore, Product, Category, PaymentConfig } from '@/lib/store';
import { getDisplayUrl } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Plus,
  Pencil,
  Trash2,
  Package,
  Tag,
  CreditCard,
  Save,
  X,
  GripVertical,
  ImagePlus,
  Upload,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Calendar,
  DollarSign,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Percent,
  RefreshCw,
  Eye,
  Copy,
  Link as LinkIcon,
} from 'lucide-react';
import { toast } from 'sonner';

function parseCSV(text: string) {
  let row = [''];
  const rows = [row];
  let i = 0;
  let inQuotes = false;
  
  for (let charIndex = 0; charIndex < text.length; charIndex++) {
    let char = text[charIndex];
    let nextChar = text[charIndex + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        row[i] += '"';
        charIndex++; // skip the escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row[++i] = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        charIndex++; // skip \n
      }
      row = [''];
      rows.push(row);
      i = 0;
    } else {
      row[i] += char;
    }
  }

  const filteredRows = rows.filter(r => r.join('').trim() !== '');
  if (filteredRows.length === 0) return [];
  const headers = filteredRows[0].map(h => h.trim());
  const data = [];
  for (let j = 1; j < filteredRows.length; j++) {
    const r = filteredRows[j];
    const obj: any = {};
    headers.forEach((h, k) => {
      obj[h] = r[k] ? r[k].trim() : '';
    });
    data.push(obj);
  }
  return data;
}

export function AdminPanel() {
  const { products, categories, paymentConfigs, setProducts, setCategories, setPaymentConfigs } = useStore();

  const refreshData = useCallback(async () => {
    const [productsRes, categoriesRes, paymentRes] = await Promise.all([
      fetch('/api/products'),
      fetch('/api/categories'),
      fetch('/api/admin/payment-config'),
    ]);
    if (productsRes.ok) setProducts(await productsRes.json());
    if (categoriesRes.ok) setCategories(await categoriesRes.json());
    if (paymentRes.ok) setPaymentConfigs(await paymentRes.json());
  }, [setProducts, setCategories, setPaymentConfigs]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
          <p className="text-sm text-gray-500">Manage your store products, categories, and payments</p>
        </div>
        <Badge variant="secondary" className="bg-blue-50 text-blue-700">
          {products.length} Products
        </Badge>
      </div>

      <Tabs defaultValue="inventory" className="space-y-4">
        <TabsList className="bg-gray-100">
          <TabsTrigger value="inventory" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            <Package className="mr-1.5 h-4 w-4" />
            Inventory
          </TabsTrigger>
          <TabsTrigger value="sales" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            <BarChart3 className="mr-1.5 h-4 w-4" />
            Sales Dashboard
          </TabsTrigger>
          <TabsTrigger value="categories" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            <Tag className="mr-1.5 h-4 w-4" />
            Categories
          </TabsTrigger>
          <TabsTrigger value="payments" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            <CreditCard className="mr-1.5 h-4 w-4" />
            Payments
          </TabsTrigger>
          <TabsTrigger value="storefront" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            <ImagePlus className="mr-1.5 h-4 w-4" />
            Storefront
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inventory">
          <InventoryTab products={products} categories={categories} onRefresh={refreshData} />
        </TabsContent>
        <TabsContent value="sales">
          <SalesTab />
        </TabsContent>
        <TabsContent value="categories">
          <CategoriesTab categories={categories} onRefresh={refreshData} />
        </TabsContent>
        <TabsContent value="payments">
          <PaymentsTab configs={paymentConfigs} onRefresh={refreshData} />
        </TabsContent>
        <TabsContent value="storefront">
          <StorefrontTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ========================================
   INVENTORY TAB
   ======================================== */
function InventoryTab({
  products,
  categories,
  onRefresh,
}: {
  products: Product[];
  categories: Category[];
  onRefresh: () => Promise<void>;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    price: '',
    compareAt: '',
    categoryId: '',
  });
  const [imageInputs, setImageInputs] = useState<{ url: string; type: string; order: number }[]>([
    { url: '', type: 'front', order: 0 },
  ]);
  const [variantInputs, setVariantInputs] = useState<{ color: string; size: string; stock: number; sku: string }[]>([
    { color: '', size: 'S', stock: 0, sku: '' },
  ]);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const [selectedAdminCategory, setSelectedAdminCategory] = useState('all');

  const filteredProductsList = selectedAdminCategory === 'all'
    ? products
    : products.filter((p) => p.category?.slug === selectedAdminCategory);

  const resetForm = () => {
    setForm({ title: '', description: '', price: '', compareAt: '', categoryId: '' });
    setImageInputs([{ url: '', type: 'front', order: 0 }]);
    setVariantInputs([{ color: '', size: 'S', stock: 0, sku: '' }]);
    setEditingProduct(null);
    setIsEditing(false);
  };

  const openForEdit = (product: Product) => {
    setEditingProduct(product);
    setForm({
      title: product.title,
      description: product.description,
      price: String(product.price),
      compareAt: product.compareAt ? String(product.compareAt) : '',
      categoryId: product.categoryId,
    });
    setImageInputs(
      product.images.length > 0
        ? product.images.map((img) => ({ url: img.url, type: img.type, order: img.order }))
        : [{ url: '', type: 'front', order: 0 }]
    );
    setVariantInputs(
      product.variants.length > 0
        ? product.variants.map((v) => ({ color: v.color, size: v.size, stock: v.stock, sku: v.sku || '' }))
        : [{ color: '', size: 'S', stock: 0, sku: '' }]
    );
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.price || !form.categoryId) {
      toast.error('Title, price, and category are required');
      return;
    }
    setIsSaving(true);
    try {
      const body = {
        ...form,
        id: editingProduct?.id,
        images: imageInputs.filter((i) => i.url),
        variants: variantInputs.filter((v) => v.color),
      };
      const res = await fetch('/api/admin/products', {
        method: editingProduct ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        toast.success(editingProduct ? 'Product updated!' : 'Product created!');
        resetForm();
        await onRefresh();
      } else {
        toast.error('Failed to save product');
      }
    } catch {
      toast.error('Failed to save product');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this product?')) return;
    try {
      const res = await fetch(`/api/admin/products?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Product deleted');
        await onRefresh();
      }
    } catch {
      toast.error('Failed to delete product');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedProductIds.size === 0) return;
    if (!confirm(`Delete ${selectedProductIds.size} products?`)) return;
    setIsSaving(true);
    let deletedCount = 0;
    for (const id of Array.from(selectedProductIds)) {
      try {
        const res = await fetch(`/api/admin/products?id=${id}`, { method: 'DELETE' });
        if (res.ok) deletedCount++;
      } catch (e) {
        console.error('Failed to delete product', id, e);
      }
    }
    setIsSaving(false);
    toast.success(`Deleted ${deletedCount} products`);
    setSelectedProductIds(new Set());
    await onRefresh();
  };

  const handleDuplicate = async (product: Product) => {
    setIsSaving(true);
    toast.info('Duplicating product...');
    try {
      const body = {
        title: `${product.title} (Copy)`,
        description: product.description,
        price: product.price,
        compareAt: product.compareAt,
        categoryId: product.categoryId,
        images: product.images.map((img) => ({
          url: img.url,
          type: img.type,
          order: img.order,
        })),
        variants: product.variants.map((v) => ({
          color: v.color,
          size: v.size,
          stock: v.stock,
          sku: v.sku ? `${v.sku}_copy` : '',
        })),
      };
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        toast.success('Product duplicated successfully!');
        await onRefresh();
      } else {
        const err = await res.json();
        toast.error(`Failed to duplicate product: ${err.error || 'Unknown error'}`);
      }
    } catch (e: any) {
      toast.error(`Failed to duplicate product: ${e.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrintfulSync = async () => {
    setIsSaving(true);
    toast.info('Syncing from Printful... this may take a minute.');
    try {
      const res = await fetch('/api/admin/printful/sync', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        toast.success(`Sync complete! ${data.synced} products synced.`);
        await onRefresh();
      } else {
        const err = await res.json();
        toast.error(`Sync failed: ${err.error || 'Unknown error'}`);
      }
    } catch (e: any) {
      toast.error(`Sync failed: ${e.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteColorGroup = (color: string) => {
    if (confirm(`Delete all variants for color "${color.split('|')[0]}"?`)) {
      setVariantInputs(variantInputs.filter((v) => {
        let vColor = v.color;
        if (vColor && !vColor.includes('|')) {
          vColor = `${vColor}|#9ca3af`;
        }
        return vColor !== color;
      }));
    }
  };

  const handleAddSizeToGroup = (color: string) => {
    setVariantInputs([...variantInputs, { color, size: 'S', stock: 0, sku: '' }]);
  };

  const triggerUploadForIndex = (index: number) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      toast.info('Uploading image...');
      const formData = new FormData();
      formData.append('file', file);
      try {
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        const data = await res.json();
        if (data.url) {
          setImageInputs(prev => {
            const newImgs = [...prev];
            if (newImgs[index]) {
              let finalUrl = data.url;
              try {
                const oldUrl = newImgs[index].url;
                let colorVal = null;
                if (oldUrl) {
                  try {
                    const oldUrlObj = new URL(oldUrl);
                    colorVal = oldUrlObj.searchParams.get('color');
                  } catch {
                    const searchParams = new URLSearchParams(oldUrl.substring(oldUrl.indexOf('?')));
                    colorVal = searchParams.get('color');
                  }
                }
                if (colorVal) {
                  const finalUrlObj = new URL(finalUrl);
                  finalUrlObj.searchParams.set('color', colorVal);
                  finalUrl = finalUrlObj.toString();
                }
              } catch (err) {
                console.error("Error preserving query params:", err);
              }
              newImgs[index] = { ...newImgs[index], url: finalUrl };
            }
            return newImgs;
          });
          toast.success('Image uploaded successfully!');
        } else {
          toast.error('Failed to upload image.');
        }
      } catch (err) {
        toast.error('Failed to upload image.');
      }
    };
    input.click();
  };

  const handleUploadNewImage = async (defaultType: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      toast.info('Uploading image...');
      const formData = new FormData();
      formData.append('file', file);
      try {
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        const data = await res.json();
        if (data.url) {
          setImageInputs(prev => [...prev, { url: data.url, type: defaultType, order: prev.length }]);
          toast.success('Image uploaded successfully!');
        } else {
          toast.error(data.error || 'Failed to upload image.');
        }
      } catch (err) {
        toast.error('Failed to upload image.');
      }
    };
    input.click();
  };

  const handleAddGoogleDriveLink = async (defaultType: string) => {
    const inputUrl = prompt('Ingresa el enlace de Google Drive (Imagen o Carpeta) o URL directa:');
    if (!inputUrl || !inputUrl.trim()) return;
    toast.info('Procesando enlace de Google Drive...');
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gdriveUrl: inputUrl.trim() })
      });
      const data = await res.json();
      if (data.url) {
        setImageInputs(prev => [...prev, { url: data.url, type: defaultType, order: prev.length }]);
        toast.success('¡Imagen procesada y añadida!');
      } else if (data.images && Array.isArray(data.images)) {
        const newEntries = data.images.map((u: string, idx: number) => ({
          url: u,
          type: defaultType,
          order: imageInputs.length + idx
        }));
        setImageInputs(prev => [...prev, ...newEntries]);
        toast.success(`¡Se añadieron ${newEntries.length} imágenes de Google Drive!`);
      } else {
        toast.error(data.error || 'No se pudo procesar el enlace.');
      }
    } catch (err: any) {
      toast.error('Error al procesar el enlace.');
    }
  };

  const handleDuplicateImage = (idx: number) => {
    const imgToDup = imageInputs[idx];
    if (!imgToDup) return;
    const newImgs = [...imageInputs];
    newImgs.splice(idx + 1, 0, {
      ...imgToDup,
    });
    const updated = newImgs.map((img, i) => ({ ...img, order: i }));
    setImageInputs(updated);
    toast.success('Image duplicated!');
  };

  const handleMoveImage = (originalIndex: number, direction: 'left' | 'right') => {
    const currentImg = imageInputs[originalIndex];
    if (!currentImg) return;

    const isProdImg = ['front', 'back', 'gallery'].includes(currentImg.type);

    const sameGroupIndices = imageInputs
      .map((img, idx) => ({ img, idx }))
      .filter(item => {
        const isItemProd = ['front', 'back', 'gallery'].includes(item.img.type);
        return isItemProd === isProdImg;
      });

    const groupIdx = sameGroupIndices.findIndex(item => item.idx === originalIndex);
    if (groupIdx === -1) return;

    const targetGroupIdx = direction === 'left' ? groupIdx - 1 : groupIdx + 1;
    if (targetGroupIdx < 0 || targetGroupIdx >= sameGroupIndices.length) return;

    const targetOriginalIndex = sameGroupIndices[targetGroupIdx].idx;

    const newImgs = [...imageInputs];
    const temp = newImgs[originalIndex];
    newImgs[originalIndex] = newImgs[targetOriginalIndex];
    newImgs[targetOriginalIndex] = temp;

    const updated = newImgs.map((img, i) => ({ ...img, order: i }));
    setImageInputs(updated);
  };

  const renderImageCard = (img: { url: string; type: string; originalIndex: number }) => {
    const idx = img.originalIndex;
    const isProdImg = ['front', 'back', 'gallery'].includes(img.type);
    const sameGroupIndices = imageInputs
      .map((item, index) => ({ item, index }))
      .filter(x => ['front', 'back', 'gallery'].includes(x.item.type) === isProdImg);
    const groupIdx = sameGroupIndices.findIndex(x => x.index === idx);
    const isFirst = groupIdx === 0;
    const isLast = groupIdx === sameGroupIndices.length - 1;

    return (
      <Card key={idx} className="p-3 border border-gray-200 bg-white shadow-sm hover:shadow-md transition-all">
        <div className="flex gap-3">
          {/* Thumbnail preview */}
          <div 
            onClick={() => triggerUploadForIndex(idx)}
            className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-gray-100 border border-gray-200 flex-shrink-0 relative overflow-hidden flex items-center justify-center p-1 group cursor-pointer"
          >
            {img.url ? (
              <>
                <img src={getDisplayUrl(img.url)} alt="" className="h-full w-full object-contain transition-transform group-hover:scale-105" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-semibold">
                  <Upload className="h-3.5 w-3.5 mr-1" />
                  Change
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center text-gray-400 gap-1 text-[10px]">
                <Upload className="h-4.5 w-4.5" />
                <span>Upload</span>
              </div>
            )}
          </div>

          {/* Info & Inputs */}
          <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
            <div className="flex items-center gap-2">
              <Select 
                value={img.type} 
                onValueChange={(v) => {
                  const newImgs = [...imageInputs];
                  newImgs[idx] = { ...newImgs[idx], type: v };
                  setImageInputs(newImgs);
                }}
              >
                <SelectTrigger className="h-8 w-28 text-xs font-semibold bg-white border-gray-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="front">Front</SelectItem>
                  <SelectItem value="back">Back</SelectItem>
                  <SelectItem value="male">Male Model</SelectItem>
                  <SelectItem value="female">Female Model</SelectItem>
                  <SelectItem value="model">Model</SelectItem>
                  <SelectItem value="gallery">Gallery</SelectItem>
                </SelectContent>
              </Select>

              {/* Interactive Color selector for this image card */}
              {(() => {
                const colors = [...new Set(variantInputs.map(v => v.color.split('|')[0]))].filter(Boolean);
                const activeColor = (() => {
                  try {
                    const urlObj = new URL(img.url);
                    return urlObj.searchParams.get('color') || 'none';
                  } catch {}
                  return 'none';
                })();
                return (
                  <Select 
                    value={activeColor} 
                    onValueChange={(c) => {
                      setImageInputs(prev => {
                        const newImgs = [...prev];
                        if (newImgs[idx]) {
                          let finalUrl = newImgs[idx].url;
                          if (finalUrl) {
                            try {
                              const urlObj = new URL(finalUrl);
                              if (c === 'none') {
                                urlObj.searchParams.delete('color');
                              } else {
                                urlObj.searchParams.set('color', c);
                              }
                              finalUrl = urlObj.toString();
                            } catch {}
                          }
                          newImgs[idx] = { ...newImgs[idx], url: finalUrl };
                        }
                        return newImgs;
                      });
                    }}
                  >
                    <SelectTrigger className="h-8 w-24 text-xs font-semibold bg-white border-gray-200">
                      <SelectValue placeholder="No Color" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Color</SelectItem>
                      {colors.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                );
              })()}

              <div className="flex-1" />

              {/* Reordering Controls & Duplicate */}
              <div className="flex items-center gap-0.5 border border-gray-150 rounded-lg p-0.5 bg-gray-50/50">
                <Button
                  variant="ghost"
                  type="button"
                  size="sm"
                  className="h-7 w-7 p-0 text-gray-500 hover:text-blue-600 hover:bg-white rounded-md transition-colors"
                  disabled={isFirst}
                  onClick={() => handleMoveImage(idx, 'left')}
                  title="Move Left"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  type="button"
                  size="sm"
                  className="h-7 w-7 p-0 text-gray-500 hover:text-blue-600 hover:bg-white rounded-md transition-colors"
                  disabled={isLast}
                  onClick={() => handleMoveImage(idx, 'right')}
                  title="Move Right"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  type="button"
                  size="sm"
                  className="h-7 w-7 p-0 text-gray-500 hover:text-blue-600 hover:bg-white rounded-md transition-colors"
                  onClick={() => handleDuplicateImage(idx)}
                  title="Duplicate Image"
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>

              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                onClick={() => {
                  setImageInputs(imageInputs.filter((_, i) => i !== idx));
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="relative">
              <Input
                value={img.url}
                onChange={(e) => {
                  const val = e.target.value;
                  const newImgs = [...imageInputs];
                  const transformed = getDisplayUrl(val);
                  newImgs[idx] = { ...newImgs[idx], url: transformed || val };
                  setImageInputs(newImgs);
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
                      if (data.url) {
                        const newImgs = [...imageInputs];
                        newImgs[idx] = { ...newImgs[idx], url: data.url };
                        setImageInputs([...newImgs]);
                        toast.success('¡Enlace de Google Drive procesado!');
                      }
                    } catch (_) {}
                  }
                }}
                placeholder="https://example.com/image.png o enlace de Google Drive"
                className="h-8 text-xs bg-white border-gray-200 pr-7 font-mono truncate"
              />
              {img.url && (
                <a 
                  href={getDisplayUrl(img.url)} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600 transition-colors"
                  title="View image in new tab"
                >
                  <Eye className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          </div>
        </div>
      </Card>
    );
  };

  const filteredCategories = categories.filter((c) => c.slug !== 'all');

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (filteredCategories.length === 0) {
      toast.error('Please create a category first before importing products.');
      e.target.value = '';
      return;
    }

    setIsSaving(true);
    toast.info('Parsing CSV...');

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const data = parseCSV(text);
        
        // Group by product name or handle
        const productsMap = new Map<string, any>();
        let lastId = '';
        let optionNames: string[] = ['', '', ''];
        
        data.forEach((row) => {
          const rawId = row['Handle'] || row['Sync product name'] || row['Product Name'] || row['Name'] || row['Title'];
          if (rawId && rawId !== lastId) {
            lastId = rawId;
            optionNames = [
              String(row['Option1 Name'] || '').toLowerCase(),
              String(row['Option2 Name'] || '').toLowerCase(),
              String(row['Option3 Name'] || '').toLowerCase()
            ];
          }
          const id = lastId;
          
          if (!id) return;
          
          if (!productsMap.has(id)) {
            let priceStr = String(row['Variant Price'] || row['Retail price'] || row['Retail Price'] || row['Price'] || '0');
            priceStr = priceStr.replace(/[^0-9.]/g, ''); // Remove $, €, etc.
            let priceVal = parseFloat(priceStr);
            if (isNaN(priceVal) || priceVal <= 0) priceVal = 0.01; // Avoid failing backend !price check

            const productTitle = row['Title'] || row['Product Name'] || row['Name'] || id;
            productsMap.set(id, {
              title: productTitle,
              description: row['Body (HTML)'] || row['Description'] || 'Imported from CSV.',
              price: priceVal,
              categoryId: filteredCategories[0].id,
              images: [],
              variants: [],
            });
          }
          
          const p = productsMap.get(id);

          // If price was set to 0.01, try to find a real price on variant rows
          if (p.price === 0.01) {
            let priceStr = String(row['Variant Price'] || row['Retail price'] || row['Retail Price'] || row['Price'] || '0');
            priceStr = priceStr.replace(/[^0-9.]/g, ''); 
            let priceVal = parseFloat(priceStr);
            if (!isNaN(priceVal) && priceVal > 0) p.price = priceVal;
          }
          
          // Image
          let imgUrl = row['Image Src'] || row['Variant Image'] || row['Image URL'] || row['File URL'] || row['Image'] || row['Mockup image URL'] || row['Product image URL'];
          
          if (!imgUrl) {
            // Fallback: search any column value that looks like an image URL
            const values = Object.values(row) as string[];
            const foundImg = values.find(v => typeof v === 'string' && v.startsWith('http') && (v.toLowerCase().includes('.jpg') || v.toLowerCase().includes('.png') || v.toLowerCase().includes('.jpeg') || v.toLowerCase().includes('.webp')));
            if (foundImg) imgUrl = foundImg.trim();
          }

          if (imgUrl && !p.images.find((i: any) => i.url === imgUrl)) {
            p.images.push({ url: imgUrl, type: p.images.length === 0 ? 'front' : 'gallery', order: p.images.length });
          }
          
          // Variant
          const sku = row['Variant SKU'] || row['SKU'];
          let finalColor = 'Default';
          let finalSize = 'One Size';
          
          // Check Shopify options using cached option names
          for(let i=1; i<=3; i++) {
             const optName = optionNames[i-1] || String(row[`Option${i} Name`] || '').toLowerCase();
             const optVal = row[`Option${i} Value`];
             if (optName.includes('color') && optVal) finalColor = optVal;
             if (optName.includes('size') && optVal) finalSize = optVal;
          }

          // Fallbacks for Printful format
          if (finalColor === 'Default' && row['Color']) finalColor = row['Color'];
          if (finalSize === 'One Size' && row['Size']) finalSize = row['Size'];

          if (finalColor === 'Default' && row['Variant name']) {
            const parts = row['Variant name'].split(' - ');
            if (parts.length > 1) {
              const attrs = parts[1].split(' / ');
              if (attrs.length > 0) finalColor = attrs[0];
              if (attrs.length > 1) finalSize = attrs[1];
            }
          }
          
          // Skip row if there's no sku and no Shopify options (it's likely just an image row)
          if (!sku && !row['Option1 Value'] && !row['Variant name']) {
             return;
          }

          const stock = parseInt(row['Variant Inventory Qty'] || row['Stock'] || row['Quantity']) || 999;
          const variantColorStr = `${finalColor.trim()}|#9ca3af`;
          
          if (sku && !p.variants.find((v: any) => v.sku === sku)) {
             p.variants.push({ color: variantColorStr, size: finalSize.trim(), stock, sku });
          }
        });

        let successCount = 0;
        let failCount = 0;

        for (const p of Array.from(productsMap.values())) {
          try {
            const res = await fetch('/api/admin/products', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(p),
            });
            if (res.ok) {
              successCount++;
            } else {
              const err = await res.json();
              console.error('Failed to add product:', p.title, err);
              failCount++;
            }
          } catch (e) {
            console.error(e);
            failCount++;
          }
        }

        setIsSaving(false);
        if (e.target && 'value' in e.target) {
           (e.target as any).value = ''; // Reset input
        }
        toast.success(`Import complete! ${successCount} added, ${failCount} failed.`);
        await onRefresh();
      } catch (error: any) {
        setIsSaving(false);
        toast.error('Failed to parse CSV: ' + error.message);
      }
    };
    reader.onerror = () => {
      setIsSaving(false);
      toast.error('Failed to read file');
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Product Inventory</h2>
        <div className="flex items-center gap-2">
          {products.length > 0 && (
            <label className="flex items-center gap-2 mr-2 text-sm text-gray-600 cursor-pointer">
              <input 
                type="checkbox" 
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                checked={selectedProductIds.size === products.length}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedProductIds(new Set(products.map(p => p.id)));
                  } else {
                    setSelectedProductIds(new Set());
                  }
                }}
              />
              Select All
            </label>
          )}
          {selectedProductIds.size > 0 && (
            <Button onClick={handleBulkDelete} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700 text-white">
              <Trash2 className="mr-1.5 h-4 w-4" />
              Delete {selectedProductIds.size}
            </Button>
          )}
          
          <Button 
            onClick={handlePrintfulSync} 
            disabled={isSaving} 
            className="bg-black hover:bg-gray-800 text-white font-semibold"
          >
            <Upload className="mr-1.5 h-4 w-4 text-red-500" />
            Auto-Sync Printful
          </Button>

          <input type="file" accept=".csv" id="csv-upload" className="hidden" onChange={handleCSVUpload} />
          <Button variant="outline" onClick={() => document.getElementById('csv-upload')?.click()} disabled={isSaving} className="text-blue-600 border-blue-200 hover:bg-blue-50 hover:text-blue-700 hidden">
            <Upload className="mr-1.5 h-4 w-4" />
            Import CSV
          </Button>
          <Button onClick={() => { resetForm(); setIsEditing(true); }} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="mr-1.5 h-4 w-4" />
            Add Product
          </Button>
        </div>
      </div>      {/* Category Filter Buttons */}
      <div className="flex flex-wrap items-center gap-2 bg-gray-50/50 p-3 rounded-2xl border border-gray-150 shadow-sm">
        <Button
          variant={selectedAdminCategory === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedAdminCategory('all')}
          className={selectedAdminCategory === 'all' ? 'bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-8 px-3 rounded-lg shadow-sm' : 'hover:border-blue-300 hover:text-blue-700 text-gray-600 bg-white text-xs h-8 px-3 rounded-lg border-gray-200'}
        >
          All Products
        </Button>
        {categories.filter((c) => c.slug !== 'all').map((cat) => (
          <Button
            key={cat.id}
            variant={selectedAdminCategory === cat.slug ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedAdminCategory(cat.slug)}
            className={selectedAdminCategory === cat.slug ? 'bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-8 px-3 rounded-lg shadow-sm' : 'hover:border-blue-300 hover:text-blue-700 text-gray-600 bg-white text-xs h-8 px-3 rounded-lg border-gray-200'}
          >
            {cat.name}
          </Button>
        ))}
        <div className="flex-1 font-mono text-[10px] font-black uppercase text-gray-400 tracking-wider text-right pr-2">
          {filteredProductsList.length} Items
        </div>
      </div>      {/* Visual Product Card Grid */}
      {(() => {
        // Group products by category
        const groupedProducts: { categoryId: string; categoryName: string; categorySlug: string; products: Product[] }[] = [];
        const activeCats = categories.filter((c) => c.slug !== 'all');
        
        activeCats.forEach((cat) => {
          const catProducts = filteredProductsList.filter((p) => p.categoryId === cat.id);
          if (catProducts.length > 0) {
            groupedProducts.push({
              categoryId: cat.id,
              categoryName: cat.name,
              categorySlug: cat.slug,
              products: catProducts,
            });
          }
        });

        const uncategorizedProducts = filteredProductsList.filter(
          (p) => !p.categoryId || !categories.some((c) => c.id === p.categoryId)
        );
        if (uncategorizedProducts.length > 0) {
          groupedProducts.push({
            categoryId: 'uncategorized',
            categoryName: 'Uncategorized',
            categorySlug: 'uncategorized',
            products: uncategorizedProducts,
          });
        }

        if (filteredProductsList.length === 0) {
          return (
            <div className="flex flex-col items-center justify-center py-20 border border-dashed border-gray-200 rounded-3xl bg-gray-50/30 text-gray-400 gap-2 shadow-inner">
              <Package className="h-10 w-10 text-gray-300" />
              <p className="text-sm font-semibold">No products found in this category.</p>
              <p className="text-xs">Add a new product or trigger sync to retrieve catalog items.</p>
            </div>
          );
        }

        return (
          <div className="space-y-12">
            {groupedProducts.map((group) => (
              <div key={group.categoryId} className="space-y-6">
                {/* Category Header */}
                <div className="flex items-center gap-3 pb-2 border-b border-gray-150">
                  <h3 className="text-lg font-black italic tracking-tight uppercase text-black">
                    {group.categoryName}
                  </h3>
                  <Badge variant="secondary" className="bg-blue-50 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full border border-blue-100">
                    {group.products.length} {group.products.length === 1 ? 'Item' : 'Items'}
                  </Badge>
                </div>

                {/* Products Grid */}
                <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
                  {group.products.map((product) => {
                    const frontImage = getDisplayUrl(product.images.find((img) => img.type === 'front')?.url || product.images[0]?.url);
                    const backImage = getDisplayUrl(product.images.find((img) => img.type === 'back')?.url || frontImage);
                    const isSelected = selectedProductIds.has(product.id);

                    return (
                      <motion.div
                        key={product.id}
                        className={`group relative flex flex-col justify-between h-full bg-transparent p-1.5 transition-all duration-200 rounded-2xl ${
                          isSelected ? 'ring-2 ring-blue-500 bg-blue-50/5' : 'hover:-translate-y-1'
                        }`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <div>
                          {/* Image Container with Flip Effect */}
                          <div className="relative aspect-square overflow-hidden rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center p-3">
                            {/* Checkbox selector */}
                            <input 
                              type="checkbox" 
                              className="absolute top-3 left-3 z-20 w-5 h-5 cursor-pointer rounded border-gray-300 text-blue-600 bg-white/95 focus:ring-blue-500 shadow-sm border-2" 
                              checked={isSelected}
                              onChange={(e) => {
                                const newSet = new Set(selectedProductIds);
                                if (e.target.checked) newSet.add(product.id);
                                else newSet.delete(product.id);
                                setSelectedProductIds(newSet);
                              }}
                            />

                            {/* Category Badge overlay */}
                            {product.category && (
                              <Badge variant="secondary" className="absolute top-3 right-3 z-20 bg-white/90 hover:bg-white text-gray-800 text-[9px] font-bold py-0.5 px-2 shadow-sm uppercase tracking-wider backdrop-blur-sm border border-gray-150">
                                {product.category.name}
                              </Badge>
                            )}

                            {/* Front Image */}
                            {frontImage ? (
                              <>
                                <img 
                                  src={frontImage} 
                                  alt="" 
                                  className={`w-full h-full object-contain transition-all duration-500 ${
                                    backImage && backImage !== frontImage ? 'group-hover:opacity-0 group-hover:scale-105' : 'group-hover:scale-105'
                                  }`} 
                                />
                                {backImage && backImage !== frontImage && (
                                  <img 
                                    src={backImage} 
                                    alt="" 
                                    className="absolute inset-0 w-full h-full object-contain p-3 opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" 
                                  />
                                )}
                              </>
                            ) : (
                              <Package className="h-10 w-10 text-gray-300" />
                            )}
                          </div>

                          {/* Product Info (matches storefront ProductCard layout) */}
                          <div className="mt-3 space-y-1 px-1">
                            <h3 className="text-sm font-semibold text-gray-900 line-clamp-1 group-hover:text-blue-700 transition-colors" title={product.title}>
                              {product.title}
                            </h3>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-gray-900">
                                ${product.price.toFixed(2)} USD
                              </span>
                              {product.compareAt && (
                                <span className="text-xs text-gray-400 line-through">
                                  ${product.compareAt.toFixed(2)} USD
                                </span>
                              )}
                            </div>
                            {/* Color dots */}
                            <div className="flex items-center gap-1 pt-1">
                              {[...new Set(product.variants.map((v) => v.color))].slice(0, 5).map((color) => {
                                const parts = color.split('|');
                                const hex = parts[1] || '#9ca3af';
                                const name = parts[0] || '';
                                return (
                                  <span
                                    key={color}
                                    className="h-3 w-3 rounded-full border border-gray-200 shrink-0"
                                    style={{ backgroundColor: hex }}
                                    title={name}
                                  />
                                );
                              })}
                              {[...new Set(product.variants.map((v) => v.color))].length > 5 && (
                                <span className="text-[10px] font-bold text-gray-400 pl-0.5 shrink-0">
                                  +{[...new Set(product.variants.map((v) => v.color))].length - 5}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Actions row */}
                        <div className="flex gap-2 mt-3 pt-2.5 border-t border-gray-100 w-full">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => openForEdit(product)}
                            className="flex-1 text-xs h-8 font-bold border-blue-200 text-blue-600 hover:bg-blue-50 bg-white rounded-lg shadow-sm"
                          >
                            <Pencil className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleDuplicate(product)}
                            className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700 hover:bg-gray-50 border-gray-200 bg-white rounded-lg shadow-sm shrink-0"
                            title="Duplicate Product"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleDelete(product.id)}
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 border-red-200 bg-white rounded-lg shadow-sm shrink-0"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Edit/Create Dialog */}
      <Dialog open={isEditing} onOpenChange={(open) => !open && resetForm()}>
        <DialogContent 
          className="sm:max-w-5xl w-[95vw] h-[85vh] flex flex-col p-0 overflow-hidden bg-white shadow-2xl rounded-2xl border border-gray-200"
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader className="p-6 border-b border-gray-150 shrink-0">
            <DialogTitle className="text-xl font-bold text-gray-900">{editingProduct ? 'Edit Product' : 'New Product'}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="Product title"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredCategories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Product description"
                  rows={3}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Price (USD)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Compare at Price (optional)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.compareAt}
                    onChange={(e) => setForm({ ...form, compareAt: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Images & Models Visual Editor Tabs */}
            <div className="space-y-4">
              {(() => {
                const imagesWithIndex = imageInputs.map((img, index) => ({ ...img, originalIndex: index }));
                const productImages = imagesWithIndex.filter(img => ['front', 'back', 'gallery'].includes(img.type));
                const modelImages = imagesWithIndex.filter(img => !['front', 'back', 'gallery'].includes(img.type));

                return (
                  <Tabs defaultValue="images" className="w-full">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                      <TabsList className="bg-gray-100 p-1 rounded-xl w-full sm:w-auto grid grid-cols-2">
                        <TabsTrigger value="images" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white font-semibold text-xs px-4 py-2 rounded-lg">Product Images</TabsTrigger>
                        <TabsTrigger value="models" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white font-semibold text-xs px-4 py-2 rounded-lg">Models / Mockups</TabsTrigger>
                      </TabsList>

                      <div className="flex items-center gap-2">
                        <TabsContent value="images" className="m-0 flex flex-wrap items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs h-9 font-semibold bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                            onClick={() => handleUploadNewImage('front')}
                          >
                            <Upload className="mr-1.5 h-3.5 w-3.5 text-blue-600" />
                            Upload Front
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs h-9 font-semibold bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                            onClick={() => handleUploadNewImage('back')}
                          >
                            <Upload className="mr-1.5 h-3.5 w-3.5 text-purple-600" />
                            Upload Back Image
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs h-9 font-semibold bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                            onClick={() => handleAddGoogleDriveLink('back')}
                          >
                            <LinkIcon className="mr-1.5 h-3.5 w-3.5 text-green-600" />
                            Google Drive Link
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs h-9"
                            onClick={() => setImageInputs([...imageInputs, { url: '', type: 'gallery', order: imageInputs.length }])}
                          >
                            <ImagePlus className="mr-1.5 h-3.5 w-3.5" />
                            Add URL
                          </Button>
                        </TabsContent>

                        <TabsContent value="models" className="m-0 flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs h-9"
                            onClick={() => handleUploadNewImage('male')}
                          >
                            <Upload className="mr-1.5 h-3.5 w-3.5" />
                            Upload Model
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs h-9"
                            onClick={() => setImageInputs([...imageInputs, { url: '', type: 'male', order: imageInputs.length }])}
                          >
                            <ImagePlus className="mr-1.5 h-3.5 w-3.5" />
                            Add URL
                          </Button>
                        </TabsContent>
                      </div>
                    </div>

                    <TabsContent value="images" className="mt-0">
                      {productImages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-8 border border-dashed border-gray-200 rounded-2xl bg-gray-50 text-gray-400 gap-2">
                          <ImagePlus className="h-8 w-8 text-gray-300" />
                          <p className="text-xs font-semibold">No product images added yet.</p>
                          <p className="text-[10px]">Add front, back, or gallery photos for this product.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {productImages.map((img) => renderImageCard(img))}
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="models" className="mt-0">
                      {modelImages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-8 border border-dashed border-gray-200 rounded-2xl bg-gray-50 text-gray-400 gap-2">
                          <ImagePlus className="h-8 w-8 text-gray-300" />
                          <p className="text-xs font-semibold">No model mockups added yet.</p>
                          <p className="text-[10px]">Add male, female, or custom models for color displays.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {modelImages.map((img) => renderImageCard(img))}
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                );
              })()}
            </div>

            <Separator />

            {/* Variants visual card manager */}
            <div className="space-y-4">
              {(() => {
                const groupedVariants: { [colorKey: string]: typeof variantInputs } = {};
                variantInputs.forEach((v) => {
                  let colorKey = v.color;
                  if (colorKey && !colorKey.includes('|')) {
                    colorKey = `${colorKey}|#9ca3af`;
                  }
                  const key = colorKey || 'New Color|#9ca3af';
                  if (!groupedVariants[key]) {
                    groupedVariants[key] = [];
                  }
                  groupedVariants[key].push(v);
                });

                return (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-semibold">Product Variants</Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setVariantInputs([...variantInputs, { color: 'New Color|#9ca3af', size: 'S', stock: 0, sku: '' }])}
                        className="text-xs h-9 bg-white"
                      >
                        <Plus className="mr-1.5 h-3.5 w-3.5 text-blue-600" />
                        Add Color Group
                      </Button>
                    </div>

                    {Object.keys(groupedVariants).length === 0 ? (
                      <div className="flex flex-col items-center justify-center p-8 border border-dashed border-gray-200 rounded-2xl bg-gray-50 text-gray-400 gap-2">
                        <Package className="h-8 w-8 text-gray-300" />
                        <p className="text-xs font-semibold">No variants defined yet.</p>
                        <p className="text-[10px]">Add a color group to start defining sizes and inventory.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Object.entries(groupedVariants).map(([colorKey, variants]) => {
                          const parts = colorKey.split('|');
                          const colorName = parts[0] || '';
                          const colorHex = parts[1] || '#9ca3af';

                          const updateColor = (nameVal: string, hexVal: string) => {
                            const newColor = `${nameVal}|${hexVal}`;
                            const updated = variantInputs.map((v) => {
                              let vColor = v.color;
                              if (vColor && !vColor.includes('|')) {
                                vColor = `${vColor}|#9ca3af`;
                              }
                              if (vColor === colorKey) {
                                return { ...v, color: newColor };
                              }
                              return v;
                            });
                            setVariantInputs(updated);
                          };

                          return (
                            <Card key={colorKey} className="border border-gray-200 bg-white shadow-sm hover:shadow-md transition-all flex flex-col overflow-hidden">
                              {/* Card Header: Color Info */}
                              <div className="p-3 bg-gray-50 border-b border-gray-150 flex items-center gap-2">
                                {/* Color picker circle */}
                                <div className="relative w-7 h-7 rounded-full border border-gray-300 cursor-pointer overflow-hidden flex items-center justify-center shrink-0 shadow-sm" style={{ backgroundColor: colorHex }}>
                                  <input
                                    type="color"
                                    value={colorHex}
                                    onChange={(e) => updateColor(colorName, e.target.value)}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                  />
                                </div>

                                <Input
                                  value={colorName}
                                  onChange={(e) => updateColor(e.target.value, colorHex)}
                                  placeholder="Color Name"
                                  className="h-8 text-xs font-bold bg-white border-gray-250 flex-1"
                                />

                                <Input
                                  value={colorHex}
                                  onChange={(e) => updateColor(colorName, e.target.value)}
                                  placeholder="#ffffff"
                                  className="h-8 w-20 font-mono text-[10px] uppercase text-center bg-white border-gray-255 shrink-0"
                                />

                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 shrink-0"
                                  onClick={() => handleDeleteColorGroup(colorKey)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>

                              {/* Card Content: Sizes */}
                              <div className="p-3 flex-1 space-y-2 overflow-y-auto max-h-[220px]">
                                {variants.map((v) => {
                                  const absIdx = variantInputs.indexOf(v);
                                  if (absIdx === -1) return null;

                                  return (
                                    <div key={absIdx} className="flex items-center gap-2 animate-fadeIn">
                                      <Select 
                                        value={v.size} 
                                        onValueChange={(val) => {
                                          const newVariants = [...variantInputs];
                                          newVariants[absIdx] = { ...newVariants[absIdx], size: val };
                                          setVariantInputs(newVariants);
                                        }}
                                      >
                                        <SelectTrigger className="h-8 w-20 text-xs bg-white border-gray-200 font-semibold shrink-0">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {(() => {
                                            const standardSizes = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL', 'XXL', 'XXXL', 'One Size'];
                                            const currentVal = (v.size || '').trim();
                                            const uniqueSizes = Array.from(new Set([
                                              ...standardSizes,
                                              ...(currentVal ? [currentVal] : [])
                                            ]));
                                            return uniqueSizes.map((s) => (
                                              <SelectItem key={s} value={s}>{s}</SelectItem>
                                            ));
                                          })()}
                                        </SelectContent>
                                      </Select>

                                      <Input
                                        type="number"
                                        value={v.stock}
                                        onChange={(e) => {
                                          const newVariants = [...variantInputs];
                                          newVariants[absIdx] = { ...newVariants[absIdx], stock: parseInt(e.target.value) || 0 };
                                          setVariantInputs(newVariants);
                                        }}
                                        placeholder="Stock"
                                        className="h-8 w-16 text-xs bg-white border-gray-255 text-center shrink-0"
                                      />

                                      <Input
                                        value={v.sku}
                                        onChange={(e) => {
                                          const newVariants = [...variantInputs];
                                          newVariants[absIdx] = { ...newVariants[absIdx], sku: e.target.value };
                                          setVariantInputs(newVariants);
                                        }}
                                        placeholder="SKU Code"
                                        className="h-8 text-xs bg-white border-gray-255 font-mono flex-1"
                                      />

                                      {variantInputs.length > 1 && (
                                        <Button 
                                          variant="ghost" 
                                          size="sm" 
                                          className="h-8 w-8 p-0 text-gray-400 hover:text-red-500 hover:bg-red-50 shrink-0"
                                          onClick={() => setVariantInputs(variantInputs.filter((_, i) => i !== absIdx))}
                                        >
                                          <X className="h-3.5 w-3.5" />
                                        </Button>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Card Footer: Add Size */}
                              <div className="p-2 bg-gray-50 border-t border-gray-150 flex justify-end">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleAddSizeToGroup(colorKey)}
                                  className="h-7 text-[10px] font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                >
                                  <Plus className="mr-1 h-3 w-3" />
                                  Add Size
                                </Button>
                              </div>
                            </Card>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>

          <div className="p-4 border-t border-gray-150 bg-gray-50 flex justify-end gap-3 shrink-0 rounded-b-2xl">
            <Button variant="outline" onClick={resetForm} type="button">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700 text-white" type="button">
              <Save className="mr-1.5 h-4 w-4" />
              {isSaving ? 'Saving...' : editingProduct ? 'Update Product' : 'Create Product'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ========================================
   CATEGORIES TAB
   ======================================== */
function CategoriesTab({
  categories,
  onRefresh,
}: {
  categories: Category[];
  onRefresh: () => Promise<void>;
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState({ name: '', slug: '', order: 0 });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const displayCategories = categories.filter((c) => c.slug !== 'all');

  const resetForm = () => {
    setForm({ name: '', slug: '', order: 0 });
    setEditingId(null);
    setIsAdding(false);
  };

  const startEdit = (cat: Category) => {
    setForm({ name: cat.name, slug: cat.slug, order: cat.order });
    setEditingId(cat.id);
    setIsAdding(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.slug) {
      toast.error('Name and slug are required');
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch('/api/admin/categories', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, id: editingId }),
      });
      if (res.ok) {
        toast.success(editingId ? 'Category updated!' : 'Category created!');
        resetForm();
        await onRefresh();
      } else {
        toast.error('Failed to save category');
      }
    } catch {
      toast.error('Failed to save category');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this category and all its products?')) return;
    try {
      const res = await fetch(`/api/admin/categories?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Category deleted');
        await onRefresh();
      }
    } catch {
      toast.error('Failed to delete category');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Category Management</h2>
        <Button onClick={() => { resetForm(); setIsAdding(true); }} className="bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="mr-1.5 h-4 w-4" />
          Add Category
        </Button>
      </div>

      {/* Category List */}
      <div className="space-y-2">
        {displayCategories.map((cat) => (
          <Card key={cat.id}>
            <div className="flex items-center gap-3 p-4">
              <GripVertical className="h-4 w-4 text-gray-400 cursor-grab" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900">{cat.name}</span>
                  <Badge variant="secondary" className="text-xs">{cat.slug}</Badge>
                </div>
                <span className="text-xs text-gray-500">Order: {cat.order}</span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => startEdit(cat)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleDelete(cat.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isAdding} onOpenChange={(open) => !open && resetForm()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Category' : 'New Category'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setForm({ ...form, name, slug: name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') });
                }}
                placeholder="Category name"
              />
            </div>
            <div className="space-y-2">
              <Label>Slug</Label>
              <Input
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                placeholder="category-slug"
              />
            </div>
            <div className="space-y-2">
              <Label>Display Order</Label>
              <Input
                type="number"
                value={form.order}
                onChange={(e) => setForm({ ...form, order: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={resetForm}>Cancel</Button>
              <Button onClick={handleSave} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700 text-white">
                <Save className="mr-1.5 h-4 w-4" />
                {isSaving ? 'Saving...' : editingId ? 'Update' : 'Create'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ========================================
   PAYMENTS TAB
   ======================================== */
function PaymentsTab({
  configs,
  onRefresh,
}: {
  configs: PaymentConfig[];
  onRefresh: () => Promise<void>;
}) {
  const [stripeForm, setStripeForm] = useState({ apiKey: '', link: '', isActive: false });
  const [paypalForm, setPaypalForm] = useState({ apiKey: '', link: '', isActive: false });
  const [isSaving, setIsSaving] = useState<string | null>(null);

  useEffect(() => {
    const stripe = configs.find((c) => c.provider === 'stripe');
    const paypal = configs.find((c) => c.provider === 'paypal');
    if (stripe) setStripeForm({ apiKey: stripe.apiKey || '', link: stripe.link || '', isActive: stripe.isActive });
    if (paypal) setPaypalForm({ apiKey: paypal.apiKey || '', link: paypal.link || '', isActive: paypal.isActive });
  }, [configs]);

  const handleSave = async (provider: 'stripe' | 'paypal') => {
    setIsSaving(provider);
    const form = provider === 'stripe' ? stripeForm : paypalForm;
    try {
      const res = await fetch('/api/admin/payment-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, ...form }),
      });
      if (res.ok) {
        toast.success(`${provider === 'stripe' ? 'Stripe' : 'PayPal'} configuration saved!`);
        await onRefresh();
      } else {
        toast.error('Failed to save configuration');
      }
    } catch {
      toast.error('Failed to save configuration');
    } finally {
      setIsSaving(null);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-900">Payment Gateway Configuration</h2>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Stripe Config */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100">
                  <CreditCard className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <CardTitle className="text-base">Stripe</CardTitle>
                  <CardDescription>Accept card payments via Stripe</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={stripeForm.isActive}
                  onCheckedChange={(checked) => setStripeForm({ ...stripeForm, isActive: checked })}
                />
                <Label className="text-xs">{stripeForm.isActive ? 'Active' : 'Inactive'}</Label>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>API Key (Publishable Key)</Label>
              <Input
                type="password"
                value={stripeForm.apiKey}
                onChange={(e) => setStripeForm({ ...stripeForm, apiKey: e.target.value })}
                placeholder="pk_live_..."
              />
              <p className="text-xs text-gray-400">Your Stripe publishable key for client-side integration</p>
            </div>
            <div className="space-y-2">
              <Label>Payment Link (optional)</Label>
              <Input
                value={stripeForm.link}
                onChange={(e) => setStripeForm({ ...stripeForm, link: e.target.value })}
                placeholder="https://buy.stripe.com/..."
              />
              <p className="text-xs text-gray-400">Direct Stripe Payment Link for quick checkout</p>
            </div>
            <Button
              onClick={() => handleSave('stripe')}
              disabled={isSaving === 'stripe'}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <Save className="mr-1.5 h-4 w-4" />
              {isSaving === 'stripe' ? 'Saving...' : 'Save Stripe Config'}
            </Button>
          </CardContent>
        </Card>

        {/* PayPal Config */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
                  <CreditCard className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <CardTitle className="text-base">PayPal</CardTitle>
                  <CardDescription>Accept payments via PayPal</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={paypalForm.isActive}
                  onCheckedChange={(checked) => setPaypalForm({ ...paypalForm, isActive: checked })}
                />
                <Label className="text-xs">{paypalForm.isActive ? 'Active' : 'Inactive'}</Label>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>API Key (Client ID)</Label>
              <Input
                type="password"
                value={paypalForm.apiKey}
                onChange={(e) => setPaypalForm({ ...paypalForm, apiKey: e.target.value })}
                placeholder="AXs1w..."
              />
              <p className="text-xs text-gray-400">Your PayPal Client ID for SDK integration</p>
            </div>
            <div className="space-y-2">
              <Label>Payment Link (optional)</Label>
              <Input
                value={paypalForm.link}
                onChange={(e) => setPaypalForm({ ...paypalForm, link: e.target.value })}
                placeholder="https://paypal.me/..."
              />
              <p className="text-xs text-gray-400">Direct PayPal.me link for quick checkout</p>
            </div>
            <Button
              onClick={() => handleSave('paypal')}
              disabled={isSaving === 'paypal'}
              className="w-full bg-amber-500 hover:bg-amber-600 text-white"
            >
              <Save className="mr-1.5 h-4 w-4" />
              {isSaving === 'paypal' ? 'Saving...' : 'Save PayPal Config'}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="border-dashed border-gray-200 bg-gray-50/50">
        <CardContent className="p-4">
          <p className="text-sm text-gray-500">
            <strong>Note:</strong> API Keys and Payment Links configured here will automatically bind to the checkout buttons in the customer cart. 
            When a payment link is provided, clicking checkout will redirect the customer to the payment page.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

/* ========================================
   STOREFRONT TAB
   ======================================== */
function StorefrontTab() {
  const [models, setModels] = useState({
    maleFront: '/products/model-male.png',
    maleBack: '/products/model-male-back.png',
    femaleFront: '/products/model-female.png',
    femaleBack: '/products/model-female-back.png',
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('storefront_models');
    if (saved) {
      setModels(JSON.parse(saved));
    }
  }, []);

  const handleSave = () => {
    setIsSaving(true);
    localStorage.setItem('storefront_models', JSON.stringify(models));
    setTimeout(() => {
      setIsSaving(false);
      toast.success('Storefront models updated!');
      // Dispatch an event so product-detail can listen if needed
      window.dispatchEvent(new Event('storefront_models_updated'));
    }, 500);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-900">Storefront Base Models</h2>
      <Card>
        <CardContent className="p-6 space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Male Model (Front)</Label>
              <Input 
                value={models.maleFront} 
                onChange={(e) => setModels({...models, maleFront: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Male Model (Back)</Label>
              <Input 
                value={models.maleBack} 
                onChange={(e) => setModels({...models, maleBack: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Female Model (Front)</Label>
              <Input 
                value={models.femaleFront} 
                onChange={(e) => setModels({...models, femaleFront: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Female Model (Back)</Label>
              <Input 
                value={models.femaleBack} 
                onChange={(e) => setModels({...models, femaleBack: e.target.value})}
              />
            </div>
          </div>
          <Button onClick={handleSave} disabled={isSaving} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
            <Save className="mr-1.5 h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save Models'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

/* ========================================
   SALES ANALYTICAL DASHBOARD TAB
   ======================================== */
function SalesTab() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [primaryMonth, setPrimaryMonth] = useState('');
  const [comparisonMonth, setComparisonMonth] = useState('');
  const [compareMode, setCompareMode] = useState(true);
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  const fetchSalesData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/sales');
      if (res.ok) {
        const json = await res.json();
        setData(json);
        
        // Auto select default months
        const months = json.monthlySales.map((m: any) => m.month);
        if (months.length > 0) {
          setPrimaryMonth(months[months.length - 1]);
          if (months.length > 1) {
            setComparisonMonth(months[months.length - 2]);
          } else {
            setComparisonMonth(months[0]);
          }
        }
      } else {
        toast.error('Failed to load sales dashboard');
      }
    } catch (e: any) {
      toast.error('Error fetching sales: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSalesData();
  }, [fetchSalesData]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <RefreshCw className="h-10 w-10 text-blue-600 animate-spin" />
        <p className="text-sm font-black tracking-[0.15em] text-gray-500 uppercase font-mono">LOADING SALES DASHBOARD...</p>
      </div>
    );
  }

  if (!data) return null;

  const { summary, monthlySales, dailySales, bestSellers, recentOrders } = data;

  const monthsList = monthlySales.map((m: any) => m.month);

  // Extract month details
  const getMonthStats = (monthStr: string) => {
    const monthObj = monthlySales.find((m: any) => m.month === monthStr);
    const dailyArr = dailySales[monthStr] || [];
    
    const revenue = monthObj ? monthObj.revenue : 0;
    const orders = monthObj ? monthObj.orders : 0;
    const itemsSold = dailyArr.reduce((sum: number, d: any) => sum + d.orders, 0); // fallback approximate count
    return { revenue, orders, itemsSold, daily: dailyArr };
  };

  const primaryStats = getMonthStats(primaryMonth);
  const comparisonStats = getMonthStats(comparisonMonth);

  // Compute growth changes
  const getPercentChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const revChange = getPercentChange(primaryStats.revenue, comparisonStats.revenue);
  const ordChange = getPercentChange(primaryStats.orders, comparisonStats.orders);
  const itemsChange = getPercentChange(primaryStats.itemsSold, comparisonStats.itemsSold);

  // Daily coordinate helpers for SVG line graph (Day 1 to 31)
  const daysArray = Array.from({ length: 31 }, (_, i) => i + 1);
  const getDayValue = (dailyList: any[], day: number, field: 'revenue' | 'orders') => {
    const found = dailyList.find(d => d.day === day);
    return found ? found[field] : 0;
  };

  // Find max daily values for scaling Y axis
  let maxDailyRevenue = 50;
  daysArray.forEach(day => {
    const r1 = getDayValue(primaryStats.daily, day, 'revenue');
    const r2 = compareMode ? getDayValue(comparisonStats.daily, day, 'revenue') : 0;
    maxDailyRevenue = Math.max(maxDailyRevenue, r1, r2);
  });
  // Pad the max revenue height slightly
  maxDailyRevenue = Math.ceil((maxDailyRevenue * 1.1) / 10) * 10 || 100;

  // SVG parameters
  const svgWidth = 800;
  const svgHeight = 260;
  const paddingLeft = 55;
  const paddingRight = 15;
  const paddingTop = 15;
  const paddingBottom = 35;

  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = svgHeight - paddingTop - paddingBottom;

  const getCoords = (day: number, val: number) => {
    const x = paddingLeft + ((day - 1) / 30) * chartWidth;
    const y = svgHeight - paddingBottom - (val / maxDailyRevenue) * chartHeight;
    return { x, y };
  };

  // Build line paths
  const buildPath = (dailyList: any[]) => {
    let points = [];
    for (let d = 1; d <= 31; d++) {
      const val = getDayValue(dailyList, d, 'revenue');
      const { x, y } = getCoords(d, val);
      points.push(`${x},${y}`);
    }
    return `M ${points.join(' L ')}`;
  };

  const buildAreaPath = (dailyList: any[]) => {
    const linePath = buildPath(dailyList);
    const firstPoint = getCoords(1, 0);
    const lastPoint = getCoords(31, 0);
    return `${linePath} L ${lastPoint.x},${lastPoint.y} L ${firstPoint.x},${firstPoint.y} Z`;
  };

  const primaryPath = buildPath(primaryStats.daily);
  const primaryArea = buildAreaPath(primaryStats.daily);
  const comparisonPath = buildPath(comparisonStats.daily);
  const comparisonArea = buildAreaPath(comparisonStats.daily);

  const yTicks = [0, Math.round(maxDailyRevenue / 4), Math.round(maxDailyRevenue / 2), Math.round(maxDailyRevenue * 3 / 4), maxDailyRevenue];

  // Hover state calculations
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    
    // Scale clientX back to SVG coordinates
    const scaleX = svgWidth / rect.width;
    const svgX = clientX * scaleX;
    
    // Calculate nearest day (1 - 31)
    const chartX = svgX - paddingLeft;
    const percentage = chartX / chartWidth;
    const day = Math.min(31, Math.max(1, Math.round(percentage * 30) + 1));
    setHoveredDay(day);
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Overview Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-gray-500 font-mono">Total Revenue</CardTitle>
            <div className="h-8 w-8 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center">
              <DollarSign className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black tracking-tight text-gray-900">${summary.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <p className="text-[10px] font-bold text-gray-400 mt-1">Across all completed orders</p>
          </CardContent>
        </Card>

        <Card className="border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-gray-500 font-mono">Total Orders</CardTitle>
            <div className="h-8 w-8 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
              <Package className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black tracking-tight text-gray-900">{summary.totalOrders}</div>
            <p className="text-[10px] font-bold text-gray-400 mt-1">Completed purchases</p>
          </CardContent>
        </Card>

        <Card className="border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-gray-500 font-mono">Avg Order Value</CardTitle>
            <div className="h-8 w-8 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center">
              <Percent className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black tracking-tight text-gray-900">${summary.averageOrderValue.toFixed(2)}</div>
            <p className="text-[10px] font-bold text-gray-400 mt-1">Average cart checkouts</p>
          </CardContent>
        </Card>

        <Card className="border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-gray-500 font-mono">Items Sold</CardTitle>
            <div className="h-8 w-8 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center">
              <Tag className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black tracking-tight text-gray-900">{summary.totalItemsSold}</div>
            <p className="text-[10px] font-bold text-gray-400 mt-1">Units distributed globally</p>
          </CardContent>
        </Card>
      </div>

      {/* Month Picker Calendars & Comparison Setup */}
      <Card className="border border-gray-100 shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <CardTitle className="text-lg font-black tracking-tight flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                Monthly Performance & Comparison
              </CardTitle>
              <CardDescription className="text-xs">Compare daily trends and performance across calendar periods</CardDescription>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-[10px] font-mono font-black text-gray-400 uppercase tracking-widest">Primary:</label>
                <Select value={primaryMonth} onValueChange={setPrimaryMonth}>
                  <SelectTrigger className="w-36 h-9 font-bold text-xs bg-white text-black border-gray-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {monthsList.map((m: string) => (
                      <SelectItem key={m} value={m} className="font-bold text-xs">{new Date(m + '-02').toLocaleString('en-US', { month: 'long', year: 'numeric' })}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {compareMode && (
                <div className="flex items-center gap-2 animate-fadeIn">
                  <label className="text-[10px] font-mono font-black text-gray-400 uppercase tracking-widest">Vs:</label>
                  <Select value={comparisonMonth} onValueChange={setComparisonMonth}>
                    <SelectTrigger className="w-36 h-9 font-bold text-xs bg-white text-black border-gray-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {monthsList.map((m: string) => (
                        <SelectItem key={m} value={m} className="font-bold text-xs">{new Date(m + '-02').toLocaleString('en-US', { month: 'long', year: 'numeric' })}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <button
                onClick={() => setCompareMode(!compareMode)}
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all font-mono ${
                  compareMode 
                    ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-transparent'
                }`}
              >
                {compareMode ? 'Disable Compare' : 'Enable Comparison'}
              </button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Comparative Metrics Dashboard */}
          <div className="grid gap-4 sm:grid-cols-3 bg-gray-50/50 p-6 rounded-2xl border border-gray-100">
            <div className="space-y-1">
              <span className="text-[9px] font-mono font-black text-gray-400 uppercase tracking-widest">Revenue Comparison</span>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-black">${primaryStats.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                {compareMode && (
                  <span className="text-xs text-gray-400 font-semibold">vs ${comparisonStats.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                )}
              </div>
              {compareMode && (
                <div className="flex items-center gap-1 mt-1">
                  {revChange >= 0 ? (
                    <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-0.5 text-[9px] font-bold py-0.5 px-1.5 rounded-md">
                      <TrendingUp className="h-3 w-3" />
                      +{revChange.toFixed(1)}% Growth
                    </Badge>
                  ) : (
                    <Badge className="bg-red-50 text-red-700 border border-red-200 flex items-center gap-0.5 text-[9px] font-bold py-0.5 px-1.5 rounded-md">
                      <TrendingDown className="h-3 w-3" />
                      {revChange.toFixed(1)}% Decline
                    </Badge>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-1">
              <span className="text-[9px] font-mono font-black text-gray-400 uppercase tracking-widest">Orders Comparison</span>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-black">{primaryStats.orders} orders</span>
                {compareMode && (
                  <span className="text-xs text-gray-400 font-semibold">vs {comparisonStats.orders}</span>
                )}
              </div>
              {compareMode && (
                <div className="flex items-center gap-1 mt-1">
                  {ordChange >= 0 ? (
                    <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-0.5 text-[9px] font-bold py-0.5 px-1.5 rounded-md">
                      <TrendingUp className="h-3 w-3" />
                      +{ordChange.toFixed(1)}% Up
                    </Badge>
                  ) : (
                    <Badge className="bg-red-50 text-red-700 border border-red-200 flex items-center gap-0.5 text-[9px] font-bold py-0.5 px-1.5 rounded-md">
                      <TrendingDown className="h-3 w-3" />
                      {ordChange.toFixed(1)}% Down
                    </Badge>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-1">
              <span className="text-[9px] font-mono font-black text-gray-400 uppercase tracking-widest">Items Distributed</span>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-black">{primaryStats.itemsSold} items</span>
                {compareMode && (
                  <span className="text-xs text-gray-400 font-semibold">vs {comparisonStats.itemsSold}</span>
                )}
              </div>
              {compareMode && (
                <div className="flex items-center gap-1 mt-1">
                  {itemsChange >= 0 ? (
                    <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-0.5 text-[9px] font-bold py-0.5 px-1.5 rounded-md">
                      <TrendingUp className="h-3 w-3" />
                      +{itemsChange.toFixed(1)}% More
                    </Badge>
                  ) : (
                    <Badge className="bg-red-50 text-red-700 border border-red-200 flex items-center gap-0.5 text-[9px] font-bold py-0.5 px-1.5 rounded-md">
                      <TrendingDown className="h-3 w-3" />
                      {itemsChange.toFixed(1)}% Less
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Premium Custom SVG Double Line / Comparison Chart */}
          <div className="relative border border-gray-100 rounded-2xl p-4 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between mb-4 px-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 font-mono">Daily Revenue Analysis (USD)</span>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-blue-600 shadow-sm shadow-blue-500/20" />
                  <span className="text-[10px] font-black text-gray-600">{new Date(primaryMonth + '-02').toLocaleString('en-US', { month: 'short', year: '2-digit' })}</span>
                </div>
                {compareMode && (
                  <div className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-full bg-purple-400 border border-dashed border-purple-500" />
                    <span className="text-[10px] font-black text-gray-600">{new Date(comparisonMonth + '-02').toLocaleString('en-US', { month: 'short', year: '2-digit' })}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="relative w-full aspect-[8/2.6] min-h-[220px]">
              <svg 
                viewBox={`0 0 ${svgWidth} ${svgHeight}`} 
                className="w-full h-full select-none"
                onMouseMove={handleMouseMove}
                onMouseLeave={() => setHoveredDay(null)}
              >
                <defs>
                  {/* Glowing line shadows */}
                  <filter id="glow-blue" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#2563eb" floodOpacity="0.15" />
                  </filter>
                  <filter id="glow-purple" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#a855f7" floodOpacity="0.1" />
                  </filter>
                  {/* Filled gradients */}
                  <linearGradient id="grad-blue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563eb" stopOpacity="0.12" />
                    <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
                  </linearGradient>
                  <linearGradient id="grad-purple" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#a855f7" stopOpacity="0.08" />
                    <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
                  </linearGradient>
                </defs>

                {/* Horizontal Grid lines */}
                {yTicks.map((tick, idx) => {
                  const y = svgHeight - paddingBottom - (tick / maxDailyRevenue) * chartHeight;
                  return (
                    <g key={idx}>
                      <line 
                        x1={paddingLeft} 
                        y1={y} 
                        x2={svgWidth - paddingRight} 
                        y2={y} 
                        stroke="#f1f5f9" 
                        strokeWidth="1.5" 
                        strokeDasharray={tick === 0 ? "0" : "4 4"}
                      />
                      <text 
                        x={paddingLeft - 10} 
                        y={y + 4} 
                        textAnchor="end" 
                        className="text-[9px] font-bold font-mono fill-gray-400"
                      >
                        ${tick}
                      </text>
                    </g>
                  );
                })}

                {/* X Axis Labels */}
                {[1, 5, 10, 15, 20, 25, 31].map((day, idx) => {
                  const { x } = getCoords(day, 0);
                  return (
                    <g key={idx}>
                      <line 
                        x1={x} 
                        y1={svgHeight - paddingBottom} 
                        x2={x} 
                        y2={svgHeight - paddingBottom + 5} 
                        stroke="#e2e8f0" 
                        strokeWidth="1.5"
                      />
                      <text 
                        x={x} 
                        y={svgHeight - paddingBottom + 18} 
                        textAnchor="middle" 
                        className="text-[9px] font-bold font-mono fill-gray-400"
                      >
                        Day {day}
                      </text>
                    </g>
                  );
                })}

                {/* Comparison Month Area & Line */}
                {compareMode && (
                  <>
                    <path d={comparisonArea} fill="url(#grad-purple)" />
                    <path 
                      d={comparisonPath} 
                      fill="none" 
                      stroke="#c084fc" 
                      strokeWidth="2.5" 
                      strokeDasharray="5 4"
                      filter="url(#glow-purple)"
                    />
                  </>
                )}

                {/* Primary Month Area & Line */}
                <path d={primaryArea} fill="url(#grad-blue)" />
                <path 
                  d={primaryPath} 
                  fill="none" 
                  stroke="#2563eb" 
                  strokeWidth="3.5" 
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  filter="url(#glow-blue)"
                />

                {/* Hover vertical crosshair & indicators */}
                {hoveredDay !== null && (() => {
                  const pVal = getDayValue(primaryStats.daily, hoveredDay, 'revenue');
                  const pCoords = getCoords(hoveredDay, pVal);
                  
                  const cVal = compareMode ? getDayValue(comparisonStats.daily, hoveredDay, 'revenue') : 0;
                  const cCoords = getCoords(hoveredDay, cVal);

                  return (
                    <g>
                      {/* Vertical tracker line */}
                      <line 
                        x1={pCoords.x} 
                        y1={paddingTop} 
                        x2={pCoords.x} 
                        y2={svgHeight - paddingBottom} 
                        stroke="#cbd5e1" 
                        strokeWidth="1" 
                        strokeDasharray="3 3"
                      />
                      
                      {/* Primary month hover dot */}
                      <circle cx={pCoords.x} cy={pCoords.y} r="6" fill="#ffffff" stroke="#2563eb" strokeWidth="3" />

                      {/* Comparison month hover dot */}
                      {compareMode && (
                        <circle cx={cCoords.x} cy={cCoords.y} r="6" fill="#ffffff" stroke="#c084fc" strokeWidth="3" />
                      )}
                    </g>
                  );
                })()}
              </svg>

              {/* Dynamic tooltip displayed when hovering days on chart */}
              {hoveredDay !== null && (() => {
                const pVal = getDayValue(primaryStats.daily, hoveredDay, 'revenue');
                const pOrd = getDayValue(primaryStats.daily, hoveredDay, 'orders');
                const cVal = compareMode ? getDayValue(comparisonStats.daily, hoveredDay, 'revenue') : 0;
                const cOrd = compareMode ? getDayValue(comparisonStats.daily, hoveredDay, 'orders') : 0;
                const { x } = getCoords(hoveredDay, pVal);

                // Dynamically offset tooltip to stay within chart boundaries
                const tooltipWidth = 170;
                const leftPos = x > (svgWidth - tooltipWidth) ? x - tooltipWidth - 20 : x + 20;

                return (
                  <div 
                    className="absolute bg-black/95 text-white p-3.5 rounded-xl text-xs space-y-1.5 shadow-2xl border border-white/10 backdrop-blur-md pointer-events-none transition-all duration-75 z-10 font-mono"
                    style={{ left: `${(leftPos / svgWidth) * 100}%`, top: '15%' }}
                  >
                    <div className="font-bold border-b border-white/10 pb-1 flex justify-between gap-4 text-[10px] text-gray-400 uppercase tracking-wider">
                      <span>Day {hoveredDay} Sales</span>
                    </div>
                    <div className="space-y-1 text-[11px]">
                      <div className="flex justify-between items-center gap-4">
                        <span className="flex items-center gap-1.5 text-blue-400 font-black">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                          {new Date(primaryMonth + '-02').toLocaleString('en-US', { month: 'short' })}:
                        </span>
                        <span className="font-black font-mono text-white">${pVal.toFixed(2)} ({pOrd} ord)</span>
                      </div>
                      {compareMode && (
                        <div className="flex justify-between items-center gap-4">
                          <span className="flex items-center gap-1.5 text-purple-400 font-black">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                            {new Date(comparisonMonth + '-02').toLocaleString('en-US', { month: 'short' })}:
                          </span>
                          <span className="font-black font-mono text-white">${cVal.toFixed(2)} ({cOrd} ord)</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Best Sellers Breakdown */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 border border-gray-100 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg font-black tracking-tight flex items-center gap-2">
              <Tag className="h-5 w-5 text-blue-600" />
              Best Selling Products Breakdown
            </CardTitle>
            <CardDescription className="text-xs">Product catalogs ranked dynamically by total items sold</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 text-[10px] font-black uppercase tracking-wider text-gray-400 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-4">Product Details</th>
                    <th className="px-6 py-4">Price</th>
                    <th className="px-6 py-4 text-center">Items Sold</th>
                    <th className="px-6 py-4 text-right">Total Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-bold text-gray-700">
                  {bestSellers.map((item: any, idx: number) => (
                    <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 flex items-center gap-3">
                        {item.image ? (
                          <div className="h-10 w-10 overflow-hidden rounded bg-gray-50 border border-gray-100 flex-shrink-0">
                            <img src={item.image} className="h-full w-full object-cover" alt="" />
                          </div>
                        ) : (
                          <div className="h-10 w-10 rounded bg-gray-100 flex items-center justify-center flex-shrink-0">
                            <Package className="h-5 w-5 text-gray-400" />
                          </div>
                        )}
                        <span className="font-bold text-gray-900 truncate max-w-xs">{item.title}</span>
                      </td>
                      <td className="px-6 py-4 text-gray-500">${item.price.toFixed(2)}</td>
                      <td className="px-6 py-4 text-center text-gray-900">{item.quantitySold} units</td>
                      <td className="px-6 py-4 text-right text-gray-900">${item.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* 12-Month Sales History Overview (Bar Chart) */}
        <Card className="border border-gray-100 shadow-lg">
          <CardHeader>
            <CardTitle className="text-sm font-black uppercase tracking-wider text-gray-500 font-mono flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-blue-600" />
              12-Month Trend
            </CardTitle>
            <CardDescription className="text-xs">Chronological monthly aggregates</CardDescription>
          </CardHeader>
          <CardContent className="h-[280px] flex items-end justify-between gap-2.5 pt-4">
            {monthlySales.map((m: any, idx: number) => {
              // Highlight selected primary/comparison months
              const isPrimary = m.month === primaryMonth;
              const isComparison = compareMode && m.month === comparisonMonth;

              // Find maximum monthly revenue for scale
              const maxMonthRev = Math.max(...monthlySales.map((item: any) => item.revenue), 100);
              const heightPercent = `${Math.max(4, (m.revenue / maxMonthRev) * 100)}%`;

              // Generate short label
              const [year, month] = m.month.split('-');
              const shortMonth = new Date(m.month + '-02').toLocaleString('en-US', { month: 'short' });

              return (
                <div key={idx} className="flex-1 flex flex-col items-center h-full group relative cursor-pointer justify-end">
                  {/* Tooltip on hover */}
                  <div className="absolute bottom-full mb-2 bg-black text-white p-2 rounded-lg text-[9px] font-mono shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all z-10 w-20 text-center uppercase tracking-wider leading-relaxed">
                    <strong>{shortMonth} {year}</strong>
                    <br />
                    ${m.revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </div>

                  {/* Vertical bar */}
                  <div 
                    className={`w-full rounded-t-sm transition-all duration-300 ${
                      isPrimary 
                        ? 'bg-blue-600 shadow-md shadow-blue-500/20 group-hover:bg-blue-500' 
                        : isComparison 
                        ? 'bg-purple-400 border border-purple-500/30' 
                        : 'bg-gray-100 group-hover:bg-gray-200'
                    }`}
                    style={{ height: heightPercent }}
                  />
                  
                  {/* X label */}
                  <span className={`text-[8px] font-black uppercase mt-2 font-mono tracking-tighter ${isPrimary ? 'text-blue-600 font-extrabold' : 'text-gray-400'}`}>
                    {shortMonth}
                  </span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions List */}
      <Card className="border border-gray-100 shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg font-black tracking-tight">Recent Transactions Ledger</CardTitle>
          <CardDescription className="text-xs">History of all customer checkout orders and their status</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-[10px] font-black uppercase tracking-wider text-gray-400 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4">Order ID</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Total Amount</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Items Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-bold text-gray-700">
                {recentOrders.map((ord: any) => {
                  const isExpanded = expandedOrderId === ord.id;
                  const dateStr = new Date(ord.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  });

                  return (
                    <React.Fragment key={ord.id}>
                      <tr className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 font-mono font-bold text-gray-500 uppercase tracking-tighter">#{ord.id.slice(-8)}</td>
                        <td className="px-6 py-4 text-gray-500">{dateStr}</td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-gray-900">{ord.name}</div>
                          <div className="text-[10px] text-gray-400 font-mono">{ord.email}</div>
                        </td>
                        <td className="px-6 py-4 text-gray-900">${ord.total.toFixed(2)}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[9px] font-mono tracking-widest uppercase ${
                            ord.status === 'completed' 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                              : ord.status === 'pending'
                              ? 'bg-amber-50 text-amber-700 border border-amber-100'
                              : 'bg-red-50 text-red-700 border border-red-100'
                          }`}>
                            {ord.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="font-bold text-blue-600 hover:text-blue-700 font-mono text-[10px] uppercase tracking-wider py-1 px-3"
                            onClick={() => setExpandedOrderId(isExpanded ? null : ord.id)}
                          >
                            <Eye className="mr-1 h-3.5 w-3.5" />
                            {isExpanded ? 'Hide' : `Items (${ord.itemsCount})`}
                          </Button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-gray-50/30">
                          <td colSpan={6} className="px-8 py-4 border-l-2 border-blue-500">
                            <div className="space-y-2 font-mono text-[10px] text-gray-500 uppercase tracking-wider">
                              <p className="font-bold text-gray-700 mb-1">Purchased Products list:</p>
                              {ord.itemsList.map((itemStr: string, idx: number) => (
                                <div key={idx} className="flex items-center gap-2">
                                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                  <span>{itemStr}</span>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

