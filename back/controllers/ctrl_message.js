const pool = require("../connection/sqlConnection");

exports.getMessages = async (req, res, next) => {
    try {
        const senderId = String(req.params.senderId).trim();
        const receiverId = String(req.params.receiverId).trim();

 const query = `
    SELECT 
        m.*, 
        sender.name AS sender_name, 
        sender.img_url AS sender_img_url, 
        receiver.name AS receiver_name, 
        receiver.img_url AS receiver_img_url
    FROM messages m
    JOIN users sender ON m.sender_id = sender._id
    JOIN users receiver ON m.receiver_id = receiver._id
    WHERE (m.sender_id = ? AND m.receiver_id = ?) 
       OR (m.sender_id = ? AND m.receiver_id = ?)
    ORDER BY m.created_at ASC;
`;

// ASC(ascendant) DESC(descendant)

       const [result] = await pool.execute(query, [senderId, receiverId, receiverId, senderId]);
        return res.status(200).json({ messages: result });

    } catch (err) {
        return res.status(400).json({ err });
    }
};


exports.sendMessage = async (req, res, next) => {
    try {
        const senderId = req.body.senderId;
        const receiverId = req.body.receiverId;
        const content = req.body.message;

        const query = `INSERT INTO messages (sender_id, receiver_id, content) VALUES (?, ?, ?)`;
        const [result] = await pool.execute(query, [senderId, receiverId, content]);
        return res.status(200).json({ msg: result })

    } catch (err) {
        return res.status(400).json({ err });
    }
};

exports.cleanMessages = async (req, res, next) => {
    console.log("-------Ctrl cleanmessages-------");
    try {
        const senderId = req.params.senderId;
        const receiverId = req.params.receiverId;

        // 1. Récupérer tous les messages dans la conversation
        const query = `
            SELECT m.id
            FROM messages m
            WHERE (m.sender_id = ? AND m.receiver_id = ?) 
               OR (m.sender_id = ? AND m.receiver_id = ?)
            ORDER BY m.created_at ASC;  -- Tri ascendant pour garder les plus anciens à la fin
        `;
        const [result] = await pool.execute(query, [senderId, receiverId, receiverId, senderId]);

        // Si la conversation a moins de 10 messages, ne rien supprimer
        if (result.length <= 10) {
            return res.status(200).json({ message: "La conversation contient moins de 10 messages, aucun nettoyage nécessaire." });
        }

        // Récupérer les IDs des messages à garder (les 10 derniers)
        const messageIdsToKeep = result.slice(-10).map(msg => msg.id);  // Garde les 10 derniers messages

        // Construire dynamiquement les placeholders pour les IDs des messages à garder
        const placeholders = messageIdsToKeep.map(() => "?").join(","); // Génère "?, ?, ?, ..." selon le nombre d'IDs

        // 2. Supprimer tous les messages sauf les 10 derniers
        const deleteQuery = `
            DELETE FROM messages
            WHERE ((sender_id = ? AND receiver_id = ?) 
               OR (sender_id = ? AND receiver_id = ?)) 
              AND id NOT IN (${placeholders});
        `;
        
        // Passer les IDs des messages à garder comme paramètres
        await pool.execute(deleteQuery, [senderId, receiverId, receiverId, senderId, ...messageIdsToKeep]);

        return res.status(200).json({ message: "Messages cleaned, only the 10 most recent are kept." });

    } catch (err) {
        return res.status(400).json({ error: err.message });
    }
};

