const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const externalBookService = require('../services/externalBookService');
const bookService = require('../services/bookService');

exports.searchExternalBooks = asyncHandler(async (req, res) => {
  const { q, query, genre, provider, page, limit } = req.query;
  const result = await externalBookService.searchExternalBooks({
    query: q || query || '',
    genre: genre || 'all',
    provider: provider || 'all',
    page: parseInt(page || '1', 10),
    limit: parseInt(limit || '18', 10),
  });

  success(res, result, 'External books retrieved successfully');
});

exports.getGenres = asyncHandler(async (req, res) => {
  const genres = externalBookService.getGenres();
  success(res, { genres }, 'Genres list retrieved');
});

exports.lookupBook = asyncHandler(async (req, res) => {
  const { query, q, isbn } = req.query;
  const term = isbn || query || q;
  const book = await externalBookService.lookupBookByQuery(term);
  success(res, { book }, 'Book details retrieved');
});

exports.importExternalBooks = asyncHandler(async (req, res) => {
  const { books, defaultOverrides } = req.body;
  const result = await externalBookService.importExternalBooks(books, defaultOverrides || {});
  success(
    res,
    result,
    `Successfully imported ${result.importedCount} book(s) into the store catalog`,
    201
  );
});

exports.bulkCreateBooks = asyncHandler(async (req, res) => {
  const { books } = req.body;
  const result = await bookService.bulkCreateBooks(books);
  success(
    res,
    result,
    `Successfully created ${result.createdCount} book(s)`,
    201
  );
});

exports.bulkUpdateBooks = asyncHandler(async (req, res) => {
  const { bookIds, action, updates } = req.body;
  const result = await bookService.bulkUpdateBooks({ bookIds, action, updates });
  success(res, result, result.message || 'Bulk operation completed');
});
