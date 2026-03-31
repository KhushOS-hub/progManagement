import Mailgen from "mailgen";
import nodemailer from "nodemailer"

// Email sending method
const sendEmail = async (options) => {
    const mailGenerator = new Mailgen({
        theme: "default",
        product: {
            name: "Task Manager",
            link: "https://taskmanagelink.com"
        }
    })

    const textualMail = mailGenerator.generatePlaintext(options.mailgenContent)
    const htmlMail = mailGenerator.generate(options.mailgenContent)

    const transporter = nodemailer.createTransport({
        host: process.env.MAILTRAP_SMTP_HOST,
        port: process.env.MAILTRAP_SMTP_PORT,
        auth: {
            user: process.env.MAILTRAP_SMTP_USER,
            pass: process.env.MAILTRAP_SMTP_PASS
        }
    })

    const mail = {
        from: "mail.taskmanager@example.com",
        to: options.email,
        subject: options.subject,
        text: textualMail,
        html: htmlMail
    }

    try {
        await transporter.sendMail(mail)
    } catch (error) {
        console.error("Email service failed, make sure you have provided mailtrap credentials at .env file");
        console.error("Error: ", error);
    }
}
// Email generation methods
const emailVerificationMailgen = (username, verificationURL) => {
    return {
        body: {
            name: username,
            intro: "Welcome to our App we are excited to have you on board",
            action: {
                instructions: "To veriy your account click on the following button",
                button: {
                    color: "#3894e0",
                    text: "Very Your Email",
                    link: verificationURL
                },
            },
            outro: "Need Help? Just reply to this email"
        },
    }
}



const forgotPasswordMailgen = (username, passwordReseteURL) => {
    return {
        body: {
            name: username,
            intro: "We got a request to reset the password for your account",
            action: {
                instructions: "To reset your password click on the following button",
                button: {
                    color: "#e03f3f",
                    text: "Reset Password",
                    link: passwordReseteURL
                },
            },
            outro: "If this password reset request is not requested by you, please contact us immediately by replying this message"
        },
    }
}

export { emailVerificationMailgen, forgotPasswordMailgen, sendEmail }