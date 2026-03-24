import mongoose from "mongoose";

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

export const user = mongoose.model("User", userSchema)