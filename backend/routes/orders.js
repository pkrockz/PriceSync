const express = require("express");
const router = express.Router();
const Product = require("../models/Product");
const Order = require("../models/Order");
const firebaseDB = require("../config/firebase");

//To place order
router.post("/", async (req, res) => {
  try {
    const { userId, items } = req.body;

    let total = 0;

    for (let item of items) {
      const product = await Product.findById(item.productId);

      if (!product) return res.status(404).json({ error: "Product not found" });

      if (product.stock < item.quantity)
        return res.status(400).json({ error: "Insufficient stock" });

      product.stock -= item.quantity;
      await product.save();

      //For dynamic pricing rule
      if (product.stock < 5) product.price *= 1.3;
      else if (product.stock > 5 && product.stock < 20) product.price *= 1.05;
      else if (product.stock > 20 && product.stock < 50) product.price *= 0.95;
      else if (product.stock > 50) product.price *= 0.9;

      await product.save();

      //To sync realtime
      await firebaseDB.ref(`stock/${product._id}`).set(product.stock);
      await firebaseDB.ref(`price/${product._id}`).set(Math.round(product.price));

      total += item.quantity * item.price;
    }

    const order = await Order.create({
      userId,
      items,
      totalAmount: total
    });

    await firebaseDB.ref(`orderStatus/${order._id}`).set("placed");

    res.status(201).json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
