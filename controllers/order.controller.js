import mongoose from "mongoose"
import AppError from "../utils/AppError.js"
import Cart from "../models/cart.model.js"
import Order from "../models/orders.model.js";
import Product from "../models/product.model.js"
import dotenv from "dotenv"
import crypto from "crypto"
dotenv.config({path:"/config/.env"})

// ===============USER ROUTES=============
export const getLoggedUserOrders = async (req , res , next) => {
    try {
        // نجيب الاوردرات الخاصة باليوزر
        const orders = await Order.find({user: req.user._id})
        .sort({createdAt: -1})
        .select("createdAt orderNumber status orderItems.title orderItems.image orderItems.size orderItems.color");

        const formattedOrders = orders.map((order) => ({
            createdAt: order.createdAt,
            orderNumber: order.orderNumber,
            status: order.status,
            orderItems: order.orderItems.map((item) => ({
                title: item.title,
                imageCover: item.image,
                size: item.size,
                color: item.color,
            })),
        }));

        res.status(200).json({
            status: "success" , 
            results: formattedOrders.length , 
            data: formattedOrders
        })
    } catch (error) {
        next(new AppError("Failed To Get Your Orders" + error.message , 500))
    }
}

export const getOrderDetails = async (req , res , next) => {
    try {
        // هنجيب الاودر برقم الاوردر
        const {orderNumber} = req.params;
        const order = await Order.findOne({orderNumber}).sort({createdAt: -1})
        .populate({path: "user" , select: "firstName lastName email"});

        if(!order){
            return next(new AppError("Order not found" , 404))
        }

        // عايزين نتأكد ان اللى بيشوف تفاصيل الاوردر لازم يبقى اليوزر اللى عامل الاوردر او الادمن غير كدا نطلع ايرور
        const orderUserId = order.user?._id ? order.user._id.toString() : order.user.toString();
        if(orderUserId !== req.user._id.toString() && req.user.role !== "admin"){
            return next(new AppError("You are not authorized to see this order" , 403))
        }

        res.status(200).json({
            status: "success" , 
            data: order
        })
    } catch (error) {
        next(new AppError("Error fetching order details: " + error.message, 500));
    }
}

// =============ADMIN ROUTE===============
export const getAllOrders = async (req , res , next) => {
    try {
        const orders = await Order.find()
        .sort({ createdAt: -1 })
        .populate({ path: "user", select: "firstName lastName email" })

        res.status(200).json({
            status: "success" , 
            data: orders
        })
    } catch (error) {
        next(new AppError("Error fetching orders: " + error.message, 500))
    }
}

export const updateOrderStatus = async (req , res , next) => {
    try {
        // بنجيب الحالة اللى هيتحدث ليها
        const {status} = req.body;
        // وبنجيب الاوردر اللى هنحدث الحالة فيه
        const order = await Order.findById(req.params.id);
        // لو مفيش اوردر بنرجع ايرور
        if(!order){
            return next(new AppError("Order not found" , 404))
        }
        // وبعدين لو فيه اوردر بنحدث الحالة بتاعته بالحالة اللى الادمن باعتها
        order.status = status;
        // لو الحالة بقت ان الاوردر خلاص اتوصل هنخلى انه اتوصل تمام واتوصل امتى
        // وساعتها الهوك بتاعتنا هتشتغل وتضيف النقط بتاعت الاوردر فى حساب اليوزر
        if(status === "Delivered"){
            order.isDelieverd = true;
            order.delieveredAt = Date.now();

            if(order.paymentMethod === "Cash on Delivery"){
                order.isPaid = true;
                order.paidAt = Date.now();
            }
        }

        await order.save();

        res.status(200).json({
            success: true,
            message: "Order status updated successfully",
            data: {order}
        })
    } catch (error) {
        next(new AppError("Error updating order status: " + error.message, 500))
    }
}
// ===================PAYMENTS FLOW=============
const readPaymobResponse = async (response, fallbackMessage) => {
    const data = await response.json();

    if (!response.ok) {
        throw new AppError(data.message || fallbackMessage, response.status || 500);
    }

    return data;
};

export const createCashOrder = async (req , res , next) => {
    // اول حاجة احنا هنبدا transaction session 
    // علشان كل الخطوات يا كلها تتم يا خلاص لان احنا محتاجين ان كل الخطوات هنا تتم كاملة مينفعش حاجة تتم والتانية لا
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        // هنجيب بيانات التتوصيل بتاع الاوردر
        const {shippingAddress} = req.body;

        // هنجيب المنتجات اللى فى السلة بتاعت اليوزر
        const cart = await Cart.findOne({user: req.user._id}).populate('cartItems.product');

        // لو اليوزر دا معندوش سلة او لو السلة فاضية اصلا مفهاش حاجة نرجع ايرور
        if(!cart || cart.cartItems.length === 0){
            return next(new AppError("No cart items found" , 400));
        }

        // لو فيه منتجات هنعمل فاليديشن نتأكد منها
        for(const item of cart.cartItems){
            const variant = item.product.variants.find(
                (v) => v.size === item.size && v.color === item.color
            )

            if(!variant || variant.stock < item.quantity){
                return next(new AppError("Not enough stock for this item" , 400))
            }
        }

        // هنحسب السعر الحالى وقت الدفع من الداتابيز عشان ميحصلش اى غلط فى الاسعار من الفرونت
        const itemsPrice = cart.totalCartPrice;
        const taxPrice = 0.010 * itemsPrice;
        const shippingPrice = itemsPrice > 2000 ? 0 : 50;
        const totalPrice = itemsPrice + taxPrice + shippingPrice;
        const pointsEarned = Math.floor(itemsPrice / 100);

        // نجمع المنتجات اللى فى الاوردر 
        const orderItems = cart.cartItems.map((item) => ({
            product: item.product._id,
            title: item.product.title,
            color: item.color,
            size: item.size,
            price: item.price,
            quantity: item.quantity,
            image: item.product.imageCover,
        }));

        // هنا بننشئ الاوردر فى المودل
        const order = await Order.create([{
            user: req.user._id,
            orderItems,
            shippingAddress,
            itemsPrice,
            shippingPrice,
            taxPrice,
            totalPrice,
            pointsEarned,
            paymentMethod: 'Cash on Delivery',
            isPaid: false, 
            status: 'Pending'
        }], {session});

        // نعمل ريكوست واحد باستخدام ال bulkWrite
        // علشان نحدث المنتجات اللى اطلبت بعد الاوردر ننقص المخزون بالكمية وهكذا
        const bulkOptions = cart.cartItems.map((item) => ({
            updateOne: {
                filter: {
                    _id: item.product._id,
                    "variations.color": item.color,
                    "variations.size": item.size
                },
                update: {
                    $inc: {
                        "variants.$.stock": -item.quantity,
                        "soldCount": item.quantity
                    }
                }
            }
        }));
        // هنا بنفذ ال bulkwrie
        await Product.bulkWrite(bulkOptions , {session});
        // وهنا خلاص بعد ما الاوردر اتعمل بنمسح السلة
        await Cart.findOneAndDelete({user: req.user._id}).session(session);

        // لو كل دا تم تمام ممن غير ما ولا حاجة تفشل ساعتها بنكمل السيشن 
        await session.commitTransaction();
        session.endSession();

        res.status(201).json({
            status: "Success",
            message: "Order Created Successfully. Prepare For Delievery!",
            data: {
                order: order[0]
            }
        })
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        next(new AppError("There was an error" , 500))
    }
}

export const createCheckoutSession = async (req , res , next) => {
    try {
        // اول حاجة هنجيب معلومات التوصيل
        const {shippingAddress} = req.body;

        // بعدين هنجيب السلة بتاعت اليوزر
        const cart = await Cart.findOne({user: req.user._id});

        if(!cart || cart.cartItems.length === 0){
            return next(new AppError("There is no items in your cart" , 400))
        }

        // هنجهز الحسابات بتاعتنا
        const itemsPrice = cart.totalCartPrice;
        const taxPrice = 0.010 * itemsPrice;
        const shippingPrice = itemsPrice > 1000 ? 0 : 50;
        const totalPrice = itemsPrice + taxPrice + shippingPrice;
        const amountInCents = Math.round(totalPrice * 100);

        // هنبدا بقا عملية الدفع مع paymob
        // اول حاجة نجيب ال authToken
        const authResponse = await fetch("https://accept.paymob.com/api/auth/tokens",{
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                api_key: process.env.PAYMOB_API_KEY
            })
        })
        const authData = await readPaymobResponse(authResponse, "Failed to authenticate with Paymob")
        const authToken = authData.token;

        if(!authToken){
            return next(new AppError(authData.message || "Paymob auth token was not returned", 400))
        }

        // تمام نبدا بقا نسجل الاوردر
        const orderResponse = await fetch("https://accept.paymob.com/api/ecommerce/orders" , {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                auth_token: authToken,
                delivery_needed: "false",
                amount_cents: amountInCents,
                currency: "EGP",
                merchant_order_id: cart._id.toString() + "_" + Date.now(),
            })
        })

        const orderData = await readPaymobResponse(orderResponse, "Failed to create Paymob order")
        const paymobOrderId = orderData.id

        if(!paymobOrderId){
            return next(new AppError(orderData.message || "Paymob order id was not returned", 400))
        }

        // تالت حاجة بقا نجيب مفتاح الدفع اللى الفرونت هيستعمله علشان يكمل الدفع فى ال IFrame
        const paymentKeyResponse = await fetch("https://accept.paymob.com/api/acceptance/payment_keys" , {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                auth_token: authToken,
                amount_cents: amountInCents,
                expiration: 3600,
                order_id: paymobOrderId,
                billing_data: {
                    apartment: "NA", 
                    email: req.user.email, 
                    floor: "NA", 
                    first_name: shippingAddress.firstName,
                    last_name: shippingAddress.lastName, 
                    street: shippingAddress.street,
                    building: "NA", 
                    phone_number: shippingAddress.phoneNumber,
                    shipping_method: "NA", 
                    postal_code: "NA", 
                    city: shippingAddress.city, 
                    country: "EG", 
                    state: shippingAddress.city
                },
                currency: "EGP",
                integration_id: Number(process.env.PAYMOB_INTEGRATION_ID),
            })
        })

        const paymentKeyData = await readPaymobResponse(paymentKeyResponse, "Failed to create Paymob payment key");
        const paymentToken = paymentKeyData.token;

        if(!paymentToken){
            return next(new AppError(paymentKeyData.message || "Paymob payment token was not returned", 400))
        }

        // نجهز لينك الدفع بقا اللى هيتبعت للفرونت عشان ندفع عليه
        const checkoutUrl = `https://accept.paymob.com/api/acceptance/iframes/${process.env.PAYMOB_IFRAME_ID}?payment_token=${paymentToken}`

        res.status(200).json({
            status: 'success',
            message: 'Checkout session created successfully',
            sessionUrl: checkoutUrl 
        });
    } catch (error) {
    next(new AppError("Error creating checkout session: " + error.message, 500));    
    }
}

export const paymobWebhook = async (req , res , next) => {
    try {
        const hmac = req.query.hmac;
        const {obj} = req.body;
        
        const hmacString = 
            obj.amount_cents.toString() + obj.created_at + obj.currency +
            obj.error_occured.toString() + obj.has_parent_transaction.toString() +
            obj.id.toString() + obj.integration_id.toString() + obj.is_3d_secure.toString() +
            obj.is_auth.toString() + obj.is_capture.toString() + obj.is_refunded.toString() +
            obj.is_standalone_payment.toString() + obj.is_voided.toString() +
            obj.order.id.toString() + obj.owner.toString() + obj.pending.toString() +
            obj.source_data.pan + obj.source_data.sub_type + obj.source_data.type +
            obj.success.toString();

        const hashedHmac = crypto.createHmac('sha512' , process.env.PAYMOB_HMAC).update(hmacString).digest('hex');
            
        if(hashedHmac !== hmac){
            return res.status(400).send('Invalid HMAC'); 
        }
        

        if(obj.success === true){
            const cartId = obj.order.merchant_order_id.split('_')[0];

            const cart = await Cart.findById(cartId).populate('cartItems.product');
            if(!cart){
                return res.status(200).send("Cart Already Processed");
            }

            const session = await mongoose.startSession();
            session.startTransaction();
            
            try {
                const itemsPrice = cart.totalCartPrice;
                const taxPrice = 0.010 * itemsPrice;
                const shippingPrice = itemsPrice > 1000 ? 0 : 50;
                const totalPrice = itemsPrice + taxPrice + shippingPrice;
                const pointsEarned = Math.floor(itemsPrice / 100);
                const billingData = obj.payment_key_claims?.billing_data || {};

                const orderItems = cart.cartItems.map((item) => ({
                    product: item.product._id,
                    title: item.product.title,
                    color: item.color,
                    size: item.size,
                    image: item.product.coverImage,
                    price: item.price,
                    quantity: item.quantity,
                }));

                await Order.create([{
                    user: cart.user, 
                    orderItems,
                    shippingAddress: { 
                        firstName: billingData.first_name || 'N/A',
                        lastName: billingData.last_name || 'N/A',
                        street: billingData.street || 'N/A',
                        city: billingData.city || 'N/A',
                        phoneNumber: billingData.phone_number || 'N/A',
                        country: billingData.country || 'EG'
                    },
                    itemsPrice,
                    shippingPrice,
                    taxPrice,
                    totalPrice,
                    pointsEarned,
                    paymentMethod: 'Credit Card',
                    isPaid: true,        
                    paidAt: Date.now(),
                    paymentID: String(obj.id),
                    status: 'Processing'
                }], { session });

                const bulkOptions = cart.cartItems.map((item) => ({
                    updateOne: {
                        filter: { _id: item.product._id, "variants.color": item.color, "variants.size": item.size },
                        update: { $inc: { "variants.$.stock": -item.quantity, "soldCount": item.quantity } }
                    }
                }));
                await Product.bulkWrite(bulkOptions , {session});

                await Cart.findByIdAndDelete(cart._id).session(session);

                await session.commitTransaction();
                session.endSession();
            } catch (error) {
                await session.abortTransaction();
                session.endSession();
                return res.status(500).send("Transaction Error");
            }
        }
        res.status(200).send("Webhook processed successfully");
    } catch (error) {
        res.status(500).send("Server Error");
    }
}

