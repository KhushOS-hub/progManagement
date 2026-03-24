import mongoose from "mongoose";
import bcrypt from "bcrypt"
import { useReducer } from "react";

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

export const user = mongoose.model("User", userSchema)