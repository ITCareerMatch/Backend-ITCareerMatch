const jobRepository = require("../repositories/job.repository");

class JobService {
  async getAllJobs(params) {
    return jobRepository.findAll(params);
  }
  async getJobById(id) {
    return jobRepository.findById(id);
  }
}

module.exports = new JobService();
