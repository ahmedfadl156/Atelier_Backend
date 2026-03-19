import mongoose from "mongoose"
import bcrypt from "bcryptjs";
import crypto from "node:crypto"

const userSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: ['true', 'First name is required'],
        trim: true,
    },
    lastName: {
        type: String,
        required: ['true', 'Last name is required'],
        trim: true,
    },
    email: {
        type: String,
        required: ['true', 'Email is required'],
        unique: true,
        trim: true,
        lowercase: true,
        index: true,
    },
    password: {
        type: String,
        required: ['true', 'Password is required'],
        minlength: [8, 'Password must be at least 8 characters long'],
        select: false, 
    },
    role:{
        type: String,
        enum: ['user', 'admin'],
        default: 'user',
    },
    atelierPoints: {
        type: Number,
        default: 0,
    },
    tier: {
        type: String,
        enum: ['Member', 'Silver', 'Gold' , 'Elite Tier'],
        default: 'Member',
    },
    address: {
        street: { type: String, trim: true },
        city: { type: String, trim: true },
        state: { type: String, trim: true },
        zipCode: { type: String, trim: true },
        country: { type: String, trim: true },
    },
    wishlist: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
        }
    ],
    isVerified: {
        type: Boolean,
        default: false
    },
    lastLogin: {
        type: Date,
        default: Date.now
    },
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    verificationToken: String,
    verificationTokenExpires: Date,
}, { timestamps: true });   

// ميدلوير عشان نعمل هاش للباسورد قبل ما نعمل سيف لليوزر
userSchema.pre('save' , async function(){
    if(!this.isModified("password")) return;
    this.password = await bcrypt.hash(this.password , 12);
})

// هنا بنقوله اما اليوزر يعدل الباسورد هنا يعدل الوقت اللى اتغير فيه الباسورد
userSchema.pre('save' , async function(){
    if(!this.isModified('password') || this.isNew) return;
    this.passwordChangedAt = Date.now() - 1000;
})

// ميثود بتتأكد ان الباسورد صح
userSchema.methods.correctPassword = async function(candidatePassword , userPassword){
    return await bcrypt.compare(candidatePassword , userPassword)
}

// ميثود علشان نعمل توكن لما اليوزر ينسى الباسورد
userSchema.methods.createPasswordResetToken = function(){
    const resetToken = crypto.randomBytes(32).toString('hex');

    this.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

    return resetToken;
}

// ميثود هنتأكد فيها الباسورد اتغير قبل ما التوكن يتعمل ولا لا
userSchema.methods.changedPasswordAfter = function(JwtTimestamp) {
    if(this.passwordChangedAt){
        const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000 , 10);
        return JwtTimestamp < changedTimestamp
    }
}

const User = mongoose.model('User', userSchema);
export default User;