import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"

const app = express()

// middleware/basic configurations
app.use(express.json({ limit: "16kb" }))
app.use(express.urlencoded({ extended: true, limit: "16kb" }))
app.use(express.static("public"))
app.use(cookieParser())
//CORS Configurations
app.use(cors({
    origin: process.env.CORS_ORIGIN?.split(",") || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Authorization", "Content-Type"]
}))

//import the routes
import healthcheckRouter from "./routes/heathcheck.route.js"
import authRouter from "./routes/auth.route.js"

app.use("/api/v1/healthcheck", healthcheckRouter)
app.use("/api/v1/auth", authRouter)

app.get("/", (req, res) => {
    res.send("Welcome to basecampy")
})

export default app