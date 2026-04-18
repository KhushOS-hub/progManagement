import { User } from "../models/user.model.js";
import { ApiError } from "../utils/api.error.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken"

const verifyJWT = asyncHandler(async (req, res, next) => {

    const Token = req.cookies?.accessToken || req.header("Authorization")

    if (!Token) throw new ApiError(401, "Unauthorized access")

    try {
        const decodedToken = jwt.verify(Token, process.env.ACCESS_TOKEN_SECRET)
        const user = await User.findById(decodedToken?._id)
            .select("-password -refreshToken -emailVerificationToken -emailExpiryToken")

        if(!user) throw new ApiError(401, "Invalid access token")
        
        req.user = user
        next()
    } catch (error) {
        throw new ApiError(401, "Invalid access token")
    }

})

export { verifyJWT }