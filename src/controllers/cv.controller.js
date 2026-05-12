import { parsePdfToText, quickScorePreview } from "../lib/cv.utils.js";
import {
  saveCvArchive,
  createAnalysisTask,
  getTaskStatusAndResult,
  getUserIdFromReq,
} from "../services/cv.service.js";

class CvController {
  // Guest upload, parse in memory, return quick score preview
  async uploadPreview(req, res, next) {
    try {
      const file = req.file;
      if (!file)
        return res
          .status(400)
          .json({ success: false, message: "No file uploaded" });
      // Parse PDF to text (in memory)
      const cvText = await parsePdfToText(file.buffer);
      // Quick scoring (dummy or real logic)
      const preview = await quickScorePreview(cvText);
      res.json({ success: true, preview });
    } catch (err) {
      next(err);
    }
  }

  // User upload, save to DB, trigger async AI analysis
  async analyze(req, res, next) {
    try {
      const file = req.file;
      if (!file)
        return res
          .status(400)
          .json({ success: false, message: "No file uploaded" });
      const userId = getUserIdFromReq(req);
      // Parse PDF to text
      const cvText = await parsePdfToText(file.buffer);
      // Save to DB (cv_archives)
      const cvArchive = await saveCvArchive({ userId, file, cvText });
      // Trigger async AI analysis (queue)
      const taskId = await createAnalysisTask({
        userId,
        cvId: cvArchive.id,
        cvText,
      });
      res.json({ success: true, task_id: taskId });
    } catch (err) {
      next(err);
    }
  }

  // Get status of AI analysis
  async status(req, res, next) {
    try {
      const { task_id } = req.params;
      const userId = getUserIdFromReq(req);
      const { status, result } = await getTaskStatusAndResult({
        userId,
        taskId: task_id,
      });
      res.json({ success: true, status, result });
    } catch (err) {
      next(err);
    }
  }
}

export default new CvController();
