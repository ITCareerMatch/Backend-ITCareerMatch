import analysisService from "../services/analysis.service.js";

class AnalysisController {
  // List all analysis history for user
  async history(req, res, next) {
    try {
      const userId = req.user?.id;
      const { page = 1, limit = 10 } = req.query;

      const pageNum = Math.max(1, parseInt(page));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
      const offset = (pageNum - 1) * limitNum;

      const data = await analysisService.getHistory(userId, limitNum, offset);
      const total = await analysisService.getHistoryCount(userId);

      res.json({
        success: true,
        data,
        meta: {
          page: pageNum,
          limit: limitNum,
          total,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  // Get detail for one analysis
  async detail(req, res, next) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      const data = await analysisService.getDetail(id);

      if (!data || data.user_id !== userId) {
        return res.status(404).json({
          success: false,
          message: "Analysis not found",
        });
      }

      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
}

export default new AnalysisController();
