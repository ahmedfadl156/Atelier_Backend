import { Router } from "express";
import { forgetPassword, resetPassword, SignIn, signOut, signUp, verifyEmail } from "../controllers/auth.controller.js";

const authRoutes = Router();

authRoutes.post('/sign-up' , signUp);
authRoutes.post('/sign-in' , SignIn);
authRoutes.post('/sign-out' , signOut)
authRoutes.post('/verify-email' , verifyEmail)
authRoutes.post('/forget-password' , forgetPassword)
authRoutes.post('/reset-password/:token' , resetPassword)
export default authRoutes;