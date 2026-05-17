// src/controllers/authController.js
const bcrypt = require("bcryptjs");
const prisma  = require("../utils/prismaClient");
const { signAccessToken } = require("../utils/jwtUtils");

// ── POST /api/auth/register ───────────────────────────────────
const register = async (req, res, next) => {
  try {
    const { name, email, password, role = "student" } = req.body;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ message: "Email already registered." });

    const rounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const hashed = await bcrypt.hash(password, rounds);

    const user = await prisma.user.create({
      data: { name, email, password: hashed, role },
      select: { user_id: true, name: true, email: true, role: true },
    });

    const token = signAccessToken({ userId: user.user_id, role: user.role });
    res.status(201).json({ user, token });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/auth/login ──────────────────────────────────────
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ message: "Invalid credentials." });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ message: "Invalid credentials." });

    const token = signAccessToken({ userId: user.user_id, role: user.role });
    const { password: _pw, ...safeUser } = user;
    res.json({ user: safeUser, token });
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login };
