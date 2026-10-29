const https = require('https');
const http = require('http');
const prisma = require('../database/prisma');
const AppError = require('../utils/AppError');
const { slugify, generateUniqueSlug, resolveCategoryIds } = require('./bookService');

// Helper to make HTTPS/HTTP requests with timeout and JSON parsing
function fetchJson(url, options = {}) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https:');
    const client = isHttps ? https : http;
    const timeout = options.timeout || 7000;

    const reqOptions = {
      headers: {
        'User-Agent': 'EbookPlatform/1.0 (DigitalBookStore/1.0; admin@ebookplatform.dev)',
        'Accept': 'application/json',
        ...(options.headers || {}),
      },
    };

    const req = client.get(url, reqOptions, (res) => {
      // Handle redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(fetchJson(res.headers.location, options));
      }

      if (res.statusCode < 200 || res.statusCode >= 300) {
        return reject(new Error(`Request failed with status code ${res.statusCode}`));
      }

      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed);
        } catch (err) {
          reject(new Error(`Failed to parse JSON response: ${err.message}`));
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.setTimeout(timeout, () => {
      req.destroy();
      reject(new Error(`Request timed out after ${timeout}ms`));
    });
  });
}

// Curated rich fallback catalog of popular books with verified HD covers
const CURATED_BOOKS = [
  {
    externalId: 'curated_1',
    source: 'Curated Collection',
    title: 'Atomic Habits',
    subtitle: 'An Easy & Proven Way to Build Good Habits & Break Bad Ones',
    author: 'James Clear',
    description: 'No matter your goals, Atomic Habits offers a proven framework for improving--every day. James Clear, one of the world\'s leading experts on habit formation, reveals practical strategies that will teach you exactly how to form good habits, break bad ones, and master the tiny behaviors that lead to remarkable results.',
    shortDescription: 'Tiny changes, remarkable results: a proven system to build good habits and break bad ones.',
    coverImage: 'https://covers.openlibrary.org/b/isbn/9780735211292-L.jpg',
    pageCount: 320,
    language: 'English',
    publicationDate: '2018-10-16',
    categories: ['Self-Help', 'Productivity', 'Psychology'],
    isbn: '9780735211292',
    suggestedPrice: 4500,
    currency: 'NGN',
    format: 'PDF',
  },
  {
    externalId: 'curated_2',
    source: 'Curated Collection',
    title: 'Clean Code: A Handbook of Agile Software Craftsmanship',
    subtitle: 'A Handbook of Agile Software Craftsmanship',
    author: 'Robert C. Martin',
    description: 'Even bad code can function. But if code isn\'t clean, it can bring a development organization to its knees. Every year, countless hours and significant resources are lost because of poorly written code. But it doesn\'t have to be that way. Clean Code is divided into three parts: principles, patterns, and practices of writing clean code.',
    shortDescription: 'Learn how to write robust, maintainable, and elegant software code.',
    coverImage: 'https://covers.openlibrary.org/b/isbn/9780132350884-L.jpg',
    pageCount: 464,
    language: 'English',
    publicationDate: '2008-08-01',
    categories: ['Technology', 'Programming', 'Software Engineering'],
    isbn: '9780132350884',
    suggestedPrice: 6500,
    currency: 'NGN',
    format: 'PDF',
  },
  {
    externalId: 'curated_3',
    source: 'Curated Collection',
    title: 'Designing Data-Intensive Applications',
    subtitle: 'The Big Ideas Behind Reliable, Scalable, and Maintainable Systems',
    author: 'Martin Kleppmann',
    description: 'Data is at the center of many challenges in system design today. Difficult issues need to be figured out, such as scalability, consistency, reliability, efficiency, and maintainability. In addition, we have an overwhelming variety of tools to process and store data. This book helps you navigate the diverse landscape of databases, distributed systems, and stream architectures.',
    shortDescription: 'The definitive guide to the architecture of modern scalable and reliable data systems.',
    coverImage: 'https://covers.openlibrary.org/b/isbn/9781449373320-L.jpg',
    pageCount: 616,
    language: 'English',
    publicationDate: '2017-03-16',
    categories: ['Technology', 'System Design', 'Databases'],
    isbn: '9781449373320',
    suggestedPrice: 8500,
    currency: 'NGN',
    format: 'PDF',
  },
  {
    externalId: 'curated_4',
    source: 'Curated Collection',
    title: 'The Psychology of Money',
    subtitle: 'Timeless lessons on wealth, greed, and happiness',
    author: 'Morgan Housel',
    description: 'Doing well with money isn\'t necessarily about what you know. It\'s about how you behave. And behavior is hard to teach, even to really smart people. Money—investing, personal finance, and business decisions—is typically taught as a math-based field, where data and formulas tell us exactly what to do. But in the real world people don\'t make financial decisions on a spreadsheet.',
    shortDescription: '19 short stories exploring the strange ways people think about money and wealth.',
    coverImage: 'https://covers.openlibrary.org/b/isbn/9780857197689-L.jpg',
    pageCount: 256,
    language: 'English',
    publicationDate: '2020-09-08',
    categories: ['Finance', 'Business', 'Psychology'],
    isbn: '9780857197689',
    suggestedPrice: 5000,
    currency: 'NGN',
    format: 'PDF',
  },
  {
    externalId: 'curated_5',
    source: 'Curated Collection',
    title: 'Zero to One: Notes on Startups, or How to Build the Future',
    subtitle: 'Notes on Startups, or How to Build the Future',
    author: 'Peter Thiel & Blake Masters',
    description: 'The great secret of our time is that there are still uncharted frontiers to explore and new inventions to create. In Zero to One, legendary entrepreneur and investor Peter Thiel shows how we can find singular ways to create those new things. Doing what someone else already knows how to do takes the world from 1 to n. But when you create something new, you go from 0 to 1.',
    shortDescription: 'How to build companies that create new things and dominate unique markets.',
    coverImage: 'https://covers.openlibrary.org/b/isbn/9780804139298-L.jpg',
    pageCount: 224,
    language: 'English',
    publicationDate: '2014-09-16',
    categories: ['Business', 'Entrepreneurship', 'Startups'],
    isbn: '9780804139298',
    suggestedPrice: 5500,
    currency: 'NGN',
    format: 'PDF',
  },
  {
    externalId: 'curated_6',
    source: 'Curated Collection',
    title: 'Deep Work: Rules for Focused Success in a Distracted World',
    subtitle: 'Rules for Focused Success in a Distracted World',
    author: 'Cal Newport',
    description: 'Deep work is the ability to focus without distraction on a cognitively demanding task. It\'s a skill that allows you to quickly master complicated information and produce better results in less time. Deep work will make you better at what you do and provide the sense of true fulfillment that comes from craftsmanship.',
    shortDescription: 'Master the superpower of distraction-free focus in a modern hyper-connected world.',
    coverImage: 'https://covers.openlibrary.org/b/isbn/9781455586691-L.jpg',
    pageCount: 304,
    language: 'English',
    publicationDate: '2016-01-05',
    categories: ['Productivity', 'Self-Help', 'Career'],
    isbn: '9781455586691',
    suggestedPrice: 4800,
    currency: 'NGN',
    format: 'PDF',
  },
  {
    externalId: 'curated_7',
    source: 'Curated Collection',
    title: 'Refactoring: Improving the Design of Existing Code',
    subtitle: 'Improving the Design of Existing Code (2nd Edition)',
    author: 'Martin Fowler',
    description: 'For more than twenty years, experienced programmers worldwide have relied on Martin Fowler\'s Refactoring to improve the design of existing code and to raise software maintainability, as well as to make existing code easier to understand. This second edition includes updated examples in JavaScript.',
    shortDescription: 'The definitive guide to transforming messy code into elegant, high-performance architecture.',
    coverImage: 'https://covers.openlibrary.org/b/isbn/9780134757599-L.jpg',
    pageCount: 448,
    language: 'English',
    publicationDate: '2018-11-20',
    categories: ['Technology', 'Programming', 'JavaScript'],
    isbn: '9780134757599',
    suggestedPrice: 7200,
    currency: 'NGN',
    format: 'PDF',
  },
  {
    externalId: 'curated_8',
    source: 'Curated Collection',
    title: 'The Pragmatic Programmer: Your Journey to Mastery',
    subtitle: 'Your Journey to Mastery (20th Anniversary Edition)',
    author: 'David Thomas & Andrew Hunt',
    description: 'The Pragmatic Programmer is one of those rare tech books you\'ll read, re-read, and read again over the years. Whether you\'re new to the field or an experienced practitioner, you\'ll come away with fresh insights each and every time.',
    shortDescription: 'Essential wisdom, career advice, and technical habits for master developers.',
    coverImage: 'https://covers.openlibrary.org/b/isbn/9780135957059-L.jpg',
    pageCount: 352,
    language: 'English',
    publicationDate: '2019-09-13',
    categories: ['Technology', 'Programming', 'Career'],
    isbn: '9780135957059',
    suggestedPrice: 6800,
    currency: 'NGN',
    format: 'PDF',
  },
  {
    externalId: 'curated_9',
    source: 'Curated Collection',
    title: 'Thinking, Fast and Slow',
    subtitle: 'The Groundbreaking Book on Behavioral Decision Making',
    author: 'Daniel Kahneman',
    description: 'In his mega-bestseller, Daniel Kahneman, the renowned psychologist and winner of the Nobel Prize in Economics, takes us on a groundbreaking tour of the mind and explains the two systems that drive the way we think: System 1 (fast, intuitive, and emotional) and System 2 (slower, more deliberative, and more logical).',
    shortDescription: 'Nobel laureate Daniel Kahneman explains the dual cognitive engines that govern human judgment.',
    coverImage: 'https://covers.openlibrary.org/b/isbn/9780374533557-L.jpg',
    pageCount: 499,
    language: 'English',
    publicationDate: '2011-10-25',
    categories: ['Psychology', 'Science', 'Decision Making'],
    isbn: '9780374533557',
    suggestedPrice: 5200,
    currency: 'NGN',
    format: 'PDF',
  },
  {
    externalId: 'curated_10',
    source: 'Curated Collection',
    title: 'Don\'t Make Me Think, Revisited',
    subtitle: 'A Common Sense Approach to Web and Mobile Usability',
    author: 'Steve Krug',
    description: 'Since Don\'t Make Me Think was first published in 2000, hundreds of thousands of Web designers and developers have relied on usability guru Steve Krug\'s guide to help them understand the principles of intuitive navigation and information design. Witty, commonsensical, and eminently practical, it\'s one of the best-loved books on the topic.',
    shortDescription: 'The ultimate guide to intuitive UX design and friction-free user interfaces.',
    coverImage: 'https://covers.openlibrary.org/b/isbn/9780321965516-L.jpg',
    pageCount: 216,
    language: 'English',
    publicationDate: '2014-01-03',
    categories: ['Design', 'UI/UX', 'Technology'],
    isbn: '9780321965516',
    suggestedPrice: 5000,
    currency: 'NGN',
    format: 'PDF',
  },
  {
    externalId: 'curated_11',
    source: 'Curated Collection',
    title: 'Dune',
    subtitle: 'The Epic Science Fiction Masterpiece',
    author: 'Frank Herbert',
    description: 'Set on the desert planet Arrakis, Dune is the story of the boy Paul Atreides, heir to a noble family tasked with ruling an inhospitable world where the only thing of value is the "spice" melange, a drug capable of extending life and enhancing consciousness. A stunning blend of adventure, mysticism, environmentalism, and politics.',
    shortDescription: 'Frank Herbert\'s monumental space epic and highest-selling science fiction novel of all time.',
    coverImage: 'https://covers.openlibrary.org/b/isbn/9780441172719-L.jpg',
    pageCount: 688,
    language: 'English',
    publicationDate: '1965-08-01',
    categories: ['Fiction', 'Sci-Fi', 'Classics'],
    isbn: '9780441172719',
    suggestedPrice: 4200,
    currency: 'NGN',
    format: 'PDF',
  },
  {
    externalId: 'curated_12',
    source: 'Curated Collection',
    title: 'Show Your Work!',
    subtitle: '10 Ways to Share Your Creativity and Get Discovered',
    author: 'Austin Kleon',
    description: 'In his New York Times bestseller Steal Like an Artist, Austin Kleon showed readers how to unlock their creativity. Now, in Show Your Work!, he shows how to take that critical next step: getting discovered. Fill your canvas with generous, open, and brave creative habits that build a loyal audience.',
    shortDescription: 'A practical, inspirational manual on sharing your creative journey and building an audience.',
    coverImage: 'https://covers.openlibrary.org/b/isbn/9780761178972-L.jpg',
    pageCount: 224,
    language: 'English',
    publicationDate: '2014-03-06',
    categories: ['Self-Help', 'Design', 'Creativity'],
    isbn: '9780761178972',
    suggestedPrice: 3500,
    currency: 'NGN',
    format: 'PDF',
  }
];

const GENRES = [
  { id: 'all', name: 'All Topics', query: 'bestsellers' },
  { id: 'technology', name: 'Technology & AI', query: 'programming software computer technology artificial intelligence' },
  { id: 'business', name: 'Business & Startups', query: 'business entrepreneurship startup leadership' },
  { id: 'self-help', name: 'Self-Help & Habits', query: 'self-help habits productivity motivation' },
  { id: 'finance', name: 'Finance & Investing', query: 'finance money investing wealth economics' },
  { id: 'psychology', name: 'Psychology & Mind', query: 'psychology mindset behavior thinking cognitive' },
  { id: 'fiction', name: 'Fiction & Novels', query: 'fiction novel fantasy science fiction thrillers' },
  { id: 'design', name: 'Design & UX', query: 'design typography user experience visual architecture' },
  { id: 'science', name: 'Science & Cosmos', query: 'science physics biology astronomy nature' },
];

/**
 * Fetch books from Open Library Search API
 */
async function fetchFromOpenLibrary(query, limit = 15, page = 1) {
  try {
    const encodedQuery = encodeURIComponent(query.trim());
    const offset = (page - 1) * limit;
    const url = `https://openlibrary.org/search.json?q=${encodedQuery}&limit=${limit}&offset=${offset}&fields=key,title,subtitle,author_name,cover_i,isbn,first_publish_year,number_of_pages_median,subject,language,first_sentence`;

    const data = await fetchJson(url, { timeout: 7000 });

    if (!data.docs || !Array.isArray(data.docs)) {
      return [];
    }

    return data.docs
      .filter((doc) => doc.title && (doc.cover_i || (doc.isbn && doc.isbn.length > 0)))
      .map((doc, idx) => {
        const coverImage = doc.cover_i
          ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`
          : doc.isbn && doc.isbn.length > 0
          ? `https://covers.openlibrary.org/b/isbn/${doc.isbn[0]}-L.jpg`
          : null;

        const author = doc.author_name ? doc.author_name.slice(0, 2).join(', ') : 'Unknown Author';
        const isbn = doc.isbn ? doc.isbn[0] : null;
        const pageCount = doc.number_of_pages_median || null;
        const subjects = doc.subject ? doc.subject.slice(0, 4) : [];
        const firstSentence = Array.isArray(doc.first_sentence) ? doc.first_sentence[0] : doc.first_sentence;
        
        const description = firstSentence 
          ? `${firstSentence} A notable work by ${author}, first published in ${doc.first_publish_year || 'recent years'}. Includes extensive insights into ${subjects.slice(0, 2).join(' and ') || 'this subject'}.`
          : `A comprehensive exploration of ${doc.title} by ${author}. Features detailed analysis, practical lessons, and core principles across ${pageCount || 'over 200'} pages.`;

        return {
          externalId: `ol_${doc.key ? doc.key.replace('/works/', '') : idx}`,
          source: 'Open Library',
          title: doc.title,
          subtitle: doc.subtitle || null,
          author,
          description,
          shortDescription: firstSentence ? firstSentence.slice(0, 150) : `By ${author} (${doc.first_publish_year || 'Classic'})`,
          coverImage,
          pageCount,
          language: doc.language ? (Array.isArray(doc.language) ? doc.language[0] : doc.language) : 'English',
          publicationDate: doc.first_publish_year ? `${doc.first_publish_year}-01-01` : null,
          categories: subjects.length > 0 ? subjects : ['General'],
          isbn,
          suggestedPrice: 4500,
          currency: 'NGN',
          format: 'PDF',
        };
      });
  } catch (err) {
    console.warn(`[OpenLibrary API] Search failed: ${err.message}`);
    return [];
  }
}

/**
 * Fetch books from Google Books API
 */
async function fetchFromGoogleBooks(query, limit = 15, startIndex = 0) {
  try {
    const apiKey = process.env.GOOGLE_BOOKS_API_KEY ? `&key=${process.env.GOOGLE_BOOKS_API_KEY}` : '';
    const encodedQuery = encodeURIComponent(query.trim());
    const url = `https://www.googleapis.com/books/v1/volumes?q=${encodedQuery}&maxResults=${limit}&startIndex=${startIndex}&printType=books${apiKey}`;

    const data = await fetchJson(url, { timeout: 6000 });

    if (!data.items || !Array.isArray(data.items)) {
      return [];
    }

    return data.items.map((item) => {
      const v = item.volumeInfo || {};
      let coverImage = null;

      if (v.imageLinks) {
        coverImage = v.imageLinks.large || v.imageLinks.medium || v.imageLinks.small || v.imageLinks.thumbnail || v.imageLinks.smallThumbnail;
        if (coverImage) {
          // Convert to HTTPS and clean up edge curls/zoom for crisper cover image
          coverImage = coverImage.replace(/^http:\/\//i, 'https://');
        }
      }

      let isbn = null;
      if (v.industryIdentifiers && Array.isArray(v.industryIdentifiers)) {
        const isbn13 = v.industryIdentifiers.find((i) => i.type === 'ISBN_13');
        const isbn10 = v.industryIdentifiers.find((i) => i.type === 'ISBN_10');
        isbn = isbn13 ? isbn13.identifier : isbn10 ? isbn10.identifier : null;
      }

      const author = v.authors && Array.isArray(v.authors) ? v.authors.join(', ') : 'Unknown Author';

      return {
        externalId: `gb_${item.id}`,
        source: 'Google Books',
        title: v.title || 'Untitled Book',
        subtitle: v.subtitle || null,
        author,
        description: v.description || `A complete guide and publication by ${author}.`,
        shortDescription: v.description ? v.description.slice(0, 160) + '...' : null,
        coverImage,
        pageCount: v.pageCount || null,
        language: v.language || 'English',
        publicationDate: v.publishedDate || null,
        categories: v.categories && Array.isArray(v.categories) ? v.categories : ['General'],
        isbn,
        suggestedPrice: 5000,
        currency: 'NGN',
        format: 'PDF',
      };
    });
  } catch (err) {
    console.warn(`[Google Books API] Search failed: ${err.message}`);
    return [];
  }
}

/**
 * Unified Search for external books
 */
async function searchExternalBooks({ query = '', genre = 'all', provider = 'all', page = 1, limit = 18 }) {
  let effectiveQuery = query.trim();

  // If no query string was provided, use the genre query
  if (!effectiveQuery) {
    const foundGenre = GENRES.find((g) => g.id === genre);
    effectiveQuery = foundGenre ? foundGenre.query : 'bestsellers';
  }

  // Filter curated collection first
  const queryLower = effectiveQuery.toLowerCase();
  const matchedCurated = CURATED_BOOKS.filter((b) => {
    return (
      b.title.toLowerCase().includes(queryLower) ||
      b.author.toLowerCase().includes(queryLower) ||
      b.categories.some((c) => c.toLowerCase().includes(queryLower)) ||
      (b.isbn && b.isbn.includes(effectiveQuery))
    );
  });

  if (provider === 'curated') {
    return {
      books: matchedCurated.length > 0 ? matchedCurated : CURATED_BOOKS.slice(0, limit),
      total: matchedCurated.length > 0 ? matchedCurated.length : CURATED_BOOKS.length,
      provider: 'Curated Library',
      page: 1,
    };
  }

  let apiResults = [];

  if (provider === 'openlibrary' || provider === 'all') {
    const olResults = await fetchFromOpenLibrary(effectiveQuery, limit, page);
    apiResults = apiResults.concat(olResults);
  }

  if ((provider === 'google' || provider === 'all') && apiResults.length < limit) {
    const gbResults = await fetchFromGoogleBooks(effectiveQuery, limit - apiResults.length, (page - 1) * limit);
    apiResults = apiResults.concat(gbResults);
  }

  // Blend with curated matching books to ensure top-notch covers and quality
  const combined = [];
  const seenTitles = new Set();

  for (const book of [...matchedCurated, ...apiResults, ...CURATED_BOOKS]) {
    const normalizedKey = (book.title || '').toLowerCase().trim();
    if (normalizedKey && !seenTitles.has(normalizedKey)) {
      seenTitles.add(normalizedKey);
      combined.push(book);
    }
  }

  const finalBooks = combined.slice(0, limit);

  return {
    books: finalBooks,
    total: combined.length,
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
    provider: provider === 'all' ? 'Multi-Source (OpenLibrary + Google + Curated)' : provider,
  };
}

/**
 * Quick search by Title or ISBN for single-book form autofill
 */
async function lookupBookByQuery(term) {
  if (!term || !term.trim()) {
    throw new AppError('Search term or ISBN is required', 400);
  }

  const cleanTerm = term.trim();
  // Check curated list first
  const curatedMatch = CURATED_BOOKS.find(
    (b) =>
      (b.isbn && b.isbn.toLowerCase() === cleanTerm.toLowerCase()) ||
      b.title.toLowerCase().includes(cleanTerm.toLowerCase())
  );

  if (curatedMatch) {
    return curatedMatch;
  }

  // Try Open Library first
  const olResults = await fetchFromOpenLibrary(cleanTerm, 5, 1);
  if (olResults.length > 0) {
    return olResults[0];
  }

  // Try Google Books
  const gbResults = await fetchFromGoogleBooks(cleanTerm, 5, 0);
  if (gbResults.length > 0) {
    return gbResults[0];
  }

  throw new AppError('No book found matching your query', 404);
}

/**
 * Import an array of external books into the platform database
 */
async function importExternalBooks(booksToImport, defaultOverrides = {}) {
  if (!booksToImport || !Array.isArray(booksToImport) || booksToImport.length === 0) {
    throw new AppError('No books provided for import', 400);
  }

  const imported = [];
  const errors = [];

  for (const rawBook of booksToImport) {
    try {
      const title = rawBook.title ? rawBook.title.trim() : 'Untitled Book';
      const author = rawBook.author ? rawBook.author.trim() : 'Unknown Author';
      const description = rawBook.description ? rawBook.description.trim() : (rawBook.shortDescription || `A book by ${author}`);
      const price = rawBook.price !== undefined ? parseFloat(rawBook.price) : defaultOverrides.price !== undefined ? parseFloat(defaultOverrides.price) : (rawBook.suggestedPrice || 4500);
      const currency = rawBook.currency || defaultOverrides.currency || 'NGN';
      const published = defaultOverrides.published !== undefined ? Boolean(defaultOverrides.published) : rawBook.published !== undefined ? Boolean(rawBook.published) : true;
      const featured = defaultOverrides.featured !== undefined ? Boolean(defaultOverrides.featured) : rawBook.featured !== undefined ? Boolean(rawBook.featured) : false;
      const format = rawBook.format || defaultOverrides.format || 'PDF';

      const slug = await generateUniqueSlug(title);

      // Resolve categories
      const categoryNames = Array.isArray(rawBook.categories) ? rawBook.categories : ['General'];
      const categoryIds = await resolveCategoryIds(defaultOverrides.categoryIds || [], categoryNames);

      const createdBook = await prisma.book.create({
        data: {
          title,
          slug,
          author,
          description,
          shortDescription: rawBook.shortDescription || (description ? description.slice(0, 160) : null),
          coverImage: rawBook.coverImage || null,
          previewFile: rawBook.previewFile || null,
          ebookFile: rawBook.ebookFile || null,
          price,
          currency,
          isbn: rawBook.isbn || null,
          publicationDate: rawBook.publicationDate ? new Date(rawBook.publicationDate) : null,
          pageCount: rawBook.pageCount ? parseInt(rawBook.pageCount, 10) : null,
          language: rawBook.language || 'English',
          format,
          featured,
          published,
        },
      });

      if (categoryIds.length > 0) {
        await prisma.bookCategory.createMany({
          data: categoryIds.map((catId) => ({ bookId: createdBook.id, categoryId: catId })),
        });
      }

      imported.push({
        id: createdBook.id,
        title: createdBook.title,
        author: createdBook.author,
        slug: createdBook.slug,
        coverImage: createdBook.coverImage,
        price: Number(createdBook.price),
      });
    } catch (err) {
      errors.push({
        title: rawBook.title,
        error: err.message,
      });
    }
  }

  return {
    importedCount: imported.length,
    imported,
    errorsCount: errors.length,
    errors,
  };
}

module.exports = {
  fetchJson,
  getGenres: () => GENRES,
  searchExternalBooks,
  lookupBookByQuery,
  importExternalBooks,
  CURATED_BOOKS,
};
