const pool = require("../connection/sqlConnection");


exports.getMyAlerts = async (req, res, next) => {
    console.log('-----CTRL getMyAlerts------');
    try {
        const receiverId = req.params.receiverId;
        const query = `SELECT * FROM alert WHERE receiver_id = ?`;
        const [alerts] = await pool.execute(query, [receiverId]);
        return res.status(200).json({alerts: alerts});
    } catch (err) {
        console.error("Erreur lors de la récupération des alertes:", err);
    }
};