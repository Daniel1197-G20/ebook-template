const multer = require('multer');
const AppError = require('../utils/AppError');

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'image/gif'];
  const allowedDocTypes = ['application/pdf', 'application/epub+zip', 'application/x-mobipocket-ebook'];

  const uploadType = req.body?.type || file.fieldname;

  if (uploadType === 'cover' || file.mimetype.startsWith('image/')) {
    if (allowedImageTypes.includes(file.mimetype)) {
      return cb(null, true);
    }
    return cb(new AppError('Only image files (JPG, PNG, WEBP, GIF) are allowed for cover images', 400), false);
  }

  if (uploadType === 'preview' || uploadType === 'ebook' || allowedDocTypes.includes(file.mimetype)) {
    if (allowedDocTypes.includes(file.mimetype) || file.originalname.endsWith('.pdf') || file.originalname.endsWith('.epub')) {
      return cb(null, true);
    }
    return cb(new AppError('Only PDF and EPUB files are allowed for e-books and previews', 400), false);
  }

  cb(null, true);
};

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB max limit
  fileFilter,
});

module.exports = upload;
