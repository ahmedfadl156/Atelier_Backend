import Cart from "../models/cart.model.js";
import Product from "../models/product.model.js";
import AppError from "../utils/appError.js";

export const addProductToCart = async (req , res , next) => {
    try {
        // اول حاجة هنجيب اللى مبعوت فى الريكوست من الفروت
        const {productId , color , size , quantity= 1} = req.body;

        // هنتأكد ان المنتج اللى مبعوت دا موجود فعلا فى الداتابيز ونجيب بياناته الحقيقة من الداتابيز منثقش فى اللى مبعوت من الفرونت
        const product = await Product.findById(productId);
        if(!product){
            return next(new AppError('Product Not Found' , 404));
        }

        // لو وموجود هنتأكد من المقاس والالوان
        const productVariant = product.variants.find(
            (v) => v.size === size && v.color === color
        )

        if(!productVariant){
            return next(new AppError('Product Variant Not Found' , 404));
        }

        // لو تمام هنشوف هل المنتج متوفر بالمية المبعوته
        if(productVariant.stock < quantity){
            return next(new AppError(`Only ${productVariant.stock} items left in the stock` , 400))
        }

        // هنتاكد من السعر ونشوف لو فيه خصم ناخده لو مفيش ناخده بالسعر الاساسى
        const itemPrice = product.discountPrice ? product.discountPrice : product.price;

        // نشوف بقا اليوزر عنده سله ولا لا 
        let cart = await Cart.findOne({user: req.user._id});

        if(!cart){
            cart = await Cart.create({
                user: req.user._id,
                cartItems: [{
                    product: product._id,
                    color,
                    size,
                    price: itemPrice,
                    quantity
                }]
            })
        }else{
            // لو اليوزر عنده سله هنتأكد هل المنتج موجود فى السلة بنفس المقاس او اللون
            const itemIndex = cart.cartItems.findIndex(
                (item) => item.product.toString() === productId && item.color === color && item.size === size
            )

            // هنشوف لو المنتج تمام موجود هنزود الكمية
            if(itemIndex > -1){
                const newQuantity = cart.cartItems[itemIndex].quantity + quantity;

                // لو الكمية اكتر من اللى موجود نرجع ايرور
                if(newQuantity > productVariant.stock){
                    return next(new AppError(`Sorry, This product is out of stock` , 400))
                }
                
                // لو الكمية تمام نزودها ونزود السعر
                cart.cartItems[itemIndex].quantity = newQuantity;
                cart.cartItems[itemIndex].price = itemPrice;
            }else{
                // لو بقا المنتج مش موجود او موجود بلون او مقاس تانى نزود للسلة 
                cart.cartItems.push({
                    product: productId,
                    color,
                    size,
                    quantity,
                    price: itemPrice
                })
            }
            // نحفظ السلة 
            await cart.save();
        }
        // وتبعت الرد للفرونت بالسلة الجديدة
        return res.status(200).json({
            status: "success",
            message: "Product added to cart successfully",
            numOfCartItems: cart.cartItems.length,
            data: {
                cart
            }
        })
    } catch (error) {
        next(new AppError("Error while adding product to cart" + error.message , 400))
    }
}

export const getLoggedUserCart = async (req , res , next) => {
    try {
        // هنجيب الكارت باليوزر ايدى اللى باعت الريكوست ونجيب معاها بيانات المنتج اللى محتاجينها فى الفرونت بس
        const cart = await Cart.findOne({user: req.user._id})
        .populate({
            path: "cartItems.product" , 
            select: "title coverImage price discountPrice brand"
        })

        if(!cart){
            next(new AppError("Cart not found" , 404))
        }

        return res.status(200).json({
            status: "success",
            numOfCartItems: cart.cartItems.length,
            data: {
                cart
            }
        })
    } catch (error) {
        next(new AppError("Error while getting logged user cart" + error.message , 400))
    }
}

export const removeCartItem = async (req , res , next) => {
    try {
        // اول حاجة هنجيب الكارت بتاعت اليوزر
        const cart = await Cart.findOne({user: req.user._id});

        if(!cart){
            return next(new AppError("Cart not found" , 404))
        }

        cart.cartItems = cart.cartItems.filter(
            (item) => item._id.toString() !== req.params.itemId
        )

        await cart.save();

        res.status(200).json({
            status: "success",
            message: "Cart item removed successfully",
            numOfCartItems: cart.cartItems.length,
            data: {
                cart
            }
        })
    } catch (error) {
        next(new AppError("Error while removing cart item" + error.message , 400))
    }
}

export const updateItemQuantity = async (req , res , next) => {
    try {
        // اول حاجة هنجيب ال quantity
        const {quantity} = req.body;

        // هنجيب السلة بتاعت اليوزر دا
        const cart = await Cart.findOne({user: req.user._id});

        if(!cart){
            return next(new AppError("There is no cart for this user" , 404))
        }

        // هندور على الايتم الللى اليوزر عايز يعدله
        const itemIndex = cart.cartItems.findIndex(
            (item) => item._id.toString() === req.params.itemId
        )

        if(itemIndex > -1){
            const cartItem = cart.cartItems[itemIndex];

            const product = await Product.findById(cartItem.product);

            const productVariant = product.variants.find(
                (variant) => variant.size === cartItem.size && variant.color === cartItem.color
            ) 

            if(productVariant.stock < quantity){
                return next(new AppError(`Cannot update quantity. Only ${productVariant.stock} Avaliable`, 400))
            }

            cartItem.quantity = quantity;

            const currentPrice = product.discountPrice ? product.discountPrice : product.price;
            cartItem.price = currentPrice;

            await cart.save();

            return res.status(200).json({
                status: "success",
                message: "Cart item updated successfully",
                data: cart
            })
        }else{
            return next(new AppError("Item not found in cart" , 404))
        }
    } catch (error) {
        next(new AppError("Error while updating cart item" + error.message , 400))
    }
}