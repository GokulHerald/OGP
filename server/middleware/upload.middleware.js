const multer = require('multer');
const { matchProofStorage, profilePicStorage } = require('../config/cloudinary');

const ALLOWED_MIMES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

function imageFileFilter(req, file, cb) {
  if (ALLOWED_MIMES.includes(file.mimetype)) {
    return cb(null, true);
  }
  cb(new Error('Only image files are allowed'));
}

const uploadMatchProof = multer({
  storage: matchProofStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: imageFileFilter,
});

const uploadProfilePic = multer({
  storage: profilePicStorage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: imageFileFilter,
});

function handleUploadError(err, req, res, next) {
  if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      message:
        'File too large. Max 5MB for proofs, 2MB for profile pictures',
    });
  }
  if (err.message === 'Only image files are allowed') {
    return res.status(400).json({
      message: 'Only image files are allowed (JPG, PNG, WEBP)',
    });
  }
  return next(err);
}

module.exports = {
  uploadMatchProof,
  uploadProfilePic,
  handleUploadError,
};
