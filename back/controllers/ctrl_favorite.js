const pool = require("../connection/sqlConnection");

exports.getFavorite = async (req, res, next) => {

    try {
        // Récupération de l'auth
        const userId = req.auth.userId;

        // Récupération des favoris
        const query = 'SELECT recipes.* FROM favorites JOIN recipes ON favorites.recipe_id = recipes._id WHERE favorites.user_id = ?';
        const [favorites] = await pool.execute(query, [userId]);

        return res.status(200).json({ favorites: favorites })

    } catch (err) {
        return res.status(500).json({ err });
    }
};

exports.toogleFavorites = async (req, res, next) => {
    try {
        // Récupération de l'auth
        const userId = req.auth.userId;

        // Récupération de la recetteId
        const recipe_id = req.params.recipeId;

        // Vérification de l'existance du favoris
        const [isFavorites] = await pool.execute('SELECT * from favorites WHERE recipe_id = ? AND user_id = ?', [recipe_id, userId]);

        if (isFavorites.length <= 0) {
            // creation
            const query = 'INSERT INTO favorites (user_id, recipe_id) VALUES (?, ?)';
            await pool.execute(query, [userId, recipe_id]);

            return res.status(201).json({ msg: "favorite created" })
        } else {
            const query = 'DELETE FROM favorites WHERE user_id = ? AND recipe_id = ?';
            await pool.execute(query, [userId, recipe_id]);
            return res.status(201).json({ msg: "favorite deleted" })
        }

        // Création du favoris
        const query = 'INSERT INTO favorites (user_id, recipe_id) VALUES (?, ?)';
        await pool.execute(query, [userId, recipe_id]);

        return res.status(201).json({ msg: "favorite created" })
    } catch (err) {
        return res.status(500).json({ err });
    }
};


exports.deleteFavorite = async (req, res, next) => {
    try {
        // Récupération de l'auth
        const user_id = req.auth.userId;

        // Récupération de la recette
        const recipe_id = req.params.recipeId;

        // Création du favoris
        const query = 'DELETE FROM favorites WHERE user_id = ? AND recipe_id = ?';
        await pool.execute(query, [user_id, recipe_id]);

        return res.status(201).json({ msg: "favorite deleted" })
    } catch (err) {
        return res.status(500).json({ err });
    }
};

exports.getFavByUserId = async (req, res, next) => {
    try {
        const userId = req.params.userId;

        const [result] = await pool.execute(`
            SELECT COUNT(*) AS total_favorites
            FROM favorites f
            INNER JOIN recipes r ON f.recipe_id = r._id
            WHERE r.user_id = ?
        `, [userId]);

        return res.status(200).json({ totalFav: result[0].total_favorites });

    } catch (err) {
        res.status(400).json({ err });
    }
};
