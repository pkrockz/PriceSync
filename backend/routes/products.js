const express = require("express");
const router = express.Router();
const Product = require("../models/Product");
const firebaseDB = require("../config/firebase");

//To add a product
router.post("/", async (req, res) => {
  try {
    const product = await Product.create(req.body);

    //To Sync stock & price to firebase
    await firebaseDB.ref(`stock/${product._id}`).set(product.stock);
    await firebaseDB.ref(`price/${product._id}`).set(product.price);

    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//To get all products
router.get("/", async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id", async (req, res) => {
  const { price, stock } = req.body;
  if (price == null || stock == null) {
  return res.status(400).json({ error: "Missing fields" });}

  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ error: "Not found" });
  
  product.price = price;
  product.stock = stock;
  await product.save();

  await firebaseDB.ref(`price/${product._id}`).set(price);
  await firebaseDB.ref(`stock/${product._id}`).set(stock);

  res.json({ message: "Updated" });
});


router.delete("/:id", async (req, res) => {
  await Product.findByIdAndDelete(req.params.id);

  await firebaseDB.ref(`stock/${req.params.id}`).remove();
  await firebaseDB.ref(`price/${req.params.id}`).remove();

  res.json({ message: "Product deleted" });
});


module.exports = router;