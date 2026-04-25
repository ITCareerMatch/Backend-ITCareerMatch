const jobService = require("../services/job.service");

class JobController {
  async getAll(req, res) {
    try {
      const { page = 1, limit: rawLimit = 10, search, location } = req.query;

      const pageNumber = Number(page) || 1;
      const limit = Math.min(Number(rawLimit) || 10, 50);

      const result = await jobService.getAllJobs({
        page: pageNumber,
        limit,
        search: search?.trim(),
        location: location?.trim(),
      });

      res.status(200).json({
        success: true,
        data: result.data,
        meta: result.meta,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  async getById(req, res) {
    try {
      const id = req.params.id;

      // validasi UUID (bukan number lagi)
      const uuidRegex = /^[0-9a-fA-F-]{36}$/;

      if (!uuidRegex.test(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid job ID format",
        });
      }

      const job = await jobService.getJobById(id);

      if (!job) {
        return res.status(404).json({
          success: false,
          message: "Job not found",
        });
      }

      res.status(200).json({
        success: true,
        data: job,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
}

module.exports = new JobController();
