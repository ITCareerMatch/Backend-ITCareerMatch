import express from "express";
import jobController from "../controllers/job.controller.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Jobs
 *   description: Job management and analysis
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Job:
 *       type: object
 *       required:
 *         - title
 *         - company_name
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Unique identifier for the job
 *         title:
 *           type: string
 *         company_name:
 *           type: string
 *         external_url:
 *           type: string
 *           format: uri
 *         category:
 *           type: string
 *
 *         education_level:
 *           type: string
 *         experience_level:
 *           type: string
 *         job_type:
 *           type: string
 *           description: Full-time | Contract | Part-time
 *         work_system:
 *           type: string
 *           description: On-site | Remote | Hybrid
 *         gender_required:
 *           type: string
 *           description: male | female | both
 *
 *         location:
 *           type: string
 *           description: Raw location string from source
 *         city:
 *           type: string
 *         province:
 *           type: string
 *
 *         salary_raw:
 *           type: string
 *           description: Raw salary string for display
 *         salary_min:
 *           type: integer
 *           format: int64
 *         salary_max:
 *           type: integer
 *           format: int64
 *
 *         age_note:
 *           type: string
 *         min_age:
 *           type: integer
 *         max_age:
 *           type: integer
 *
 *         requirements:
 *           type: string
 *
 *         is_active:
 *           type: boolean
 *           default: true
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/v1/jobs:
 *   get:
 *     summary: Get all jobs
 *     tags: [Jobs]
 *     description: Retrieve all jobs with optional filtering (future support query params)
 *     responses:
 *       200:
 *         description: List of jobs retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Job'
 */

/**
 * @swagger
 * /api/v1/jobs/{id}:
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
 *                   $ref: '#/components/schemas/Job'
 *       404:
 *         description: Job not found
 */

router.get("/", jobController.getAll);
router.get("/:id", jobController.getById);

export default router;
