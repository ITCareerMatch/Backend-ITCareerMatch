import axios from "axios";
import jobRepository from "../repositories/job.repository.js";
import cvRepository from "../repositories/cv.repository.js";
import userRepository from "../repositories/user.repository.js";
import config from "../config/config.js";
import { CATEGORY_KEYWORD_MAP } from "../constants/cvKeyword.js";
import { STOP_WORDS, SECTION_WEIGHTS } from "../constants/cvKeyword.js";

export const processJobToAi = async (jobData) => {
  const { userId, cvId } = jobData;

  const normalizeText = (value) =>
    (value || "")
      .toString()
      .toLowerCase()
      .replace(/[^a-z0-9+.#/\s-]/gi, " ")
      .replace(/\s+/g, " ")
      .trim();

  const buildKeywordMap = (text) => {
    if (!text) return new Map();

    const DEFAULT_WEIGHT = 1;

    const lines = text.split(/\n/);
    const sections = [];
    let current = { weight: DEFAULT_WEIGHT, lines: [] };

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // A header line: short, matches pattern, no bullet prefix
      // Also test a lightly-cleaned version so '1. Skills' or 'A. KEAHLIAN' are caught
      const cleanedForHeader = trimmed
        .replace(/^([0-9]+|[a-zA-Z])[.)]\s*/, "")
        .trim();
      if (trimmed.length < 80 && !/^[•\-*]/.test(trimmed)) {
        let matched = false;
        for (const { pattern, weight } of SECTION_WEIGHTS) {
          if (pattern.test(trimmed) || pattern.test(cleanedForHeader)) {
            if (current.lines.length > 0) sections.push(current);
            current = { weight, lines: [] };
            matched = true;
            break;
          }
        }
        if (!matched) current.lines.push(trimmed);
      } else {
        current.lines.push(trimmed);
      }
    }
    if (current.lines.length > 0) sections.push(current);

    const keywordMap = new Map();
    const add = (kw, w) => {
      if (w === 0) return;
      const prev = keywordMap.get(kw) || 0;
      if (w > prev) keywordMap.set(kw, w);
    };

    for (const section of sections) {
      const sectionNorm = normalizeText(section.lines.join(" "));
      const tokens = sectionNorm
        .split(" ")
        .map((t) => t.trim())
        .filter((t) => t.length >= 2 && !STOP_WORDS.has(t));

      for (const token of tokens) add(token, section.weight);

      for (let i = 0; i < tokens.length - 1; i++) {
        add(`${tokens[i]} ${tokens[i + 1]}`, section.weight);
      }
    }

    return keywordMap;
  };

  // Score job text against CV keyword map — weighted by section importance
  const scoreKeywordOverlapWeighted = (cvKeywordMap, jobNormalized) => {
    if (!cvKeywordMap.size || !jobNormalized) return 0;
    let score = 0;
    for (const [keyword, weight] of cvKeywordMap) {
      if (jobNormalized.includes(keyword)) {
        const typeMultiplier = keyword.includes(" ") ? 2 : 1;
        score += weight * typeMultiplier;
      }
    }
    return score;
  };

  const cv = await cvRepository.getCvArchiveById(cvId);
  if (!cv || !cv.raw_text) {
    throw new Error(`CV not found or raw_text is empty for cvId: ${cvId}`);
  }

  const cvKeywordMap = buildKeywordMap(cv.raw_text);
  const cvNormalized = normalizeText(cv.raw_text);

  const userProfile = await userRepository.findById(userId);
  if (!userProfile) throw new Error(`User not found: ${userId}`);

  let userAge = null;
  if (userProfile.birth_date) {
    const today = new Date();
    const birth = new Date(userProfile.birth_date);
    userAge = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birth.getDate())
    ) {
      userAge--;
    }
  }

  console.log(
    `[AI Service] User — Education: ${userProfile.education_level}, Gender: ${userProfile.gender}, City: ${userProfile.city}, Age: ${userAge}`,
  );

  const candidatePoolLimit = config.aiMatchCandidatePoolLimit || 600;
  const aiMatchJobLimit = config.aiMatchJobLimit || 20;

  // Fetch candidate pool of jobs with basic filters
  const filteredJobs = await jobRepository.findAll({
    page: 1,
    limit: candidatePoolLimit,
    education_level: userProfile.education_level || undefined,
    gender: userProfile.gender || undefined,
    minAge: userAge || undefined,
    maxAge: userAge || undefined,
  });

  const jobsArray = filteredJobs.data || filteredJobs;
  if (!jobsArray || jobsArray.length === 0) {
    throw new Error(`No jobs found after filtering for user: ${userId}`);
  }

  console.log(`[AI Service] Candidate pool: ${jobsArray.length} jobs`);

  const inferCategoryBoost = (job) => {
    const category = normalizeText(job.category || "");
    if (!category) return 0;

    for (const [cat, signals] of Object.entries(CATEGORY_KEYWORD_MAP)) {
      if (!category.includes(cat)) continue;
      if (signals.some((s) => cvNormalized.includes(s))) return 20;
    }
    return 0;
  };

  // Rank jobs by weighted keyword overlap with CV (before calling AI) to select top candidates for AI matching
  const rankedJobs = jobsArray
    .map((job) => {
      const jobText = [
        job.title,
        job.category || "",
        job.company_name,
        job.requirements,
        Array.isArray(job.skills) ? job.skills.join(" ") : "",
        job.job_type,
        job.work_system,
        job.education_level,
        job.gender_required,
        job.location,
        job.city,
        job.province,
      ].join(" ");

      const jobNormalized = normalizeText(jobText);
      const titleNormalized = normalizeText(job.title);
      const reqNormalized = normalizeText(job.requirements || "");

      // Weighted overlap: skills section keywords count more than narration
      const baseOverlap = scoreKeywordOverlapWeighted(
        cvKeywordMap,
        jobNormalized,
      );
      const titleBonus =
        scoreKeywordOverlapWeighted(cvKeywordMap, titleNormalized) * 3;
      const categoryBonus = inferCategoryBoost(job);
      let requirementsBonus = 0;
      for (const [keyword, weight] of cvKeywordMap) {
        if (
          weight >= 2 &&
          keyword.includes(" ") &&
          reqNormalized.includes(keyword)
        ) {
          requirementsBonus += weight * 2;
        }
      }

      return {
        ...job,
        _relevanceScore:
          baseOverlap + titleBonus + requirementsBonus + categoryBonus,
      };
    })
    .sort((a, b) => {
      if (b._relevanceScore !== a._relevanceScore)
        return b._relevanceScore - a._relevanceScore;
      return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    });

  const selectedJobs = rankedJobs.slice(0, aiMatchJobLimit);

  console.log(
    `[AI Service] Top ${selectedJobs.length} selected — scores: ${selectedJobs
      .slice(0, 5)
      .map((j) => `${j.title}@${j.company_name}=${j._relevanceScore}`)
      .join(", ")}`,
  );

  // Step 1: Call batch AI match endpoint to get match_score for all selected jobs
  const payload = {
    user_id: userId,
    cv_id: cvId,
    cv_text: cv.raw_text,
    filtered_jobs: selectedJobs.map((job) => ({
      job_id: job.id,
      title: job.title,
      company_name: job.company_name,
      description: (
        job.requirements || `Requirements for ${job.title}`
      ).substring(0, 1000),
    })),
  };

  let batchRecommendations = [];
  let extracted_skills = [];

  try {
    console.log(
      `[AI Service] Calling /internal/ai/match with ${payload.filtered_jobs.length} jobs`,
    );
    const response = await axios.post(
      `${config.aiApiUrl}/internal/ai/match`,
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          "X-Internal-Request": config.internalApiKey,
        },
        timeout: 30000,
      },
    );

    const aiResponse = response.data || {};
    extracted_skills = aiResponse.extracted_skills || [];
    batchRecommendations = aiResponse.recommendations || [];

    console.log(
      `[AI Batch] Received ${batchRecommendations.length} recommendations, ${extracted_skills.length} skills`,
    );
  } catch (error) {
    console.error(
      `[AI Service] Batch match failed: ${error.response?.status || error.code}`,
      error.response?.data || error.message,
    );
    // Fall back to using ranked jobs with zero match_score so we still call analyze-single
    batchRecommendations = selectedJobs.map((job) => ({
      job_id: job.id,
      job_title: job.title,
      company: job.company_name,
      match_score: 0,
    }));
  }

  // Step 2: For each recommended job, call analyze-single to get skill_match, skill_gap, and ai_insight
  console.log(
    `[AI Service] Running analyze-single for all ${batchRecommendations.length} jobs in parallel...`,
  );

  const analyzeResults = await Promise.allSettled(
    batchRecommendations.map(async (rec) => {
      const jobRecord =
        selectedJobs.find((j) => j.id === rec.job_id) ||
        (await jobRepository.findById(rec.job_id)) ||
        {};

      const singlePayload = {
        cv_text: cv.raw_text,
        job: {
          job_id: rec.job_id,
          title: rec.job_title || rec.title || jobRecord.title || "",
          company_name: rec.company || jobRecord.company_name || "",
          description: (
            jobRecord.requirements ||
            rec.description ||
            `Requirements for ${rec.job_title || rec.title || ""}`
          ).substring(0, 1500),
        },
      };

      const { data: singleResp } = await axios.post(
        `${config.aiApiUrl}/internal/ai/analyze-single`,
        singlePayload,
        {
          headers: {
            "Content-Type": "application/json",
            "X-Internal-Request": config.internalApiKey,
          },
          timeout: 25000,
        },
      );

      return { job_id: rec.job_id, data: singleResp };
    }),
  );

  // Step 3: Merge batch scores + single analysis into final recommendations
  const finalRecommendations = batchRecommendations.map((rec) => {
    const settled = analyzeResults.find(
      (r) => r.status === "fulfilled" && r.value?.job_id === rec.job_id,
    );

    if (!settled) {
      console.warn(
        `[AI Service] analyze-single failed or missing for job ${rec.job_id}`,
      );
      return {
        ...rec,
        skill_match: [],
        skill_gap: [],
        ai_insight: null,
      };
    }

    const analysis = settled.value.data?.analysis || settled.value.data || {};

    const skill_match =
      analysis.skill_match ??
      analysis.skillMatches ??
      analysis.skills_match ??
      [];

    const skill_gap =
      analysis.skill_gap ?? analysis.skillGaps ?? analysis.skills_gap ?? [];

    const ai_insight =
      analysis.ai_insight ?? analysis.aiInsight ?? analysis.insight ?? null;

    // Use batch match_score as primary (SBERT semantic score);
    // fall back to single score if batch gave 0
    const match_score =
      rec.match_score || analysis.match_score || analysis.matchScore || 0;

    console.log(
      `[AI Merge] job=${rec.job_id} score=${match_score} match=${Array.isArray(skill_match) ? skill_match.length : 0} gap=${Array.isArray(skill_gap) ? skill_gap.length : 0}`,
    );

    return {
      ...rec,
      match_score,
      skill_match: Array.isArray(skill_match) ? skill_match : [],
      skill_gap: Array.isArray(skill_gap) ? skill_gap : [],
      ai_insight,
    };
  });

  // Persist extracted skills
  if (extracted_skills.length > 0) {
    console.log(
      `[AI Service] Updating ${extracted_skills.length} skills for user ${userId}`,
    );
    await userRepository.updateUserSkills(userId, cvId, extracted_skills);
  }

  // Persist recommendations
  if (finalRecommendations.length > 0) {
    console.log(
      `[AI Service] Saving ${finalRecommendations.length} recommendations`,
    );
    await userRepository.saveRecommendations(
      userId,
      cvId,
      finalRecommendations,
    );
  }

  return {
    message: "Successfully processed and saved AI recommendations.",
    userId,
    cvId,
    user_age: userAge,
    jobs_filtered: jobsArray.length,
    skills_updated: extracted_skills.length,
    recommendations_saved: finalRecommendations.length,
  };
};

/**
 * Analyze a single CV against a single job for gap skill analysis.
 * Called when user clicks "Lihat Detail" on a job listing.
 */
export const analyzeGapSkill = async (cvText, jobData) => {
  const { job_id, title, company_name, description } = jobData;

  if (!cvText?.trim()) throw new Error("CV text is required");
  if (!job_id || !title || !description)
    throw new Error("job_id, title, and description are required");

  const payload = {
    cv_text: cvText,
    job: { job_id, title, company_name: company_name || "", description },
  };

  console.log(`[AI Service] Gap analysis for job ${job_id}`);

  try {
    const response = await axios.post(
      `${config.aiApiUrl}/internal/ai/analyze-single`,
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          "X-Internal-Request": config.internalApiKey,
        },
        timeout: 15000,
      },
    );

    const analysis = response.data?.analysis || {};

    return {
      analysis: {
        job_id: analysis.job_id ?? job_id,
        match_score: analysis.match_score ?? 0,
        skill_match: Array.isArray(analysis.skill_match)
          ? analysis.skill_match
          : [],
        skill_gap: Array.isArray(analysis.skill_gap) ? analysis.skill_gap : [],
        ai_insight: analysis.ai_insight ?? null,
      },
    };
  } catch (error) {
    console.error(
      `[AI Service] Gap analysis failed for job ${job_id}:`,
      error.response?.data || error.message,
    );
    throw new Error(
      `Gap skill analysis failed: ${error.response?.data?.message || error.message}`,
    );
  }
};
