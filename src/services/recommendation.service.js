import analysisRepository from "../repositories/analysis.repository.js";

class RecommendationService {
  async getTopRecommendations(userId, cvId, limit = 20) {
    const recommendations = await analysisRepository.getTopRecommendations(
      userId,
      cvId,
      limit,
    );

    // Format response
    return recommendations.map((rec) => ({
      analysis_id: rec.analysis_id,
      job_id: rec.job_id,
      job_title: rec.job_title_snapshot,
      company: rec.company_snapshot,
      match_score: parseFloat(rec.match_score),
      location: rec.location,
      external_url: rec.external_url,
      skill_match_count: parseInt(rec.skill_match_count),
      skill_gap_count: parseInt(rec.skill_gap_count),
      analyzed_at: rec.analyzed_at,
    }));
  }

  async getRecommendationDetail(analysisId) {
    return null;
  }
}

export default new RecommendationService();
