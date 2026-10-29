import { useEffect, useState } from 'react';
import { booksApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { useNavigate } from 'react-router-dom';
import { GlassGalleryShowcase } from '../components/gallery/GlassGalleryShowcase';
import type { Book } from '../types';
import './BooksPage.css';

export function BooksPage() {
  const { isAuthenticated } = useAuth();
  const { cartItemIds, addToCart } = useCart();
  const toast = useToast();
  const navigate = useNavigate();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    booksApi
      .list({ limit: 50 })
      .then((res) => {
        setBooks(res.data.data.books || []);
      })
      .catch(() => setBooks([]))
      .finally(() => setLoading(false));
  }, []);

  const handleAddToCart = async (book: Book) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (cartItemIds.includes(book.id)) return;
    try {
      await addToCart(book.id);
      toast.success('Added to Cart', `"${book.title}" was added to your shopping cart.`);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } }).response?.data?.message ||
        'Failed to add book to cart';
      toast.error('Cart Error', msg);
    }
  };

  return (
    <main className="books-page">
      <div className="container">
        <GlassGalleryShowcase
          items={books}
          title="Digital Book Gallery Showcase"
          subtitle="Discover curated publications in an interactive glassmorphism gallery."
          isLibraryMode={false}
          onAddToCart={handleAddToCart}
          cartItemIds={cartItemIds}
          isLoading={loading}
        />
      </div>
    </main>
  );
}
