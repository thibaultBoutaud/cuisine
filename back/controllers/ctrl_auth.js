require("dotenv").config();
const pool = require("../connection/sqlConnection");
const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const fs = require('fs').promises;


exports.signUp = async (req, res, next) => {
    try {
        const magicWord = req.body.magicWord;
        if (!magicWord || magicWord !== process.env.MAGIC_WORD) {
            return res.status(400).json({ msg: "Invalid magic word" })
        }

        // Vérification des champs
        if (!req.body.name || !req.body.email || !req.body.password) return res.status(400).json({ msg: "All fields are required" });

        // Validation de l'email avec regex
        const emailRegex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;
        if (!emailRegex.test(req.body.email)) {
            return res.status(400).json({ msg: "Invalid email format" });
        }

        // Attendre que le hash du mot de passe soit généré
        const hash = await bcrypt.hash(req.body.password, 10);

        // Créer un nouvel utilisateur
        const user = {
            _id: uuidv4(),
            name: req.body.name,
            email: req.body.email,
            password: hash,
            img_url: req.file ? req.file.filename : "default_avatar_profile.png"
        };

        const [existingUser] = await pool.execute('SELECT * FROM users WHERE email = ?', [req.body.email]);
        if (existingUser.length > 0) {
            return res.status(400).json({ msg: "Email is already taken" });
        }

        // Insérer l'utilisateur dans la base de données
        const [results] = await pool.execute('INSERT INTO users (_id, name, email, password, img_url) VALUES (?,?,?,?,?)', [user._id, user.name, user.email, user.password, user.img_url]);

        // Répondre avec un message de succès
        return res.status(201).json({ msg: "user created", id: results.insertId });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ msg: "Internal server error" });
    }
};

exports.logIn = async (req, res, next) => {
    const { email, password } = req.body;
    // Vérification des champs
    if (!email || !password) return res.status(400).json({ msg: "All fields are required" });

    // Vérification du format mail
    const emailRegex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ msg: "Invalid email format" });
    }

    // Vérification de l'existance du mail
    const [user] = await pool.execute('SELECT * FROM users WHERE email=?', [email]);
    if (!user[0] || !user[0].email) return res.status(400).json({ msg: "Non existant email" });

    // Vérification du mdp
    const isPassword = await bcrypt.compare(password, user[0].password);
    if (!isPassword) return res.status(400).json({ msg: "Password invalid" });

    // Modification de la table user pour indique que l'utilisateur est connecté:
    await pool.execute('UPDATE users SET isConnected = ? WHERE _id = ?', [1, user[0]._id]);

    const token = jwt.sign(
        { userId: user[0]._id, isAdmin: user[0]._isAdmin },
        `${process.env._SECRET_KEY}`,
        { expiresIn: "24h" }
    );

    const isProduction = process.env.NODE_ENV === 'production';
    // Envoie du token dans un cookie sécurisé HttpOnly  
    res.cookie('authToken', token, {
        httpOnly: true, // Le cookie ne peut pas être accédé par JavaScript
        secure: isProduction,   // Le cookie est envoyé uniquement sur HTTPS  // pendant la production => secure: 'production' // en ligne: secure: true
        maxAge: 24 * 60 * 60 * 1000, // Durée de vie du cookie (24h)
        sameSite: 'None', // Protection contre les attaques CSRF   // sameSite: 'Strict' 
        partitioned: true,
        path: "/"
    });

    res.status(200).json({ msg: "Connection sucessful" });
};


exports.isAdmin = async (req, res, next) => {
    return res.json({ isAdmin: req.auth.isAdmin });
};

exports.isUserConnected = async (req, res, next) => {
    if (req.auth.userId) return res.json({ isUser: true });
};

exports.shutDown = async (req, res, next) => {
    try {
        console.log("shut down");

        // modification de la table user pour indiquer déconnecté
        await pool.execute('UPDATE users SET isConnected = ? WHERE _id = ?', [0, req.auth.userId]);

        res.clearCookie('authToken', {
            httpOnly: true,
            secure: true,
            sameSite: 'None',
            path: '/'
        });
        return res.status(200).json({ msg: "Session destroyed" });
    } catch (err) {
        return res.status(400).json({ err });
    }
};

exports.getMyProfil = async (req, res, next) => {
    try {
        const query = 'SELECT u._id, u.name, u.img_url, u.isConnected, u.date_inscription, u.email, u.description FROM users u WHERE u._id = ?';
        const [user] = await pool.execute(query, [req.auth.userId]);

        return res.status(200).json({ user: user[0] });
    } catch (err) {
        return res.status(400).json({ err });
    }
};

exports.getProfilById = async (req, res, next) => {
    try {
        const userId = req.params.userId;
        const myUserId = req.auth.userId;

        let query = '';
        if (userId === myUserId) query = 'SELECT u.name, u.img_url, u.isConnected, u.date_inscription, u.email, u.description FROM users u WHERE u._id = ?';
        if (userId !== myUserId) query = 'SELECT u.name, u.img_url, u.isConnected, u.date_inscription, u.description FROM users u WHERE u._id = ?';
        const [user] = await pool.execute(query, [userId]);

        return res.status(200).json({ user: user[0] });
    } catch (err) {
        return res.status(400).json({ err });
    }
};

exports.getUsers = async (req, res, next) => {
    try {
        const query = 'SELECT u.name, u.img_url, u._id FROM users u';
        const [users] = await pool.execute(query);
        return res.status(200).json({ users: users });
    } catch (err) {
        return res.status(400).json({ err });
    }
};

exports.getMyId = async (req, res, next) => {
    try {
        const userId = req.auth.userId;
        return res.status(200).json({ userId: userId });
    } catch (err) {
        return res.status(400).json({ err });
    }
};


exports.updateProfil = async (req, res, next) => {
    try {
        const userId = req.auth.userId;

        const { name, email, password, description } = req.body;
        // verifier si l'email est déjà pris ou si c'est le votre
        const userData = {};
        if (name && name.trim() !== "") userData.name = name;
        if (email) userData.email = email;
        if (password) userData.password = await bcrypt.hash(password, 10);
        if (description) userData.description = description;
        if (req.file) userData.img_url = req.file.filename;

        const [previous_img_url] = await pool.execute(`SELECT u.img_url FROM users u WHERE u._id = ?`, [userId]);
        if (req.file && (previous_img_url[0].img_url !== 'default_avatar_profile.png')) await fs.unlink(`uploads/pictures/avatars/${previous_img_url[0].img_url}`);

        const keys = Object.keys(userData);
        const values = Object.values(userData);
        values.push(userId);

        const placeholder = keys.map((key) => `${key} = ?`).join(", ");
        const query = `UPDATE users SET ${placeholder} WHERE _id = ?`;
        console.log(query);
        console.log(values);
        const [response] = await pool.execute(query, values);
        return res.status(200).json({ msg: "user updated", res: response })


    } catch (err) {
        return res.status(400).json({ err });
    }
};

