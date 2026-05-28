import express from "express";
import jobController from "../controllers/job.controller.js";
import {
  validateUUID,
  validateJobFilters,
} from "../middlewares/validator.middleware.js";

const router = express.Router();

/**
 * @swagger
 * /api/v1/jobs:
 *   get:
 *     summary: Get All Jobs
 *     tags: [Jobs]
 *     security: []
 *     description: Retrieve a list of all available jobs with pagination and general filters.
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by job title or keywords
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *         description: Filter by city name (e.g., Jakarta)
 *       - in: query
 *         name: province
 *         schema:
 *           type: string
 *         description: Filter by province name (e.g., "DI Yogyakarta")
 *       - in: query
 *         name: minSalary
 *         schema:
 *           type: integer
 *         description: Minimum salary filter
 *       - in: query
 *         name: maxSalary
 *         schema:
 *           type: integer
 *         description: Maximum salary filter
 *       - in: query
 *         name: minAge
 *         schema:
 *           type: integer
 *         description: Minimum age requirement
 *       - in: query
 *         name: maxAge
 *         schema:
 *           type: integer
 *         description: Maximum age requirement
 *       - in: query
 *         name: education_level
 *         schema:
 *           type: string
 *           enum: [sma, d3, s1, s2, semua]
 *         description: "Filter by education level"
 *       - in: query
 *         name: gender
 *         schema:
 *           type: string
 *           enum: [laki-laki, perempuan, semua]
 *         description: "Filter by gender requirement"
 *       - in: query
 *         name: job_type
 *         schema:
 *           type: string
 *           enum: [penuh-waktu, kontrak, magang, paruh-waktu, freelance]
 *         description: "Filter by job type"
 *       - in: query
 *         name: work_system
 *         schema:
 *           type: string
 *           enum: [di-kantor, remote, hybrid]
 *         description: "Filter by work system"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
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
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       title:
 *                         type: string
 *                         example: "Web Developer"
 *                       company_name:
 *                         type: string
 *                         example: "CITRANET (PT Jembatan Citra Nusantara)"
 *                       external_url:
 *                         type: string
 *                         nullable: true
 *                         example: "https://glints.com/id/opportunities/..."
 *                       city:
 *                         type: string
 *                         example: "Kab. Sleman"
 *                       province:
 *                         type: string
 *                         example: "DI Yogyakarta"
 *                       location:
 *                         type: string
 *                         example: "Kab. Sleman, DI Yogyakarta"
 *                       salary_raw:
 *                         type: string
 *                         example: "Rp2.200.000 - 3.000.000/Bulan"
 *                       salary_min:
 *                         type: integer
 *                         example: 2200000
 *                       salary_max:
 *                         type: integer
 *                         nullable: true
 *                         example: 3000000
 *                       min_age:
 *                         type: integer
 *                         nullable: true
 *                       max_age:
 *                         type: integer
 *                         nullable: true
 *                       age_note:
 *                         type: string
 *                         example: "tanpa batasan usia"
 *                       education_level:
 *                         type: string
 *                         example: "Minimal SMA/SMK"
 *                       gender_required:
 *                         type: string
 *                         example: "Laki-laki saja"
 *                       job_type:
 *                         type: string
 *                         example: "Penuh Waktu"
 *                       work_system:
 *                         type: string
 *                         example: "Kerja di kantor"
 *                       requirements:
 *                         type: string
 *                         example: "Kualifikasi :\nSMK/D3/S1 Ilmu komputer..."
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                       updated_at:
 *                         type: string
 *                         format: date-time
 *                       skills:
 *                         type: array
 *                         items:
 *                           type: string
 *                         example: ["PHP", "JavaScript", "Java", "MySQL"]
 *                 meta:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 */

/**
 * @swagger
 * /api/v1/jobs/{id}:
 *   get:
 *     summary: Get Job Details by ID
 *     tags: [Jobs]
 *     security: []
 *     description: Retrieve detailed information about a specific job listing by its unique UUID.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Unique job identifier
 *     responses:
 *       200:
 *         description: Job details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                       example: "cf6e8af9-9f98-4316-8bc1-b8d3204cf153"
 *                     title:
 *                       type: string
 *                       example: "Web Developer"
 *                     company_name:
 *                       type: string
 *                       example: "CITRANET (PT Jembatan Citra Nusantara)"
 *                     external_url:
 *                       type: string
 *                       nullable: true
 *                       example: "https://glints.com/id/opportunities/..."
 *                     city:
 *                       type: string
 *                       example: "Kab. Sleman"
 *                     province:
 *                       type: string
 *                       example: "DI Yogyakarta"
 *                     location:
 *                       type: string
 *                       example: "Kab. Sleman, DI Yogyakarta"
 *                     salary_raw:
 *                       type: string
 *                       example: "Rp2.200.000 - 3.000.000/Bulan"
 *                     salary_min:
 *                       type: integer
 *                       example: 2200000
 *                     salary_max:
 *                         type: integer
 *                         nullable: true
 *                         example: 3000000
 *                     min_age:
 *                       type: integer
 *                       nullable: true
 *                       example: null
 *                     max_age:
 *                       type: integer
 *                       nullable: true
 *                       example: null
 *                     age_note:
 *                       type: string
 *                       example: "tanpa batasan usia"
 *                     education_level:
 *                       type: string
 *                       example: "Minimal SMA/SMK"
 *                     gender_required:
 *                       type: string
 *                       example: "Laki-laki saja"
 *                     job_type:
 *                       type: string
 *                       example: "Penuh Waktu"
 *                     work_system:
 *                       type: string
 *                       example: "Kerja di kantor"
 *                     requirements:
 *                       type: string
 *                       example: "Kualifikasi :\nSMK/D3/S1 Ilmu komputer, manajemen informatika, sistem informasi\nMemiliki kemampuan dalam pemrograman PHP..."
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *                       example: "2026-05-04T14:07:22.394Z"
 *                     updated_at:
 *                       type: string
 *                       format: date-time
 *                       example: "2026-05-04T14:07:22.394Z"
 *                     skills:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["PHP", "JavaScript", "Java", "MySQL"]
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */

router.get("/", validateJobFilters, jobController.getAll);
router.get("/:id", validateUUID, jobController.getById);

export default router;
