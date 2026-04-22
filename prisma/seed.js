const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  await prisma.job.createMany({
    data: [
      {
        title: "Backend Developer",
        company_name: "PT Maju Mundur",
        is_active: true,
        category: "IT",
        experience_level: "Junior",
        job_type: "Fulltime",
        requirements: "Menguasai Node.js dan PostgreSQL",
        location: "Jakarta",
        gender_required: "Both",
        salary_min: 7000000,
        salary_max: 12000000,
        source: "glints",
      },
      {
        title: "Frontend Developer",
        company_name: "Startup Kreatif",
        is_active: true,
        category: "IT",
        experience_level: "Senior",
        job_type: "Remote",
        requirements: "React.js, Next.js",
        location: "Bandung",
        gender_required: "Both",
        salary_min: 9000000,
        salary_max: 15000000,
        source: "linkedin",
      },
    ],
    skipDuplicates: true,
  });
  console.log("Dummy jobs inserted!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
