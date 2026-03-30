const jwt = require('jsonwebtoken');

const User = require('../models/User');
const { verifyFirebaseToken } = require('../config/firebase');
const { cloudinary } = require('../config/cloudinary');

function publicIdFromCloudinaryUrl(url) {
  if (!url || typeof url !== 'string' || !url.trim()) return null;
  const uploadIdx = url.indexOf('/upload/');
  if (uploadIdx === -1) return null;
  const rest = url.slice(uploadIdx + '/upload/'.length);
  const parts = rest.split('/');
  let start = 0;
  while (start < parts.length && parts[start].includes(',')) {
    start += 1;
  }
  if (start < parts.length && /^v\d+$/.test(parts[start])) {
    start += 1;
  }
  const pathPart = parts.slice(start).join('/');
  if (!pathPart) return null;
  return pathPart.replace(/\.[^/.]+$/, '') || null;
}

function generateToken(userId) {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );
}

async function verifyOTP(req, res) {
  try {
    const { idToken } = req.body;

    const decoded = await verifyFirebaseToken(idToken);
    const phoneNumber = decoded.phone_number;

    let user = await User.findOne({ phoneNumber });

    if (user && user.isVerified) {
      return res.status(200).json({
        status: 'existing_user',
        message: 'User already registered, please login',
      });
    }

    if (user && !user.isVerified) {
      user.isVerified = true;
      await user.save();
      return res.status(200).json({
        status: 'verified',
        phoneNumber,
      });
    }

    await User.create({
      phoneNumber,
      isVerified: true,
    });

    return res.status(200).json({
      status: 'new_user',
      phoneNumber,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'OTP verification failed' });
  }
}

async function completeRegistration(req, res) {
  try {
    const { phoneNumber, username, password, role } = req.body;

    const user = await User.findOne({ phoneNumber, isVerified: true });
    if (!user) {
      return res.status(404).json({ message: 'Phone number not verified' });
    }

    if (user.username) {
      return res.status(400).json({ message: 'Registration already complete' });
    }

    const usernameRegex = /^[A-Za-z0-9_]{3,20}$/;
    if (!usernameRegex.test(username || '')) {
      return res.status(400).json({
        message: 'Username must be 3-20 characters and contain only letters, numbers, or underscores',
      });
    }

    const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(password || '')) {
      return res.status(400).json({
        message: 'Password must be at least 8 characters and include 1 uppercase letter and 1 number',
      });
    }

    if (!['player', 'organizer'].includes(role)) {
      return res.status(400).json({ message: 'Role must be player or organizer' });
    }

    user.username = username;
    user.password = password;
    user.role = role;

    await user.save();

    const token = generateToken(user._id);
    return res.status(200).json({
      token,
      user: user.toPublicJSON(),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Registration failed' });
  }
}

async function login(req, res) {
  try {
    const { phoneNumber, password } = req.body;

    const user = await User.findOne({ phoneNumber }).select('+password');
    if (!user) {
      return res.status(404).json({ message: 'No account found with this phone number' });
    }

    if (!user.username) {
      return res.status(400).json({ message: 'Please complete registration first' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Incorrect password' });
    }

    const token = generateToken(user._id);
    return res.status(200).json({
      token,
      user: user.toPublicJSON(),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Login failed' });
  }
}

async function getMe(req, res) {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json({
      user: user.toPublicJSON(),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to fetch profile' });
  }
}

async function updateProfilePicture(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload an image' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const previous = user.profilePicture;
    if (previous && previous !== '') {
      const publicId = publicIdFromCloudinaryUrl(previous);
      if (publicId) {
        try {
          await cloudinary.uploader.destroy(publicId);
        } catch {
          // Old asset may already be gone; still save the new picture
        }
      }
    }

    user.profilePicture = req.file.path;
    await user.save();

    return res.status(200).json({
      message: 'Profile picture updated',
      profilePicture: req.file.path,
      user: user.toPublicJSON(),
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: error.message || 'Failed to update profile picture' });
  }
}

module.exports = {
  verifyOTP,
  completeRegistration,
  login,
  getMe,
  updateProfilePicture,
};

