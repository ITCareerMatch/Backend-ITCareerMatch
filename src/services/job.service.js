const jobRepository = require("../repositories/job.repository");

class JobService {
  async getAllJobs() {
    return jobRepository.findAll();
  }
  async getJobById(id) {
    return jobRepository.findById(id);
  }
  async createJob(data) {
    return jobRepository.create(data);
  }
  async updateJob(id, data) {
    return jobRepository.update(id, data);
  }
  async deleteJob(id) {
    return jobRepository.delete(id);
  }
}

module.exports = new JobService();
