const path = require('path');
const fs = require('fs');
const { bucket, isFirebaseConfigured } = require('../config/firebase');
const AppError = require('../utils/AppError');

// Ensure local directories exist for fallback
const localUploadsDir = path.join(__dirname, '../../uploads');
['covers', 'previews', 'ebooks'].forEach((dir) => {
  const dirPath = path.join(localUploadsDir, dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
});

const generateSafeFilename = (originalname) => {
  const ext = path.extname(originalname);
  const cleanBasename = path.basename(originalname, ext).replace(/[^\w\-]/g, '_');
  const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  return `${cleanBasename}-${uniqueSuffix}${ext}`;
};

/**
 * Upload a file buffer to either Firebase Cloud Storage or local disk.
 */
const uploadFile = async ({ buffer, originalname, mimetype, folder = 'covers', isPublic = true }) => {
  if (!buffer) {
    throw new AppError('File buffer is required for upload', 400);
  }

  const filename = generateSafeFilename(originalname);
  const storageFilePath = `${folder}/${filename}`;

  if (isFirebaseConfigured && bucket) {
    try {
      const file = bucket.file(storageFilePath);

      await file.save(buffer, {
        metadata: {
          contentType: mimetype,
          cacheControl: isPublic ? 'public, max-age=31536000' : 'private, max-age=0',
        },
        resumable: false,
      });

      let publicUrl;
      if (isPublic) {
        try {
          await file.makePublic();
          publicUrl = `https://storage.googleapis.com/${bucket.name}/${storageFilePath}`;
        } catch {
          // If uniform bucket-level access is enabled, use standard URL
          publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(storageFilePath)}?alt=media`;
        }
      } else {
        // Private asset (eBook)
        publicUrl = `firebase://${storageFilePath}`;
      }

      return {
        url: publicUrl,
        storagePath: storageFilePath,
        filename,
        originalName: originalname,
        mimetype,
        size: buffer.length,
        provider: 'firebase',
      };
    } catch (err) {
      console.error('[Firebase Storage] Upload error:', err);
      throw new AppError('Failed to upload file to Firebase Cloud Storage: ' + err.message, 500);
    }
  }

  // Fallback: Local disk storage
  const destDir = path.join(localUploadsDir, folder);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  const localFilePath = path.join(destDir, filename);
  fs.writeFileSync(localFilePath, buffer);

  return {
    url: `/uploads/${folder}/${filename}`,
    storagePath: `uploads/${folder}/${filename}`,
    filename,
    originalName: originalname,
    mimetype,
    size: buffer.length,
    provider: 'local',
  };
};

/**
 * Get read stream for downloading or reading an eBook file
 */
const getFileStream = async (storedPath) => {
  if (!storedPath) {
    throw new AppError('File path is required', 400);
  }

  if (storedPath.startsWith('firebase://') || (isFirebaseConfigured && !storedPath.startsWith('/uploads') && !storedPath.startsWith('uploads/'))) {
    const rawPath = storedPath.replace('firebase://', '');
    if (!bucket) {
      throw new AppError('Firebase Storage is not initialized', 500);
    }
    const file = bucket.file(rawPath);
    const [exists] = await file.exists();
    if (!exists) {
      throw new AppError('File does not exist in Firebase Storage', 404);
    }
    return {
      stream: file.createReadStream(),
      filename: path.basename(rawPath),
      provider: 'firebase',
    };
  }

  // Local storage path
  let relativePath = storedPath;
  if (relativePath.startsWith('/')) relativePath = relativePath.slice(1);

  const fullLocalPath = path.isAbsolute(storedPath) ? storedPath : path.join(process.cwd(), relativePath);

  if (!fs.existsSync(fullLocalPath)) {
    throw new AppError('File not found on server storage', 404);
  }

  return {
    stream: fs.createReadStream(fullLocalPath),
    filename: path.basename(fullLocalPath),
    provider: 'local',
  };
};

/**
 * Generate temporary signed URL for direct secure download from Firebase Storage
 */
const getSignedDownloadUrl = async (storedPath, expiresInMinutes = 15) => {
  if (isFirebaseConfigured && bucket && (storedPath.startsWith('firebase://') || !storedPath.startsWith('/uploads'))) {
    const rawPath = storedPath.replace('firebase://', '');
    const file = bucket.file(rawPath);
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + expiresInMinutes * 60 * 1000,
    });
    return url;
  }
  return null;
};

/**
 * Delete a file from storage
 */
const deleteFile = async (storedPath) => {
  if (!storedPath) return;

  if (isFirebaseConfigured && bucket && (storedPath.startsWith('firebase://') || !storedPath.startsWith('/uploads'))) {
    try {
      const rawPath = storedPath.replace('firebase://', '');
      await bucket.file(rawPath).delete();
    } catch (err) {
      console.warn('[Firebase Storage] Delete file error:', err.message);
    }
    return;
  }

  try {
    let relativePath = storedPath.startsWith('/') ? storedPath.slice(1) : storedPath;
    const fullLocalPath = path.isAbsolute(storedPath) ? storedPath : path.join(process.cwd(), relativePath);
    if (fs.existsSync(fullLocalPath)) {
      fs.unlinkSync(fullLocalPath);
    }
  } catch (err) {
    console.warn('[Local Storage] Delete file error:', err.message);
  }
};

module.exports = {
  uploadFile,
  getFileStream,
  getSignedDownloadUrl,
  deleteFile,
};
