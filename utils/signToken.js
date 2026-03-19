import jwt from "jsonwebtoken";
import dotenv from "dotenv"
import { serialize } from "cookie";
dotenv.config({path: "config/.env"})
const signToken = async (user) => {
    return jwt.sign({id: user._id, role: user.role} , process.env.JWT_SECRET , {
        expiresIn: process.env.JWT_EXPIRES_IN
    })
}

const getCookieOptions = () => {
    const cookieExpiresInDays = Number(process.env.JWT_COOKIE_EXPIRES_IN || 7);
    const isProduction = process.env.NODE_ENV === "production";

    return {
        expires: new Date(Date.now() + cookieExpiresInDays * 24 * 60 * 60 * 1000),
        httpOnly: true,
        path: "/",
        secure: isProduction,
        sameSite: isProduction ? "none" : "strict"
    };
};

export const createSendToken = async (user , statusCode , res) => {
    const token = await signToken(user);
    const cookieOptions = getCookieOptions();
    const cookie = serialize("Atielie_JWT", token, cookieOptions);

    res.append("Set-Cookie", cookie);

    user.password = undefined;

    res.status(statusCode).json({
        status: "success",
        data: {
            user
        }
    })
}

export const clearAuthCookie = (res) => {
    const cookieOptions = getCookieOptions();
    const expiredCookie = serialize("Atielie_JWT", "", {
        ...cookieOptions,
        expires: new Date(0)
    });

    res.append("Set-Cookie", expiredCookie);
};
