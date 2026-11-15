import { ProductSize } from '@/types';

interface SizeSelectorProps {
  sizes: ProductSize[];
  selectedSize: string;
  onSizeChange: (size: string) => void;
}

export function SizeSelector({ sizes, selectedSize, onSizeChange }: SizeSelectorProps) {
  const orderedSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
  
  const sortedSizes = sizes.sort((a, b) => {
    return orderedSizes.indexOf(a.size) - orderedSizes.indexOf(b.size);
  });

  return (
    <div>
      <h3 className="text-sm font-semibold uppercase tracking-wider mb-3">Select Size</h3>
      <div className="flex flex-wrap gap-3">
        {sortedSizes.map((sizeOption) => (
          <button
            key={sizeOption.id}
            onClick={() => onSizeChange(sizeOption.size)}
            disabled={sizeOption.stock === 0}
            className={`
              size-pill min-w-[50px] text-center
              ${selectedSize === sizeOption.size ? 'active' : ''}
              ${sizeOption.stock === 0 ? 'opacity-40 cursor-not-allowed line-through' : ''}
            `}
          >
            {sizeOption.size}
          </button>
        ))}
      </div>
      {selectedSize && (
        <p className="text-sm text-muted-foreground mt-2">
          Selected: <span className="font-medium text-foreground">{selectedSize}</span>
        </p>
      )}
    </div>
  );
}
