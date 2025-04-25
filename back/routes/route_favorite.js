const express = require("express");
const router = express.Router();
const ctrl_favorite = require("../controllers/ctrl_favorite");
const auth = require("../middlewares/auth");

router.get("/", auth, ctrl_favorite.getFavorite);
router.get("/getFavByUserId/:userId", ctrl_favorite.getFavByUserId);
router.post("/:recipeId", auth, ctrl_favorite.toogleFavorites);
router.delete("/:recipeId", auth, ctrl_favorite.deleteFavorite);

module.exports = router;