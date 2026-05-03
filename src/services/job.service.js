import jobRepository from "../repositories/job.repository.js";

class JobService {
  async getAllJobs(params) {
    return jobRepository.findAll(params);
  }
  async getJobById(id) {
    return jobRepository.findById(id);
  }
}

export default new JobService();
