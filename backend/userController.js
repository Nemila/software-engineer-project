// src/controllers/userController.js
const prisma  = require("../utils/prismaClient");
const bcrypt  = require("bcryptjs");

const SAFE_SELECT = {
  user_id: true, name: true, email: true, role: true,
};

// GET /api/users/me
const getMe = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { user_id: req.user.user_id },
      select: SAFE_SELECT,
    });
    res.json(user);
  } catch (err) { next(err); }
};

// PATCH /api/users/me
const updateMe = async (req, res, next) => {
  try {
    const { name, password } = req.body;
    const data = {};
    if (name) data.name = name;
    if (password) {
      const rounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
      data.password = await bcrypt.hash(password, rounds);
    }

    const updated = await prisma.user.update({
      where: { user_id: req.user.user_id },
      data,
      select: SAFE_SELECT,
    });
    res.json(updated);
  } catch (err) { next(err); }
};

// GET /api/users  (teacher can see student list)
const listUsers = async (req, res, next) => {
  try {
    const { role } = req.query;
    const where = role ? { role } : {};
    const users = await prisma.user.findMany({ where, select: SAFE_SELECT });
    res.json(users);
  } catch (err) { next(err); }
};

module.exports = { getMe, updateMe, listUsers };
