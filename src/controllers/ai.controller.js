import httpStatus from "http-status";
import { aiQueue } from "../lib/queue.js";
import catchAsync from "../utils/catchAsync.js";

const triggerAiMatching = catchAsync(async (req, res) => {
  const { userId, cvId } = req.body;
  if (!userId || !cvId) {
    return res.status(httpStatus.BAD_REQUEST).json({
      message: "userId and cvId are required.",
    });
  }
  await aiQueue.add("match-job", { userId, cvId });
  res
    .status(httpStatus.ACCEPTED)
    .json({ message: "AI matching process has been queued." });
});

export const aiController = {
  triggerAiMatching,
};
