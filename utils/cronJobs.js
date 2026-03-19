import redisClient from "../config/redisClient.js";
import Product from "../models/product.model.js";
import cron from "node-cron"
export const calculateTrendingProducts = async () => {
    try {
        // تمام هنحسب المنتجات التريند يمعادلة كدا تطلعلنا المنتجات التريند فعلا
        // المعادلة: (المبيعات * 5) + (المشاهدات * 1) + (التقييم * 10)
        const trendingProducts = await Product.aggregate([
            {
                $addFields: {
                    trendingScore: {
                        $add: [
                            {$multiply: ["$soldCount" , 5]},
                            {$multiply: ["$viewsCount" , 1]},
                            {$multiply: ["$ratingsAverage" , 10]}
                        ]
                    }
                }
            },
            {
                $sort: {trendingScore: -1}
            },
            {
                $limit: 12
            },
            {
                $project: {title: 1 , price: 1 , coverImage: 1 , trendingScore: 1}
            }
        ]);

        // هنخزن النتيجة بتاعت المنتجات دى فى redis كل ساعة يجدد المنتجات
        await redisClient.setEx('tredning-products' , 3600 , JSON.stringify(trendingProducts))
        console.log('Trending products updated successfully');
    } catch (error) {
        console.error('Error calculating trending products:', error);
    } 
}

// دى الفانكشن اللى هتجمع المساهدات من redis وتخزنها فى الداتابيز
export const syncProductViews = async () => {
    try {
        const views = await redisClient.hGetAll('product_views');
        const productIds = Object.keys(views);

        if(productIds.length === 0) return;

        const bulkOps = productIds.map(id => ({
            updateOne: {
                filter: { _id: id },
                update: { $inc: { viewsCount: parseInt(views[id]) } }
            }
        }));
        // دى حاجة فى مونجو بتنفذ كل العمليات فى مرة واحدة خطوة واحدة بس
        await Product.bulkWrite(bulkOps);

        await redisClient.del('product_views')
        console.log('views updated successfully');
    } catch (error) {
        console.error('Error syncing product views:', error);
    }
}

cron.schedule('0 * * * *', () => {
    calculateTrendingProducts();
});

cron.schedule('*/15 * * * *', () => {
    syncProductViews();
}); 