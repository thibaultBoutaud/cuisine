const pool = require("../connection/sqlConnection");


async function sendMessage(senderId, receiverId, content) {
    try {
        const query = `INSERT INTO messages (sender_id, receiver_id, content) VALUES (?, ?, ?)`;
        const [result] = await pool.execute(query, [senderId, receiverId, content]);
        return result;
    } catch (err) {
        console.error(err);
    }
}

module.exports = { sendMessage };