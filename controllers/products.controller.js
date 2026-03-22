import mongoose from "mongoose";
import redisClient from "../config/redisClient.js";
import Product from "../models/product.model.js";
import APIFeatures from "../utils/apiFeatures.js";
import AppError from "../utils/appError.js";
import { calculateTrendingProducts } from "../utils/cronJobs.js";
import Category from "../models/category.model.js";
import { deleteFromCloudinary } from "../utils/uploadToCloudinary.js";

export const aliasFeaturedProducts = (req , res , next) => {
    req.query.isFeatured = true;
    req.query.limit = '5';
    req.query.fields = 'coverImage ,title ,id ,price ,category';
    next()
}

export const getAllProducts = async (req, res, next) => {
    try {
        if (req.query.category) {
            // هنجيب كل الأقسام اللي الـ parent بتاعها هو القسم اللي مبعوت في الـ URL
            const subcategories = await Category.find({ parentCategory: req.query.category });
            
            // هنعمل Array فيها الـ ID الأساسي + الـ IDs بتاعت الأقسام الفرعية
            const categoryIds = [
                req.query.category, 
                ...subcategories.map(sub => sub._id.toString())
            ];

            // بنحول الـ query لـ $in عشان الـ APIFeatures تفلتر بالـ Array دي كلها
            req.query.category = { $in: categoryIds };
        }
        // --- نهاية التريكة ---

        // هنعمل الكويرى بتاعتنا باستخدام ال features اللى عملناها
        const features = new APIFeatures(Product.find(), req.query)
            .filter()
            .search()
            .sort()
            .limitFields()
            .pagination();

        //  وبعدين نشوف المنتجات اللى رجعت
        const products = await features.query;
        
        //  هنا بنجيب عدد المنتجات 
        const totalCount = await Product.countDocuments();
        
        //  بنرجع الرد للفرونت عشان نبدا نعرضها
        res.status(200).json({
            status: "success",
            results: products.length,
            totalCount,
            data: {
                products
            }
        });
    } catch (error) {
        next(new AppError("Error While Getting All Products: " + error, 400));
    }
};
// هنا هننشئ منتج جديد
export const creatProduct = async (req , res , next) => {
    try {
        if(req.body.variants && typeof req.body.variants === 'string'){
            req.body.variants = JSON.parse(req.body.variants);
        }

        const newProduct = await Product.create(req.body);

        res.status(201).json({
            status: "success",
            data: {
                product: newProduct
            }
        })
    } catch (error) {
        next(new AppError("Error While Creating The Produtc" + error) , 400)
    }
}

// هناهنجيب منتج واحد عن طريق ال id
export const getProduct = async (req , res , next) => {
    try {
        const query = mongoose.Types.ObjectId.isValid(req.params.id) ?
        {_id: req.params.id} : {slug: req.params.id}
        // هنجيب المنتج بالايدى ونعمل populate for reviews
        const product = await Product.findOne(query).populate('reviews');

        // لو مفيش منتج
        if(!product){
            return next(new AppError("There is no product found by this ID" , 404))
        }

        // هنعمل هنا شوية عمليات عشان نزود المشاهدات بتاعت المنتج هنوزده اولا فى redis
        // علشان منعملش عمليات كتير على الداتابيز وكمان العمليه تتم بسرعه وهنفلتر بالايبى عشان ميتعملش سبام
        // ف اول حاجة هنجيب الايبى بتاع اليوزر لو اليوزر مسجل هناخد الايدى لو مش مسجل هناخد الايبى
        const viewrId = req.user ? req.user._id.toString() : req.ip
        console.log(viewrId , req.ip)
        // هنعمل مفتاح لكل يوزر
        const viewKey = `viewed: ${product._id}:${viewrId}`
        // هنشوف بقا نسأل هل اليوزر دا شاف قبل كدا
        const hasViewed = await redisClient.get(viewKey);

        if(!hasViewed){
            // لو مشفش فساعتها هنزود المشاهدات او بردو لو عدى ساعة
            await redisClient.setEx(viewKey , 3600 , '1')
            // بنزود بقا عدد المشاهدتا
            await redisClient.hIncrBy('product_views' , product._id.toString() , 1)
        }
        // لو المنتج موجود نرجعه 
        res.status(200).json({
            status: "success",
            data: {
                product
            }
        })
    } catch (error) {
        next(new AppError("Error while getting the product details" + error , 404))
    }
}

// هنا هنعمل update للمنتج بتاعنا
export const updateProduct = async (req , res , next) => {
    try {
        const {id} = req.params;
        if(!id){
            next(new AppError("Please provide the product id to update it" , 400))
        }
        // لو الادم بيحدث المقاسات والالوان
        if(req.body.variants && typeof req.body.variants === 'string'){
            req.body.variants = JSON.parse(req.body.variants);
        }
        // هنا هنعدل على البرودكنت 
        const product = await Product.findByIdAndUpdate(id , req.body , {
            returnDocument: "after",
            runValidators: true
        })
        // لو مفيش برودكت اصلا موجود نرجع ايرور
        if(!product){
            next(new AppError("No Product Found For This ID" , 404))
        }

        res.status(200).json({
            status: "success",
            data: {
                product
            }
        })
    } catch (error) {
        next(new AppError("Error while updating the product" , 400))
    }
}

// حذف المنتج وهنا بقا احنا مش هنحذف المنتج تمام احنا هنخليه مش Active
export const deleteProduct = async (req , res , next) => {
    try {
        const {id} = req.params;
        const product = await Product.findByIdAndUpdate(id , {
            isActive: false
        });
        
        if(!product){
            next(new AppError("There is no product found with this ID" , 404))
        }

        res.status(200).json({
            status: "success",
            message: "The Product Deleted Successfully",
            data: null
        })
    } catch (error) {
        next(new AppError("Error while deleting the product" , 400))
    }
}
// هنا حذف المنتج تماما
export const deleteProductPermenant = async (req , res , next) => {
    try {
        const {id} = req.params;
        const product = await Product.findById(id);
        
        if(!product){
            next(new AppError("There is no product found with this ID" , 404))
        }

        if(product.coverImage){
            await deleteFromCloudinary(product.coverImage);
        }

        if(product.images && product.images.length > 0){
            const deltePromises = product.images.map(imgUrl => deleteFromCloudinary(imgUrl))

            await Promise.all(deltePromises);
        }

        await product.deleteOne();

        res.status(200).json({
            status: "success",
            message: "The Product Deleted Successfully",
            data: null
        })
    } catch (error) {
        next(new AppError("Error while deleting the product" , 400))
    }
}

export const getRelatedProducts = async (req, res, next) => {
    try {
        // هنجيب المنتج الحالى 
        const currentProduct = await Product.findById(req.params.id);

        if (!currentProduct) {
            return next(new AppError("Product not found", 404))
        }
       // بعد كدا نعمل aggregation عشان نجيب منتجات فى نفس القسم او قريبة للسعر بتاع  المنتج الحالى
        const relatedProducts = await Product.aggregate([
            // اول خطوة نشيل المنتج الحالى عشان ميطلعش فى الاقترااحات
            {
                $match: {
                    _id: { $ne: currentProduct._id }
                }
            },
             // بعدين نعمل ماتش بالكاتجورى وباقرب سعر للمنتج سواء مثلا اكثر منه بنسبة او اقل بنفس النسبية
            {
                $match: {
                    $or: [
                        { category: currentProduct.category },
                        {
                            price: {
                                $gte: currentProduct.price * 0.7,
                                $lte: currentProduct.price * 1.3
                            }
                        }
                    ]
                }
            },
            // بعدين نضيف سكورات معينه بردو زيادة عشان نزود نسبة الاقتراح زى الجودة ونسبة المبيعات عشان نجيب منتجات مطلوبة فعلا
            {
                $addFields: {
                    recommendationScore: {
                        $add: [
                            { $multiply: ["$soldCount", 2] },
                            { $multiply: ["$ratingsAverage", 10] }
                        ]
                    }
                }
            },
            // بعد كدا نرتبهم من الاعلى للأقل
            {
                $sort: { recommendationScore: -1 }
            },
            // بعد كدا نرجع اول اربعه بس لانى محتاجين فى الاقتراحات فى الفرونت هنعرض اربعه بس
            {
                $limit: 4
            },
            {
                $project: {
                    title: 1,
                    coverImage: 1,
                    price: 1,
                    discountPrice: 1,
                    slug: 1,
                    ratingsAverage: 1,
                    recommendationScore: 1
                }
            }
        ]);

        res.status(200).json({
            status: "success",
            results: relatedProducts.length,
            data: {
                relatedProducts
            }
        });

    } catch (error) {
        next(new AppError("Error while getting related products", 400))
    }
}

// هنا بنجيب المنمتجات التريند
export const getTrendingProducts = async (req , res , next) => {
    try {
        // اول قبل مانكلم الداتا بيز بنسال هل فيه منتجات اتعملها كاش عشان نسرع العملية
        const cachedTrendingProducts = await redisClient.get("tredning-products");

        if(cachedTrendingProducts){
            return res.status(200).json({
                status: "Success",
                message: "Trending Products",
                data: JSON.parse(cachedTrendingProducts)
            })
        }

        // لو مفيش هنتكلم بقا الداتا بيز ونخليها تحسب وننده الفانكشن بتاعت الحفظ فى redis
        await calculateTrendingProducts();
        const freshTrendingProducts = await redisClient.get("tredning-products");

        res.status(200).json({
            status: "success",
            message: "Trending Products",
            data: JSON.parse(freshTrendingProducts)
        })
    } catch (error) {
        next(new AppError("Error while getting trending products" , 400))
    }
}