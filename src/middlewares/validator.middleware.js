import Joi from "joi";

export const validateUUID = (req, res, next) => {
  const { id } = req.params;
  const schema = Joi.string().uuid().required();
  const { error } = schema.validate(id);

  if (error) {
    return res.status(400).json({
      success: false,
      message: "Invalid UUID format",
    });
  }
  next();
};

export const validatePagination = (req, res, next) => {
  const schema = Joi.object({
    page: Joi.number().integer().min(1).optional().default(1),
    limit: Joi.number().integer().min(1).max(100).optional().default(10),
  });

  const { error, value } = schema.validate(req.query);
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message,
    });
  }

  req.query = value;
  next();
};

export const validateUserUpdate = (req, res, next) => {
  const schema = Joi.object({
    name: Joi.string().max(255).optional(),
    gender: Joi.string().valid("male", "female", "other").optional(),
    avatar_url: Joi.string().uri().optional(),
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message,
    });
  }

  req.body = value;
  next();
};

export const validateJobFilters = (req, res, next) => {
  const schema = Joi.object({
    page: Joi.number().integer().min(1).optional().default(1),
    limit: Joi.number().integer().min(1).max(50).optional().default(10),
    search: Joi.string().max(255).optional(),
    city: Joi.string().max(255).optional(),
    province: Joi.string().max(255).optional(),
    minSalary: Joi.number().integer().min(0).optional(),
    maxSalary: Joi.number().integer().min(0).optional(),
    minAge: Joi.number().integer().min(0).max(100).optional(),
    maxAge: Joi.number().integer().min(0).max(100).optional(),
    education_level: Joi.string().max(100).optional(),
    gender: Joi.string().valid("laki-laki", "perempuan", "semua").optional(),
    job_type: Joi.string().max(100).optional(),
    work_system: Joi.string().max(100).optional(),
  });

  const { error, value } = schema.validate(req.query);
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message,
    });
  }

  req.validatedQuery = value;
  next();
};
