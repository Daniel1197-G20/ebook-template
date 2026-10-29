const bcrypt = require('bcryptjs');
const prisma = require('../database/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const AppError = require('../utils/AppError');
const bookService = require('../services/bookService');
const storageService = require('../services/storageService');

exports.getStats = asyncHandler(async (req, res) => {
  const [totalBooks, publishedBooks, draftBooks, totalUsers, totalOrders, salesAgg] = await Promise.all([
    prisma.book.count(),
    prisma.book.count({ where: { published: true } }),
    prisma.book.count({ where: { published: false } }),
    prisma.user.count({ where: { role: 'CUSTOMER' } }),
    prisma.order.count({
      where: {
        OR: [
          { paymentStatus: { in: ['SUCCESS', 'SUCCESSFUL'] } },
          { status: 'PAID' },
        ],
      },
    }),
    prisma.order.aggregate({
      where: {
        OR: [
          { paymentStatus: { in: ['SUCCESS', 'SUCCESSFUL'] } },
          { status: 'PAID' },
        ],
      },
      _sum: { total: true },
    }),
  ]);

  const totalRevenue = salesAgg._sum.total ? Number(salesAgg._sum.total) : 0;

  const recentOrders = await prisma.order.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { name: true, email: true } },
      items: true,
    },
  });

  success(
    res,
    {
      stats: {
        totalBooks,
        publishedBooks,
        draftBooks,
        totalUsers,
        totalOrders,
        totalRevenue,
      },
      recentOrders,
    },
    'Admin statistics retrieved'
  );
});

exports.uploadFile = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError('No file uploaded', 400, 'NO_FILE');
  }

  const uploadType = req.body.type || req.file.fieldname || 'cover';
  let folder = 'covers';
  let isPublic = true;
  if (uploadType === 'preview') {
    folder = 'previews';
    isPublic = true;
  } else if (uploadType === 'ebook') {
    folder = 'ebooks';
    isPublic = false;
  }

  const uploadResult = await storageService.uploadFile({
    buffer: req.file.buffer,
    originalname: req.file.originalname,
    mimetype: req.file.mimetype,
    folder,
    isPublic,
  });

  success(
    res,
    {
      url: uploadResult.url,
      storagePath: uploadResult.storagePath,
      filename: uploadResult.filename,
      originalName: uploadResult.originalName,
      mimetype: uploadResult.mimetype,
      size: uploadResult.size,
      provider: uploadResult.provider,
    },
    'File uploaded successfully'
  );
});

exports.getAllBooks = asyncHandler(async (req, res) => {
  // Pass published='all' so admin sees both published and draft books
  const query = { ...req.query, published: req.query.published || 'all' };
  const result = await bookService.getBooks(query);
  success(res, result, 'All books retrieved for admin');
});

exports.getUsers = asyncHandler(async (req, res) => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      profileImage: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  success(res, { users }, 'Users list retrieved');
});

exports.createAdminUser = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    throw new AppError('Name, email, and password are required', 400);
  }

  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (existing) {
    throw new AppError('A user with this email already exists', 409);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const newAdmin = await prisma.user.create({
    data: {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      role: 'ADMIN',
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });

  success(res, { user: newAdmin }, 'New admin user created successfully', 201);
});

exports.toggleUserRole = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Toggle role between CUSTOMER and ADMIN
  const newRole = user.role === 'ADMIN' ? 'CUSTOMER' : 'ADMIN';
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { role: newRole },
    select: { id: true, name: true, email: true, role: true },
  });

  success(res, { user: updatedUser }, `User role changed to ${newRole}`);
});
