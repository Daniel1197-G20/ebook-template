import { useState, useEffect, useCallback } from 'react';
import {
  Search,
  BookOpen,
  Download,
  Check,
  Globe,
  Sparkles,
  FileText,
  Loader2,
  Edit3,
} from 'lucide-react';
import { adminApi } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import type { ExternalBook, ExternalGenre } from '../../types';
import { Button } from '../ui/Button';
import './ExternalBookExplorer.css';

interface ExternalBookExplorerProps {
  onImportSuccess?: () => void;
  onCustomizeBook?: (book: ExternalBook) => void;
}

export function ExternalBookExplorer({ onImportSuccess, onCustomizeBook }: ExternalBookExplorerProps) {
  const { success, error, info } = useToast();

  const [genres, setGenres] = useState<ExternalGenre[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [provider, setProvider] = useState<string>('all');
  const [books, setBooks] = useState<ExternalBook[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // Selection for bulk import
  const [selectedBooks, setSelectedBooks] = useState<ExternalBook[]>([]);
  const [bulkPrice, setBulkPrice] = useState<string>('4500');
  const [bulkCurrency, setBulkCurrency] = useState<string>('NGN');
  const [bulkPublished, setBulkPublished] = useState<boolean>(true);
  const [importing, setImporting] = useState<boolean>(false);
  const [importingId, setImportingId] = useState<string | null>(null);

  // Fetch Genres
  useEffect(() => {
    adminApi
      .getExternalGenres()
      .then((res) => {
        setGenres(res.data.data.genres || []);
      })
      .catch((err) => console.error('Failed to load genres', err));
  }, []);

  // Fetch books from external APIs
  const fetchExternalBooks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.searchExternalBooks({
        q: searchQuery.trim(),
        genre: selectedGenre,
        provider,
        limit: 24,
      });

      const items = res.data.data.books || [];
      setBooks(items);
      // Reset selected when query changes
      setSelectedBooks([]);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } }).response?.data?.message ||
        'Failed to query external book API';
      error(msg);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedGenre, provider, error]);

  useEffect(() => {
    fetchExternalBooks();
  }, [fetchExternalBooks]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchExternalBooks();
  };

  const handleGenreClick = (genreId: string) => {
    setSelectedGenre(genreId);
    setSearchQuery('');
  };

  const toggleSelectBook = (book: ExternalBook) => {
    const isSelected = selectedBooks.some((b) => b.externalId === book.externalId);
    if (isSelected) {
      setSelectedBooks(selectedBooks.filter((b) => b.externalId !== book.externalId));
    } else {
      setSelectedBooks([...selectedBooks, book]);
    }
  };

  const toggleSelectAll = () => {
    if (selectedBooks.length === books.length) {
      setSelectedBooks([]);
    } else {
      setSelectedBooks([...books]);
    }
  };

  // Single book 1-click import
  const handleSingleImport = async (book: ExternalBook) => {
    setImportingId(book.externalId);
    try {
      const payload = {
        books: [book],
        defaultOverrides: {
          price: parseFloat(bulkPrice) || 4500,
          currency: bulkCurrency,
          published: bulkPublished,
        },
      };

      const res = await adminApi.importExternalBooks(payload);
      success(`'${book.title}' imported into store catalog!`);
      if (res.data.data.errorsCount > 0) {
        info(`Note: ${res.data.data.errors[0]?.error}`);
      }
      onImportSuccess?.();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } }).response?.data?.message ||
        'Failed to import book';
      error(msg);
    } finally {
      setImportingId(null);
    }
  };

  // Bulk import selected books
  const handleBulkImport = async () => {
    if (selectedBooks.length === 0) return;
    setImporting(true);
    try {
      const payload = {
        books: selectedBooks,
        defaultOverrides: {
          price: parseFloat(bulkPrice) || 4500,
          currency: bulkCurrency,
          published: bulkPublished,
        },
      };

      const res = await adminApi.importExternalBooks(payload);
      const { importedCount, errorsCount } = res.data.data;
      success(`Successfully imported ${importedCount} book(s) into your catalog!`);
      if (errorsCount > 0) {
        info(`${errorsCount} book(s) encountered skipped duplicate titles or errors.`);
      }
      setSelectedBooks([]);
      onImportSuccess?.();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } }).response?.data?.message ||
        'Bulk import failed';
      error(msg);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="external-explorer-container">
      {/* Top Header Card */}
      <div className="explorer-header-card">
        <div className="explorer-intro">
          <div>
            <h2>
              <Globe size={22} className="text-primary" /> External Book Supplier & API Discovery
            </h2>
            <p>
              Search & supply live book listings with official cover art, synopsis, authors, and page counts from Open Library, Google Books, and curated collections. Import books directly into your store with 1-click or customize before saving.
            </p>
          </div>
          <div className="explorer-source-badge">
            <Sparkles size={15} /> Live Book APIs Active
          </div>
        </div>

        {/* Search & Provider Selector */}
        <div className="explorer-controls">
          <form onSubmit={handleSearchSubmit} className="search-and-provider">
            <div className="api-search-box">
              <Search size={18} className="search-icon" />
              <input
                type="text"
                placeholder="Search any book title, author, or ISBN (e.g. Atomic Habits, Clean Code, 9780132350884)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="provider-select-wrapper">
              <select value={provider} onChange={(e) => setProvider(e.target.value)}>
                <option value="all">⚡ All Sources (OpenLibrary + Google)</option>
                <option value="openlibrary">Open Library API</option>
                <option value="google">Google Books API</option>
                <option value="curated">Curated HD Collection</option>
              </select>
            </div>

            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />} Search
            </Button>
          </form>

          {/* Genre / Topic Pills */}
          <div className="genre-pills-bar">
            {genres.map((g) => (
              <button
                key={g.id}
                type="button"
                className={`genre-pill ${selectedGenre === g.id && !searchQuery ? 'active' : ''}`}
                onClick={() => handleGenreClick(g.id)}
              >
                {g.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Sticky / Floating Bulk Import Bar when items selected */}
      {selectedBooks.length > 0 && (
        <div className="bulk-import-sticky-bar">
          <div className="bulk-import-left">
            <span className="bulk-count-badge">
              <Check size={18} /> {selectedBooks.length} Book(s) Selected
            </span>

            <div className="bulk-pricing-config">
              <label>Default Price:</label>
              <input
                type="number"
                min="0"
                step="50"
                value={bulkPrice}
                onChange={(e) => setBulkPrice(e.target.value)}
                placeholder="Price"
              />
              <select value={bulkCurrency} onChange={(e) => setBulkCurrency(e.target.value)}>
                <option value="NGN">NGN (₦)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
              </select>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: '#e2e8f0', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={bulkPublished}
                onChange={(e) => setBulkPublished(e.target.checked)}
              />
              Auto-Publish on Store
            </label>
          </div>

          <div className="bulk-import-actions">
            <Button variant="ghost" size="sm" onClick={() => setSelectedBooks([])}>
              Deselect All
            </Button>
            <Button variant="primary" size="sm" onClick={handleBulkImport} disabled={importing}>
              {importing ? (
                <>
                  <Loader2 size={15} className="animate-spin" /> Importing...
                </>
              ) : (
                <>
                  <Download size={15} /> Import {selectedBooks.length} Selected Books
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Results Header / Summary */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.9rem', color: 'var(--color-text-muted, #94a3b8)' }}>
          Found <strong>{books.length}</strong> book results from external providers
        </span>
        {books.length > 0 && (
          <Button variant="ghost" size="sm" onClick={toggleSelectAll}>
            {selectedBooks.length === books.length ? 'Deselect All' : `Select All (${books.length})`}
          </Button>
        )}
      </div>

      {/* Book Cards Grid */}
      {loading ? (
        <div className="explorer-loading">
          <div className="spinner" />
          <p>Querying external book suppliers & fetching official cover art...</p>
        </div>
      ) : books.length === 0 ? (
        <div className="explorer-empty">
          <BookOpen size={48} />
          <h3>No book results found</h3>
          <p>Try searching for different keywords, author names, or pick a topic category above.</p>
        </div>
      ) : (
        <div className="external-books-grid">
          {books.map((book) => {
            const isSelected = selectedBooks.some((b) => b.externalId === book.externalId);
            const isCurrentImporting = importingId === book.externalId;

            return (
              <div key={book.externalId} className={`ext-book-card ${isSelected ? 'selected' : ''}`}>
                <input
                  type="checkbox"
                  className="ext-book-checkbox"
                  checked={isSelected}
                  onChange={() => toggleSelectBook(book)}
                  title="Select for bulk import"
                />

                <div className="ext-card-header">
                  <div className="ext-cover-wrapper">
                    {book.coverImage ? (
                      <img
                        src={book.coverImage}
                        alt={book.title}
                        className="ext-cover-img"
                        loading="lazy"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="ext-cover-placeholder">
                        <BookOpen size={28} />
                      </div>
                    )}
                  </div>

                  <div className="ext-book-meta">
                    <span className="ext-source-tag">{book.source}</span>
                    <h3 className="ext-book-title" title={book.title}>
                      {book.title}
                    </h3>
                    <span className="ext-book-author">by {book.author}</span>

                    <div className="ext-book-specs">
                      {book.pageCount && (
                        <span className="spec-item">
                          <FileText size={12} /> {book.pageCount}p
                        </span>
                      )}
                      {book.publicationDate && (
                        <span className="spec-item">{book.publicationDate.slice(0, 4)}</span>
                      )}
                      {book.language && <span className="spec-item">{book.language}</span>}
                    </div>
                  </div>
                </div>

                <p className="ext-book-desc">{book.description}</p>

                {book.categories && book.categories.length > 0 && (
                  <div className="ext-categories-row">
                    {book.categories.slice(0, 3).map((cat, idx) => (
                      <span key={idx} className="ext-cat-chip">
                        {cat}
                      </span>
                    ))}
                  </div>
                )}

                <div className="ext-card-footer">
                  <div className="ext-price-box">
                    <span className="ext-price-label">Suggested</span>
                    <span className="ext-price-value">
                      ₦{(book.suggestedPrice || 4500).toLocaleString()}
                    </span>
                  </div>

                  <div className="ext-actions">
                    {onCustomizeBook && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => onCustomizeBook(book)}
                        title="Customize metadata & files before saving"
                      >
                        <Edit3 size={14} /> Customize
                      </Button>
                    )}

                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={() => handleSingleImport(book)}
                      disabled={isCurrentImporting}
                      title="1-Click direct import to store"
                    >
                      {isCurrentImporting ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Download size={14} />
                      )}
                      {isCurrentImporting ? 'Importing...' : '1-Click Import'}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
