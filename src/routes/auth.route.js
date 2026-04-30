import { Router } from "express";
import { 
    registerUser,
    login, 
    logoutUser, 
    currentUser, 
    emailVerify, 
    resendEmailVerification, 
    refreshAccessToken,
    forgotPasswordController,
    resetPasswordController,
    changePassword   } from "../controllers/auth.controller.js"
import { validate } from "../middlewares/validator.middleware.js";
import { 
    userRegisterValidator,
    userLoginValidator,
    userChangeCurrentPasswordValidator,
    userForgotPasswordValidator,
    userResetForgotPasswordValidator,
    createProjectValidator,
    addMembertoProjectValidator,
 } from "../validators/index.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";


const router = Router()

router.route("/register").post(userRegisterValidator(), validate,registerUser)
router.route("/login").post(userLoginValidator(), validate, login)
router.route("/forgot-password").post(userForgotPasswordValidator(), validate, forgotPasswordController);
router.route("/reset-password/:resetToken").post(userResetForgotPasswordValidator(), validate, resetPasswordController);
router.route("/verify-email/:verificationToken").get(emailVerify);
router.route("/refresh-token").post(refreshAccessToken);
//secure routes
router.route("/logout").post(verifyJWT, logoutUser)
router.route("/current-user").post(verifyJWT, currentUser);
router
  .route("/change-password")
  .post(
    verifyJWT,
    userChangeCurrentPasswordValidator(),
    validate,
    changePassword,
  );
router
  .route("/resend-email-verification")
  .post(verifyJWT, resendEmailVerification);
export default router