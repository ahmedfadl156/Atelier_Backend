import mongoose from "mongoose"
import slugify from "slugify";
import Review from "./review.model.js";

const productSchema = new mongoose.Schema({
    title: {
        type: String,
        required: ['true', 'Product title is required'],
        trim: true,
    },
    slug: {
        type: String,
        unique: true,
        index: true,
    },
    description: {
        type: String,
        required: ['true', 'Product description is required'],
        trim: true,
    },
    brand: {
        type: String,
        trim: true,
        default: "ATELIER"
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        // required: ['true', 'Product category is required'],
    },
    price: {
        type: Number,
        required: ['true', 'Product price is required'],
        min: [0, 'Price cannot be negative'],
    },
    discountPrice: {
        type: Number,
        min: [0, 'Discount price cannot be negative'],
        validate: {
            validator: function(value){
                return value < this.price;
            },
            message: 'Discount price must be less than the original price' 
        } 
    }, 
    coverImage: {
        type: String,
        required: ['true', 'Product cover image is required'],
    },
    images: [String],
    variants: [{
        sku: {type: String , required: ['true', 'Variant SKU is required']},
        color: {type: String, trim: true , required: ['true', 'Variant color is required']},
        size: {type: String, trim: true, required: ['true', 'Variant size is required']},
        stock: {type: Number, default: 0, min: [0, 'Stock cannot be negative']},
    }],
    ratingsAverage: {
        type: Number,
        min: [1, 'Rating must be at least 1'],
        max: [5, 'Rating cannot be more than 5'],
        default: 4.5,
        set: val => Math.round(val * 10) / 10,
    },
    ratingsQuantity: {
        type: Number,
        default: 0,
        min: [0, 'Ratings quantity cannot be negative'],
    },
    isActive:{
        type: Boolean,
        default: true,
        select: false,
    },
    isFeatured: {
        type: Boolean,
        default: false,
    },
    soldCount: {
        type: Number,
        default: 0,
    },
    viewsCount: {
        type: Number,
        default: 0,
    },
}, { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});

// هنا هنعمل ال slug قبل ما نحفظ المنتج في الداتا بيز
productSchema.pre('save' , function() {
    if(this.isModified('title') || this.isNew){
        this.slug = slugify(this.title , { lower: true });
    }
})

// هنا هنعمل ال reviews عبارة عن virtual مش هنخزنها بس اما نحتاجها نقدر نجيبها من ال review model عن طريق ال product id
productSchema.virtual('reviews' , {
    ref: 'Review',
    foreignField: 'product',
    localField: '_id',
})

const Product = mongoose.model('Product', productSchema);
export default Product;