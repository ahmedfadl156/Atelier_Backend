import mongoose from "mongoose"

const cartItemSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
    },
    color: {type: String, trim: true , required: true},
    size: {type: String, trim: true, required: true},
    quantity: {
        type: Number,
        required: true,
        default: 1,
        min: [1, 'Quantity must be at least 1'],
    },
    price: {
        type: Number,
        required: true,
    }
});

const cartSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true,
    },
    cartItems: [cartItemSchema],
    totalCartPrice: {
        type: Number,
        required: true,
        default: 0,
    },
    totalPriceAfterDiscount: {
        type: Number,
    },
}, { timestamps: true });

// هنا هنحسب السعر الكلى لل cart
cartSchema.pre('save' , function() {
    this.totalCartPrice = this.cartItems.reduce((total, item) => {
        return total + item.price * item.quantity;
    }, 0);
})

const Cart = mongoose.model('Cart', cartSchema);
export default Cart;