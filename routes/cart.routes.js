import { Router } from "express";
import { addProductToCart, getLoggedUserCart, removeCartItem, updateItemQuantity } from "../controllers/cart.controller.js";
import { authorize } from "../middlewares/authorize.middleware.js";

const cartRouter = Router();
cartRouter.use(authorize);
cartRouter.route("/").post(addProductToCart).get(getLoggedUserCart);
cartRouter.route("/:itemId").delete(removeCartItem).patch(updateItemQuantity);
export default cartRouter;