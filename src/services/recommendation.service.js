// Dummy implementation, replace with real DB queries
class RecommendationService {
  async getTopRecommendations(userId) {
    // Return dummy Top-20 jobs
    return [
      {
        job_id: "job-1",
        job_title: "Software Engineer",
        company: "PT. Teknologi Maju",
        match_score: 88.5,
        skill_match: ["JavaScript", "React"],
        skill_gap: ["AWS"],
        ai_insight:
          "Skill React kamu sudah bagus, pelajari AWS untuk peluang lebih besar.",
      },
      // ... up to 20
    ];
  }
}

export default new RecommendationService();
