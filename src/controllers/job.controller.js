const jobService = require("../services/job.service");

class JobController {
  async getAll(req, res) {
    const jobs = await jobService.getAllJobs();
    res.json(jobs);
  }
  async getById(req, res) {
    const job = await jobService.getJobById(req.params.id);
    if (!job) return res.status(404).json({ message: "Job not found" });
    res.json(job);
  }
  async create(req, res) {
    const job = await jobService.createJob(req.body);
    res.status(201).json(job);
  }
  async update(req, res) {
    const job = await jobService.updateJob(req.params.id, req.body);
    res.json(job);
  }
  async delete(req, res) {
    await jobService.deleteJob(req.params.id);
    res.status(204).end();
  }
}

module.exports = new JobController();
