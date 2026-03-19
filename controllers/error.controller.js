import AppError from "../utils/appError.js";
// هنا بنهندل أخطاء المونجو زى ان الايدى اللى اتبعت مش صح او مش موجود
const handleCastErrorDB = (err) => {
    const message = `Invalid ${err.path}: ${err.value}`;
    return new AppError(message , 400);
}

// هنا لو فيه فيلدز متكررة زى ال slug مثلا
const handleDuplicateFieldsDB = (err) => {
    const value = Object.values(err.keyValue)[0];
    const message = `Duplicate field value: ${value}. Please use another value!`;
    return new AppError(message , 400);
}

// هنا لو فيه validations Erro
const handleValidationErrorDB = (err) => {
    const errors = Object.values(err.errors).map(el => el.message);
    const message = `Invalid input data. ${errors.join('. ')}`;
    return new AppError(message , 400);
}

const handleJWTError = () => new AppError('Invalid token. Please log in again!', 401);

const handleJWTExpiredError = () => new AppError('Your token has expired! Please log in again.', 401);

// الفانكشن اللى هنستخدمها ترجع الايرورز فى الديفلوبمنت
export const sendErrorDev = (err , res) => {
    res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
        stack: err.stack,
        error: err
    })
}

// الفانكشن اللى هنستخدمها ترجع الايرورز فى البرودكشن
export const sendErrorProd = (err , res) => {
    if(err.isOperational){
        res.status(err.statusCode).json({
            status: err.status,
            message: err.message
        })
    }else{
        console.error('ERROR', err);
        res.status(500).json({
            status: 'error',
            message: 'Something went very wrong! Please Try Again Later.'
        })
    }
}
// الفانكشن الاصلية اللى هنستخدمها فى الملف الاصلى
export const globalErrorHandler = (err , req , res , next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    if (process.env.NODE_ENV === 'development') {
        sendErrorDev(err, res);
    }

    if(process.env.NODE_ENV === 'production'){
        let error = {...err};
        error.message = err.message;
        error.name = err.name;
        error.code = err.code;

        if (error.name === 'CastError') error = handleCastErrorDB(error);
        if (error.code === 11000) error = handleDuplicateFieldsDB(error);
        if (error.name === 'ValidationError') error = handleValidationErrorDB(error);
        if (error.name === 'JsonWebTokenError') error = handleJWTError();
        if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();

        sendErrorProd(error , res);
    }
}