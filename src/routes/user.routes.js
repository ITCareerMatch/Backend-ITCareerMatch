import express from "express";
import multer from "multer";
import userController from "../controllers/user.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { validateUserUpdate } from "../middlewares/validator.middleware.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * @swagger
 * /api/v1/user/profile:
 *   get:
 *     summary: Get Current User Profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     description: Retrieve the authenticated user's complete profile information including demographic data used for hard filtering
 *     responses:
 *       200:
 *         description: User profile successfully retrieved
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
 *                     email:
 *                       type: string
 *                       format: email
 *                     name:
 *                       type: string
 *                     gender:
 *                       type: string
 *                       nullable: true
 *                       enum: [male, female, other]
 *                     avatar_url:
 *                       type: string
 *                       format: uri
 *                       nullable: true
 *                     birth_date:
 *                       type: string
 *                       format: date
 *                       nullable: true
 *                       description: User's birth date (YYYY-MM-DD) for hard filtering by age
 *                     education_level:
 *                       type: string
 *                       nullable: true
 *                       enum: [SMA, D3, S1, S2, S3]
 *                       description: Highest education level achieved
 *                     experience_level:
 *                       type: string
 *                       nullable: true
 *                       enum: [Junior, Mid, Senior]
 *                       description: Career experience level for job filtering
 *                     city:
 *                       type: string
 *                       nullable: true
 *                       description: Current city of residence for location-based filtering
 *                     province:
 *                       type: string
 *                       nullable: true
 *                       description: Province for regional filtering
 *                     min_salary_expect:
 *                       type: integer
 *                       nullable: true
 *                       description: Minimum expected salary in IDR
 *                     max_salary_expect:
 *                       type: integer
 *                       nullable: true
 *                       description: Maximum expected salary in IDR
 *                     bio:
 *                       type: string
 *                       nullable: true
 *                       description: Short biography or professional summary
 *                     skills_overview:
 *                       type: string
 *                       nullable: true
 *                       description: Overview of key technical skills
 *                     is_verified:
 *                       type: boolean
 *                       description: Email verification status
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *                     updated_at:
 *                       type: string
 *                       format: date-time
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *   put:
 *     summary: Update Current User Profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Update user profile including demographic data.
 *       Only include fields you want to change; omitted or empty fields keep their existing values.
 *       Leave fields blank if you do not want to change them.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Full name
 *               gender:
 *                 type: string
 *                 description: |
 *                   Gender field.
 *                 enum: ["", male, female, other]
 *               avatar:
 *                 type: string
 *                 format: binary
 *                 description: Avatar image file (.jpg/.png)
 *               birth_date:
 *                 type: string
 *                 format: date
 *                 description: Birth date (YYYY-MM-DD) - used to calculate age for job filtering
 *               education_level:
 *                 type: string
 *                 description: |
 *                   Highest education level used to filter jobs by education requirement.
 *                 enum: ["", SMA, D3, S1, S2, S3]
 *               experience_level:
 *                 type: string
 *                 description: |
 *                   Career experience level used to filter jobs by experience requirement.
 *                 enum: ["", junior, mid, senior]
 *               city:
 *                 type: string
 *                 description: Current city of residence used for location-based job filtering
 *               province:
 *                 type: string
 *                 description: Province used for regional job filtering
 *               min_salary_expect:
 *                 type: integer
 *                 description: Minimum expected salary in IDR
 *               max_salary_expect:
 *                 type: integer
 *                 description: Maximum expected salary in IDR
 *               bio:
 *                 type: string
 *                 description: Short professional biography or summary
 *               skills_overview:
 *                 type: string
 *                 description: Overview of key technical skills (comma-separated)
 *     responses:
 *       200:
 *         description: Profile successfully updated
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
 *                     email:
 *                       type: string
 *                       format: email
 *                     name:
 *                       type: string
 *                     gender:
 *                       type: string
 *                     avatar_url:
 *                       type: string
 *                       format: uri
 *                       nullable: true
 *                     birth_date:
 *                       type: string
 *                       format: date
 *                       nullable: true
 *                     education_level:
 *                       type: string
 *                       nullable: true
 *                     experience_level:
 *                       type: string
 *                       nullable: true
 *                     city:
 *                       type: string
 *                       nullable: true
 *                     province:
 *                       type: string
 *                       nullable: true
 *                     min_salary_expect:
 *                       type: integer
 *                       nullable: true
 *                     max_salary_expect:
 *                       type: integer
 *                       nullable: true
 *                     bio:
 *                       type: string
 *                       nullable: true
 *                     skills_overview:
 *                       type: string
 *                       nullable: true
 *                     updated_at:
 *                       type: string
 *                       format: date-time
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *   delete:
 *     summary: Delete Current User Account
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     description: Permanently delete the authenticated user's account and all associated data from the system
 *     responses:
 *       200:
 *         description: Account successfully deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Account successfully deleted
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */

router.get("/profile", authenticate, userController.getMe);
router.put(
  "/profile",
  authenticate,
  upload.single("avatar"),
  validateUserUpdate,
  userController.updateMe,
);
router.delete("/profile", authenticate, userController.deleteMe);

export default router;
