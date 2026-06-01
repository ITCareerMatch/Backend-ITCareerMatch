import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

console.log("\n╔════════════════════════════════════════════════════════════╗");
console.log("║  ITCareerMatch — AI API Connection Test                  ║");
console.log("╚════════════════════════════════════════════════════════════╝\n");

// 1. Check environment variables
console.log("📋 ENVIRONMENT VARIABLES:");
console.log(`   AI_API_URL: ${process.env.AI_API_URL || "[NOT SET]"}`);
console.log(
  `   INTERNAL_API_KEY: ${process.env.INTERNAL_API_KEY ? `${process.env.INTERNAL_API_KEY.substring(0, 20)}...` : "[NOT SET]"}`,
);
console.log("");

if (!process.env.AI_API_URL) {
  console.error("❌ ERROR: AI_API_URL not set in environment!");
  process.exit(1);
}

const aiApiUrl = process.env.AI_API_URL;
const internalApiKey = process.env.INTERNAL_API_KEY || "none";

// 2. Test endpoint availability
console.log("🔗 TESTING AI API ENDPOINTS:\n");

const endpoints = [
  { method: "POST", path: "/internal/ai/match", name: "Batch Matching" },
  {
    method: "POST",
    path: "/internal/ai/analyze-single",
    name: "Single Analysis",
  },
];

// Test payload
const testPayload = {
  user_id: "test-user",
  cv_id: "test-cv",
  cv_text:
    "Python developer with 3 years experience. Skills: Python, Django, PostgreSQL, Docker.",
  filtered_jobs: [
    {
      job_id: "job-1",
      title: "Senior Python Developer",
      company_name: "PT Tech Indonesia",
      description:
        "We are looking for a Senior Python Developer with experience in Django, FastAPI, and Docker. Must have 5+ years experience.",
    },
  ],
};

const testSinglePayload = {
  cv_text:
    "Python developer with 3 years experience. Skills: Python, Django, PostgreSQL, Docker.",
  job: {
    job_id: "job-1",
    title: "Senior Python Developer",
    company_name: "PT Tech Indonesia",
    description:
      "We are looking for a Senior Python Developer with experience in Django, FastAPI, and Docker. Must have 5+ years experience.",
  },
};

async function testEndpoint(endpoint) {
  try {
    const url = `${aiApiUrl}${endpoint.path}`;
    const payload =
      endpoint.path === "/internal/ai/match" ? testPayload : testSinglePayload;

    console.log(`   Testing: ${endpoint.name}`);
    console.log(`   URL: ${url}`);
    console.log(`   Sending payload...`);

    const startTime = Date.now();
    const response = await axios.post(url, payload, {
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Request": internalApiKey,
      },
      timeout: 15000,
    });
    const duration = Date.now() - startTime;

    console.log(`   ✅ Status: ${response.status}`);
    console.log(`   ✅ Response time: ${duration}ms`);

    if (response.data?.recommendations) {
      console.log(
        `   ✅ Recommendations returned: ${response.data.recommendations.length}`,
      );
      if (response.data.recommendations.length > 0) {
        const first = response.data.recommendations[0];
        console.log(
          `      - Top match: ${first.job_title} @ ${first.company} (score: ${first.match_score})`,
        );
      }
    }

    if (response.data?.analysis) {
      console.log(
        `   ✅ Analysis returned: ${response.data.analysis.job_title}`,
      );
      console.log(`      - Match score: ${response.data.analysis.match_score}`);
      console.log(
        `      - Skills matched: ${response.data.analysis.skill_match?.length || 0}`,
      );
      console.log(
        `      - Skills gap: ${response.data.analysis.skill_gap?.length || 0}`,
      );
    }

    console.log(`   ✅ SUCCESS\n`);
    return true;
  } catch (error) {
    console.log(`   ❌ Status: ${error.response?.status || "TIMEOUT/ERROR"}`);
    console.log(
      `   ❌ Error: ${error.response?.data?.detail || error.message}`,
    );
    console.log(`   ❌ FAILED\n`);
    return false;
  }
}

// 3. Run tests
async function runTests() {
  let successCount = 0;

  for (const endpoint of endpoints) {
    const success = await testEndpoint(endpoint);
    if (success) successCount++;
  }

  console.log("╔════════════════════════════════════════════════════════════╗");
  if (successCount === endpoints.length) {
    console.log("║  ✅ ALL TESTS PASSED - AI API is working correctly!      ║");
  } else {
    console.log("║  ❌ SOME TESTS FAILED - Check configuration above        ║");
  }
  console.log(
    "╚════════════════════════════════════════════════════════════╝\n",
  );

  process.exit(successCount === endpoints.length ? 0 : 1);
}

runTests();
