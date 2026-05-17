// src/controllers/questionController.js
// In this schema, the "answers" table stores the answer OPTIONS for each question
// (e.g. the MCQ choices), NOT the student's submitted answers.

const prisma = require("../utils/prismaClient");

const ownsQuiz = async (teacherId, quizId) => {
  const quiz = await prisma.quiz.findUnique({ where: { quiz_id: quizId } });
  return quiz?.teacher_id === teacherId;
};

// GET /api/quizzes/:quizId/questions
const listQuestions = async (req, res, next) => {
  try {
    const questions = await prisma.question.findMany({
      where:   { quiz_id: Number(req.params.quizId) },
      include: { answers: true },
    });
    res.json(questions);
  } catch (err) { next(err); }
};

// POST /api/quizzes/:quizId/questions  (teacher only)
const createQuestion = async (req, res, next) => {
  try {
    const quizId = Number(req.params.quizId);
    if (!(await ownsQuiz(req.user.user_id, quizId)))
      return res.status(403).json({ message: "Forbidden." });

    const { question_text, question_type, answers } = req.body;

    const question = await prisma.question.create({
      data: {
        quiz_id:       quizId,
        question_text,
        question_type,
        answers: {
          create: answers.map((a) => ({
            answer_text: a.answer_text,
            is_correct:  Boolean(a.is_correct),
          })),
        },
      },
      include: { answers: true },
    });

    res.status(201).json(question);
  } catch (err) { next(err); }
};

// PATCH /api/questions/:id  (teacher only)
const updateQuestion = async (req, res, next) => {
  try {
    const question = await prisma.question.findUnique({
      where: { question_id: Number(req.params.id) },
    });
    if (!question) return res.status(404).json({ message: "Question not found." });
    if (!(await ownsQuiz(req.user.user_id, question.quiz_id)))
      return res.status(403).json({ message: "Forbidden." });

    const { question_text, question_type, answers } = req.body;

    // If new answers provided, replace all old ones
    if (answers) {
      await prisma.answer.deleteMany({ where: { question_id: question.question_id } });
    }

    const updated = await prisma.question.update({
      where: { question_id: Number(req.params.id) },
      data: {
        ...(question_text !== undefined && { question_text }),
        ...(question_type !== undefined && { question_type }),
        ...(answers && {
          answers: {
            create: answers.map((a) => ({
              answer_text: a.answer_text,
              is_correct:  Boolean(a.is_correct),
            })),
          },
        }),
      },
      include: { answers: true },
    });

    res.json(updated);
  } catch (err) { next(err); }
};

// DELETE /api/questions/:id  (teacher only)
const deleteQuestion = async (req, res, next) => {
  try {
    const question = await prisma.question.findUnique({
      where: { question_id: Number(req.params.id) },
    });
    if (!question) return res.status(404).json({ message: "Question not found." });
    if (!(await ownsQuiz(req.user.user_id, question.quiz_id)))
      return res.status(403).json({ message: "Forbidden." });

    await prisma.question.delete({ where: { question_id: Number(req.params.id) } });
    res.json({ message: "Question deleted." });
  } catch (err) { next(err); }
};

module.exports = { listQuestions, createQuestion, updateQuestion, deleteQuestion };
