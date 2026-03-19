import jwt from "jsonwebtoken"
import dotenv from "dotenv"
import User from "../models/users.model.js";
dotenv.config({path: "config/.env"})

export const authorize = async (req , res , next) => {
    try {
        let token;
        // اول حاجة هنجيب التوكن دا من اللوكال استورج او من الكوكيز 
        if(req.headers.authorization && req.headers.authorization.startsWith('Bearer')){
            token = req.headers.authorization.split(" ")[1]
        }else if(req.cookies.Atielie_JWT){
            token = req.cookies.Atielie_JWT
        }

        if(!token){
            return res.status(400).json({
                status: 'Fail',
                message: "You are not logged in! Please log in to get access."
            })
        }
        // بعدين عايزين نتأكد ان التوكن دا سليم ومفيش اى حد عدل عليه حاجة
        const decoded = jwt.verify(token , process.env.JWT_SECRET);

        // نتأكد ان اليوزر صاحب الاكونت موجود فعلا فى عندنا فى الداتابيز
        const currentUser = await User.findById(decoded.id);
        if(!currentUser){
            return res.status(400).json({
                status: "Fail",
                message: "The user belonging to this token does no longer exists"
            })
        }

        // نتأكد ان اليوزر مغيرش الباسورد بتاعه بعد ما التوكن اتعمل
        if(currentUser.changedPasswordAfter(decoded.iat)){
            return res.status(400).json({
                status: "Fail",
                message: "User Recently changed his password! Please Login Again"
            })
        }

        // غير كده يبقى تمام نبعت اليوزر فى الريكوست 
        req.user = currentUser;
        next();
    } catch (error) {
        res.status(401).json({ status: 'fail', message: 'Invalid token or authorization failed.' });
    }
}