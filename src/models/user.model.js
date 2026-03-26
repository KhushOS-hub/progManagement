import mongoose from "mongoose";
import bcrypt from "bcrypt";

const userSchema = new Schema(
    {
        avatar: {
            type: {
                url: String,
                localPath: String
            },
            default: {
                url: `https://palcehold.co/200x200`,
                localPath:""
            }
        },
        username: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true
        },
        email:{
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },
        fullName:{
            typw: String,
            trim: true
        },
        password:{
            type: String,
            required: [true, "Password is required"]
        },
        isEmaimVerified:{
            type: Boolean,
            default: false
        },
        refreshToken:{
            type: String
        },
        forgotPasswordToken:{
            type: String
        },
        forgotPasswordExpiry:{
            type: Date
        },
        emailVerificationToken:{
            type: String
        },
        emailVerificationExpiry:{
            type: Date
        }
}, {
    timestamps: true,
}
)

userSchema.pre("save", async function (next) {
    if(!this.isModified("password")) return next()
        
    this.password = await bcrypt.hash(this.password, 10)
    next()    
})

userSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password)
}

userSchema.methods.generateAccessToken = function () {
    return jwt.sign({
            _id: this._id,
            email: this.email,
            uesername: this.username
        },
        process.env.ACCESS_TOKEN_SECRET,
        {expiresIn: process.env.ACCESS_TOKEN_EXPIRY}
    )   
}

userSchema.methods.generateRefreshToken = function () {
    return jwt.sign({
        _id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {expiresIn: process.env.REFRESH_TOKEN_EXPIRY}
)
}

export const user = mongoose.model("User", userSchema)