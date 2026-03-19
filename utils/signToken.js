import jwt from "jsonwebtoken";
import dotenv from "dotenv"
dotenv.config({path: "config/.env"})
const signToken = async (user) => {
    return jwt.sign({id: user._id, role: user.role} , process.env.JWT_SECRET , {
        expiresIn: process.env.JWT_EXPIRES_IN
    })
}
export const createSendToken = async (user , statusCode , res) => {
    const token = await signToken(user);

    const cookieOptions = {
        expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000),
        httpOnly: true,
        sameSite: 'strict'
    }

    if(process.env.NODE_ENV === "production"){
        cookieOptions.secure = true;
        cookieOptions.sameSite = 'none';
    }

    res.cookie('Atielie_JWT' , token , cookieOptions);

    user.password = undefined;

    res.status(statusCode).json({
        status: "success",
        data: {
            user
        }
    })
}
