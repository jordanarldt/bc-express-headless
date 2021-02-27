const express = require("express");
const router = express.Router();

const dataController = require("../controllers/storedata");
const userController = require("../controllers/auth");
const cartController = require("../controllers/cart");

router.post("/api/getsku", dataController.getDataFromAttributes);
router.post("/api/login", userController.userLogin);
//router.post("/api/register", userController.registerUser);
router.post("/api/cart", cartController.addProductToCart);
router.post("/api/cart/update", cartController.updateCartItem);

module.exports = router;