import express from "express";
import userController from "../controllers/user.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { validateUserUpdate } from "../middlewares/validator.middleware.js";

const router = express.Router();

/**
 * @swagger
 * /api/v1/user/profile:
 *   get:
 *     summary: Get Current User Profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     description: Retrieve the authenticated user's profile information
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
 *                     avatar_url:
 *                       type: string
 *                       format: uri
 *                       nullable: true
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *   put:
 *     summary: Update Current User Profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     description: Update the authenticated user's profile information (name, gender, avatar_url)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: John Doe
 *               gender:
 *                 type: string
 *                 enum: [male, female, other]
 *                 example: male
 *               avatar_url:
 *                 type: string
 *                 format: uri
 *                 nullable: true
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
 *                       nullable: true
 *                     avatar_url:
 *                       type: string
 *                       format: uri
 *                       nullable: true
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *   delete:
 *     summary: Delete Current User Account
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     description: Permanently delete the authenticated user's account and all associated data
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
  validateUserUpdate,
  userController.updateMe,
);
router.delete("/profile", authenticate, userController.deleteMe);

export default router;
