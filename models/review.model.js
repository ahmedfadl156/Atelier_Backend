import mongoose from "mongoose";
import Product from "./product.model.js";

const reviewSchema = new mongoose.Schema({
    review: {
    type: String,
    required: [true, 'Review cannot be empty!']
    } ,
    rating: {
    type: Number,
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot be more than 5'],
    required: [true, 'Review must have a rating.']
    },
    product: {
    type: mongoose.Schema.ObjectId,
    ref: 'Product',
    required: [true, 'Review must belong to a product.']
    },
    user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'Review must belong to a user.']
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// علشان اليوزر يقيم المنتج مرة واحدة بس لكل منتج ميقيمش المنتج بأكتر من تقييم
reviewSchema.index({product: 1 , user: 1} , {unique: true})

// هنا واحنا بنجيب التقيممات نرجع معاها اسم اليوزر
reviewSchema.pre(/^find/ , function() {
    this.populate({
        path: "user product",
        select: "firstName lastName title"
    })
})

// هنا هنعمل aggregation تحسب المتوسط اوتوماتيك
reviewSchema.statics.calcAverageRatings = async function(productId) {
    const stats = await this.aggregate([
        {
            $match: {product: productId}
        },
        {
            $group: {
                _id: '$product',
                nRating: {$sum: 1},
                avgRating: {$avg: "$rating"}
            }
        }
    ])

    // بعد ما نجمع نروح نحدث المنتج نفسه
    if(stats.length > 0){
        await Product.findByIdAndUpdate(productId , {
            ratingsQuantity: stats[0].nRating,
            ratingsAverage: stats[0].avgRating
        })
    }else{
        await Product.findByIdAndUpdate(productId , {
            ratingsQuantity: 0,
            ratingsAverage: 4.5
        })
    }        
}

// هنا بعد مانعمل تقييم جديد فى الداتابيز
reviewSchema.post('save' , function() {
    this.constructor.calcAverageRatings(this.product)
})

// هنا هنعمل عشان لو يوزر عدل التقييم بتاعه او مسحه يتحدث برضه
reviewSchema.pre(/^findOneAnd/, async function() {
    const id = this.getQuery()._id;
    this.r = await this.model.findById(id);
});

reviewSchema.post(/^findOneAnd/, async function() {
    if (this.r) {
        const productId = this.r.product._id || this.r.product;
        await this.r.constructor.calcAverageRatings(productId);
    }
});

const Review = mongoose.model('Review' , reviewSchema);
export default Review;