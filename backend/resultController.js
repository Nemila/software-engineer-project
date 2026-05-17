// src/controllers/resultController.js
const prisma = require("../utils/prismaClient");

// ── GET /api/results/me  (student: my results) ────────────────
const getMyResults = async (req, res, next) => {
  try {
    const results = await prisma.result.findMany({
      where:   { user_id: req.user.user_id },
      include: { quiz: { select: { quiz_id: true, title: true, description: true } } },
      orderBy: { submission_date: "desc" },
    });
    res.json(results);
  } catch (err) { next(err); }
};

// ── GET /api/results/quiz/:quizId  (teacher: all results for a quiz) ─
const getQuizResults = async (req, res, next) => {
  try {
    const quizId = Number(req.params.quizId);

    const quiz = await prisma.quiz.findUnique({ where: { quiz_id: quizId } });
    if (!quiz) return res.status(404).json({ message: "Quiz not found." });
    if (quiz.teacher_id !== req.user.user_id)
      return res.status(403).json({ message: "Forbidden." });

    const results = await prisma.result.findMany({
      where:   { quiz_id: quizId },
      include: { user: { select: { user_id: true, name: true, email: true } } },
      orderBy: { submission_date: "desc" },
    });

    // Basic analytics
    const scores  = results.map((r) => Number(r.score));
    const summary = {
      totalSubmissions: results.length,
      averageScore: scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0,
      highestScore: scores.length ? Math.max(...scores) : 0,
      lowestScore:  scores.length ? Math.min(...scores) : 0,
    };

    res.json({ summary, results });
  } catch (err) { next(err); }
};

// ── GET /api/results/:resultId  (student: one result detail) ──
const getResult = async (req, res, next) => {
  try {
    const result = await prisma.result.findUnique({
      where:   { result_id: Number(req.params.resultId) },
      include: { quiz: true, user: { select: { user_id: true, name: true, email: true } } },
    });

    if (!result) return res.status(404).json({ message: "Result not found." });

    // Students can only see their own results
    if (req.user.role === "student" && result.user_id !== req.user.user_id)
      return res.status(403).json({ message: "Forbidden." });

    res.json(result);
  } catch (err) { next(err); }
};

// ── GET /api/results/dashboard  (teacher: overview of all their quizzes) ─
const getDashboard = async (req, res, next) => {
  try {
    const quizzes = await prisma.quiz.findMany({
      where:   { teacher_id: req.user.user_id },
      include: { _count: { select: { questions: true, attempts: true, results: true } } },
      orderBy: { quiz_id: "desc" },
    });
    res.json(quizzes);
  } catch (err) { next(err); }
};

module.exports = { getMyResults, getQuizResults, getResult, getDashboard };
