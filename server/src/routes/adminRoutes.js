const express = require('express');
const adminController = require('../controllers/adminController');
const externalBookController = require('../controllers/externalBookController');
const { protect, restrictTo } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

// Require logged-in user with ADMIN role for all routes here
router.use(protect);
router.use(restrictTo('ADMIN'));

// Core Admin Metrics & File Upload
router.get('/stats', adminController.getStats);
router.get('/books', adminController.getAllBooks);
router.post('/upload', upload.single('file'), adminController.uploadFile);

// External Book Provider & API Discovery
router.get('/external-books/search', externalBookController.searchExternalBooks);
router.get('/external-books/genres', externalBookController.getGenres);
router.get('/external-books/lookup', externalBookController.lookupBook);
router.post('/external-books/import', externalBookController.importExternalBooks);

// Bulk Manual Input & Management
router.post('/books/bulk-create', externalBookController.bulkCreateBooks);
router.patch('/books/bulk-update', externalBookController.bulkUpdateBooks);

// User Management Routes
router.get('/users', adminController.getUsers);
router.post('/users', adminController.createAdminUser);
router.patch('/users/:userId/role', adminController.toggleUserRole);

module.exports = router;
