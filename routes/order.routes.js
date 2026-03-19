import { Router } from "express";
import { createCashOrder, createCheckoutSession, getAllOrders, getLoggedUserOrders, getOrderDetails, paymobWebhook, updateOrderStatus } from "../controllers/order.controller.js";
import { authorize } from "../middlewares/authorize.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { createOrderSchema } from "../utils/validators.js";
import { restrictTo } from "../controllers/auth.controller.js";

const orderRouter = Router();
// دا هيبقى خاص بالدفع مش محتاج حماية PUBLIC ROUTE
orderRouter.post('/webhook', paymobWebhook);
// اى حاجة تحت دا محتاجة حماية
orderRouter.use(authorize)
// دى الراوتس الاخاصة بالادمن
orderRouter.get('/allOrders' , restrictTo('admin') , getAllOrders)
orderRouter.patch('/:id/status' , restrictTo('admin') , updateOrderStatus)
// دى الراوتس الخاصة باليوزر
orderRouter.route('/').post(validate(createOrderSchema), createCashOrder).get(getLoggedUserOrders)
orderRouter.route('/checkout-session').post(validate(createOrderSchema), createCheckoutSession)
orderRouter.get('/:orderNumber' , getOrderDetails);
export default orderRouter;
