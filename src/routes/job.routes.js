import express from "express";
import jobController from "../controllers/job.controller.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Jobs
 *   description: Job management
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
 *         title:
 *           type: string
 *         company_name:
 *           type: string
 *         category:
 *           type: string
 *         experience_level:
 *           type: string
 *         job_type:
 *           type: string
 *         requirements:
 *           type: string
 *         location:
 *           type: string
 *         gender_required:
 *           type: string
 *         salary:
 *           type: string
 *         external_url:
 *           type: string
 *         source:
 *           type: string
 *         is_active:
 *           type: boolean
 *         scraped_at:
 *           type: string
 *           format: date-time
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
 *     responses:
 *       200:
 *         description: List of jobs
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
 *          type: string
 *          format: uuid
 *     responses:
 *       200:
 *         description: Job found
 *       404:
 *         description: Job not found
 */

router.get("/", jobController.getAll);
router.get("/:id", jobController.getById);

export default router;
