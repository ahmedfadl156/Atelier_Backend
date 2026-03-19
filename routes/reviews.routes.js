import { Router } from "express";
import { restrictTo } from "../controllers/auth.controller.js";
import { authorize } from "../middlewares/authorize.middleware.js";
import {createReview, deleteReview, getAllReviews, getReview, updateReview} from "../controllers/reviews.controller.js"

const reviewsRouter = Router({mergeParams: true})
// عشان محدش يعمل review الا لما يبقى مسجل
reviewsRouter.use(authorize)

reviewsRouter.route('/').post(restrictTo('user') , createReview)
.get(getAllReviews)

reviewsRouter.route('/:id')
.get(getReview)
.patch(updateReview)
.delete(deleteReview)
export default reviewsRouter;
