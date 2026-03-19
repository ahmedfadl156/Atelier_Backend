import Review from "../models/review.model.js";
import AppError from "../utils/appError.js"

export const getAllReviews = async (req , res , next) => {
    try {
        // هنعمل فلتر عشان نعرف نجيب كل الريفيوهات او ريفيو معين
        let filter = {};
        // هنا بنقوله لو فيه ايدى مبعوتلك يبقى كدا هنجيب ريفيو واحد 
        if(req.params.productId) filter = {product: req.params.productId};
        // غير كدا هنجيب كل الريفيوهات ونبعتها
        const reviews = await Review.find(filter);

        if(!reviews){
            return next(new AppError("There is no reviews found" , 404))
        }
        res.status(200).json({
            status: "success",
            data: {
                reviews
            }
        })
    } catch (error) {
        next(new AppError("Error while getting review" + error.message) , 404)
    }
}

// انشاء ريفيو
export const createReview = async (req , res , next) => {
    try {
        // هناخد البرودكت من الurl لو مش مبعوت
        if(!req.body.product) req.body.product = req.params.productId;
        const newReview = await Review.create({
            ...req.body,
            user: req.user._id
        })
        res.status(201).json({
            status: "success",
            data: {
                newReview
            }
        })
    } catch (error) {
        next(new AppError("Error while creating Review: " + error.message, 400))
    }
}

// هنا اجيب ريفيو واحد بس
export const getReview = async (req , res , next) => {
    try {
        const {id} = req.params;
        const review = await Review.findById(id);

        if(!review){
            return next(new AppError('No review found with that ID' , 404))
        }

        res.status(200).json({
            status: "success",
            data: {
                review
            }
        })
    } catch (error) {
        next(new AppError("Error while getting the review" + error.message , 404))
    }
}

// هنا هنعمل تعديل على الريفيو
export const updateReview = async (req , res , next) => {
    try {
        // هنا هنجيب التقييم الاول علشان اتاكد من صاحبه
        let review = await Review.findById(req.params.id);

        if(!review){
            return next(new AppError("No review found with that ID" , 404))
        }

        // هنا هنجيب الايدى بتاع اليوزر اللى فى الريفيو والايدى بتاع اليوزر فى الريكوست
        const reviewUserId = review.user._id ? review.user._id.toString() : review.user.toString();
        const currentUserId = req.user._id.toString();

        if(reviewUserId !== currentUserId && req.user.role !== 'admin'){
            return next(new AppError("You are not authorized to update this review!", 403))
        }

        // لو تما واليوزر وكله تمام دلوقتى نعدل بقا الريفيو
        review = await Review.findByIdAndUpdate(req.params.id , req.body , {
            returnDocument: "after",
            runValidators: true,
        })

        res.status(200).json({
            status: "success",
            data: {
                review
            }
        })
    } catch (error) {
        next(new AppError("Error while updating the review" + error.message, 400))
    }
}

// هنا هنحذف الريفيو
export const deleteReview = async (req , res , next) => {
    try {
    const review = await Review.findById(req.params.id);

    if (!review) {
        return next(new AppError("No review found with that ID" , 404))
    }

    const reviewUserId = review.user._id ? review.user._id.toString() : review.user.toString();
    const currentUserId = req.user._id.toString();

    if (reviewUserId !== currentUserId && req.user.role !== 'admin') {
        return next(new AppError("You are not authorized to delete this review!"))
    }

    await Review.findByIdAndDelete(req.params.id);

    res.status(204).json({
        status: 'success',
        message: "Review Deleted Successfully",
        data: null
    });
    } catch (error) {
        next(new AppError("Error while deleting the review" + error.message , 400))
    }
}