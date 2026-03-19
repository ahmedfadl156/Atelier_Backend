import AppError from "../utils/appError.js";

export const validate = (schema) => (req, res, next) => {
    const result = schema.safeParse({
        body: req.body,
        params: req.params,
        query: req.query
    });

    if (!result.success) {
        const message = result.error.issues.map((issue) => issue.message).join(", ");
        return next(new AppError(message || "Validation failed", 400));
    }

    req.body = result.data.body ?? req.body;
    req.params = result.data.params ?? req.params;
    req.query = result.data.query ?? req.query;

    next();
};
