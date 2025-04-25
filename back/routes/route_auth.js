const express = require("express");
const router = express.Router();
const ctrl_auth = require("../controllers/ctrl_auth");
const auth = require("../middlewares/auth");
const { uploadAvatar } = require("../middlewares/multer-config");

router.get("/", auth, ctrl_auth.getUsers);
router.get("/getMyId", auth, ctrl_auth.getMyId);
router.get("/isUserConnected", auth, ctrl_auth.isUserConnected);
router.get("/getMyProfil", auth, ctrl_auth.getMyProfil);
router.get("/isAdmin", auth, ctrl_auth.isAdmin);
router.get("/getProfilById/:userId", auth, ctrl_auth.getProfilById);
router.post("/signUp", uploadAvatar, ctrl_auth.signUp);
router.post("/logIn", uploadAvatar, ctrl_auth.logIn);
router.put('/updateProfil', auth, uploadAvatar, ctrl_auth.updateProfil);
router.delete("/shutDown", auth, ctrl_auth.shutDown);

module.exports = router;