import multer from "multer";

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 1 * 1024 * 1024, // 1MB
  },

  fileFilter: (req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      return cb(new Error("Only PDF files are allowed"));
    }

    cb(null, true);
  },
});

// Middleware that accepts both file and form fields
export const uploadCv = (req, res, next) => {
  upload.single("file")(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }
    // Continue to next middleware/handler
    // req.file will contain file if uploaded
    // req.body will contain form fields including cv_data
    next();
  });
};
