require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/mongo");

const app = express();
app.use(cors({
  origin: [
    "https://pricesync-eecb8.web.app",
    "https://pricesync-eecb8.firebaseapp.com"
  ],
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));
app.use(express.json());

connectDB();

app.get("/", (req, res) => {
  res.send("PriceSync backend running");
});

const productRoutes = require("./routes/products");
app.use("/products", productRoutes);

const orderRoutes = require("./routes/orders");
app.use("/orders", orderRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on port", PORT);
});