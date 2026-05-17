// src/controllers/attemptController.js
// Records a student starting a quiz (attempt table) and handles submission
// which grades the quiz and writes to the result table.

const prisma            = require("../utils/prismaClient");
const { gradeSubmission } = require("../utils/gradingUtils");

// ── POST /api/quizzes/:quizId/attempts  (student: start quiz) ─
const startAttempt = async (req, res, next) => {
  try {
    const quizId    = Number(req.params.quizId);
    const studentId = req.user.user_id;

    const quiz = await prisma.quiz.findUnique({ where: { quiz_id: quizId } });
    if (!quiz) return res.status(404).json({ message: "Quiz not found." });

    // Enforce date window if set
    const now = new Date();
    if (quiz.start_date && now < quiz.start_date)
      return res.status(403).json({ message: "Quiz has not started yet." });
    if (quiz.end_date && now > quiz.end_date)
      return res.status(403).json({ message: "Quiz deadline has passed." });

    const attempt = await prisma.attempt.create({
      data: { user_id: studentId, quiz_id: quizId },
    });

    res.status(201).json(attempt);
  } catch (err) { next(err); }
};

// ── GET /api/attempts/:id ─────────────────────────────────────
const getAttempt = async (req, res, next) => {
  try {
    const attempt = await prisma.attempt.findUnique({
      where:   { attempt_id: Number(req.params.id) },
      include: { quiz: true, user: { select: { user_id: true, name: true, email: true } } },
    });

    if (!attempt) return res.status(404).json({ message: "Attempt not found." });

    // Students can only view their own attempts
    if (req.user.role === "student" && attempt.user_id !== req.user.user_id)
      return res.status(403).json({ message: "Forbidden." });

    res.json(attempt);
  } catch (err) { next(err); }
};

// ── GET /api/quizzes/:quizId/attempts  (teacher: see all attempts) ─
const listAttempts = async (req, res, next) => {
  try {
    const quizId = Number(req.params.quizId);

    // Verify teacher owns this quiz
    const quiz = await prisma.quiz.findUnique({ where: { quiz_id: quizId } });
    if (!quiz) return res.status(404).json({ message: "Quiz not found." });
    if (quiz.teacher_id !== req.user.user_id)
      return res.status(403).json({ message: "Forbidden." });

    const attempts = await prisma.attempt.findMany({
      where:   { quiz_id: quizId },
      include: { user: { select: { user_id: true, name: true, email: true } } },
      orderBy: { attempt_date: "desc" },
    });

    res.json(attempts);
  } catch (err) { next(err); }
};

// ── POST /api/attempts/:id/submit  (student: submit answers) ──
// Grades the attempt and writes a result record.
const submitAttempt = async (req, res, next) => {
  try {
    const attemptId = Number(req.params.id);
    const attempt   = await prisma.attempt.findUnique({ where: { attempt_id: attemptId } });

    if (!attempt) return res.status(404).json({ message: "Attempt not found." });
    if (attempt.user_id !== req.user.user_id)
      return res.status(403).json({ message: "Forbidden." });

    // Check not already graded
    const existingResult = await prisma.result.findFirst({
      where: { user_id: attempt.user_id, quiz_id: attempt.quiz_id },
    });
    if (existingResult)
      return res.status(400).json({ message: "Quiz already submitted.", result: existingResult });

    // Load questions with their answer options
    const questions = await prisma.question.findMany({
      where:   { quiz_id: attempt.quiz_id },
      include: { answers: true },
    });

    const { answers: studentAnswers = [] } = req.body;
    const { score } = gradeSubmission(questions, studentAnswers);

    // Write result
    const result = await prisma.result.create({
      data: {
        user_id:         attempt.user_id,
        quiz_id:         attempt.quiz_id,
        score,
        submission_date: new Date(),
      },
    });

    res.json({ message: "Quiz submitted.", result });
  } catch (err) { next(err); }
};

module.exports = { startAttempt, getAttempt, listAttempts, submitAttempt };
