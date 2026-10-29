import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, BookOpen, ArrowRight, Library, ShoppingCart, RefreshCw, Sparkles } from 'lucide-react';
import { paymentsApi } from '../services/api';
import './PaymentCallbackPage.css';

interface OrderItem {
  id: string;
  bookId: string;
  price: number;
  titleSnapshot: string;
  book?: {
    id: string;
    title: string;
    coverImage?: string;
    author: string;
  };
}

interface OrderResult {
  id: string;
  orderNumber: string;
  total: number;
  currency: string;
  status: string;
  paymentStatus: string;
  items: OrderItem[];
}

export function PaymentCallbackPage() {
  const [searchParams] = useSearchParams();
  const reference = searchParams.get('reference') || searchParams.get('trxref') || '';

  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [order, setOrder] = useState<OrderResult | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const verifyPayment = async () => {
    if (!reference) {
      setStatus('error');
      setErrorMessage('No payment reference found in callback URL.');
      return;
    }

    setStatus('verifying');
    setErrorMessage('');

    try {
      const res = await paymentsApi.verify(reference);
      const data = res.data.data;
      setOrder(data.order);
      setStatus('success');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'We could not verify this transaction. If you were debited, please contact support.';
      setErrorMessage(msg);
      setStatus('error');
    }
  };

  useEffect(() => {
    verifyPayment();
  }, [reference]);

  const formatPrice = (price: number, currency = 'NGN') =>
    new Intl.NumberFormat('en-NG', { style: 'currency', currency, minimumFractionDigits: 0 }).format(price);

  return (
    <main className="callback-page">
      <div className="callback-container">
        {status === 'verifying' && (
          <motion.div
            className="glass-callback-card"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="callback-spinner-stage">
              <div className="glass-spinner" />
            </div>
            <h2>Confirming Your Payment</h2>
            <p className="callback-subtext">
              Please wait while we securely verify your Paystack transaction and unlock your digital books...
            </p>
            <span className="reference-pill">Ref: {reference || 'Verifying...'}</span>
          </motion.div>
        )}

        {status === 'success' && (
          <motion.div
            className="glass-callback-card success"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="status-icon success-icon">
              <CheckCircle2 size={48} />
            </div>

            <div className="celebration-badge">
              <Sparkles size={16} /> Payment Verified & Confirmed
            </div>

            <h1>Thank You for Your Order!</h1>
            <p className="callback-subtext">
              Your transaction was successful. Your volumes have been added to your personal library and are ready to read and download.
            </p>

            {order && (
              <div className="order-details-box">
                <div className="order-meta-header">
                  <div>
                    <span className="label">Order Number</span>
                    <span className="val">{order.orderNumber}</span>
                  </div>
                  <div className="align-right">
                    <span className="label">Total Paid</span>
                    <span className="val price">{formatPrice(order.total, order.currency)}</span>
                  </div>
                </div>

                {order.items && order.items.length > 0 && (
                  <div className="order-items-preview">
                    <h4>Purchased Items</h4>
                    <div className="items-list">
                      {order.items.map((item) => (
                        <div key={item.id} className="order-item-row">
                          <div className="item-icon">
                            <BookOpen size={16} />
                          </div>
                          <span className="item-title">{item.titleSnapshot || item.book?.title || 'Digital eBook'}</span>
                          <span className="item-price">{formatPrice(item.price, order.currency)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="callback-actions">
              <Link to="/dashboard/library" className="btn-action primary">
                <Library size={18} /> Go to My Library <ArrowRight size={16} />
              </Link>
              <Link to="/books" className="btn-action secondary">
                <BookOpen size={18} /> Explore More Books
              </Link>
            </div>
          </motion.div>
        )}

        {status === 'error' && (
          <motion.div
            className="glass-callback-card error"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="status-icon error-icon">
              <XCircle size={48} />
            </div>

            <h1>Payment Verification Failed</h1>
            <p className="callback-subtext">{errorMessage}</p>

            <div className="error-ref-box">
              <span>Transaction Reference:</span>
              <code>{reference || 'None provided'}</code>
            </div>

            <div className="callback-actions">
              <button onClick={verifyPayment} className="btn-action primary">
                <RefreshCw size={18} /> Retry Verification
              </button>
              <Link to="/cart" className="btn-action secondary">
                <ShoppingCart size={18} /> Return to Cart
              </Link>
            </div>
          </motion.div>
        )}
      </div>
    </main>
  );
}
