// src/app.js
require("dotenv").config();

const express = require("express");
const cors    = require("cors");
const helmet  = require("helmet");
const morgan  = require("morgan");

const authRoutes     = require("./routes/authRoutes");
const userRoutes     = require("./routes/userRoutes");
const quizRoutes     = require("./routes/quizRoutes");
const questionRoutes = require("./routes/questionRoutes");
const attemptRoutes  = require("./routes/attemptRoutes");
const resultRoutes   = require("./routes/resultRoutes");

const { errorHandler } = require("./middleware/errorMiddleware");
const { apiLimiter }   = require("./middleware/rateLimitMiddleware");

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== "test") {
  app.use(morgan("dev"));
}

app.use("/api/", apiLimiter);

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use("/api/auth",      authRoutes);
app.use("/api/users",     userRoutes);
app.use("/api/quizzes",   quizRoutes);
app.use("/api/questions", questionRoutes);
app.use("/api/attempts",  attemptRoutes);
app.use("/api/results",   resultRoutes);

app.use((_req, res) => res.status(404).json({ message: "Route not found" }));
app.use(errorHandler);

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🚀  Quiz Platform API running on port ${PORT}`);
  });
}

module.exports = app;
