import mongoose from "mongoose";
import Category from "../models/category.model.js"
import APIFeatures from "../utils/apiFeatures.js";
import AppError from "../utils/appError.js"
import slugify from "slugify";

// انشاء قسم جديد
export const createCategory = async (req , res , next) => {
    try {
        const newCategory = await Category.create(req.body)

        res.status(201).json({
            status: "success",
            message: "Category Created Successfully!",
            data: {
                newCategory
            }
        })
    } catch (error) {
        next(new AppError("Error while creating the category" + error.message , 400))
    }
}

// هنا هجيب كل الاقسام الموجودة عندى
export const getAllCategories = async (req , res , next) => {
    try {
        const features = new APIFeatures(Category.find() , req.query)
        .filter()
        .sort()
        .limitFields()
        .pagination()

        const categories = await features.query;

        if(!categories){
            return next(new AppError("There is no categories yet! add your first" , 404))
        }

        res.status(200).json({
            status: "success",
            data:{
                categories
            }
        })
    } catch (error) {
        next(new AppError("Error while getting all categories" + error.message , 400))
    }
}

// هنا بجيب كل الاقسام وكمان الاقسام اللى جواها
export const getAllAndSubcategories = async (req , res , next) => {
    try {
        const categories = await Category.find({parentCategory: null}).populate("subcategories");
        if(!categories){
            return next(new AppError("There is no categories yet! add your first" , 404))
        }
        res.status(200).json({
            status: "success",
            data: {
                categories
            }
        })
    } catch (error) {
        next(new AppError("Error while getting all categories" + error.message , 400))
    }
}

// هنا لو عايزين نجيب حسب قسم واحد هتفيدنا فى ال SEO واننا نجيب منتجات القسم
export const getCategory = async (req , res , next) => {
    try {
        // احان عايزين نبحث ياما بال slug او ال id 
        // فاحنا هنعمل حاجة بتعمل تست تشوف اللى بنبحث بيه دا بيناسب شكل الايدى فى مونجو لو اه 
        // يبقى احنا كدا بنبحث بالايدى لو لا يبقى كدا بنبحث بال slug
        const query = mongoose.Types.ObjectId.isValid(req.params.id)
        ? { _id: req.params.id }
        : { slug: req.params.id };

        const category = await Category.findOne(query);

        if(!category){
            return next(new AppError("Category Not Found!" , 404))
        }

        res.status(200).json({
            status: "success",
            data: {category}
        })
    } catch (error) {
        next(new AppError("Error while getting the category" + error.message , 404))
    }
}

// هنا هنعمل ابديت للكاتجورى
export const updateCategory = async (req , res , next) => {
    try {
        // لو هنغير اسم الكاتجورى لازم طبعا نغير اسم ال Slug معاه
    if (req.body.name) {
        req.body.slug = slugify(req.body.name, { lower: true });
    }

    const category = await Category.findByIdAndUpdate(req.params.id, req.body, {
        returnDocument: "after",
        runValidators: true
    });

    if (!category) {
        return next(new AppError("Category not found" , 404))
    }

    res.status(200).json({
        status: 'success',
        data: { category }
    });
    } catch (error) {
        next(new AppError("Error while updating the category" + error.message , 400))
    }
}

// هنا لو عايزين نحذف كاتجورى
export const deleteCategory = async (req , res , next) => {
    try {
    const category = await Category.findByIdAndDelete(req.params.id);

    if (!category) {
        return next(new AppError("Category not found" , 404))
    }

    res.status(204).json({
        status: 'success',
        data: null
    });
    } catch (err) {
        next(new AppError("Error while deleting the category" + error.message , 400))
    }
}