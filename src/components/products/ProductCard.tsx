import { Link } from 'react-router-dom';
import { Uniform, School } from '@/types';
import { ShoppingBag } from 'lucide-react';

interface ProductCardProps {
  uniform: Uniform;
  school: School;
  index?: number;
}

export function ProductCard({ uniform, school, index = 0 }: ProductCardProps) {
  const getCategoryEmoji = () => {
    switch (uniform.item_name.toLowerCase()) {
      case 'shirt': return '👔';
      case 'pant': return '👖';
      case 'skirt': return '🩱';
      case 'blazer': return '🧥';
      case 'tie': return '👔';
      default: return '👕';
    }
  };

  // Use first colour's image if multi-colour item, else fall back to image_url
  const displayImage = uniform.colors && uniform.colors.length > 0
    ? (uniform.colors.find(c => c.image_url)?.image_url ?? uniform.image_url)
    : uniform.image_url;

  return (
    <Link
      to={`/product/${uniform.id}`}
      className="group bg-card border border-border overflow-hidden cursor-pointer transition-all duration-500 hover:shadow-xl hover:-translate-y-2 fade-in block relative"
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <div className="relative block overflow-hidden aspect-[3/4] bg-secondary">
        <div className="w-full h-full transition-transform duration-700 group-hover:scale-110">
          {displayImage ? (
            <img
              src={displayImage}
              alt={uniform.item_name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-secondary to-muted">
              <span className="text-6xl opacity-20 group-hover:opacity-40 transition-opacity duration-500">{getCategoryEmoji()}</span>
            </div>
          )}
        </div>

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="absolute inset-x-0 bottom-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-500 flex items-center justify-center">
          <div className="bg-foreground text-background px-6 py-3 rounded-sm text-xs font-bold uppercase tracking-widest flex items-center gap-2 shadow-xl">
            <ShoppingBag className="w-4 h-4" /> View Details
          </div>
        </div>
      </div>

      <div className="p-5 relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-accent transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />

        <div className="flex items-center gap-2 mb-3">
          <span className="px-2 py-0.5 bg-secondary text-[10px] font-bold uppercase tracking-widest text-muted-foreground rounded-full">{uniform.type}</span>
          <span className="px-2 py-0.5 bg-secondary text-[10px] font-bold uppercase tracking-widest text-muted-foreground rounded-full">{uniform.category}</span>
        </div>

        <h3 className="font-bold text-base mb-2 line-clamp-2 group-hover:text-accent transition-colors leading-tight">
          {uniform.item_name}
        </h3>

        <div className="flex items-center justify-between mt-4">
          <p className="text-xl font-bold tracking-tight">₹{uniform.price.toLocaleString()}</p>

          {/* Colour swatches */}
          {uniform.colors && uniform.colors.length > 0 && (
            <div className="flex -space-x-1">
              {uniform.colors.slice(0, 3).map(c => (
                <div
                  key={c.name}
                  className="w-4 h-4 rounded-full border-2 border-background ring-1 ring-border"
                  style={{ backgroundColor: c.hex }}
                />
              ))}
              {uniform.colors.length > 3 && (
                <div className="w-4 h-4 rounded-full border-2 border-background ring-1 ring-border bg-secondary flex items-center justify-center text-[8px] font-bold">
                  +{uniform.colors.length - 3}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
