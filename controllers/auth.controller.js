import User from "../models/users.model.js";
import { clearAuthCookie, createSendToken } from "../utils/signToken.js";
import { sendPasswordResetEmail, sendVerificationEmail, sendWelcomeEmail } from "../utils/email.js";
import Cart from "../models/cart.model.js";
import crypto from "node:crypto"
import jwt from "jsonwebtoken";
export const signUp = async (req , res , next) => {
    const {email , firstName , lastName , password} = req.body;
    try {
        // لو فيه حاجة مش مبعوته لازم يبعت كله
        if(!email || !password || !firstName || !lastName){
            throw new Error("All Fields are required");
        }

        // هنا هنعمل اتشيك هل الحساب دا موجود قبل كدا ولا لا
        const userAlreadyExist = await User.findOne({email});

        if(userAlreadyExist){
            return res.status(400).json({
                status: "Fail",
                message: "User Already Exist Go To Login"
            })
        }

        // هنعمل التوكن 
        const verificationToken = Math.floor(100000 + Math.random() * 900000).toString();

        // لو مش موجود نبدا بقا نعمل اكونت جديد
        const user = await User.create({
            firstName,
            lastName,
            email,
            password,
            verificationToken,
            verificationTokenExpires: Date.now() + 2 * 60 * 60 * 1000
        });
        
        // اول ما نعمل اليوزر نعمله كارت فاضية للمشتريات
        await Cart.create({
            user: user._id,
            cartItems: []
        })

        // هنيعت الايميل لليوزر
        await sendVerificationEmail(user.email , verificationToken)
        // هنبعت الريسبونس للفرونت
        createSendToken(user , 201 , res)
    } catch (error) {
        next(error)
    }
}

export const SignIn = async (req , res , next) => {
    const {email , password} = req.body;
    try {
        // نتأكد ان اليوزر باعت الايميل والباسورد مفيش حاجة ناقصة
        if(!email || !password){
            return res.status(400).json({
                status: "Fail",
                message: "Please provide email and password!"
            })
        }

        // بعدين ندور على الايميل لو موجود ونجيب معاه الباسورد
        const user = await User.findOne({email}).select("+password");

        // نتأكد ان اليوزر موجود وان الباسورد بعد مانشفره طبعا صح
        if(!user || !await user.correctPassword(password , user.password)){
            return res.status(401).json({
                status: "Fail",
                message: "Incorrect Email Or Password"
            })
        }
        // نحدث اخر مرة اليوزر سجل فيها
        user.lastLogin = new Date();
        await user.save();
        // لو كل حاجة مظبوطة ابعت بقا الرد للفرونت والتوكن
        createSendToken(user , 200 , res);
    } catch (error) {
        next(error)
    }
}

export const verifyEmail = async (req , res , next) => {
    const {code} = req.body;
    try {
        // اول حاجة هنشوف اليوزر عندنا ونجيبه
        const user = await User.findOne({
            verificationToken: code,
            verificationTokenExpires: {$gt: Date.now()}
        })
        //  لو مفيش يوزر نرجع ايرور
        if(!user){
            return res.status(400).json({
                status: "false",
                message: "Invalid or expired verification code"
            })
        }
        // لو اليوزر موجود نخليه verified
        user.isVerified = true;
        user.verificationToken = undefined;
        user.verificationTokenExpires = undefined;
        await user.save();
        // نبعت الايميل الترحيب لليوزر
        sendWelcomeEmail(user.email , user.firstName)
        res.status(200).json({
            status: "success",
            message: "User Verified Successfully!"
        })
    } catch (error) {
        next(error)
    }
}

export const signOut = async (req , res , next) => {
    try {
        clearAuthCookie(res);
        res.status(200).json({
            status: "success",
            message: "User Signed Out Successfully!"
        })
    } catch (error) {
        next(error)
    }
} 

export const forgetPassword = async (req , res , next) => {
    const {email} = req.body;
    try {
        // نتأكد ان فيه ايميل اتبعت
        if(!email){
            return res.status(400).json({
                status: "Fail",
                message: "Please provide the registerd email"
            })
        }

        // نتأكد ان فيه يوزر موجود بالايميل دا
        const user = await User.findOne({email});
        if(!user){
            return res.status(400).json({
                status: "Fail",
                message: "There is no user with this email please provide a correct email"
            })
        }

        // نعمل التوكن وخزنه
        const resetToken = user.createPasswordResetToken();
        await user.save({validateBeforeSave: false})

        const resetUrl = `${req.protocol}://${req.get('host')}/api/v1/auth/resetPassword/${resetToken}`;

        await sendPasswordResetEmail(user.email , resetUrl);
        res.status(200).json({
            status: "success",
            message: "Password Reset link sent to your email"
        })
    } catch (error) {
        next(error)
    }
}

export const resetPassword = async (req , res , next) => {
    try {
        const {token} = req.params;
        const {password} = req.body;

        // هنعمل هاش للتوكن عشان نقارنه بالموجود فى الداتابيز
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

        // هنجيب اليوزر بناء على التوكن
        const user = await User.findOne({
            passwordResetToken: hashedToken,
            passwordResetExpires: {$gt: Date.now()}
        })
        // لو مفيش يوزر يبقىالتوكن وقته خلص او مش موجود اصلا
        if(!user){
            return res.status(400).json({
                status: "Fail",
                message: "Token is Invalid or Expired"
            })
        }
        // لو موجود هنغير الباسورد بتاع اليوزر ونشيل ال reset token بقا من الداتابيز مبقناش محتاجينها
        user.password = password;
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save();

        createSendToken(user , 200 , res);
    } catch (error) {
        
    }
}

export const restrictTo = (...roles) => {
    return (req , res , next) => {
        if(!roles.includes(req.user.role)){
            return res.status(400).json({
                status: "Fail",
                message: "You do not have permission to perform this"
            })
        }
        next()
    }
}

export const checkUser = async (req, res, next) => {
    try {
        let token;
        
        //  بندور على التوكن في الهيدر
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        } else if (req.cookies.Atielie_JWT) { token = req.cookies.Atielie_JWT }

        //  لو مفيش توكن، يبقى ده زائر عادي، كمل شغل عادي جداً
        if (!token) {
            return next();
        }

        // لو فيه توكن، نفك شفرته
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        //  نجيب اليوزر من الداتابيز
        const currentUser = await User.findById(decoded.id);
        
        //  لو اليوزر موجود، نحطه في الـ Request
        if (currentUser) {
            req.user = currentUser;
        }

        next();
    } catch (err) {
        next();
    }
};

