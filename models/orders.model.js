import mongoose from "mongoose"
import { customAlphabet } from "nanoid";
import User from "./users.model.js";
const generateOrderNumber = customAlphabet('23456789ABCDEFGHJKLMNPQRSTUVWXYZ' , 6);

const orderItemSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
    },
    title: {type: String, trim: true, required: true},
    color: {type: String, trim: true , required: true},
    size: {type: String, trim: true, required: true},
    image: {type: String, trim: true},
    price: {type: Number, required: true},
    quantity: {type: Number, required: true},
});

const orderSchema = new mongoose.Schema({
    // معلومات اليوزر اللى هيشترى
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    // المنتجات في الطلب
    orderItems: [orderItemSchema],
    // معلومات التوصيل
    shippingAddress: {
        firstName: String,
        lastName: String,
        street: String,
        city: String,
        country: String,
        phoneNumber: String,
    },
    // معلومات الدفع
    itemsPrice: {type: Number, required: true},
    shippingPrice: {type: Number, required: true},
    taxPrice: {type: Number, required: true},
    totalPrice: {type: Number, required: true},
    // معلومات طريقة الدفع
    paymentMethod: {
        type: String,
        enum: ['Cash on Delivery', 'Credit Card'],
        default: 'Cash on Delivery',
    },
    isPaid: {type: Boolean, default: false},
    paidAt: Date,

    // هنخزن الايدى بتاع الدفع عشان لو اليوزر حب يعمل استرجاع او حاجة معينة حصلت
    paymentID: String, 
    // حالة الطلب 
    status: {
        type: String,
        enum: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'],
        default: 'Pending',
    },
    orderNumber: {
        type: String,
        unique: true,
    },
    isDelieverd: {type: Boolean, default: false},
    delieveredAt: Date,
    // هنا هنحسب النقاط اللى هتتاخد من الطلب اللى اتعمل
    pointsEarned: {type: Number, default: 0}, 
}, { timestamps: true });

// قبل الحفظ عايزين نعمل ال orderId
orderSchema.pre('save' , function(){
    if(this.isNew){
        this.orderNumber = `AF-${generateOrderNumber()}`
    }
})

// داله هتحسب النقط لليوزر يعد ما الاوردر بتاعه يوصل
orderSchema.pre('save' , async function() {
    if(this.isModified('isDelieverd') && this.isDelieverd === true){
        try {
            await mongoose.model('User').findByIdAndUpdate(
                this.user,
                {$inc: {atelierPoints: this.pointsEarned}}
            )
        } catch (error) {
            console.error("Error Adding points to user" + error);
        }
    }
})

const Order = mongoose.model('Order', orderSchema);
export default Order;