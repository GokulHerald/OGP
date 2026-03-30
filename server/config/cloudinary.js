const path = require('path');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const matchProofStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'ogp/match-proofs',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 1280, height: 720, crop: 'limit' }],
    public_id: (req, file) => {
      const ext = path.extname(file.originalname || '');
      const base = path.basename(file.originalname || 'upload', ext);
      return `${Date.now()}-${base}`;
    },
  },
});

const profilePicStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'ogp/profile-pictures',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }],
    public_id: () => `profile-${Date.now()}`,
  },
});

module.exports = {
  cloudinary,
  matchProofStorage,
  profilePicStorage,
};
