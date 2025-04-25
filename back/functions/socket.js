const socketIo = require("socket.io");
const pool = require("../connection/sqlConnection");
const { sendMessage } = require("./messages");
const { createAlert, getAlerts } = require("./alert");
const { getUsersUpdated, getUsers } = require("./users");

module.exports = (server) => {
    const io = socketIo(server, {
        cors: {
            origin: `http://127.0.0.1:3000`,
            allowHeaders: ['Content-Type'],
            methods: ["GET", "POST"],
            credentials: true
        }
    });

    let users = [];

    io.on('connection', (socket) => {
        console.log(`Nouvelle connection: ${socket.id}`);

        socket.on('setUserId', async (userId, userEmail) => {
            const includeUser = users.some((user) => user.userId === userId);
            if (!includeUser) users.push({ email: userEmail, userId: userId, socketId: socket.id });
            console.log(`Utilisateur ${userEmail} ${userId} associé à socket.id ${socket.id}`);

            // Revoie le la nouvelle liste de users à tous les 'connectedUsers'
            const usersWithStatus = await addStatus(users);
            io.emit('connectedUsers', usersWithStatus);

            // Si le user est un receiver dans une des alerts ou +, alors lui envoie une liste avec status et des alert true sur les sender des alerts où il est receiver
            const alerts = await getAlerts(userId);
            // alert (celui qui recoit l'alert = receiver_id);
            //usersWithStatus // _id;
            const usersWithStatusAndAlerts = usersWithStatus.map((user) => {
                const isUser = alerts.some((cell) => cell.sender_id === user._id);
                user.alert = isUser ? true : false;
                return user;
            });
            const userConcerned = users.find((user) => user.userId === userId);
            io.to(userConcerned.socketId).emit("alertMsg", (usersWithStatusAndAlerts));
            //console.log(usersWithStatusAndAlerts);
            //  io.to(userConcerned.socketId).emit("clean_alert", (users));
        });

        socket.on('joinRoom', async ({ sender, receiver }) => {
            const roomName = getChatRoomName(sender, receiver);
            socket.join(roomName);
            console.log(`La room ${roomName} a été créé`);
            const alerts = await getAlerts(sender);

            const alertSearched = alerts.find((alert) => (alert.receiver_id === sender) && alert.sender_id === receiver);
            if (alertSearched) {
                try{
                await pool.execute(`DELETE FROM alert WHERE id = ?`, [alertSearched.id]);
                }catch(err){
                    console.log(`Problème avec la suppression de l'alert : ${err}`);
                }
                const alerts = await getAlerts(sender);
                const usersWithStatus = await addStatus(users);
                const usersWithStatusAndAlerts = usersWithStatus.map((user) => {
                    const isUser = alerts.some((cell) => cell.sender_id === user._id);
                    user.alert = isUser ? true : false;
                    return user;
                });
                const userConcerned = users.find((user) => user.userId === sender);
                io.to(userConcerned.socketId).emit("clean_alert", (usersWithStatusAndAlerts));
            }
        });

        socket.on('sendMessage', async ({ sender, receiver, msg }) => {
            try {
                await sendMessage(sender, receiver, msg);
                const roomName = getChatRoomName(sender, receiver);
                io.to(roomName).emit('receiveMessage', ({ sender, receiver, msg }));
                // creation de la req pour enregistrer une alerte
                const res = await createAlert(sender, receiver);


                const usersWithStatus = await addStatus(users);
                const alerts = await getAlerts(receiver);
                const usersWithStatusAndAlerts = usersWithStatus.map((user) => {
                    const isUser = alerts.some((cell) => cell.sender_id === user._id);
                    user.alert = isUser ? true : false;
                    return user;
                });
                const userConcerned = users.find((user) => user.userId === receiver);
                io.to(userConcerned.socketId).emit("alertMsg", (usersWithStatusAndAlerts));
            } catch (err) {
                console.error(err);
            }
        });

        socket.on('disconnect', async () => {
            const user = users.find((user) => user.socketId === socket.id);
            if (user) {
                console.log(`User ${user.email} déconnecté`);
                users = users.filter(user => user.socketId !== socket.id);

                const usersWithStatus = await addStatus(users);
                io.emit('connectedUsers', usersWithStatus);
            }
        });

        function getChatRoomName(userId1, userId2) {
            return `chat-${[userId1, userId2].sort().join('_')}`;
        }

        async function addStatus(usersConnected) {
            const allUsers = await getUsers();
            return allUsers.map((user) => {
                const isUser = usersConnected.some((cell) => cell.userId === user._id);
                user.status = isUser ? true : false;
                return user;
            });

        }

        async function addAlertAndStatus(usersConnected, alerts) {
            const usersWithStatus = await addStatus(usersConnected);
            return usersWithStatus.map((user) => {
                const isAlert = alerts.find((cell) => cell.receiver_id === user._id);
                user.alert = isAlert ? true : false;
                return user;
            })
        }

    });

    return io;

};

