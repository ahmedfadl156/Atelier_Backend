import { Router } from "express";
import {createCategory,getAllCategories,getCategory,updateCategory,deleteCategory, getAllAndSubcategories,} from "../controllers/category.controller.js";

import {resizeCategoryImage , uplodaCategoryImage} from "../middlewares/category.middleware.js";

import { authorize } from "../middlewares/authorize.middleware.js";
import { restrictTo } from "../controllers/auth.controller.js"; 

const categoryRouter = Router();

// Public Routes
categoryRouter.route("/").get(getAllCategories);
categoryRouter.get('/subcategories' , getAllAndSubcategories)

categoryRouter
.route("/:id")
.get(getCategory);

//Admin Protected Routes
const adminProtect = [authorize, restrictTo("admin")];
const uploadMiddleware = [uplodaCategoryImage, resizeCategoryImage];

categoryRouter.route("/")
.post(...adminProtect, ...uploadMiddleware, createCategory);

categoryRouter.route("/:id")
.patch(...adminProtect, ...uploadMiddleware, updateCategory)
.delete(...adminProtect, deleteCategory);

export default categoryRouter;