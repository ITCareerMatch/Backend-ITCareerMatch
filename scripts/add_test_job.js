import dotenv from "dotenv";
import { v4 as uuidv4 } from "uuid";
import { addTaskToQueue } from "../src/lib/queue.js";

dotenv.config();

async function main() {
  const taskId = uuidv4();
  const userId = "38c6a311-74c3-4de6-bea2-6af72cd6463a";
  const cvId = "d82e220c-1b66-448d-8d13-a108810080d5";
  const cvText = "Test CV text for automated job enqueue - ignore";

  try {
    const id = await addTaskToQueue({ taskId, userId, cvId, cvText });
    console.log("Enqueued task:", id);
    process.exit(0);
  } catch (err) {
    console.error("Failed to enqueue task:", err);
    process.exit(1);
  }
}

main();
