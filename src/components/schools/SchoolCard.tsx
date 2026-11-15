import { Link } from 'react-router-dom';
import { School } from '@/types';
import { MapPin, ChevronRight } from 'lucide-react';

interface SchoolCardProps {
  school: School;
  index?: number;
  onClick: (school: School) => void;
}

export function SchoolCard({ school, index = 0, onClick }: SchoolCardProps) {
  return (
    <div
      onClick={() => onClick(school)}
      className="group bg-card border border-border overflow-hidden cursor-pointer transition-all duration-500 hover:shadow-xl hover:-translate-y-2 fade-in"
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <div className="aspect-[4/3] bg-secondary flex items-center justify-center relative overflow-hidden p-6 group-hover:bg-muted/50 transition-colors">
        {school.logo_url ? (
          <img
            src={school.logo_url}
            alt={`${school.name} logo`}
            className="w-full h-full object-contain max-w-[140px] max-h-[140px] transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="w-24 h-24 bg-foreground/5 rounded-full flex items-center justify-center group-hover:bg-foreground/10 transition-colors">
            <span className="text-4xl font-bold text-foreground/20 group-hover:text-foreground/30">
              {school.name.charAt(0)}
            </span>
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      </div>

      <div className="p-5 relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-accent transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
        <h3 className="font-bold text-lg mb-1 group-hover:text-accent transition-colors leading-tight">
          {school.name}
        </h3>
        <div className="flex items-center gap-2 text-sm text-muted-foreground group-hover:text-foreground/70 transition-colors">
          <MapPin className="w-3.5 h-3.5" />
          <span>{school.area}</span>
        </div>

        <div className="flex items-center gap-2 mt-4 text-xs font-bold uppercase tracking-widest text-accent translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
          <span>Enter Shop</span>
          <ChevronRight className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
}
