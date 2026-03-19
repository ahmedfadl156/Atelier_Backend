import { createClient } from "redis";
import dotenv from 'dotenv';
dotenv.config({path: 'config/.env'});

const redisClient = createClient({
    username: 'default',
    password: process.env.REDIS_PASSWORD, 
    socket: {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT
    } 
});

redisClient.on('error', (err) => {
    console.log('Redis Client Error', err);
});

redisClient.on('connect', () => {
    console.log('Successfully connected to Redis');
});

export const connectRedis = async () => {
    try {
        if (!redisClient.isOpen) {
            await redisClient.connect();
        }
    } catch (error) {
        console.error("Could not connect to redis", error);
    }
}

export default redisClient;