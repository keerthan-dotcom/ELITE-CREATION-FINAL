import { ReactNode } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';
import { SlidingCart } from '@/components/cart/SlidingCart';

interface LayoutProps {
  children: ReactNode;
  showCart?: boolean;
}

export function Layout({ children, showCart = true }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      {showCart && <SlidingCart />}
    </div>
  );
}
