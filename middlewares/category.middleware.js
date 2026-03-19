import multer from "multer"
import AppError from "../utils/appError.js";
import sharp from "sharp";

const multerStorage = multer.memoryStorage();
const multerFilter = (req , file , cb) => {
    if(file.mimetype.startsWith('image')){
        cb(null , true)
    }else{
        cb(new AppError("Not an image, Please upload only images") , false)
    }
}

const upload = multer({
    storage: multerStorage,
    fileFilter: multerFilter
})

export const uplodaCategoryImage = upload.single('image');

export const resizeCategoryImage = async (req , res , next) => {
    try {
        if(!req.file){
            return next();
        }

        req.body.image = `category-${Date.now()}-.jpeg`

        await sharp(req.file.buffer)
        .resize(800, 800)
        .toFormat('jpeg')
        .jpeg({ quality: 90 })
        .toFile(`public/images/Categories/${req.body.image}`);

        next()
    } catch (error) {
        next(new AppError(error))
    }
}