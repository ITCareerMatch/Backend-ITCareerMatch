import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
);

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        message: "No token",
      });
    }

    const token = authHeader.split(" ")[1];

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    console.log("TOKEN:", token);
    console.log("ERROR:", error);
    console.log("USER:", user);

    if (error || !user) {
      return res.status(401).json({
        message: "Invalid token",
      });
    }

    req.user = user;

    next();
  } catch (err) {
    console.log(err);
    next(err);
  }
};
