import analysisRepository from "../repositories/analysis.repository.js";
import cvRepository from "../repositories/cv.repository.js";
import jobRepository from "../repositories/job.repository.js";
import { analyzeGapSkill } from "./ai.service.js";

const normalizeSkills = (value) => {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => item?.trim()).filter(Boolean))];
};

const aggregateSkillsFromDetails = (details) => {
  const skillMatch = details
    .filter((detail) => detail.status === "match" && detail.skill_name_snapshot)
    .map((detail) => detail.skill_name_snapshot);

  const skillGap = details
    .filter((detail) => detail.status === "gap" && detail.skill_name_snapshot)
    .map((detail) => detail.skill_name_snapshot);

  const aiInsight =
    details.find((detail) => Boolean(detail.ai_insight))?.ai_insight || null;

  return {
    skillMatch: normalizeSkills(skillMatch),
    skillGap: normalizeSkills(skillGap),
    aiInsight,
  };
};

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

  async getHistory(userId, limit = 100, offset = 0, cvId = null, jobId = null) {
    return analysisRepository.getAnalysisHistory(
      userId,
      limit,
      offset,
      cvId,
      jobId,
    );
  }

  async getDetail(analysisId) {
    const analysis = await analysisRepository.getAnalysisById(analysisId);
    if (!analysis) return null;

    let details = await analysisRepository.getAnalysisDetails(analysisId);
    let { skillMatch, skillGap, aiInsight } =
      aggregateSkillsFromDetails(details);

    const shouldLazyAnalyze = details.length === 0 || !aiInsight;
    let lazySkillMatch = [];
    let lazySkillGap = [];
    let lazyAiInsight = null;

    if (shouldLazyAnalyze) {
      try {
        const cv = await cvRepository.getCvArchiveById(analysis.cv_id);
        const job = await jobRepository.findById(analysis.job_id);

        if (cv?.raw_text && job?.id && job?.title && job?.requirements) {
          const lazyResult = await analyzeGapSkill(cv.raw_text, {
            job_id: job.id,
            title: job.title,
            company_name: job.company_name || analysis.company_snapshot || "",
            description: (job.requirements || "").substring(0, 1500),
          });

          const lazyAnalysis = lazyResult?.analysis || lazyResult || {};
          lazySkillMatch = normalizeSkills(
            lazyAnalysis.skill_match ||
              lazyAnalysis.skillMatches ||
              lazyAnalysis.skills_match,
          );
          lazySkillGap = normalizeSkills(
            lazyAnalysis.skill_gap ||
              lazyAnalysis.skillGaps ||
              lazyAnalysis.skills_gap,
          );
          lazyAiInsight =
            lazyAnalysis.ai_insight || lazyAnalysis.aiInsight || null;

          if (!analysis.ai_insight && lazyAiInsight) {
            const updated = await analysisRepository.updateAnalysisInsight(
              analysisId,
              lazyAiInsight,
            );
            if (updated?.ai_insight) {
              analysis.ai_insight = updated.ai_insight;
            }
          }

          if (
            details.length === 0 &&
            (lazySkillMatch.length > 0 || lazySkillGap.length > 0)
          ) {
            const detailRows = [];

            for (const skillName of lazySkillMatch) {
              const skillId =
                await analysisRepository.getOrCreateSkillIdByName(skillName);
              if (skillId) {
                detailRows.push({
                  skill_id: skillId,
                  skill_name_snapshot: skillName,
                  status: "match",
                  ai_insight: lazyAiInsight,
                });
              }
            }

            for (const skillName of lazySkillGap) {
              const skillId =
                await analysisRepository.getOrCreateSkillIdByName(skillName);
              if (skillId) {
                detailRows.push({
                  skill_id: skillId,
                  skill_name_snapshot: skillName,
                  status: "gap",
                  ai_insight: lazyAiInsight,
                });
              }
            }

            if (detailRows.length > 0) {
              await analysisRepository.createAnalysisDetails(
                analysisId,
                detailRows,
              );
              details = await analysisRepository.getAnalysisDetails(analysisId);
              ({ skillMatch, skillGap, aiInsight } =
                aggregateSkillsFromDetails(details));
            }
          }
        }
      } catch (error) {
        console.warn(
          `[Analysis Service] Lazy analyze-single failed for analysis ${analysisId}:`,
          error.message,
        );
      }
    }

    const finalSkillMatch =
      skillMatch.length > 0 ? skillMatch : normalizeSkills(lazySkillMatch);
    const finalSkillGap =
      skillGap.length > 0 ? skillGap : normalizeSkills(lazySkillGap);
    const finalAiInsight =
      aiInsight || analysis.ai_insight || lazyAiInsight || null;

    return {
      ...analysis,
      skill_match: finalSkillMatch,
      skill_gap: finalSkillGap,
      ai_insight: finalAiInsight,
      skill_details: details,
    };
  }

  async checkAnalysisExists(cvId, jobId) {
    return analysisRepository.checkAnalysisExists(cvId, jobId);
  }

  async getHistoryCount(userId, cvId = null) {
    return analysisRepository.getAnalysisHistoryCount(userId, cvId);
  }
}

export default new AnalysisService();
