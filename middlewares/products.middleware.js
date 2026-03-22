import AppError from "../utils/appError.js";
import sharp from "sharp";
import multer from "multer";
import { uploadToCloudinary } from "../utils/uploadToCloudinary.js";

// هنا هنظبط شوية اعدادات خاصة ب multer
// هنا هنخزن فى الميمورى عشان عملية ال sharp تتم أسرع
const multerStorage = multer.memoryStorage();
// هنا هنفلتر علشان احنا عايزين صور بس ممنوع ملفات تانية من اى نوع
const multerFilter = (req , file , cb) => {
    if(file.mimetype.startsWith('image')){
        cb(null , true)
    }else{
        cb(new AppError("Not an image! please upload only images" , 400) , false)
    }
}
// اعدادات الرفع
const upload = multer({
    storage: multerStorage,
    fileFilter: multerFilter
})

// اول حاجة هنا وهى رفع الصور
export const uploadProductImages = upload.fields([
    {name: 'coverImage' , maxCount: 1},
    {name: 'images' , maxCount: 5}
]);

// هنا بقا هنعالج الصور ونظبطها عشان تبقا حجمها مناسب مش كبير وابعادها مناسبة بردو
export const resizeProductImages = async (req , res , next) => {
    try {
        // لو مفيش صور مرفوعة روح الميدلوير اللى بعده
        if(!req.files) return next();
        if(!req.files.coverImage && !req.files.images) return next();

        if(req.files.coverImage){
        // نظبط ابعادها والفرومات ونحفظها
        const coverBuffer =        
            await sharp(req.files.coverImage[0].buffer)
            .resize(1200 , 1600)
            .toFormat('webp')
            .jpeg({quality: 90})
            .toBuffer();

            const result = await uploadToCloudinary(coverBuffer , "Products");
            req.body.coverImage = result.secure_url;
        }

        if(req.files.images){
            req.body.images = [];

            await Promise.all(
                req.files.images.map(async (file) => {
                    const imgBuffer = await sharp(file.buffer)
                    .resize(1200 , 1600)
                    .toFormat('webp')
                    .jpeg({quality: 90})
                    .toBuffer();

                    const result = await uploadToCloudinary(imgBuffer , "Products");
                    req.body.images.push(result.secure_url);
                })
            )
        }

        next();
    } catch (error) {
        next(new AppError("Error while resize images: " + error.message , 400))
    }
}
