const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../database/prisma');
const config = require('../config');
const AppError = require('../utils/AppError');

const hashPassword = async (password) => {
  return bcrypt.hash(password, 12);
};

const comparePassword = async (password, hash) => {
  return bcrypt.compare(password, hash);
};

const signAccessToken = (userId) => {
  return jwt.sign({ userId }, config.jwt.secret, { expiresIn: config.jwt.expiresIn });
};

const signRefreshToken = (userId) => {
  return jwt.sign({ userId }, config.jwt.refreshSecret, { expiresIn: config.jwt.refreshExpiresIn });
};

const register = async ({ name, email, password }) => {
  const normalizedEmail = (email || '').trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    throw new AppError('Email already registered', 409, 'EMAIL_EXISTS');
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      name: (name || '').trim(),
      email: normalizedEmail,
      passwordHash,
      role: 'CUSTOMER',
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });

  const accessToken = signAccessToken(user.id);
  const refreshToken = signRefreshToken(user.id);

  return { user, accessToken, refreshToken };
};

const login = async ({ email, password }) => {
  const normalizedEmail = (email || '').trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (!user) {
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) {
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  const accessToken = signAccessToken(user.id);
  const refreshToken = signRefreshToken(user.id);

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      profileImage: user.profileImage,
      createdAt: user.createdAt,
    },
    accessToken,
    refreshToken,
  };
};

const getMe = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      profileImage: true,
      createdAt: true,
    },
  });
  if (!user) throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  return user;
};

const forgotPassword = async ({ email }) => {
  const normalizedEmail = email.toLowerCase().trim();
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

  // If user is not found, return generic success message to prevent user enumeration
  if (!user) {
    return {
      message: 'If an account exists for this email, a password reset link has been sent.',
    };
  }

  const rawToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour validity

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordResetToken: hashedToken,
      passwordResetExpires: expiresAt,
    },
  });

  const resetUrl = `${config.frontendUrl}/reset-password?token=${rawToken}`;
  console.log(`\n========================================`);
  console.log(`[PASSWORD RESET] Link for ${user.email}:`);
  console.log(resetUrl);
  console.log(`========================================\n`);

  return {
    message: 'If an account exists for this email, a password reset link has been sent.',
    ...(config.nodeEnv === 'development' ? { resetUrl } : {}),
  };
};

const resetPassword = async ({ token, password }) => {
  if (!token) {
    throw new AppError('Password reset token is required', 400, 'TOKEN_REQUIRED');
  }

  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const user = await prisma.user.findFirst({
    where: {
      passwordResetToken: hashedToken,
      passwordResetExpires: {
        gt: new Date(),
      },
    },
  });

  if (!user) {
    throw new AppError('This reset link is invalid or has expired. Please request a new one.', 400, 'INVALID_RESET_TOKEN');
  }

  const passwordHash = await hashPassword(password);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      passwordResetToken: null,
      passwordResetExpires: null,
    },
  });

  return { message: 'Password has been reset successfully. You can now sign in with your new password.' };
};

const refresh = async (token) => {
  if (!token) {
    throw new AppError('Refresh token is required', 401, 'UNAUTHORIZED');
  }

  try {
    const decoded = jwt.verify(token, config.jwt.refreshSecret);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        profileImage: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new AppError('User no longer exists', 401, 'UNAUTHORIZED');
    }

    const accessToken = signAccessToken(user.id);
    const refreshToken = signRefreshToken(user.id);

    return { user, accessToken, refreshToken };
  } catch (err) {
    throw new AppError('Invalid or expired refresh token', 401, 'UNAUTHORIZED');
  }
};

module.exports = {
  register,
  login,
  getMe,
  forgotPassword,
  resetPassword,
  refresh,
  signAccessToken,
  signRefreshToken,
};
