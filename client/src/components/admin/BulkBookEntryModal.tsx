import { useState } from 'react';
import {
  X,
  Layers,
  Plus,
  Trash2,
  FileSpreadsheet,
  FileCode,
  CheckCircle,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { adminApi } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Button } from '../ui/Button';
import './BulkBookEntryModal.css';

interface BulkBookEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface BookRow {
  id: string;
  title: string;
  author: string;
  price: string;
  currency: string;
  categoryNames: string;
  format: string;
  coverImage: string;
  description: string;
}

const SAMPLE_CSV = `Title,Author,Price,Currency,Category,CoverImage,Description
Mastering React & TypeScript,Elena Vance,6500,NGN,Programming,https://covers.openlibrary.org/b/isbn/9780132350884-L.jpg,A modern deep-dive into building scalable applications with React.
Startup Playbook 2026,Marcus Sterling,5000,NGN,Business,https://covers.openlibrary.org/b/isbn/9780804139298-L.jpg,Step-by-step strategies for high-growth tech ventures.
Mindset for High Performers,Dr. Sarah Chen,4500,NGN,Self-Help,https://covers.openlibrary.org/b/isbn/9780735211292-L.jpg,Unlock cognitive stamina and deep flow state.`;

export function BulkBookEntryModal({ isOpen, onClose, onSuccess }: BulkBookEntryModalProps) {
  const { success, error, info } = useToast();

  const [activeTab, setActiveTab] = useState<'grid' | 'csv'>('grid');
  const [loading, setLoading] = useState(false);

  // Grid Mode State
  const [rows, setRows] = useState<BookRow[]>([
    {
      id: '1',
      title: '',
      author: '',
      price: '4500',
      currency: 'NGN',
      categoryNames: 'General',
      format: 'PDF',
      coverImage: '',
      description: '',
    },
    {
      id: '2',
      title: '',
      author: '',
      price: '4500',
      currency: 'NGN',
      categoryNames: 'General',
      format: 'PDF',
      coverImage: '',
      description: '',
    },
  ]);

  // CSV / JSON Mode State
  const [csvText, setCsvText] = useState(SAMPLE_CSV);

  if (!isOpen) return null;

  const handleAddRow = () => {
    setRows([
      ...rows,
      {
        id: Date.now().toString(),
        title: '',
        author: '',
        price: '4500',
        currency: 'NGN',
        categoryNames: 'General',
        format: 'PDF',
        coverImage: '',
        description: '',
      },
    ]);
  };

  const handleRemoveRow = (id: string) => {
    if (rows.length === 1) {
      error('At least one row is required');
      return;
    }
    setRows(rows.filter((r) => r.id !== id));
  };

  const handleRowChange = (id: string, field: keyof BookRow, val: string) => {
    setRows(
      rows.map((r) => {
        if (r.id === id) {
          return { ...r, [field]: val };
        }
        return r;
      })
    );
  };

  const parseCsvToBooks = (text: string) => {
    const lines = text
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length === 0) return [];

    // Check if it's JSON
    if (text.trim().startsWith('[') && text.trim().endsWith(']')) {
      try {
        const json = JSON.parse(text);
        return json.map((b: Record<string, unknown>) => ({
          title: b.title || 'Untitled',
          author: b.author || 'Unknown',
          price: parseFloat(b.price as string) || 0,
          currency: b.currency || 'NGN',
          categoryNames: Array.isArray(b.categories) ? b.categories : b.category ? [b.category] : ['General'],
          coverImage: b.coverImage || null,
          description: b.description || `Book by ${b.author || 'Author'}`,
          format: b.format || 'PDF',
        }));
      } catch (err) {
        console.error(err);
      }
    }

    // CSV Parse
    const books = [];
    const startIndex = lines[0].toLowerCase().includes('title') ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
      const parts = lines[i].split(',').map((p) => p.trim());
      if (parts.length >= 2 && parts[0] && parts[1]) {
        books.push({
          title: parts[0],
          author: parts[1],
          price: parseFloat(parts[2]) || 4500,
          currency: parts[3] || 'NGN',
          categoryNames: parts[4] ? parts[4].split(';').map((s) => s.trim()) : ['General'],
          coverImage: parts[5] || null,
          description: parts[6] || `A book titled ${parts[0]} by ${parts[1]}`,
          format: 'PDF',
        });
      }
    }

    return books;
  };

  const handleSubmit = async () => {
    let booksToCreate: Record<string, unknown>[] = [];

    if (activeTab === 'grid') {
      const validRows = rows.filter((r) => r.title.trim() && r.author.trim());
      if (validRows.length === 0) {
        error('Please provide at least one valid book with Title and Author');
        return;
      }

      booksToCreate = validRows.map((r) => ({
        title: r.title.trim(),
        author: r.author.trim(),
        price: parseFloat(r.price) || 0,
        currency: r.currency || 'NGN',
        format: r.format || 'PDF',
        categoryNames: r.categoryNames ? r.categoryNames.split(',').map((s) => s.trim()) : ['General'],
        coverImage: r.coverImage.trim() || null,
        description: r.description.trim() || `A publication by ${r.author.trim()}`,
      }));
    } else {
      booksToCreate = parseCsvToBooks(csvText);
      if (booksToCreate.length === 0) {
        error('No valid book entries could be parsed from the CSV/JSON text');
        return;
      }
    }

    setLoading(true);
    try {
      const res = await adminApi.bulkCreateBooks(booksToCreate);
      const { createdCount, errorsCount } = res.data.data;
      success(`Successfully created ${createdCount} book(s) in the catalog!`);
      if (errorsCount > 0) {
        info(`Note: ${errorsCount} entries failed.`);
      }
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } }).response?.data?.message ||
        'Bulk creation failed';
      error(msg);
    } finally {
      setLoading(false);
    }
  };

  const parsedCount = activeTab === 'csv' ? parseCsvToBooks(csvText).length : rows.filter((r) => r.title.trim()).length;

  return (
    <div className="bulk-modal-overlay" onClick={onClose}>
      <div className="bulk-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="bulk-modal-header">
          <div className="bulk-modal-title">
            <Layers size={22} className="bulk-modal-icon" />
            <div>
              <h3>Manual Batch Book Input & CSV Import</h3>
            </div>
          </div>
          <button className="bulk-modal-close" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="bulk-modal-tabs">
          <button
            type="button"
            className={`bulk-tab-btn ${activeTab === 'grid' ? 'active' : ''}`}
            onClick={() => setActiveTab('grid')}
          >
            <FileSpreadsheet size={16} /> Interactive Table Rows
          </button>
          <button
            type="button"
            className={`bulk-tab-btn ${activeTab === 'csv' ? 'active' : ''}`}
            onClick={() => setActiveTab('csv')}
          >
            <FileCode size={16} /> Paste CSV / JSON List
          </button>
        </div>

        {/* Modal Content Body */}
        <div className="bulk-modal-body">
          {activeTab === 'grid' ? (
            <>
              <div className="bulk-table-toolbar">
                <span style={{ fontSize: '0.88rem', color: 'var(--color-text-muted, #94a3b8)' }}>
                  Add multiple book entries quickly. Required fields: Title, Author.
                </span>
                <Button type="button" variant="secondary" size="sm" onClick={handleAddRow}>
                  <Plus size={14} /> Add Another Row
                </Button>
              </div>

              <div className="bulk-table-wrapper">
                <table className="bulk-entry-table">
                  <thead>
                    <tr>
                      <th style={{ width: '22%' }}>Title *</th>
                      <th style={{ width: '18%' }}>Author *</th>
                      <th style={{ width: '12%' }}>Price</th>
                      <th style={{ width: '10%' }}>Currency</th>
                      <th style={{ width: '14%' }}>Categories</th>
                      <th style={{ width: '18%' }}>Cover Image URL</th>
                      <th style={{ width: '6%' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.id}>
                        <td>
                          <input
                            type="text"
                            placeholder="e.g. Masterclass in Go"
                            value={row.title}
                            onChange={(e) => handleRowChange(row.id, 'title', e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            placeholder="e.g. Alex Johnson"
                            value={row.author}
                            onChange={(e) => handleRowChange(row.id, 'author', e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            placeholder="4500"
                            value={row.price}
                            onChange={(e) => handleRowChange(row.id, 'price', e.target.value)}
                          />
                        </td>
                        <td>
                          <select
                            value={row.currency}
                            onChange={(e) => handleRowChange(row.id, 'currency', e.target.value)}
                          >
                            <option value="NGN">NGN (₦)</option>
                            <option value="USD">USD ($)</option>
                            <option value="EUR">EUR (€)</option>
                          </select>
                        </td>
                        <td>
                          <input
                            type="text"
                            placeholder="Tech, Code"
                            value={row.categoryNames}
                            onChange={(e) => handleRowChange(row.id, 'categoryNames', e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            placeholder="https://... or /uploads/..."
                            value={row.coverImage}
                            onChange={(e) => handleRowChange(row.id, 'coverImage', e.target.value)}
                          />
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            className="bulk-delete-row-btn"
                            onClick={() => handleRemoveRow(row.id)}
                            title="Remove row"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="csv-mode-container">
              <div className="csv-top-bar">
                <span style={{ fontSize: '0.88rem', color: 'var(--color-text-muted, #94a3b8)' }}>
                  Format: <code>Title,Author,Price,Currency,Category,CoverUrl,Description</code> or JSON array
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setCsvText(SAMPLE_CSV)}
                >
                  <Sparkles size={14} /> Load Sample Template
                </Button>
              </div>

              <textarea
                className="csv-textarea"
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder="Paste CSV rows or JSON array..."
              />

              <div className="csv-preview-box">
                <CheckCircle size={16} style={{ color: '#34d399' }} />
                <span>
                  Parsed <strong>{parsedCount}</strong> ready book entries from text
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bulk-modal-footer">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="button" variant="primary" onClick={handleSubmit} disabled={loading || parsedCount === 0}>
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Creating Books...
              </>
            ) : (
              `Create & Save ${parsedCount} Book(s)`
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
