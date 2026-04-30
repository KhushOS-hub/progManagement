import { User } from "../models/user.model.js"
import { ApiResponse } from "../utils/api.response.js"
import { ApiError } from "../utils/api.error.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { emailVerificationMailgen, forgotPasswordMailgen, sendEmail } from "../utils/mail.js"
import jwt from "jsonwebtoken"

const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId);
        if (!user) {
            throw new ApiError(404, "User not found");
        }

        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        console.log("Tokens generated successfully");

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };
    } catch (error) {
        // Log the actual error
        console.error("Token generation error:", error);
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);

        // Throw with the actual error message
        throw new ApiError(500, `Something went wrong: ${error.message}`);
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

const login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email) {
        throw new ApiError(400, "User email is required");
    }

    const user = await User.findOne({ email });

    if (!user) {
        throw new ApiError(400, "User doesn't exist");
    }

    const isPasswordValid = await user.isPasswordCorrect(password);

    if (!isPasswordValid) {
        throw new ApiError(400, "Invalid credentials");
    }

    const { accessToken, refreshToken } =
        await generateAccessAndRefreshTokens(user._id);

    const loggedInUser = await User.findById(user._id)
        .select("-password -refreshToken -emailVerificationToken -emailExpiryToken");

    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
    };

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser,
                    accessToken,
                    refreshToken,
                },
                "User logged in successfully"
            )
        );
});

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: ""
            },

        },

        {
            returnDocument: "after"
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(
            new ApiResponse(200, {}, "User logged out")
        )

})

const currentUser = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(
            new ApiResponse(200,
                req.user,
                "User sucessfully fetched"
            )
        )
})

const emailVerify = asyncHandler(async (req, res) => {
    const { verificationToken } = req.params
    if (!verificationToken) throw new ApiError(400, "Email Verification Token Missing");

    let hashedToken = crypto
        .createHash("sha256")
        .update(verificationToken)
        .digest("hex")

    const user = await User.findOne({
        emailVerificationToken: hashedToken,
        emailVerificationExpiry: { $gt: Date.now() }
    })

    if (!user) throw new ApiError(404, "Token is Invalid or expired");

    user.emailVerificationToken = undefined
    user.emailVerificationExpiry = undefined

    user.isEmailVerified = true
    await user.save({ validateBeforeSave: false })

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { isEmailVerified: true },
                "Email is verified"
            )
        )
})

const resendEmailVerification = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user?._id)

    if (!user) throw new ApiError(404, "User doesn't exist");

    if (user.isEmailVerified) throw new ApiError(409, "Email is already verified");

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

    return res.status(200).json(new ApiResponse(200, {}, "Mail has been sent to your email id"))
})

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.body.refreshToken || req.cookie.refreshToken

    if (!incomingRefreshToken) throw new ApiError(401, "Unauthorized Access");

    try {
        const decodedRefreshToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
        const user = await User.findById(decodedRefreshToken?._id)

        if (!user) throw new ApiError(401, "Invalid Request");

        if (incomingRefreshToken !== user?.refreshToken) throw new ApiError(401, "Expired refresh token");

        const options = {
            httpOnly: true,
            secure: true
        }

        const { accessToken, refreshToken: newRefreshToken } = await generateAccessAndRefreshTokens(user._id)
        user.refreshToken = newRefreshToken

        await user.save()

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    {
                        accessToken,
                        refreshToken: newRefreshToken
                    },
                    "Access token generated successfully"
                )
            );
    } catch (error) {
        throw new ApiError(401, "Invalid Refresh Token");

    }


})

const forgotPasswordController = asyncHandler (async (req, res) => {
    const {email} = req.body
    const user = await User.findOne({email})

    if(!user) throw new ApiError(409, "User doesn't exist");

    const {unhashedToken, hashedToken, tokenExpiry} = user.generateTemporaryToken()

    user.forgotPasswordToken = hashedToken
    user.forgotPasswordExpiry = tokenExpiry

    await user.save({validateBeforeSave: false})

     await sendEmail({
        email: user?.email,
        subject: "Password reset request ",
        mailgenContent: forgotPasswordMailgen(
            user.username,
            `${process.env.FORGOT_PASSWORD_REDIRECT_URL}/${unhashedToken}`
        )
    })

    return res
        .status(200)
        .json(
            new ApiResponse(
                200, 
                {},
                "Password reset email has been sent"
            )
        )
    
})

const resetPasswordController = asyncHandler (async (req, res) => {
    const {resetToken} = req.body
    const {newPassword} = req.params

    let hashedToken = crypto
        .createHash("sha256")
        update(resetToken)
        .digest("hex")

    await User.findOne({
        forgotPasswordToken: hashedToken,
        forgotPasswordExpiry: {$gt: Date.now()}
    })

    if(!user) throw new ApiError(489, "Token is invalid or expired");

    user.forgotPasswordExpiry = undefined
    user.forgotPasswordToken = undefined

    user.password = newPassword

    await user.save({validateBeforeSave: false})
    
    return res 
        .status(200)
        .json(
            new ApiResponse(200,
                {},
                "Password reset successfully"
            )
        )
})

const changePassword = asyncHandler(async (req, res) => {
    const {oldPassword, newPassword} = req.body

    const user = await User.findById(req.user?._id)

    const isPasswordValid = await user.isPasswordCorrect(oldPassword)

    if(!isPasswordValid) throw new ApiError(400, "Invalid Password");

    user.password = newPassword
    await user.save({validateBeforeSave: false})

    return res
        .status(200)
        .json(
            new ApiResponse(200,
                {},
                "Password changed successfully"
            )
        )
    
})
export { 
    registerUser,
    login, 
    logoutUser, 
    currentUser, 
    emailVerify, 
    resendEmailVerification, 
    refreshAccessToken,
    forgotPasswordController,
    resetPasswordController,
    changePassword    
}