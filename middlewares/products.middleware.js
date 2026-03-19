import AppError from "../utils/appError.js";
import sharp from "sharp";
import multer from "multer";

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
        if(!req.files.coverImage || !req.files.images) return next();

        // نظبط صورة الغلاف
        req.body.coverImage = `product-${Date.now()}-cover.jpeg`;
        // نظبط ابعادها والفرومات ونحفظها
        await sharp(req.files.coverImage[0].buffer)
        .resize(1200 , 1600)
        .toFormat('jpeg')
        .jpeg({quality: 90})
        .toFile(`public/images/Products/${req.body.coverImage}`)

        // نظبط باقى الصور
        req.body.images = [];

        await Promise.all(
            req.files.images.map(async (file , i) => {
                const filename = `product-${Date.now()}-${i + 1}.jpeg`;

                await sharp(file.buffer)
                .resize(1200 , 1600)
                .toFormat('jpeg')
                .jpeg({quality: 90})
                .toFile(`public/images/Products/${filename}`)

                req.body.images.push(filename)
            })
        );

        next();
    } catch (error) {
        next(new AppError("Error while resize images: " + error.message , 400))
    }
}
