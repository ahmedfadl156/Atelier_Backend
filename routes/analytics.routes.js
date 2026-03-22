import { Router } from "express";
import { authorize } from "../middlewares/authorize.middleware.js";
import { restrictTo } from "../controllers/auth.controller.js";
import { getDashboardStats } from "../controllers/analytics.controller.js";

const analtyticsRouter = Router();

analtyticsRouter.use(authorize , restrictTo("admin"));

analtyticsRouter.get("/dashboard" , getDashboardStats)

export default analtyticsRouter;