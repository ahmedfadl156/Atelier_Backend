import User from "../models/users.model.js"
import AppError from "../utils/appError.js"

export const getMe = async (req , res , next) => {
    try {
        const user = await User.findById(req.user._id)
        if(!user){
            return next(new AppError("User not found" , 404))
        }
        res.status(200).json({
            status: "success",
            data: user
        })
    } catch (error) {
        next(new AppError("Error while getting your info" , 400))
    }
}

// ==========FOR ADMIN========
