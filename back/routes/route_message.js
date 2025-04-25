const express = require("express");
const router = express.Router();
const ctrl_message = require("../controllers/ctrl_message");
const auth = require("../middlewares/auth");

router.get("/:senderId/:receiverId", auth, ctrl_message.getMessages);
router.post("/", auth, ctrl_message.sendMessage);
router.delete("/:senderId/:receiverId", auth, ctrl_message.cleanMessages);

module.exports = router;