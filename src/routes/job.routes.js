const express = require("express");
const jobController = require("../controllers/job.controller");

const pool = require("../config/db");
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
 *         salary_min:
 *           type: integer
 *         salary_max:
 *           type: integer
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
 *   post:
 *     summary: Create a new job
 *     tags: [Jobs]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Job'
 *     responses:
 *       201:
 *         description: Job created
 *
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
 *     responses:
 *       200:
 *         description: Job found
 *       404:
 *         description: Job not found
 *   put:
 *     summary: Update job by ID
 *     tags: [Jobs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Job'
 *     responses:
 *       200:
 *         description: Job updated
 *   delete:
 *     summary: Delete job by ID
 *     tags: [Jobs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Job deleted
 */

router.get("/", (req, res) => jobController.getAll(req, res));
router.get("/:id", (req, res) => jobController.getById(req, res));
router.post("/", (req, res) => jobController.create(req, res));
router.put("/:id", (req, res) => jobController.update(req, res));
router.delete("/:id", (req, res) => jobController.delete(req, res));

module.exports = router;
