/**
 * Wrapper untuk async route handlers
 * Menangani errors dan mengoper ke error middleware
 */
export default function catchAsync(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((err) => next(err));
  };
}
