import redisClient from "../config/redisClient.js"
import Order from "../models/orders.model.js";
import Product from "../models/product.model.js";
import AppError from "../utils/appError.js"

export const getDashboardStats = async (req , res , next) => {
    try {
        // بنشوف لو فيه داتا فى الكاش ولا لا عشان منروحش للداتابيز كتير
        const cachedAnalytic = await redisClient.get("dashboard-stats");
        if(cachedAnalytic){
            return res.status(200).json(JSON.parse(cachedAnalytic));
        }

        // لو مفيش بيانات فى الكاش هنجيبها من الداتا بيز
        // هنجيب شوية معلومات هنحتاجها فى الاحصائيات وهنبعتها كلها فى ريكوست واحد تتنفذ مرة واحده علشان السرة تبقى عالية
        const [kpis , topCustomers , topProducts , lowStockAlerts] = await Promise.all([
            // اول حاجة ال KPIS
            Order.aggregate([
                {
                    $group: {
                        _id: null,
                        totalRevenue: {
                            $sum: {$cond: [{$eq: ["$isPaid" , true]} , "$totalPrice" , 0]}
                        },
                        totalOrders: {
                            $sum: 1
                        },
                        delieveredOrders: {
                            $sum: {$cond: [{$eq: ["$status" , "Delivered"]} , 1 , 0]}
                        },
                        proccessingOrders: {
                            $sum: {$cond: [{$eq: ["$status" , "Processing"]} , 1 , 0]}
                        }
                    }
                }
            ]),

            // تانى حاجة هنجيب اكتر 5 زباين دفعوا فلوس
            Order.aggregate([
                {
                    $match: {isPaid: true}
                },
                {
                $group: {
                    _id: "$user",
                    totalSpent: {$sum: "$totalPrice"},
                    totalOrders: {$sum: 1}
                },
                },
                {
                    $sort: {totalSpent: -1}
                },
                {
                    $limit: 5
                },
                {
                    $lookup: {
                        from: "users",
                        localField: "_id",
                        foreignField: "_id",
                        as: "userData"
                    }
                },
                {
                    $unwind: "$userData"
                },
                {
                    $project: {
                        _id: 1,
                        totalSpent: 1,
                        totalOrders: 1,
                        "userData.firstName": 1,
                        "userData.lastName": 1,
                        "userData.email": 1,
                    }
                }
            ]),

            // هنا هنجيب المنتجات الاكثر مبيعا
            Product.find()
            .sort({ soldCount: -1 })
            .limit(5)
            .select("title coverImage price soldCount"),

            // هنا هنجيب المنتجات اللى قربت تخلص
            Product.find({"variants.stock": {$lt: 5}})
            .select("title variants soldCount coverImage")
            .limit(10)
        ])

        // نظبط بقا شكل الداتا اللى هترجع للفرونت اند
        const responseData = {
            status: "success",
            data: {
                kpis: kpis.length > 0 ? kpis[0] : {totalRevenue: 0 , totalOrders: 0 , delieveredOrders: 0 , proccessingOrders: 0},
                topCustomers,
                topProducts,
                lowStockAlerts
            }
        };

        await redisClient.setEx('dashboard-stats' , 300 , JSON.stringify(responseData))

        res.status(200).json(responseData);
    } catch (error) {
        next(new AppError("Error while fetching dashboard stats: " + error.message, 500))
    }
}