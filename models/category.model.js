import mongoose from "mongoose"
import slugify from "slugify";
import Product from "./product.model.js";

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: ['true', 'Category name is required'],
        unique: true,
        trim: true,
    },
    slug: {
        type: String,
        unique: true,
        index: true,
    },
    image: {
        type: String
    },
    description: {
        type: String,
        trim: true,
    },
    parentCategory: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
        default: null
    }
}, { 
    timestamps: true,
    toJSON: {virtuals: true}, 
    toObject: {virtuals: true} 
});

// هنعمل قسم virtual يجيب الاقسام الفرعية
categorySchema.virtual('subcategories' , {
    ref: 'Category',
    localField: '_id',
    foreignField: 'parentCategory'
})

// هنا يمكنك إضافة pre-save hook لتوليد slug تلقائيًا من اسم الفئة
categorySchema.pre('save', function() {
    if (this.isModified('name') || this.isNew) {
        this.slug = slugify(this.name, { lower: true });
    }
});

// هنا ميدلوير نمنع حذف كاتجوريز لو جواها منتجات
categorySchema.pre("findOneAndDelete" , async function() {
    // بنجيب الايدى بتاع الكاتجورى اللى هيتمسح 
    const categoryId = this.getQuery()._id;
    // بنشوف لو جواه منتجات لو اه بنرمى ايرور اننا مينفعش نحذفه
    const productCount = await mongoose.model('Product').countDocuments({category: categoryId});

    if(productCount > 0){
        throw new Error(`You cant delete this category it have ${productCount} Products delete them first`)
    }
})

const Category = mongoose.model('Category', categorySchema);
export default Category;