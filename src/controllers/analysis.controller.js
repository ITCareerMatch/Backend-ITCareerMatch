import analysisService from "../services/analysis.service.js";

class AnalysisController {
  // List all analysis history for user
  async history(req, res, next) {
    try {
      const userId = req.user?.id;
      const data = await analysisService.getHistory(userId);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  // Get detail for one analysis
  async detail(req, res, next) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      const data = await analysisService.getDetail(userId, id);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
}

export default new AnalysisController();
