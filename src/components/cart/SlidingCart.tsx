import { X, Minus, Plus, Trash2, ShoppingBag } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { Link, useNavigate } from 'react-router-dom';

export function SlidingCart() {
  const { items, isOpen, closeCart, removeItem, updateQuantity, totalAmount, totalItems } = useCart();
  const navigate = useNavigate();

  const handleContinueShopping = () => {
    closeCart();
    if (items.length > 0) {
      navigate(`/school/${items[items.length - 1].school.id}`);
    } else {
      navigate('/');
    }
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 animate-fade-in"
          onClick={closeCart}
        />
      )}

      {/* Cart Panel */}
      <div
        className={`cart-slide flex flex-col ${isOpen ? 'open' : 'closed'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5" />
            <span className="font-semibold">Your Cart</span>
            <span className="text-sm text-muted-foreground">({totalItems} items)</span>
          </div>
          <button
            onClick={closeCart}
            className="p-2 hover:bg-secondary rounded-sm transition-colors"
            aria-label="Close cart"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {items.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingBag className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Your cart is empty</p>
              <button
                onClick={handleContinueShopping}
                className="mt-4 text-sm font-medium underline hover:no-underline"
              >
                Continue Shopping
              </button>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={`${item.uniform.id}-${item.size}-${item.color ?? ''}`}
                className="flex gap-4 py-4 border-b border-border last:border-0"
              >
                {/* Product Image */}
                <div className="w-20 h-24 bg-secondary flex-shrink-0 flex items-center justify-center">
                  {item.uniform.image_url ? (
                    <img
                      src={item.uniform.image_url}
                      alt={item.uniform.item_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl">👔</span>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground mb-1">{item.school.name}</p>
                  <h4 className="font-medium text-sm truncate">{item.uniform.item_name}</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Size: {item.size}
                    {item.color && <span className="ml-1 font-medium text-foreground">({item.color})</span>}
                  </p>
                  <p className="font-semibold mt-2">₹{item.uniform.price.toLocaleString()}</p>

                  {/* Quantity Controls */}
                  <div className="flex items-center gap-2 mt-3">
                    <button
                      onClick={() => updateQuantity(item.uniform.id, item.size, item.quantity - 1, item.color)}
                      className="qty-btn"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.uniform.id, item.size, item.quantity + 1, item.color)}
                      className="qty-btn"
                      aria-label="Increase quantity"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => removeItem(item.uniform.id, item.size, item.color)}
                      className="ml-auto p-2 text-muted-foreground hover:text-destructive transition-colors"
                      aria-label="Remove item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-border p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Subtotal</span>
              <span className="font-semibold text-lg">₹{totalAmount.toLocaleString()}</span>
            </div>
            <Link
              to="/checkout"
              onClick={closeCart}
              className="block w-full bg-foreground text-background py-3 text-center font-semibold uppercase tracking-wider text-sm hover:bg-foreground/90 transition-colors"
            >
              Proceed to Checkout
            </Link>
            <button
              onClick={handleContinueShopping}
              className="block w-full text-center text-sm font-medium underline hover:no-underline"
            >
              Continue Shopping
            </button>
          </div>
        )}
      </div>
    </>
  );
}
