import { socket } from "../functions/socket";
import { HOST } from "../host";
import { getMyProfil, getProfilById, getUsers } from "../services/auth";
import { useState, useEffect } from "react";
import { getMyAlerts } from "../services/alerts";

export function useSocket() {

    const [allUsers, setAllUsers] = useState([]);

    useEffect(() => {
        init();

        if (!socket.connected) {
            socket.connect();
        }

        // socket.on('connect', async () => {
        //     console.log("✅ Connecté au serveur WebSocket avec ID :", socket.id);
        // });

        // socket.on("disconnect", () => {
        //     console.log("❌ Déconnecté du serveur WebSocket");
        // });

        socket.on('connectedUsers', (users) => {
            setAllUsers(users); // status = true/false
        });

        socket.on('alertMsg', (usersWithAlert) => {
            setAllUsers(usersWithAlert); // alerts = true/false
        });

        socket.on('clean_alert', async (usersWithAlert) => {
            setAllUsers(usersWithAlert);
        });


        return () => {
            socket.off("connect");
            socket.off("disconnect");
            socket.off("connectedUsers");
            socket.off("alertMsg");
            socket.off("clean_alert");
        };


    }, []);

    async function init() {
        const myInfo = await fetchMyUser();
        if(!myInfo) return;
        socket.emit("setUserId", myInfo._id, myInfo.email);
    }

    async function fetchMyUser() {
        const myInfoRes = await getMyProfil();
        const myInfo = myInfoRes.data.user;
        return myInfo;
    }

    return { socket, allUsers, setAllUsers };
}