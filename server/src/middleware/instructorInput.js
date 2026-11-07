import mongoSanitize from 'express-mongo-sanitize';

const sanitize = mongoSanitize({
  onSanitize: ({ req }) => { req.unsafeInstructorInput = true; }
});

export function sanitizeInstructorInput(req, res, next) {
  sanitize(req, res, (err) => {
    if (err) return next(err);
    // Silently dropping operators could broaden a search to every account.
    if (req.unsafeInstructorInput) {
      return res.status(400).json({ message: 'Query operators and dotted keys are not allowed' });
    }
    next();
  });
}
