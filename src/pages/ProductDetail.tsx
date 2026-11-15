import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Uniform, ColorVariant } from '@/types';
import { supabase } from '@/lib/supabase';
import { useCart } from '@/contexts/CartContext';
import { ChevronLeft, Minus, Plus, ShoppingBag, Truck, RefreshCw, Shield, Check } from 'lucide-react';
import { logError } from '@/lib/errorHandler';
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const SIZES = ['20', '22', '24', '26', '28', '30', '32', '34', '36', '38', '40', '42', '44'];

// Helper to generate sizing ranges
const generateRange = (start: number, end: number, step: number = 2) => {
  const range = [];
  for (let i = start; i <= end; i += step) {
    range.push(i);
  }
  return range;
};

export default function ProductDetail() {
  const { productId } = useParams<{ productId: string }>();
  const [uniform, setUniform] = useState<Uniform | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSize, setSelectedSize] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [school, setSchool] = useState<any>(null);
  const [added, setAdded] = useState(false);
  const [activeImage, setActiveImage] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<ColorVariant | null>(null);
  const [showSizeError, setShowSizeError] = useState(false);

  // Dual Sizing State
  const [waist, setWaist] = useState('');
  const [length, setLength] = useState('');

  const { addItem } = useCart();

  useEffect(() => {
    async function fetchUniform() {
      if (!productId) return;

      const { data, error } = await supabase
        .from('uniforms')
        .select('*, schools(*)')
        .eq('id', productId)
        .single();

      if (error) {
        logError('FetchUniform', error);
      } else {
        let finalData = data;

        // Fetch all matching rows for the same uniform item to construct a robust metadata merge
        const { data: allRows } = await supabase
          .from('uniforms')
          .select('*')
          .eq('school_id', data.school_id)
          .eq('item_name', data.item_name)
          .eq('type', data.type)
          .eq('category', data.category);

        if (allRows && allRows.length > 0) {
          const baseRow = data; // the current specific class row
          const allRow = allRows.find(r => r.grade === 'All');

          const findBest = <T,>(extractor: (r: Uniform) => T | null | undefined, isEmpty?: (val: T) => boolean): T | null => {
            // 1. Try base row
            const baseVal = extractor(baseRow);
            if (baseVal !== undefined && baseVal !== null) {
              if (!isEmpty || !isEmpty(baseVal)) return baseVal;
            }

            // 2. Try 'All' row if it exists
            if (allRow) {
              const allVal = extractor(allRow);
              if (allVal !== undefined && allVal !== null) {
                if (!isEmpty || !isEmpty(allVal)) return allVal;
              }
            }

            // 3. Try any sibling row in the group
            for (const r of allRows) {
              const val = extractor(r);
              if (val !== undefined && val !== null) {
                if (!isEmpty || !isEmpty(val)) return val;
              }
            }

            return null;
          };

          finalData = {
            ...baseRow,
            image_url: findBest(r => r.image_url) || baseRow.image_url,
            image_urls: findBest(r => r.image_urls, val => !val || val.length === 0) || baseRow.image_urls,
            colors: findBest(r => r.colors, val => !val || val.length === 0) || baseRow.colors,
            description: findBest(r => r.description) || baseRow.description,
            fabric_info: findBest(r => r.fabric_info) || baseRow.fabric_info,
            fit_description: findBest(r => r.fit_description) || baseRow.fit_description,
            size_config: findBest(r => r.size_config) || baseRow.size_config,
            stock: findBest(r => r.stock, val => !val || Object.keys(val).length === 0) || baseRow.stock,
            description_image_url: findBest(r => r.description_image_url) || baseRow.description_image_url,
            schools: data.schools // Ensure referenced schools object is preserved
          };
        }

        setUniform(finalData);
        setSchool(finalData.schools);

        // If item has colour variants, auto-select the first one with an image
        if (finalData.colors && finalData.colors.length > 0) {
          const firstWithImage = finalData.colors.find((c: any) => c.image_url) ?? finalData.colors[0];
          setSelectedColor(firstWithImage);
          setActiveImage(firstWithImage.image_url ?? finalData.image_urls?.[0] ?? finalData.image_url);
        } else if (finalData.image_urls && finalData.image_urls.length > 0) {
          setActiveImage(finalData.image_urls[0]);
        } else {
          setActiveImage(finalData.image_url);
        }
      }
      setLoading(false);
    }

    fetchUniform();
  }, [productId]);

  // Determine if product requires dual sizing
  const isDualSizing = uniform && (
    uniform.item_name.toLowerCase().includes('pant') ||
    uniform.item_name.toLowerCase().includes('skirt') ||
    uniform.item_name.toLowerCase().includes('pino') ||
    uniform.item_name.toLowerCase().includes('short')
  );

  // Update selectedSize when waist/length changes for dual sizing items
  // Update selectedSize based on size_config or legacy logic
  useEffect(() => {
    if (uniform?.size_config) {
      if (uniform.size_config.type === 'single') {
        // For single, selectedSize is set directly by the dropdown onChange
        // So we don't need to do anything here unless we want to sync state
      } else if (uniform.size_config.type === 'dual') {
        if (waist && length) {
          const dims = uniform.size_config.dimensions;
          const name1 = dims[0]?.name || '';
          const name2 = dims[1]?.name || '';
          const isWL = (name1.toLowerCase().includes('waist') && name2.toLowerCase().includes('length'));

          if (isWL) {
            setSelectedSize(`W${waist} L${length}`);
          } else {
            setSelectedSize(`${waist} ${length}`);
          }
        } else {
          setSelectedSize('');
        }
      }
    } else if (isDualSizing) {
      // Legacy fallback
      if (waist && length) {
        setSelectedSize(`W${waist} L${length}`);
      } else {
        setSelectedSize('');
      }
    }
  }, [waist, length, isDualSizing, uniform]);

  useEffect(() => {
    if (selectedSize) {
      setShowSizeError(false);
    }
  }, [selectedSize]);

  const handleAddToCart = () => {
    if (!selectedSize) {
      setShowSizeError(true);
      toast.error('Please select a size first', {
        className: 'bg-red-500 text-white border-none', // Ensure it is red
        duration: 3000,
      });
      return;
    }

    if (uniform && school) {
      // Pass selected colour name so it shows everywhere in the order pipeline
      const colorName = selectedColor?.name ?? null;
      addItem(uniform, selectedSize, school, quantity, colorName);
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
      toast.success(`${uniform.item_name}${colorName ? ` (${colorName})` : ''} added to your cart.`);
    }
  };

  const getWaistRange = () => {
    if (!uniform) return [];
    if (uniform.item_name.toLowerCase().includes('skirt')) {
      return generateRange(26, 34, 2);
    }
    if (uniform.item_name.toLowerCase().includes('short')) {
      return generateRange(9, 18, 1); // Shorts sizes 9-18
    }
    if (uniform.item_name.toLowerCase().includes('pino')) {
      return generateRange(24, 38, 2); // Pinos sizes 24-38
    }
    // Pants default
    return generateRange(26, 42, 2);
  };

  const getLengthRange = () => {
    if (!uniform) return [];
    if (uniform.item_name.toLowerCase().includes('skirt') || uniform.item_name.toLowerCase().includes('pino')) {
      return generateRange(20, 28, 2);
    }
    if (uniform.item_name.toLowerCase().includes('short')) {
      // Assuming standard length or not applicable, but keeping range for consistency if UI asks
      return generateRange(10, 20, 1);
    }
    // Pants default
    return generateRange(22, 44, 2);
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </Layout>
    );
  }

  if (!uniform) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Product not found</h1>
          <Link to="/" className="text-accent hover:underline">Back to Home</Link>
        </div>
      </Layout>
    );
  }

  const getCategoryEmoji = () => {
    switch (uniform.item_name.toLowerCase()) {
      case 'shirt': return '👔';
      case 'pant': return '👖';
      case 'skirt': return '🩱';
      case 'blazer': return '🧥';
      case 'short': return '🩳';
      case 'pino': return '👗';
      default: return '👕';
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link
            to={school ? `/school/${school.id}` : "/"}
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors bg-secondary/50 px-3 py-1.5 rounded-md"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to {school ? school.name : "Uniforms"}
          </Link>
        </div>

        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
          <Link to={school ? `/school/${school.id}` : "/"} className="hover:text-foreground transition-colors">Schools</Link>
          {school && (
            <>
              <span>/</span>
              <Link to={`/school/${school.id}`} className="hover:text-foreground transition-colors">{school.name}</Link>
            </>
          )}
          <span>/</span>
          <span className="text-foreground">{uniform.item_name}</span>
        </nav>

        <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
          {/* Image */}
          {/* Image & Gallery */}
          <div className="space-y-4">
            <div className="aspect-[3/4] bg-secondary flex items-center justify-center rounded-sm overflow-hidden bg-gradient-to-br from-secondary via-muted to-secondary relative">
              {activeImage ? (
                <img src={activeImage} alt={uniform.item_name} className="w-full h-full object-cover transition-all duration-300" />
              ) : (
                <span className="text-8xl">{getCategoryEmoji()}</span>
              )}
            </div>

            {/* Thumbnail Gallery */}
            {uniform.image_urls && uniform.image_urls.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {uniform.image_urls.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImage(img)}
                    className={`relative w-20 h-20 flex-shrink-0 rounded-sm overflow-hidden border-2 transition-all ${activeImage === img ? 'border-foreground shadow-sm' : 'border-transparent hover:border-muted-foreground'}`}
                  >
                    <img src={img} alt={`${uniform.item_name} view ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="fade-in">
            <div className="mb-6">
              <p className="text-sm text-muted-foreground mb-2">{school?.name}</p>
              <h1 className="text-3xl font-bold mb-2">{uniform.item_name}</h1>
              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                <span className="bg-secondary px-2 py-1 rounded capitalize">{uniform.type}</span>
                <span className="bg-secondary px-2 py-1 rounded capitalize">{uniform.category}</span>
              </div>
              <p className="text-2xl font-bold mb-4">₹{uniform.price.toLocaleString()}</p>

              {uniform.description && (
                <div className="bg-secondary/40 rounded-lg px-4 py-3 mb-2">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">About this item</p>
                  <p className="text-base text-foreground leading-relaxed">{uniform.description}</p>
                </div>
              )}

              {/* Colour Variants */}
              {uniform.colors && uniform.colors.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm font-semibold mb-2">
                    Colour
                    {selectedColor && (
                      <span className="ml-2 font-normal text-muted-foreground">{selectedColor.name}</span>
                    )}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {uniform.colors.map(color => {
                      const isSelected = selectedColor?.name === color.name;
                      return (
                        <button
                          key={color.name}
                          type="button"
                          title={color.name}
                          onClick={() => {
                            setSelectedColor(color);
                            if (color.image_url) setActiveImage(color.image_url);
                          }}
                          className={`w-8 h-8 rounded-full border-2 transition-all ${isSelected
                            ? 'border-black scale-110 shadow-md'
                            : 'border-gray-200 hover:border-gray-400'
                            }`}
                          style={{ backgroundColor: color.hex }}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Size Selection */}
            <div className="mb-8">
              <h3 className="font-medium mb-3">Select Size</h3>

              {uniform.size_config ? (
                // DYNAMIC SIZE CONFIGURATION
                <div className={`grid gap-4 ${uniform.size_config.type === 'dual' ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  {uniform.size_config.dimensions.map((dim, idx) => {
                    const isWaist = dim.name.toLowerCase().includes('waist');
                    const isLength = dim.name.toLowerCase().includes('length');
                    const val = isWaist ? waist : isLength ? length : selectedSize;
                    const setVal = isWaist ? setWaist : isLength ? setLength : setSelectedSize;

                    // If it's a single dimension but not waist/length named, we treat it as the main size
                    // For dual dimension, we map 0->waist, 1->length simplistically or by name
                    // Actually, let's just use local state for dynamic dims. 
                    // To keep it simple without complex dynamic state map:
                    // If type is dual:
                    //   Dim 0 -> setWaist
                    //   Dim 1 -> setLength
                    // If type is single:
                    //   Dim 0 -> setSelectedSize

                    let currentValue = '';
                    let handleChange = (e: any) => { };

                    if (uniform.size_config!.type === 'dual') {
                      if (idx === 0) {
                        currentValue = waist;
                        handleChange = (e) => setWaist(e.target.value);
                      } else {
                        currentValue = length;
                        handleChange = (e) => setLength(e.target.value);
                      }
                    } else {
                      currentValue = selectedSize;
                      handleChange = (e) => setSelectedSize(e.target.value);
                    }

                    return (
                      <div key={idx}>
                        <label className="text-sm text-muted-foreground mb-1 block">{dim.name}</label>
                        <div className="relative">
                          <select
                            className="w-full p-3 border border-border rounded-sm bg-background appearance-none cursor-pointer focus:border-foreground focus:outline-none"
                            value={currentValue}
                            onChange={handleChange}
                          >
                            <option value="" disabled>Select {dim.name}</option>
                            {dim.values.map(s => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                          <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                            <ChevronLeft className="w-4 h-4 -rotate-90" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                // FALLBACK TO LEGACY LOGIC
                isDualSizing ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-muted-foreground mb-1 block">Waist (in)</label>
                      <div className="relative">
                        <select
                          className="w-full p-3 border border-border rounded-sm bg-background appearance-none cursor-pointer focus:border-foreground focus:outline-none"
                          value={waist}
                          onChange={(e) => setWaist(e.target.value)}
                        >
                          <option value="" disabled>Select Waist</option>
                          {getWaistRange().map(s => (
                            <option key={s} value={s}>{s}"</option>
                          ))}
                        </select>
                        <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                          <ChevronLeft className="w-4 h-4 -rotate-90" />
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground mb-1 block">Length (in)</label>
                      <div className="relative">
                        <select
                          className="w-full p-3 border border-border rounded-sm bg-background appearance-none cursor-pointer focus:border-foreground focus:outline-none"
                          value={length}
                          onChange={(e) => setLength(e.target.value)}
                        >
                          <option value="" disabled>Select Length</option>
                          {getLengthRange().map(s => (
                            <option key={s} value={s}>{s}"</option>
                          ))}
                        </select>
                        <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                          <ChevronLeft className="w-4 h-4 -rotate-90" />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Size</label>
                    <div className="relative">
                      <select
                        className="w-full p-3 border border-border rounded-sm bg-background appearance-none cursor-pointer focus:border-foreground focus:outline-none"
                        value={selectedSize}
                        onChange={(e) => setSelectedSize(e.target.value)}
                      >
                        <option value="" disabled>Select Size</option>
                        {SIZES.map(size => (
                          <option key={size} value={size}>{size}</option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                        <ChevronLeft className="w-4 h-4 -rotate-90" />
                      </div>
                    </div>
                  </div>
                ))}
            </div>

            {showSizeError && !selectedSize && (
              <p className="text-red-500 text-sm font-medium mb-4 animate-in fade-in slide-in-from-top-2">
                ⚠️ Please select a size first
              </p>
            )}

            {selectedSize && (
              <div className="mb-4">
                <p className="text-green-600 font-medium tracking-wide flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-600 animate-pulse" />
                  In Stock
                </p>
              </div>
            )}

            {/* Quantity */}
            <div className="mb-8">
              <h3 className="font-medium mb-3">Quantity</h3>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="p-2 border border-border rounded-sm hover:bg-secondary"
                  disabled={!selectedSize}
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-12 text-center font-medium text-lg">{quantity}</span>
                <button
                  onClick={() => {
                    setQuantity(quantity + 1);
                  }}
                  className="p-2 border border-border rounded-sm hover:bg-secondary"
                  disabled={!selectedSize}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Add to Cart */}
            <button
              onClick={() => {
                handleAddToCart();
              }}
              className={`w-full md:w-auto px-8 py-4 font-semibold uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 border-2 rounded-sm
                ${added
                  ? 'bg-green-600 text-white border-green-600'
                  : 'bg-white text-black border-black hover:bg-black hover:text-white cursor-pointer'
                }`}
            >
              {added ? <><Check className="w-5 h-5" /> Added</> : <><ShoppingBag className="w-5 h-5" /> Add to Cart</>}
            </button>

            {/* Description Image (Size Chart etc) */}
            {uniform.description_image_url && (
              <div className="mt-10 pt-8 border-t border-border">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1.5 h-6 bg-accent rounded-full" />
                  <h3 className="text-sm font-black uppercase tracking-widest text-foreground">Size Chart & Details</h3>
                </div>
                <div className="bg-secondary/20 rounded-xl p-2 md:p-4 border border-border/50 overflow-hidden">
                  <img
                    src={uniform.description_image_url}
                    alt="Size Chart and Details"
                    className="w-full h-auto rounded-lg shadow-sm"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-4 mt-8 pt-8 border-t border-border">
              <div className="text-center">
                <Truck className="w-5 h-5 mx-auto mb-2 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">School Delivery</p>
              </div>
              <div className="text-center">
                <RefreshCw className="w-5 h-5 mx-auto mb-2 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Easy Exchange</p>
              </div>
              <div className="text-center">
                <Shield className="w-5 h-5 mx-auto mb-2 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Quality Assured</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
