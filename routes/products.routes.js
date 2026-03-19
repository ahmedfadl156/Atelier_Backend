import {Router} from "express";
import { aliasFeaturedProducts, creatProduct, deleteProduct, getAllProducts, getProduct, getRelatedProducts, getTrendingProducts, updateProduct } from "../controllers/products.controller.js";
import { resizeProductImages, uploadProductImages } from "../middlewares/products.middleware.js";
import reviewsRouter from "./reviews.routes.js";
import { authorize } from "../middlewares/authorize.middleware.js";
import { checkUser, restrictTo } from "../controllers/auth.controller.js";

const productsRouter = Router();
// بقوله هنا ان لو عايز اجيب تفقييمات منتج معين ابعته لراوت التقييمات وهيتعامل اهو بعمله توجيه
productsRouter.use('/:productId/reviews' , reviewsRouter)

// راوت اللى هيطلع الاقتراحات
productsRouter.route('/:id/related').get(getRelatedProducts);

productsRouter.route('/featured-products').get(aliasFeaturedProducts , getAllProducts);
productsRouter.route('/trending-products').get(getTrendingProducts);

productsRouter.route('/').get(getAllProducts)
.post(authorize , restrictTo('admin') ,  uploadProductImages , resizeProductImages , creatProduct)

productsRouter.route('/:id').get(checkUser , getProduct)
.patch(authorize , restrictTo('admin') , uploadProductImages , resizeProductImages , updateProduct)
.delete(authorize , restrictTo('admin') , deleteProduct)
export default productsRouter;

