import axios from "axios";
import jobRepository from "../repositories/job.repository.js";
import cvRepository from "../repositories/cv.repository.js";
import userRepository from "../repositories/user.repository.js";
import config from "../config/config.js";

export const processJobToAi = async (jobData) => {
  const { userId, cvId } = jobData;

  const hasItems = (value) => Array.isArray(value) && value.length > 0;
  const normalizeText = (value) =>
    (value || "")
      .toString()
      .toLowerCase()
      .replace(/[^a-z0-9+.#/\s-]/gi, " ")
      .replace(/\s+/g, " ")
      .trim();

  const buildKeywordSet = (text) => {
    const normalized = normalizeText(text);
    if (!normalized) return new Set();

    const tokens = normalized.split(" ").filter((token) => token.length >= 3);
    const phrases = [];

    for (let i = 0; i < tokens.length - 1; i++) {
      phrases.push(`${tokens[i]} ${tokens[i + 1]}`);
    }

    return new Set([...tokens, ...phrases]);
  };

  const extractSkillPhrases = (text) => {
    const normalized = normalizeText(text);
    if (!normalized) return new Set();

    const skillPhrases = [
      "machine learning",
      "deep learning",
      "computer vision",
      "natural language processing",
      "artificial intelligence",
      "ai engineer",
      "ml engineer",
      "data scientist",
      "data analysis",
      "data analyst",
      "python",
      "javascript",
      "typescript",
      "node.js",
      "react",
      "next.js",
      "vue",
      "angular",
      "php",
      "laravel",
      "java",
      "spring boot",
      "c#",
      "dotnet",
      "flutter",
      "kotlin",
      "swift",
      "fastapi",
      "flask",
      "django",
      "tensorflow",
      "pytorch",
      "scikit learn",
      "keras",
      "nlp",
      "docker",
      "kubernetes",
      "postgresql",
      "mysql",
      "mongodb",
      "redis",
      "rest api",
      "graphql",
      "git",
      "linux",
      "aws",
      "gcp",
      "azure",
      "ci cd",
      "testing",
      "automation",
      "web developer",
      "frontend",
      "backend",
      "fullstack",
      "ui ux",
      "mobile developer",
      "it support",
      "technical support",
    ];

    return new Set(
      skillPhrases.filter((phrase) => normalized.includes(phrase)),
    );
  };

  const scoreTextOverlap = (sourceKeywords, text) => {
    if (!sourceKeywords.size) return 0;

    const normalized = normalizeText(text);
    if (!normalized) return 0;

    let score = 0;
    for (const keyword of sourceKeywords) {
      if (normalized.includes(keyword)) {
        score += keyword.includes(" ") ? 3 : 1;
      }
    }

    return score;
  };

  const inferDomainBoost = (text) => {
    const normalized = normalizeText(text);
    if (!normalized) return 0;

    const weightedKeywords = [
      ["machine learning", 6],
      ["deep learning", 6],
      ["computer vision", 6],
      ["natural language processing", 6],
      ["nlp", 5],
      ["ai engineer", 8],
      ["artificial intelligence", 8],
      ["data scientist", 5],
      ["ml engineer", 7],
      ["python", 3],
      ["pytorch", 4],
      ["tensorflow", 4],
      ["scikit learn", 4],
      ["fastapi", 2],
      ["flask", 2],
      ["docker", 2],
      ["postgresql", 2],
      ["javascript", 2],
      ["typescript", 2],
      ["web developer", 3],
      ["frontend", 2],
      ["backend", 2],
      ["fullstack", 2],
      ["it support", 2],
    ];

    let boost = 0;
    for (const [keyword, weight] of weightedKeywords) {
      if (normalized.includes(keyword)) {
        boost += weight;
      }
    }

    return boost;
  };

  const cv = await cvRepository.getCvArchiveById(cvId);
  if (!cv || !cv.raw_text) {
    throw new Error(`CV not found or raw_text is empty for cvId: ${cvId}`);
  }

  const cvKeywords = buildKeywordSet(cv.raw_text);
  const cvSkillPhrases = extractSkillPhrases(cv.raw_text);

  const userProfile = await userRepository.findById(userId);
  if (!userProfile) {
    throw new Error(`User not found: ${userId}`);
  }

  let userAge = null;
  if (userProfile.birth_date) {
    const today = new Date();
    const birth = new Date(userProfile.birth_date);
    userAge = today.getFullYear() - birth.getFullYear();
    // Adjust if birthday hasn't occurred yet this year
    const monthDiff = today.getMonth() - birth.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birth.getDate())
    ) {
      userAge--;
    }
  }

  console.log(
    `[AI Service] User Profile - Education: ${userProfile.education_level}, Gender: ${userProfile.gender}, City: ${userProfile.city}, Age: ${userAge}`,
  );

  const candidatePoolLimit = config.aiMatchCandidatePoolLimit || 200;
  const aiMatchJobLimit = config.aiMatchJobLimit || 20;

  let filteredJobs = await jobRepository.findAll({
    page: 1,
    limit: candidatePoolLimit,
    education_level: userProfile.education_level || undefined,
    gender: userProfile.gender || undefined,
    city: userProfile.city || undefined,
    province: userProfile.province || undefined,
    minAge: userAge || undefined,
    maxAge: userAge || undefined,
  });

  let jobsArray = filteredJobs.data || filteredJobs;

  if (!jobsArray || jobsArray.length === 0) {
    console.log(
      `[AI Service] Strict filtering (with location) returned 0 jobs, retrying without location filters...`,
    );

    filteredJobs = await jobRepository.findAll({
      page: 1,
      limit: candidatePoolLimit,
      education_level: userProfile.education_level || undefined,
      gender: userProfile.gender || undefined,
      minAge: userAge || undefined,
      maxAge: userAge || undefined,
    });

    jobsArray = filteredJobs.data || filteredJobs;
  }

  if (!jobsArray || jobsArray.length === 0) {
    console.error(
      `[AI Service] ERROR: No jobs found after filtering for user: ${userId}`,
    );
    console.error(`[AI Service] Filter parameters:`, {
      education_level: userProfile.education_level,
      gender: userProfile.gender,
      city: userProfile.city,
      province: userProfile.province,
      age: userAge,
    });
    throw new Error(`No jobs found after filtering for user: ${userId}`);
  }

  const rankedJobs = jobsArray
    .map((job) => {
      const jobText = [
        job.title,
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

      const jobSkillText = Array.isArray(job.skills)
        ? job.skills.join(" ")
        : "";
      const jobSkillSet = extractSkillPhrases(jobSkillText);
      const jobTextSet = buildKeywordSet(jobText);

      const skillOverlap = [...cvSkillPhrases].filter((skill) => {
        return (
          jobSkillSet.has(skill) ||
          jobTextSet.has(skill) ||
          normalizeText(jobText).includes(skill)
        );
      }).length;

      const titleBoost = [...cvSkillPhrases].reduce((score, skill) => {
        if (normalizeText(job.title).includes(skill)) {
          return score + 4;
        }

        if (normalizeText(job.requirements).includes(skill)) {
          return score + 2;
        }

        return score;
      }, 0);

      const overlapScore = scoreTextOverlap(cvKeywords, jobText);
      const domainBoost = inferDomainBoost(jobText);

      return {
        ...job,
        _relevanceScore:
          skillOverlap * 5 + titleBoost + overlapScore + domainBoost,
      };
    })
    .sort((left, right) => {
      if (right._relevanceScore !== left._relevanceScore) {
        return right._relevanceScore - left._relevanceScore;
      }

      return new Date(right.created_at || 0) - new Date(left.created_at || 0);
    });

  const selectedJobs = rankedJobs.slice(0, aiMatchJobLimit);

  console.log(
    `[AI Service] Ranked ${rankedJobs.length} candidate jobs from CV text and selected top ${selectedJobs.length} jobs for AI`,
  );

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
      ).substring(0, 200),
    })),
  };

  console.log(
    `[AI Service] Processing CV for user ${userId}, sending ${payload.filtered_jobs.length} CV-ranked jobs (limit=${aiMatchJobLimit})`,
  );

  // Safety check: Ensure there are jobs to process before calling AI
  if (!payload.filtered_jobs || payload.filtered_jobs.length === 0) {
    throw new Error(
      `Cannot process AI matching: No filtered jobs available for user ${userId}`,
    );
  }

  let aiResponse = null;
  try {
    console.log(
      `[AI Service] Calling AI API at: ${config.aiApiUrl}/internal/ai/match with ${payload.filtered_jobs.length} jobs`,
    );
    const response = await axios.post(
      `${config.aiApiUrl}/internal/ai/match`,
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          "X-Internal-Request": config.internalApiKey,
        },
        timeout: 30000, // 30 second timeout
      },
    );
    aiResponse = response.data;
    console.log(
      `[AI Response] Received from AI service:`,
      JSON.stringify(aiResponse, null, 2).substring(0, 2000),
    );
  } catch (error) {
    console.error(
      `[AI Service] ERROR calling AI API: ${error.response?.status || error.code}`,
      error.response?.data || error.message,
    );
    console.error(
      `[AI Service] AI API URL: ${config.aiApiUrl}`,
      `| Internal Key: ${config.internalApiKey ? "SET" : "NOT SET"}`,
    );
    // Continue with fallback instead of throwing
    aiResponse = { recommendations: [] };
  }

  if (!aiResponse) {
    aiResponse = { recommendations: [] };
  }

  const { extracted_skills, recommendations } = aiResponse;

  const getSkillList = (rec, keys) => {
    for (const key of keys) {
      const value = rec?.[key] ?? rec?.analysis?.[key] ?? rec?.result?.[key];
      if (Array.isArray(value) && value.length > 0) {
        return value;
      }
    }
    return [];
  };

  // Defensive: if recommendations exist but lack skill details, optionally call analyze-single
  const fallbackTopN = config.fallbackAnalyzeTopN || 5;
  if (recommendations && recommendations.length > 0) {
    for (let i = 0; i < Math.min(recommendations.length, fallbackTopN); i++) {
      const rec = recommendations[i];
      const skillMatch = getSkillList(rec, [
        "skill_match",
        "skillMatches",
        "skills_match",
      ]);
      const skillGap = getSkillList(rec, [
        "skill_gap",
        "skillGaps",
        "skills_gap",
      ]);

      if (!hasItems(skillMatch) || !hasItems(skillGap)) {
        try {
          const jobRecord = await jobRepository.findById(rec.job_id);
          const fallbackJob = jobRecord || {};

          console.log(
            `[AI Service] Fallback analyze-single for job ${rec.job_id} (index ${i})`,
          );
          const { data: singleResp } = await axios.post(
            `${config.aiApiUrl}/internal/ai/analyze-single`,
            {
              cv_text: cv.raw_text,
              job: {
                job_id: rec.job_id,
                title:
                  rec.job_title ||
                  rec.title ||
                  rec.job_title_snapshot ||
                  fallbackJob.title ||
                  "",
                company_name:
                  rec.company ||
                  rec.company_snapshot ||
                  fallbackJob.company_name ||
                  "",
                description:
                  rec.description ||
                  rec.requirements ||
                  fallbackJob.requirements ||
                  "",
              },
            },
            {
              headers: {
                "Content-Type": "application/json",
                "X-Internal-Request": config.internalApiKey,
              },
            },
          );

          console.log(
            `[AI Service] Fallback analyze-single response for ${rec.job_id}:`,
            JSON.stringify(singleResp, null, 2).substring(0, 1000),
          );

          // Merge returned details if present
          const analysis = singleResp?.analysis || singleResp;
          if (analysis) {
            rec.skill_match = hasItems(analysis.skill_match)
              ? analysis.skill_match
              : hasItems(analysis.skillMatches)
                ? analysis.skillMatches
                : hasItems(analysis.skills_match)
                  ? analysis.skills_match
                  : skillMatch;
            rec.skill_gap = hasItems(analysis.skill_gap)
              ? analysis.skill_gap
              : hasItems(analysis.skillGaps)
                ? analysis.skillGaps
                : hasItems(analysis.skills_gap)
                  ? analysis.skills_gap
                  : skillGap;
            rec.match_score =
              analysis.match_score || analysis.matchScore || rec.match_score;
            rec.ai_insight =
              analysis.ai_insight || analysis.aiInsight || rec.ai_insight;
          }
        } catch (err) {
          console.warn(
            `[AI Service] Fallback analyze-single failed for job ${rec.job_id}:`,
            err.response?.data || err.message,
          );
        }
      }
    }
  }

  if (recommendations && recommendations.length > 0) {
    const detailReadyCount = recommendations.filter(
      (rec) =>
        hasItems(
          getSkillList(rec, ["skill_match", "skillMatches", "skills_match"]),
        ) ||
        hasItems(getSkillList(rec, ["skill_gap", "skillGaps", "skills_gap"])),
    ).length;
    console.log(
      `[AI Service] Recommendations with skill details ready: ${detailReadyCount}/${recommendations.length}`,
    );
  }

  // Save extracted skills to the user profile
  if (extracted_skills && extracted_skills.length > 0) {
    console.log(
      `[AI Service] Updating user skills (${extracted_skills.length}) for user ${userId}`,
    );
    await userRepository.updateUserSkills(userId, cvId, extracted_skills);
    console.log(`[AI Service] updateUserSkills completed for user ${userId}`);
  }

  // Save recommendations
  if (recommendations && recommendations.length > 0) {
    console.log(
      `[AI Service] Saving ${recommendations.length} recommendations for user ${userId}`,
    );
    await userRepository.saveRecommendations(userId, cvId, recommendations);
    console.log(
      `[AI Service] saveRecommendations completed for user ${userId}`,
    );
  }

  return {
    message: "Successfully processed and saved AI recommendations.",
    userId,
    cvId,
    user_age: userAge,
    jobs_filtered: jobsArray.length,
    skills_updated: extracted_skills?.length || 0,
    recommendations_saved: recommendations?.length || 0,
  };
};

/**
 * Analyze single CV against single job for gap skill analysis
 * Used when user clicks "Lihat Detail" on job listing
 */
export const analyzeGapSkill = async (cvText, jobData) => {
  const { job_id, title, company_name, description } = jobData;

  // Validate inputs
  if (!cvText || !cvText.trim()) {
    throw new Error("CV text is required for gap skill analysis");
  }
  if (!job_id || !title || !description) {
    throw new Error("Job ID, title, and description are required");
  }

  // Build payload for AI service
  const payload = {
    cv_text: cvText,
    job: {
      job_id,
      title,
      company_name: company_name || "",
      description, // AI expects full job description/requirements
    },
  };

  console.log(
    `[AI Service] Sending gap skill analysis for job ${job_id}:`,
    JSON.stringify(payload, null, 2),
  );

  try {
    // Call AI service endpoint for single job analysis
    const response = await axios.post(
      `${config.aiApiUrl}/internal/ai/analyze-single`,
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          "X-Internal-Request": config.internalApiKey,
        },
      },
    );

    console.log(
      `[AI Service] Gap skill analysis response for job ${job_id}:`,
      JSON.stringify(response.data, null, 2),
    );

    // Return the AI response directly
    return response.data;
  } catch (error) {
    console.error(
      `[AI Service] Error analyzing gap skill for job ${job_id}:`,
      error.response?.data || error.message,
    );
    throw new Error(
      `Gap skill analysis failed: ${
        error.response?.data?.message || error.message
      }`,
    );
  }
};
