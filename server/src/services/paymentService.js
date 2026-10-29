const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const prisma = require('../database/prisma');
const config = require('../config');
const AppError = require('../utils/AppError');
const cartService = require('./cartService');

const PAYSTACK_BASE = 'https://api.paystack.co';

const generateOrderNumber = () => {
  const date = new Date();
  const y = date.getFullYear().toString().slice(-2);
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `EB${y}${m}${d}${rand}`;
};

const initializePayment = async (userId, { bookIds }) => {
  if (!config.paystack.secretKey) {
    throw new AppError('Payment gateway is not configured', 503, 'PAYMENT_NOT_CONFIGURED');
  }

  if (!bookIds || !Array.isArray(bookIds) || bookIds.length === 0) {
    throw new AppError('No books selected for checkout', 400, 'NO_BOOKS');
  }

  const uniqueIds = [...new Set(bookIds)];

  const books = await prisma.book.findMany({
    where: { id: { in: uniqueIds }, published: true },
  });

  if (books.length !== uniqueIds.length) {
    throw new AppError('One or more selected books are unavailable', 400, 'INVALID_BOOKS');
  }

  // Check ownership
  const existingPurchases = await prisma.purchase.findMany({
    where: { userId, bookId: { in: uniqueIds } },
  });
  if (existingPurchases.length > 0) {
    throw new AppError('You already own one or more of these books', 400, 'ALREADY_OWNED');
  }

  // Authoritative pricing from DB
  const subtotal = books.reduce((sum, b) => sum + Number(b.price), 0);
  const total = subtotal;
  const currency = books[0]?.currency || 'NGN';

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError('User not found', 404, 'USER_NOT_FOUND');

  const orderNumber = generateOrderNumber();
  const reference = `eb_${uuidv4().replace(/-/g, '')}`;

  // Handle free books (price == 0) directly
  if (total === 0) {
    const order = await prisma.$transaction(async (txClient) => {
      const createdOrder = await txClient.order.create({
        data: {
          orderNumber,
          userId,
          subtotal: 0,
          total: 0,
          currency,
          status: 'PAID',
          paymentStatus: 'SUCCESS',
          paymentReference: reference,
          items: {
            create: books.map((b) => ({
              bookId: b.id,
              price: 0,
              titleSnapshot: b.title,
            })),
          },
        },
        include: { items: true },
      });

      for (const item of books) {
        await txClient.purchase.upsert({
          where: {
            userId_bookId: { userId, bookId: item.id },
          },
          create: {
            userId,
            bookId: item.id,
            orderId: createdOrder.id,
          },
          update: {},
        });
      }

      await txClient.cartItem.deleteMany({
        where: {
          userId,
          bookId: { in: uniqueIds },
        },
      });

      return createdOrder;
    });

    return {
      orderId: order.id,
      orderNumber,
      reference,
      authorizationUrl: `${config.frontendUrl}/payment/callback?reference=${reference}`,
      accessCode: null,
      amount: 0,
      currency,
      isFree: true,
    };
  }

  const order = await prisma.order.create({
    data: {
      orderNumber,
      userId,
      subtotal,
      total,
      currency,
      status: 'PENDING',
      paymentStatus: 'PENDING',
      paymentReference: reference,
      items: {
        create: books.map((b) => ({
          bookId: b.id,
          price: b.price,
          titleSnapshot: b.title,
        })),
      },
    },
    include: { items: true },
  });

  // Initialize Paystack
  const amountInKobo = Math.round(total * 100);

  const response = await fetch(`${PAYSTACK_BASE}/transaction/initialize`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.paystack.secretKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: user.email,
      amount: amountInKobo,
      currency,
      reference,
      callback_url: `${config.frontendUrl}/payment/callback?reference=${reference}`,
      metadata: {
        orderId: order.id,
        orderNumber,
        userId,
        bookIds: uniqueIds,
      },
    }),
  });

  const result = await response.json();

  if (!result.status) {
    await prisma.order.update({
      where: { id: order.id },
      data: { status: 'FAILED', paymentStatus: 'FAILED' },
    });
    throw new AppError(result.message || 'Payment initialization failed', 502, 'PAYSTACK_ERROR');
  }

  await prisma.order.update({
    where: { id: order.id },
    data: { paystackAccessCode: result.data.access_code },
  });

  return {
    orderId: order.id,
    orderNumber,
    reference,
    authorizationUrl: result.data.authorization_url,
    accessCode: result.data.access_code,
    amount: total,
    currency,
  };
};

const verifyTransaction = async (reference) => {
  if (!config.paystack.secretKey) {
    throw new AppError('Payment gateway is not configured', 503, 'PAYMENT_NOT_CONFIGURED');
  }

  const response = await fetch(`${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: {
      Authorization: `Bearer ${config.paystack.secretKey}`,
    },
  });

  const result = await response.json();

  if (!result.status) {
    throw new AppError(result.message || 'Verification failed', 400, 'VERIFICATION_FAILED');
  }

  return result.data;
};

const confirmPayment = async (reference, requestingUserId = null) => {
  const order = await prisma.order.findUnique({
    where: { paymentReference: reference },
    include: { items: { include: { book: true } }, user: { select: { id: true, email: true, name: true } } },
  });

  if (!order) {
    throw new AppError('Order not found', 404, 'ORDER_NOT_FOUND');
  }

  // Authorization check: if called via protected endpoint with userId, ensure it matches order owner
  if (requestingUserId && order.userId !== requestingUserId) {
    throw new AppError('Unauthorized access to this order', 403, 'FORBIDDEN');
  }

  // Idempotency: already paid
  if (order.paymentStatus === 'SUCCESS' && order.status === 'PAID') {
    return { order, alreadyProcessed: true };
  }

  // Free order confirmation
  if (Number(order.total) === 0) {
    return { order, alreadyProcessed: true };
  }

  const tx = await verifyTransaction(reference);

  if (tx.status !== 'success') {
    await prisma.order.update({
      where: { id: order.id },
      data: { paymentStatus: 'FAILED', status: 'FAILED' },
    });
    throw new AppError('Payment was not successful', 400, 'PAYMENT_FAILED');
  }

  // Verify amount (Paystack returns amount in kobo/lowest unit)
  const expectedAmount = Math.round(Number(order.total) * 100);
  if (Number(tx.amount) !== expectedAmount) {
    throw new AppError('Payment amount mismatch', 400, 'AMOUNT_MISMATCH');
  }

  // Verify currency
  if (order.currency && tx.currency && tx.currency.toUpperCase() !== order.currency.toUpperCase()) {
    throw new AppError('Payment currency mismatch', 400, 'CURRENCY_MISMATCH');
  }

  // Mark paid + create entitlements in an atomic transaction
  const updated = await prisma.$transaction(async (txClient) => {
    // Re-check order status inside transaction to prevent concurrent race condition
    const freshOrder = await txClient.order.findUnique({
      where: { id: order.id },
      include: { items: { include: { book: true } } },
    });

    if (freshOrder.paymentStatus === 'SUCCESS' && freshOrder.status === 'PAID') {
      return freshOrder;
    }

    const updatedOrder = await txClient.order.update({
      where: { id: order.id },
      data: {
        status: 'PAID',
        paymentStatus: 'SUCCESS',
      },
      include: { items: { include: { book: true } } },
    });

    for (const item of order.items) {
      await txClient.purchase.upsert({
        where: {
          userId_bookId: { userId: order.userId, bookId: item.bookId },
        },
        create: {
          userId: order.userId,
          bookId: item.bookId,
          orderId: order.id,
        },
        update: {},
      });
    }

    // Clear purchased books from user's cart
    await txClient.cartItem.deleteMany({
      where: {
        userId: order.userId,
        bookId: { in: order.items.map((i) => i.bookId) },
      },
    });

    return updatedOrder;
  });

  return { order: updated, alreadyProcessed: false };
};

const handleWebhook = async (event, signature, rawBody) => {
  if (!config.paystack.secretKey) {
    throw new AppError('Paystack secret key is not configured', 500, 'GATEWAY_NOT_CONFIGURED');
  }

  if (!signature) {
    throw new AppError('Webhook signature header missing', 401, 'SIGNATURE_MISSING');
  }

  const bodyStr = rawBody ? (Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : String(rawBody)) : JSON.stringify(event);
  const expectedHash = crypto.createHmac('sha512', config.paystack.secretKey).update(bodyStr).digest('hex');

  const sigBuffer = Buffer.from(signature, 'utf8');
  const expectedBuffer = Buffer.from(expectedHash, 'utf8');

  if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
    throw new AppError('Invalid Paystack webhook signature', 401, 'INVALID_SIGNATURE');
  }

  if (event && event.event === 'charge.success') {
    const reference = event.data?.reference;
    if (reference) {
      await confirmPayment(reference);
    }
  }

  return { received: true };
};

module.exports = {
  initializePayment,
  verifyTransaction,
  confirmPayment,
  handleWebhook,
};
