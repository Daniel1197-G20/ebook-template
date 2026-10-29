const prisma = require('../database/prisma');
const AppError = require('../utils/AppError');
const { Prisma } = require('@prisma/client');

const slugify = (text) =>
  text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');

/**
 * Generate a unique slug by appending incremental integers or random bytes if collided
 */
const generateUniqueSlug = async (text, currentBookId = null) => {
  const baseSlug = slugify(text) || 'book';
  let candidate = baseSlug;
  let counter = 1;

  while (true) {
    const existing = await prisma.book.findUnique({ where: { slug: candidate } });
    if (!existing || (currentBookId && existing.id === currentBookId)) {
      return candidate;
    }
    candidate = `${baseSlug}-${counter}`;
    counter++;
    if (counter > 50) {
      candidate = `${baseSlug}-${Date.now().toString(36)}`;
      return candidate;
    }
  }
};

/**
 * Helper to resolve category IDs from an array of IDs and/or category name strings
 */
const resolveCategoryIds = async (categoryIds = [], categoryNames = []) => {
  const resolvedIds = new Set(Array.isArray(categoryIds) ? categoryIds.filter(Boolean) : []);

  if (Array.isArray(categoryNames) && categoryNames.length > 0) {
    for (const rawName of categoryNames) {
      const name = typeof rawName === 'string' ? rawName.trim() : '';
      if (!name) continue;

      const slug = slugify(name);
      let category = await prisma.category.findUnique({ where: { slug } });
      if (!category) {
        // Create category if it doesn't exist
        category = await prisma.category.create({
          data: {
            name,
            slug,
            description: `Books in ${name}`,
          },
        });
      }
      resolvedIds.add(category.id);
    }
  }

  return Array.from(resolvedIds);
};

const getBooks = async (query = {}) => {
  const {
    search,
    category,
    featured,
    published = 'true',
    sort = 'newest',
    page = 1,
    limit = 20,
    minPrice,
    maxPrice,
  } = query;

  const where = {};

  if (published === 'true') where.published = true;
  if (published === 'false') where.published = false;
  // If published === 'all', we don't set where.published filter

  if (featured === 'true') where.featured = true;

  if (search) {
    where.OR = [
      { title: { contains: search } },
      { author: { contains: search } },
      { description: { contains: search } },
    ];
  }

  if (category) {
    where.categories = {
      some: {
        category: { slug: category },
      },
    };
  }

  if (minPrice || maxPrice) {
    where.price = {};
    if (minPrice) where.price.gte = new Prisma.Decimal(minPrice);
    if (maxPrice) where.price.lte = new Prisma.Decimal(maxPrice);
  }

  let orderBy = { createdAt: 'desc' };
  if (sort === 'price_asc') orderBy = { price: 'asc' };
  if (sort === 'price_desc') orderBy = { price: 'desc' };
  if (sort === 'title') orderBy = { title: 'asc' };
  if (sort === 'oldest') orderBy = { createdAt: 'asc' };

  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  const take = parseInt(limit, 10);

  const [books, total] = await Promise.all([
    prisma.book.findMany({
      where,
      orderBy,
      skip,
      take,
      include: {
        categories: { include: { category: true } },
        reviews: { select: { rating: true } },
        _count: { select: { reviews: true, purchases: true } },
      },
    }),
    prisma.book.count({ where }),
  ]);

  const data = books.map((book) => {
    const ratings = book.reviews.map((r) => r.rating);
    const avgRating =
      ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;

    return {
      id: book.id,
      title: book.title,
      slug: book.slug,
      author: book.author,
      description: book.description,
      shortDescription: book.shortDescription,
      coverImage: book.coverImage,
      previewFile: book.previewFile,
      ebookFile: book.ebookFile,
      price: Number(book.price),
      currency: book.currency,
      isbn: book.isbn,
      featured: book.featured,
      published: book.published,
      format: book.format,
      pageCount: book.pageCount,
      language: book.language,
      publicationDate: book.publicationDate,
      categories: book.categories.map((c) => c.category),
      averageRating: Math.round(avgRating * 10) / 10,
      reviewCount: book._count.reviews,
      purchaseCount: book._count.purchases,
      createdAt: book.createdAt,
      updatedAt: book.updatedAt,
    };
  });

  return {
    books: data,
    pagination: {
      page: parseInt(page, 10),
      limit: take,
      total,
      totalPages: Math.ceil(total / take),
    },
  };
};

const getBookBySlug = async (slug, userId = null) => {
  const book = await prisma.book.findUnique({
    where: { slug },
    include: {
      categories: { include: { category: true } },
      tags: { include: { tag: true } },
      reviews: {
        include: {
          user: { select: { id: true, name: true, profileImage: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      },
      _count: { select: { reviews: true, purchases: true } },
    },
  });

  if (!book) {
    throw new AppError('Book not found', 404, 'BOOK_NOT_FOUND');
  }

  let owned = false;
  if (userId) {
    const purchase = await prisma.purchase.findUnique({
      where: { userId_bookId: { userId, bookId: book.id } },
    });
    owned = !!purchase;
  }

  const ratings = book.reviews.map((r) => r.rating);
  const avgRating =
    ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;

  return {
    id: book.id,
    title: book.title,
    slug: book.slug,
    author: book.author,
    description: book.description,
    shortDescription: book.shortDescription,
    coverImage: book.coverImage,
    previewFile: book.previewFile,
    ebookFile: book.ebookFile,
    price: Number(book.price),
    currency: book.currency,
    isbn: book.isbn,
    publicationDate: book.publicationDate,
    pageCount: book.pageCount,
    language: book.language,
    format: book.format,
    featured: book.featured,
    published: book.published,
    categories: book.categories.map((c) => c.category),
    tags: book.tags.map((t) => t.tag),
    reviews: book.reviews,
    averageRating: Math.round(avgRating * 10) / 10,
    reviewCount: book._count.reviews,
    purchaseCount: book._count.purchases,
    owned,
    createdAt: book.createdAt,
    updatedAt: book.updatedAt,
  };
};

const createBook = async (data) => {
  const { categoryIds, categoryNames, ...bookData } = data;
  const slug = await generateUniqueSlug(bookData.slug || bookData.title);

  const book = await prisma.book.create({
    data: {
      title: bookData.title.trim(),
      slug,
      author: bookData.author.trim(),
      description: bookData.description.trim(),
      shortDescription: bookData.shortDescription ? bookData.shortDescription.trim() : null,
      coverImage: bookData.coverImage ? bookData.coverImage.trim() : null,
      previewFile: bookData.previewFile ? bookData.previewFile.trim() : null,
      ebookFile: bookData.ebookFile ? bookData.ebookFile.trim() : null,
      price: new Prisma.Decimal(bookData.price || 0),
      currency: bookData.currency || 'NGN',
      isbn: bookData.isbn ? bookData.isbn.trim() : null,
      publicationDate: bookData.publicationDate ? new Date(bookData.publicationDate) : null,
      pageCount: bookData.pageCount ? parseInt(bookData.pageCount, 10) : null,
      language: bookData.language || 'English',
      format: bookData.format || 'PDF',
      featured: Boolean(bookData.featured),
      published: bookData.published !== undefined ? Boolean(bookData.published) : true,
    },
  });

  const resolvedCategoryIds = await resolveCategoryIds(categoryIds, categoryNames);
  if (resolvedCategoryIds.length > 0) {
    await prisma.bookCategory.createMany({
      data: resolvedCategoryIds.map((catId) => ({ bookId: book.id, categoryId: catId })),
    });
  }

  return getBookBySlug(book.slug);
};

const updateBook = async (id, data) => {
  const book = await prisma.book.findUnique({ where: { id } });
  if (!book) throw new AppError('Book not found', 404, 'BOOK_NOT_FOUND');

  const { categoryIds, categoryNames, ...updateData } = data;
  let newSlug = undefined;

  if (updateData.slug || (updateData.title && updateData.title !== book.title)) {
    newSlug = await generateUniqueSlug(updateData.slug || updateData.title, id);
  }

  const updated = await prisma.book.update({
    where: { id },
    data: {
      ...(updateData.title && { title: updateData.title.trim() }),
      ...(newSlug && { slug: newSlug }),
      ...(updateData.author && { author: updateData.author.trim() }),
      ...(updateData.description && { description: updateData.description.trim() }),
      ...(updateData.shortDescription !== undefined && {
        shortDescription: updateData.shortDescription ? updateData.shortDescription.trim() : null,
      }),
      ...(updateData.coverImage !== undefined && {
        coverImage: updateData.coverImage ? updateData.coverImage.trim() : null,
      }),
      ...(updateData.previewFile !== undefined && {
        previewFile: updateData.previewFile ? updateData.previewFile.trim() : null,
      }),
      ...(updateData.ebookFile !== undefined && {
        ebookFile: updateData.ebookFile ? updateData.ebookFile.trim() : null,
      }),
      ...(updateData.price !== undefined && { price: new Prisma.Decimal(updateData.price) }),
      ...(updateData.currency && { currency: updateData.currency }),
      ...(updateData.isbn !== undefined && { isbn: updateData.isbn ? updateData.isbn.trim() : null }),
      ...(updateData.publicationDate !== undefined && {
        publicationDate: updateData.publicationDate ? new Date(updateData.publicationDate) : null,
      }),
      ...(updateData.pageCount !== undefined && {
        pageCount: updateData.pageCount ? parseInt(updateData.pageCount, 10) : null,
      }),
      ...(updateData.language && { language: updateData.language }),
      ...(updateData.format && { format: updateData.format }),
      ...(updateData.featured !== undefined && { featured: Boolean(updateData.featured) }),
      ...(updateData.published !== undefined && { published: Boolean(updateData.published) }),
    },
  });

  if (categoryIds !== undefined || categoryNames !== undefined) {
    const resolvedCategoryIds = await resolveCategoryIds(categoryIds || [], categoryNames || []);
    await prisma.bookCategory.deleteMany({ where: { bookId: id } });
    if (resolvedCategoryIds.length > 0) {
      await prisma.bookCategory.createMany({
        data: resolvedCategoryIds.map((catId) => ({ bookId: id, categoryId: catId })),
      });
    }
  }

  return getBookBySlug(updated.slug);
};

const deleteBook = async (id) => {
  const book = await prisma.book.findUnique({ where: { id } });
  if (!book) throw new AppError('Book not found', 404, 'BOOK_NOT_FOUND');
  await prisma.book.delete({ where: { id } });
  return true;
};

/**
 * Bulk create a list of books entered manually or from CSV/JSON
 */
const bulkCreateBooks = async (booksList = []) => {
  if (!Array.isArray(booksList) || booksList.length === 0) {
    throw new AppError('Please provide a valid list of books to create', 400);
  }

  const created = [];
  const errors = [];

  for (const item of booksList) {
    try {
      if (!item.title || !item.author) {
        throw new Error('Title and Author are required');
      }

      const book = await createBook(item);
      created.push(book);
    } catch (err) {
      errors.push({
        title: item.title || 'Untitled',
        error: err.message,
      });
    }
  }

  return {
    createdCount: created.length,
    created,
    errorsCount: errors.length,
    errors,
  };
};

/**
 * Bulk update multiple books at once (status, price, featured, delete)
 */
const bulkUpdateBooks = async ({ bookIds = [], action, updates = {} }) => {
  if (!Array.isArray(bookIds) || bookIds.length === 0) {
    throw new AppError('No book IDs specified for bulk operation', 400);
  }

  if (action === 'delete') {
    const res = await prisma.book.deleteMany({
      where: { id: { in: bookIds } },
    });
    return { count: res.count, message: `${res.count} books deleted successfully` };
  }

  if (action === 'publish') {
    const res = await prisma.book.updateMany({
      where: { id: { in: bookIds } },
      data: { published: true },
    });
    return { count: res.count, message: `${res.count} books published` };
  }

  if (action === 'unpublish') {
    const res = await prisma.book.updateMany({
      where: { id: { in: bookIds } },
      data: { published: false },
    });
    return { count: res.count, message: `${res.count} books moved to draft` };
  }

  if (action === 'feature') {
    const res = await prisma.book.updateMany({
      where: { id: { in: bookIds } },
      data: { featured: true },
    });
    return { count: res.count, message: `${res.count} books marked as featured` };
  }

  if (action === 'unfeature') {
    const res = await prisma.book.updateMany({
      where: { id: { in: bookIds } },
      data: { featured: false },
    });
    return { count: res.count, message: `${res.count} books removed from featured` };
  }

  if (action === 'updatePrice' && updates.price !== undefined) {
    const res = await prisma.book.updateMany({
      where: { id: { in: bookIds } },
      data: {
        price: new Prisma.Decimal(updates.price),
        ...(updates.currency && { currency: updates.currency }),
      },
    });
    return { count: res.count, message: `${res.count} books updated with new price` };
  }

  if (action === 'addCategory' && updates.categoryId) {
    let addedCount = 0;
    for (const id of bookIds) {
      try {
        await prisma.bookCategory.upsert({
          where: { bookId_categoryId: { bookId: id, categoryId: updates.categoryId } },
          create: { bookId: id, categoryId: updates.categoryId },
          update: {},
        });
        addedCount++;
      } catch (_) {}
    }
    return { count: addedCount, message: `Category assigned to ${addedCount} books` };
  }

  throw new AppError('Invalid bulk action specified', 400);
};

module.exports = {
  getBooks,
  getBookBySlug,
  createBook,
  updateBook,
  deleteBook,
  bulkCreateBooks,
  bulkUpdateBooks,
  slugify,
  generateUniqueSlug,
  resolveCategoryIds,
};
