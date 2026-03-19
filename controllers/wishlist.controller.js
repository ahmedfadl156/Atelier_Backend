import User from "../models/users.model.js"

export const addProductToWishlist = async (req , res , next) => {
    try {
        // هنجيب اليورز ونضيفله فى الوش ليست البرودكت ايدى باستخدام ميثود addToSet
        // الميثود دى بتضمن ان اللى يضاف يبقى ما اتضافش قبل كدا بتمنع التكرار
        const user = await User.findByIdAndUpdate(
            req.user._id,
            {
                $addToSet: { wishlist: req.body.productId }
            },
            { returnDocument: "after" } 
        );

        res.status(200).json({
            status: "success",
            message: "Product added to wishlist successfully!",
            data: user.wishlist
        })
    } catch (error) {
        next(new AppError("Error while adding product to wishlist" , 400))
    }
}

export const getLoggedUserWishlist = async (req , res , next) => { 
    try {
        // هنجيب اليوزر ونجيب منه الوش ليست بتاعته ونعمل populate للمنمتجات اللى جواه
        const user = await User.findById(req.user._id)
        .populate({
            path: "wishlist" , 
            select: "title coverImage price ratingsAverage discountPrice brand slug"
        })

        res.status(200).json({
            status: "success" , 
            result: user.wishlist.length,
            data: user.wishlist
        })
    } catch (error) {
        next(new AppError("Error while getting logged user wishlist" , 400))
    }
}

export const removeFromWishlist = async (req , res , next) => {
    try {
        const user = await User.findByIdAndUpdate(req.user._id , {
            $pull: {
                wishlist: req.params.productId
            }
        }, {returnDocument: "after"})

        res.status(200).json({
            status: "success",
            message: "Item removed from wishlist",
            data: null
        })
    } catch (error) {
        next(new AppError("Error while removing from wishlist" , 400))
    }
}
