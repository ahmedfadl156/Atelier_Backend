import mongoose from 'mongoose';
import dotenv from "dotenv"
import Product from './models/product.model.js';
import dns from "dns"
// بنقرأ ملف الـ env عشان نجيب لينك الداتابيز
dotenv.config({ path: 'config/.env' });
dns.setServers(['1.1.1.1', '8.8.8.8']);

// الداتا اللي هنحقنها
const sampleProducts = [
    {
      title: "The Ethereal Mulberry Silk Gown",
      slug: "the-ethereal-mulberry-silk-gown",
      description: "Crafted from the finest 40mm mulberry silk, this silhouette is a testament to timeless elegance. The Atelier's signature bias cut ensures a drape that mimics liquid light.",
      brand: "ATELIER",
      category: "60d5ec49f1b2c8b1f8e4e1a1", // لما تعمل أقسام حقيقية، ابقى حط الـ ID بتاعها هنا
      price: 1850,
      coverImage: "gown-cover.jpg",
      images: ["gown-detail-1.jpg", "gown-detail-2.jpg"],
      variants: [
        { sku: "GOWN-SLK-GLD-36", color: "Champagne", size: "36", stock: 5 },
        { sku: "GOWN-SLK-GLD-38", color: "Champagne", size: "38", stock: 12 },
        { sku: "GOWN-SLK-GLD-40", color: "Champagne", size: "40", stock: 3 }
      ],
      ratingsAverage: 4.8,
      ratingsQuantity: 24
    },
    {
      title: "Tailored Wool Blazer",
      slug: "tailored-wool-blazer",
      description: "Structured elegance. Discover the new season essentials featuring intricate craftsmanship and timeless silhouettes designed for the modern muse.",
      brand: "ATELIER",
      category: "60d5ec49f1b2c8b1f8e4e1a1", 
      price: 1450,
      discountPrice: 1250, 
      coverImage: "blazer-cover.jpg",
      images: ["blazer-back.jpg"],
      variants: [
        { sku: "BLZ-WOL-BLK-38", color: "Midnight Black", size: "38", stock: 8 },
        { sku: "BLZ-WOL-BLK-40", color: "Midnight Black", size: "40", stock: 0 }, 
        { sku: "BLZ-WOL-CHR-38", color: "Charcoal", size: "38", stock: 15 }
      ],
      ratingsAverage: 4.9,
      ratingsQuantity: 56
    },
    {
      title: "Architectural Silk Blouse",
      slug: "architectural-silk-blouse",
      description: "A minimalist approach to everyday luxury. This silk blouse features clean lines and a concealed button placket for a seamless finish.",
      brand: "ATELIER",
      category: "60d5ec49f1b2c8b1f8e4e1a1", 
      price: 620,
      coverImage: "blouse-cover.jpg",
      images: ["blouse-detail.jpg"],
      variants: [
        { sku: "BLS-SLK-IVR-S", color: "Ivory", size: "S", stock: 20 },
        { sku: "BLS-SLK-IVR-M", color: "Ivory", size: "M", stock: 25 },
        { sku: "BLS-SLK-IVR-L", color: "Ivory", size: "L", stock: 10 }
      ],
      ratingsAverage: 4.5,
      ratingsQuantity: 12
    }
  ];

// الاتصال بالداتابيز
mongoose
  .connect(process.env.DATABASE_URL) // اتأكد إن اسم المتغير ده هو اللي عندك في ملف الـ .env
  .then(() => console.log('DB connection successful for seeding...'))
  .catch((err) => console.log('DB Connection Error: ', err));

// دالة حقن البيانات (Import)
const importData = async () => {
  try {
    // 1. بنمسح أي داتا قديمة عشان ميحصلش تكرار أو Conflict في الـ unique fields زي الـ slug
    await Product.deleteMany();
    console.log('Old Data Deleted...');

    // 2. بنحقن الداتا الجديدة
    await Product.insertMany(sampleProducts);
    console.log('Data Imported Successfully! 🔥');
    
    // 3. بنقفل الاتصال والملف عشان الـ Terminal تفضى
    process.exit();
  } catch (err) {
    console.error('Error with Import:', err);
    process.exit(1); // بنقفل مع كود 1 يعني حصل error
  }
};

// دالة مسح البيانات (Destroy) - لو حبيت تنظف الداتابيز خالص
const destroyData = async () => {
  try {
    await Product.deleteMany();
    console.log('Data Destroyed Successfully! 🗑️');
    process.exit();
  } catch (err) {
    console.error('Error with Destroy:', err);
    process.exit(1);
  }
};

// هنا بنحدد هنشغل أنهي دالة بناءً على الكوماند اللي هنكتبه في الـ Terminal
if (process.argv[2] === '-d') {
  destroyData();
} else {
  importData();
}