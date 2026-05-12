import jobService from "../services/job.service.js";

import recommendationService from "../services/recommendation.service.js";

class JobController {
  async getAll(req, res, next) {
    try {
      let {
        page,
        limit,
        search,
        city,
        province,
        minSalary,
        maxSalary,
        minAge,
        maxAge,
        education_level,
        gender,
        job_type,
        work_system,
      } = req.query;

      // Validasi dan set default value
      page = Number(page);
      if (isNaN(page) || page < 1) page = 1;

      limit = Number(limit);
      if (isNaN(limit) || limit < 1) limit = 10;
      limit = Math.min(limit, 50);

      minSalary = Number(minSalary);
      if (isNaN(minSalary)) minSalary = undefined;

      maxSalary = Number(maxSalary);
      if (isNaN(maxSalary)) maxSalary = undefined;

      minAge = Number(minAge);
      if (isNaN(minAge)) minAge = undefined;

      maxAge = Number(maxAge);
      if (isNaN(maxAge)) maxAge = undefined;

      // education_level dan gender biarkan string/null

      const result = await jobService.getAllJobs({
        page,
        limit,
        search,
        city,
        province,
        minSalary,
        maxSalary,
        minAge,
        maxAge,
        education_level,
        gender,
        job_type,
        work_system,
      });

      res.json({
        success: true,
        data: result.data,
        meta: result.meta,
      });
    } catch (err) {
      next(err);
    }
  }

  async getById(req, res, next) {
    try {
      const { id } = req.params;

      const job = await jobService.getJobById(id);

      if (!job) {
        return res.status(404).json({
          success: false,
          message: "Job not found",
        });
      }

      res.json({
        success: true,
        data: job,
      });
    } catch (err) {
      next(err);
    }
  }

  // Endpoint: GET /api/v1/jobs/recommendations
  async recommendations(req, res, next) {
    try {
      const userId = req.user?.id;
      const data = await recommendationService.getTopRecommendations(userId);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
}

export default new JobController();
