const pool = require("../connection/sqlConnection");
const { getAlerts } = require("./alert");


async function getUsersUpdated(receiverId) {
    try {
        const alerts = await getAlerts(receiverId);
        console.log("---- function getUsersUpdated-----");

        const query = `SELECT _id, name, img_url FROM users`;
        const [users] = await pool.execute(query);

        // ensuite on inclue la key alert dans les users
        const newUsers = users.map((user) => {
            if (alerts.some((cell) => cell.receiver_id === user._id)) {
                user.alert = true;
                return user;
            } else {
                user.alert = false;
                return user;
            }
        });

        return newUsers;
    } catch (err) {
        console.error(err);
    }
}

async function getUsers() {
    try {
        const [users] = await pool.execute('SELECT _id, name, img_url FROM users');
        return users;
    } catch (err) {
        return res.status(500).json({ err });
    }
}

module.exports = { getUsersUpdated, getUsers };