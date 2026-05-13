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
 *     description: Retrieve a list of all available jobs with optional filtering and pagination
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
 *         description: Filter by city
 *       - in: query
 *         name: province
 *         schema:
 *           type: string
 *         description: Filter by province
 *       - in: query
 *         name: minSalary
 *         schema:
 *           type: integer
 *           format: int32
 *         description: Minimum salary filter
 *       - in: query
 *         name: maxSalary
 *         schema:
 *           type: integer
 *           format: int32
 *         description: Maximum salary filter
 *       - in: query
 *         name: minAge
 *         schema:
 *           type: integer
 *           format: int32
 *         description: Minimum age requirement
 *       - in: query
 *         name: maxAge
 *         schema:
 *           type: integer
 *           format: int32
 *         description: Maximum age requirement
 *       - in: query
 *         name: education_level
 *         schema:
 *           type: string
 *         description: Filter by education level
 *       - in: query
 *         name: gender
 *         schema:
 *           type: string
 *           enum: [male, female, both]
 *         description: Filter by gender requirement
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           format: int32
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           format: int32
 *           default: 10
 *         description: Number of items per page
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
 *                       company_name:
 *                         type: string
 *                       city:
 *                         type: string
 *                       salary_min:
 *                         type: integer
 *                       salary_max:
 *                         type: integer
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 */

/**
 * @swagger
 * /api/v1/jobs/{id}:
 *   get:
 *     summary: Get Job Details by ID
 *     tags: [Jobs]
 *     description: Retrieve detailed information about a specific job listing
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
 *                       nullable: true
 *                     max_age:
 *                       type: integer
 *                       nullable: true
 *                     age_note:
 *                       type: string
 *                       nullable: true
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
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */

router.get("/", validateJobFilters, jobController.getAll);
router.get("/:id", validateUUID, jobController.getById);

export default router;
