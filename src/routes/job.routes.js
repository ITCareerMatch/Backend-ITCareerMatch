import express from "express";
import jobController from "../controllers/job.controller.js";
import { validateUUID } from "../middlewares/validator.middleware.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Jobs
 *   description: Job management and analysis
 */

/**
 * @swagger
 * /api/jobs:
 *   get:
 *     summary: Get all jobs
 *     tags: [Jobs]
 *     description: Retrieve jobs with filtering & pagination
 *
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by job title
 *
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *         description: Filter by city
 *
 *       - in: query
 *         name: province
 *         schema:
 *           type: string
 *         description: Filter by province
 *
 *       - in: query
 *         name: minSalary
 *         schema:
 *           type: integer
 *         description: Minimum salary
 *
 *       - in: query
 *         name: maxSalary
 *         schema:
 *           type: integer
 *         description: Maximum salary
 *
 *       - in: query
 *         name: minAge
 *         schema:
 *           type: integer
 *         description: Minimum age
 *
 *       - in: query
 *         name: maxAge
 *         schema:
 *           type: integer
 *         description: Maximum age
 *
 *       - in: query
 *         name: education_level
 *         schema:
 *           type: string
 *         description: Filter by education level
 *
 *       - in: query
 *         name: gender
 *         schema:
 *           type: string
 *           enum: [male, female, both]
 *         description: Filter by gender
 *
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of items per page
 *
 *     responses:
 *       200:
 *         description: List of jobs
 */

/**
 * @swagger
 * /api/jobs/{id}:
 *   get:
 *     summary: Get job by ID
 *     tags: [Jobs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The job unique identifier
 *     responses:
 *       200:
 *         description: Job details found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     title:
 *                       type: string
 *                     company_name:
 *                       type: string
 *                     city:
 *                       type: string
 *                     province:
 *                       type: string
 *                     location:
 *                       type: string
 *                     salary_raw:
 *                       type: string
 *                     salary_min:
 *                       type: integer
 *                     salary_max:
 *                       type: integer
 *                     min_age:
 *                       type: integer
 *                     max_age:
 *                       type: integer
 *                     age_note:
 *                       type: string
 *                     education_level:
 *                       type: string
 *                     gender_required:
 *                       type: string
 *                     job_type:
 *                       type: string
 *                     work_system:
 *                       type: string
 *                     requirements:
 *                       type: string
 *                     skills:
 *                       type: array
 *                       items:
 *                         type: string
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *                     updated_at:
 *                       type: string
 *                       format: date-time
 *       404:
 *         description: Job not found
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       **Authorization header:**
 *
 *           Bearer ... (token)
 *
 *       Contoh:
 *           Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 */

router.get("/", jobController.getAll);
router.get("/:id", validateUUID, authenticate, jobController.getById);

export default router;
