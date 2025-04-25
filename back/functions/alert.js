const pool = require("../connection/sqlConnection");

async function createAlert(senderId, receiverId) {
    try {
        const checkQuery = `SELECT * FROM alert WHERE sender_id = ? AND receiver_id = ?`;
        const [existingAlert] = await pool.execute(checkQuery, [senderId, receiverId]);

        if (existingAlert.length > 0) {
            console.log("Cette alerte existe déjà.");
            return null;
        }

        const query = `INSERT INTO alert (sender_id, receiver_id) VALUES (?, ?)`;
        const [result] = await pool.execute(query, [senderId, receiverId]);
        return result;
    } catch (err) {
        console.error("Erreur lors de la création de l'alerte:", err);
    }
}


async function getAlerts(userId) {
    try {
        // Sélectionner uniquement les alertes pour un utilisateur donné
        const query = `SELECT * FROM alert WHERE receiver_id = ?`;
        const [result] = await pool.execute(query, [userId]);
        return result;
    } catch (err) {
        console.error("Erreur lors de la récupération des alertes:", err);
    }
}

module.exports = { createAlert, getAlerts };