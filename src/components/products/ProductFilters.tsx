import { FilterGender } from '@/types';
import { X } from 'lucide-react';

interface ProductFiltersProps {
  gender: FilterGender;
  onGenderChange: (gender: FilterGender) => void;
  onClear: () => void;
  isOpen: boolean;
  onClose: () => void;
}

const GENDERS: { value: FilterGender; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'Boys', label: 'Boys' },
  { value: 'Girls', label: 'Girls' },
  { value: 'Unisex', label: 'Unisex' },
];

export function ProductFilters({
  gender,
  onGenderChange,
  onClear,
  isOpen,
  onClose,
}: ProductFiltersProps) {
  const hasFilters = gender !== 'all';

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-40 w-80 bg-background border-r border-border transform transition-transform duration-300 lg:static lg:transform-none lg:w-64 lg:flex-shrink-0
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="p-6 h-full overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-semibold text-lg">Filters</h2>
            <button
              onClick={onClose}
              className="lg:hidden p-2 hover:bg-secondary rounded-sm"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {hasFilters && (
            <button
              onClick={onClear}
              className="text-sm text-muted-foreground hover:text-foreground underline mb-6"
            >
              Clear all filters
            </button>
          )}

          {/* Gender Filter */}
          <div className="mb-8">
            <h3 className="text-sm font-semibold uppercase tracking-wider mb-4">Gender</h3>
            <div className="space-y-1">
              {GENDERS.map((g) => (
                <label key={g.value} className="filter-checkbox">
                  <input
                    type="radio"
                    name="gender"
                    checked={gender === g.value}
                    onChange={() => onGenderChange(g.value)}
                    className="w-4 h-4 accent-foreground"
                  />
                  <span className={gender === g.value ? 'text-foreground font-medium' : 'text-muted-foreground'}>
                    {g.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

        </div>
      </aside>
    </>
  );
}
