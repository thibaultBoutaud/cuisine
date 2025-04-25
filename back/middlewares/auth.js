const jwt = require("jsonwebtoken");
require("dotenv").config();
const pool = require("../connection/sqlConnection");

module.exports = async (req, res, next) => {

    try {
        const token = req.cookies.authToken;
        if (!token) {
            return res.status(401).json({ message: "Non autorisé" });
        }

        const decodedToken = jwt.verify(token, process.env._SECRET_KEY);
        const userId = decodedToken.userId;
        const isAdmin = decodedToken.isAdmin;

        req.auth = {
            userId: userId,
            isAdmin: isAdmin
        }

        next();

    } catch (err) {
        res.clearCookie('authToken', {
            httpOnly: true,
            secure: true,
            sameSite: 'None',
            path: '/' // supprimer le cookie pour TOUS les chemins
        });

        // modification de la table user pour indiquer déconnecté
        await pool.execute('UPDATE users SET isConnected = ? WHERE _id = ?', [0, req.auth.userId]);

        res.status(401).json({ msg: "Authentification impossible", error: err })
    }
};