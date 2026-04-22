const prisma = require("../config/prisma");

class JobRepository {
  async findAll() {
    return prisma.job.findMany();
  }
  async findById(id) {
    return prisma.job.findUnique({ where: { id } });
  }
  async create(data) {
    return prisma.job.create({ data });
  }
  async update(id, data) {
    return prisma.job.update({ where: { id }, data });
  }
  async delete(id) {
    return prisma.job.delete({ where: { id } });
  }
}

module.exports = new JobRepository();
