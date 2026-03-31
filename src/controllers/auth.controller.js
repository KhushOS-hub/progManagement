import { User } from "../models/user.model.js"
import { ApiResponse } from "../utils/api.response.js"
import { ApiError } from "../utils/api.error.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { emailVerificationMailgen, sendEmail } from "../utils/mail.js"

const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })
        return { accessToken, refreshToken }
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating refresh token");
    }
}
const registerUser = asyncHandler(async (req, res) => {
    const { email, username, password, role } = req.body
    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })
    if (existedUser) {
        throw new ApiError(409, "User with email or username already exist", []);
    }
    const user = await User.create({
        email,
        password,
        username,
        isEmailVerified: true
    })

    const { unhashedToken, hashedToken, tokenExpiry } = user.generateTemporaryToken()

    user.emailVerificationToken = hashedToken
    user.emailVerificationExpiry = tokenExpiry

    await user.save({ validateBeforeSave: false })

    await sendEmail({
        email: user?.email,
        subject: "Please verify your email",
        mailgenContent: emailVerificationMailgen(
            user.username,
            `${req.protocol}://${req.get("host")}/api/v1/users/verify-email/${unhashedToken}`
        )
    })

    const createdUser = await User.findById(user._id)
        .select("-password -refreshToken -emailVerificationToken -emailExpiryToken")

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user");
    }

    return res
        .status(201)
        .json(new ApiResponse(
            200,
            { user: createdUser },
            "User registered successfully and verification email has been sent on your email"))
})

export { registerUser }