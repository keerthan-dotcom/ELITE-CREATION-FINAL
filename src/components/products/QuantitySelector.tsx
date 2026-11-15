import { Minus, Plus } from 'lucide-react';

interface QuantitySelectorProps {
  quantity: number;
  onQuantityChange: (quantity: number) => void;
  min?: number;
  max?: number;
}

export function QuantitySelector({
  quantity,
  onQuantityChange,
  min = 1,
  max = 10,
}: QuantitySelectorProps) {
  const decrease = () => {
    if (quantity > min) {
      onQuantityChange(quantity - 1);
    }
  };

  const increase = () => {
    if (quantity < max) {
      onQuantityChange(quantity + 1);
    }
  };

  return (
    <div>
      <h3 className="text-sm font-semibold uppercase tracking-wider mb-3">Quantity</h3>
      <div className="flex items-center gap-4">
        <button
          onClick={decrease}
          disabled={quantity <= min}
          className="qty-btn disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Decrease quantity"
        >
          <Minus className="w-4 h-4" />
        </button>
        <span className="text-lg font-semibold w-8 text-center">{quantity}</span>
        <button
          onClick={increase}
          disabled={quantity >= max}
          className="qty-btn disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Increase quantity"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
