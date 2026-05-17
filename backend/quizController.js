// src/controllers/quizController.js
const prisma = require("../utils/prismaClient");

// GET /api/quizzes
const listQuizzes = async (req, res, next) => {
  try {
    const quizzes = await prisma.quiz.findMany({
      include: {
        teacher: { select: { user_id: true, name: true, email: true } },
        _count:  { select: { questions: true } },
      },
      orderBy: { quiz_id: "desc" },
    });
    res.json(quizzes);
  } catch (err) { next(err); }
};

// GET /api/quizzes/:id
const getQuiz = async (req, res, next) => {
  try {
    const quiz = await prisma.quiz.findUnique({
      where: { quiz_id: Number(req.params.id) },
      include: {
        teacher:   { select: { user_id: true, name: true, email: true } },
        questions: {
          include: {
            answers: {
              select: {
                answer_id:   true,
                answer_text: true,
                // hide is_correct from students
                ...(req.user.role === "teacher" && { is_correct: true }),
              },
            },
          },
        },
      },
    });

    if (!quiz) return res.status(404).json({ message: "Quiz not found." });
    res.json(quiz);
  } catch (err) { next(err); }
};

// POST /api/quizzes  (teacher only)
const createQuiz = async (req, res, next) => {
  try {
    const { title, description, time_limit, start_date, end_date } = req.body;

    const quiz = await prisma.quiz.create({
      data: {
        title,
        description,
        time_limit:  time_limit  ? Number(time_limit)    : null,
        start_date:  start_date  ? new Date(start_date)  : null,
        end_date:    end_date    ? new Date(end_date)     : null,
        teacher_id:  req.user.user_id,
      },
    });

    res.status(201).json(quiz);
  } catch (err) { next(err); }
};

// PATCH /api/quizzes/:id  (teacher only – must own quiz)
const updateQuiz = async (req, res, next) => {
  try {
    const quiz = await prisma.quiz.findUnique({ where: { quiz_id: Number(req.params.id) } });
    if (!quiz) return res.status(404).json({ message: "Quiz not found." });
    if (quiz.teacher_id !== req.user.user_id)
      return res.status(403).json({ message: "Forbidden." });

    const { title, description, time_limit, start_date, end_date } = req.body;

    const updated = await prisma.quiz.update({
      where: { quiz_id: Number(req.params.id) },
      data: {
        ...(title       !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(time_limit  !== undefined && { time_limit: Number(time_limit) }),
        ...(start_date  !== undefined && { start_date: new Date(start_date) }),
        ...(end_date    !== undefined && { end_date:   new Date(end_date) }),
      },
    });

    res.json(updated);
  } catch (err) { next(err); }
};

// DELETE /api/quizzes/:id  (teacher only – must own quiz)
const deleteQuiz = async (req, res, next) => {
  try {
    const quiz = await prisma.quiz.findUnique({ where: { quiz_id: Number(req.params.id) } });
    if (!quiz) return res.status(404).json({ message: "Quiz not found." });
    if (quiz.teacher_id !== req.user.user_id)
      return res.status(403).json({ message: "Forbidden." });

    await prisma.quiz.delete({ where: { quiz_id: Number(req.params.id) } });
    res.json({ message: "Quiz deleted." });
  } catch (err) { next(err); }
};

module.exports = { listQuizzes, getQuiz, createQuiz, updateQuiz, deleteQuiz };
