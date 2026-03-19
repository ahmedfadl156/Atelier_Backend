import { Router } from "express";
import { authorize } from "../middlewares/authorize.middleware.js";
import { addProductToWishlist, getLoggedUserWishlist, removeFromWishlist } from "../controllers/wishlist.controller.js";

const wishlistRouter = Router();

wishlistRouter.use(authorize);

wishlistRouter.route('/').get(getLoggedUserWishlist).post(addProductToWishlist);
wishlistRouter.route('/:productId').delete(removeFromWishlist);
export default wishlistRouter;