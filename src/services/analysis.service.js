import analysisRepository from "../repositories/analysis.repository.js";

class AnalysisService {
  async createAnalysis(
    userId,
    cvId,
    jobId,
    matchScore,
    jobTitleSnapshot,
    companySnapshot,
  ) {
    return analysisRepository.createAnalysisHistory({
      userId,
      cvId,
      jobId,
      matchScore,
      jobTitleSnapshot,
      companySnapshot,
    });
  }

  async createAnalysisDetails(analysisId, details) {
    return analysisRepository.createAnalysisDetails(analysisId, details);
  }

  async getHistory(userId, limit = 100, offset = 0) {
    return analysisRepository.getAnalysisHistory(userId, limit, offset);
  }

  async getDetail(analysisId) {
    const analysis = await analysisRepository.getAnalysisById(analysisId);
    if (!analysis) return null;

    const details = await analysisRepository.getAnalysisDetails(analysisId);

    return {
      ...analysis,
      skill_details: details,
    };
  }

  async checkAnalysisExists(cvId, jobId) {
    return analysisRepository.checkAnalysisExists(cvId, jobId);
  }

  async getHistoryCount(userId) {
    return analysisRepository.getAnalysisHistoryCount(userId);
  }
}

export default new AnalysisService();
