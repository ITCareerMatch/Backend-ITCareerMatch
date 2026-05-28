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
      } = req.validatedQuery;

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

  async recommendations(req, res, next) {
    try {
      const userId = req.user?.id;
      const { cv_id } = req.query;

      if (!cv_id) {
        return res.status(400).json({
          success: false,
          message: "cv_id query parameter is required",
        });
      }

      const uuidPattern =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

      if (!uuidPattern.test(cv_id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid cv_id format",
        });
      }

      const data = await recommendationService.getTopRecommendations(
        userId,
        cv_id,
      );
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
}

export default new JobController();
