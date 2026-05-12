// Dummy implementation, replace with real DB queries
class AnalysisService {
  async getHistory(userId) {
    // Return dummy history
    return [
      {
        id: "analysis-1",
        job_title_snapshot: "Data Scientist",
        company_snapshot: "PT. AI Cerdas",
        match_score: 85.2,
        analyzed_at: new Date().toISOString(),
      },
      // ...
    ];
  }

  async getDetail(userId, id) {
    // Return dummy detail
    return {
      id,
      job_title_snapshot: "Data Scientist",
      company_snapshot: "PT. AI Cerdas",
      match_score: 85.2,
      analyzed_at: new Date().toISOString(),
      skill_match: ["Python", "SQL"],
      skill_gap: ["Spark", "AWS"],
      ai_insight:
        "Skill Python dan SQL kamu sangat sesuai. Pertimbangkan untuk mempelajari Spark agar lebih kompetitif.",
    };
  }
}

export default new AnalysisService();
