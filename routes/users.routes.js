import { Router } from "express";
import { authorize } from "../middlewares/authorize.middleware.js";
import { getMe } from "../controllers/users.controller.js";

const usersRouter = Router();

usersRouter.use(authorize);

usersRouter.get("/getMe" , getMe);
export default usersRouter;