import express from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import logger from 'morgan';
import mongoose from 'mongoose';
import dns from 'dns';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.routes.js';
import productsRouter from './routes/products.routes.js';
import reviewsRouter from './routes/reviews.routes.js';
import categoryRouter from './routes/category.routes.js';
import { connectRedis } from './config/redisClient.js';
import cors from "cors"
import './utils/cronJobs.js'
import { calculateTrendingProducts } from './utils/cronJobs.js';
import usersRouter from './routes/users.routes.js';
import cartRouter from './routes/cart.routes.js';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import hpp from 'hpp';
import { globalErrorHandler } from './controllers/error.controller.js';
import AppError from './utils/appError.js';
import wishlistRouter from './routes/wishlist.routes.js';
import orderRouter from './routes/order.routes.js';
import analtyticsRouter from './routes/analytics.routes.js';
import dotenv from 'dotenv';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// dotenv config
dotenv.config({ path: path.join(__dirname, 'config', '.env') });

const app = express();

dns.setServers(['1.1.1.1', '8.8.8.8']);
app.set('trust proxy', 1);

app.use(cors({
  origin: ["https://atelier-fashion-e-commerce.vercel.app" , "http://localhost:3000"],
  credentials: true  
})); 

// نأمن ال HTTP Headers
app.use(helmet());


// هنا نمنع ال DDOS , Brute Force بأننا نقلل الليميت نعمل rateLimit
const limiter = rateLimit({
  windowMs: 60  * 60 * 1000,
  limit: 150,
  message:  'Too many requests from this IP, please try again after an hour'
})
app.use('/api' , limiter);
app.use(logger('dev'));
app.use(express.json({limit: '10kb'}));
app.use(express.urlencoded({ extended: true , limit: '10kb' }));
app.use(hpp({
  whitelist:['price' , 'size' , 'color' , 'ratingsAverage' , 'ratingsQuantity' , 'category' , 'brand']
}))
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Redis
connectRedis();
const connectToDB = async () => {
  try {
    await mongoose.connect(process.env.DATABASE_URL);
    console.log('Connected to the database successfully');
  } catch (error) {
    console.error('Error connecting to the database:', error);
    process.exit(1);
  }
};

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/products' , productsRouter);
app.use('/api/v1/reviews' , reviewsRouter);
app.use("/api/v1/categories", categoryRouter);
app.use("/api/v1/users", usersRouter);
app.use("/api/v1/cart", cartRouter);
app.use("/api/v1/wishlist", wishlistRouter);
app.use("/api/v1/order", orderRouter);
app.use("/api/v1/analytics", analtyticsRouter);

app.all('*', (req, res, next) => {
    next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler);

// connect to the database and start the server
app.listen(process.env.PORT, async () => {
  await connectToDB();
  console.log(`Server is running on port ${process.env.PORT}`);
  calculateTrendingProducts();
});

export default app;
