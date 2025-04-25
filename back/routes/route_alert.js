const express = require("express");
const router = express.Router();
const ctrl_alert = require("../controllers/ctrl_alert");
const auth = require("../middlewares/auth");
const { uploadAvatar } = require("../middlewares/multer-config");

router.get("/:receiverId", auth, ctrl_alert.getMyAlerts);


module.exports = router;