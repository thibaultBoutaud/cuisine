import { useState, useEffect } from "react";
import { ChatBase } from "./ChatBase";
import { ChatRoom } from "./ChatRoom";
import { ChatList } from "./ChatList";
import { useSocket } from "../../../hooks/useSocket";
import { getMyProfil, getUsers } from "../../../services/auth";
import { getMessages, cleanMessages } from "../../../services/messages";

export function ChatMenu() {

  const { socket, allUsers, setAllUsers } = useSocket();
  const [myUser, setMyUser] = useState();
  const [chatMode, setChatMode] = useState(true);
  const [roomTargetUserId, setRoomTargetUserId] = useState("");
  const [receiverUser, setReceiverUser] = useState();
  const [historyChat, setHistoryChat] = useState([]);
  const [message, setMessage] = useState("");

  
  useEffect(() => { 
    init();
  }, []);

  useEffect(()=>{
    // console.log("--- cheching all users");
    // console.log(allUsers);
  },[allUsers]);

  useEffect(() => {
    if (myUser && roomTargetUserId !== "") {
      socket.emit("joinRoom", ({ sender: myUser._id, receiver: roomTargetUserId }));

      doIt(myUser._id, roomTargetUserId);
      async function doIt(sender, receiver) {
        await cleanMessages(sender, receiver);
        await majMessageHistory(sender, receiver);
      }
      getReceiver();
    }
  }, [roomTargetUserId]);

  useEffect(() => {
    if (socket && myUser && roomTargetUserId && message) {
      sendMessage(myUser._id, roomTargetUserId, message);
    }
  }, [message]);

  useEffect(() => {
    socket.on('receiveMessage', async ({ sender, receiver, msg }) => {
      await majMessageHistory(sender, receiver);
    })
  }, []);

  async function getReceiver() {
    const receiverUser = allUsers.find((user) => user._id === roomTargetUserId);
    setReceiverUser(receiverUser);
  }


  async function sendMessage(sender, receiver, message) {
    socket.emit("sendMessage", ({ sender: sender, receiver: receiver, msg: message }));
  }

  async function majMessageHistory(sender, receiver) {
    const res = await getMessages(sender, receiver);
    const messages = res.data.messages;
    const updateMessages = updateDate(messages);
    setHistoryChat(updateMessages);
  }

  async function init() {
    await setUpMyUser();
  }

  async function setUpMyUser() {
    const myProfilRes = await getMyProfil();
    const myProfil = myProfilRes.data.user;
    setMyUser(myProfil);
  }

  function updateDate(messages) {
    for (let i = 0; i < messages.length; i++) {
      const timeStamp = messages[i].created_at;
      const date = new Date(timeStamp);
      const dateData = {
        day: date.getDay(),
        month: date.getMonth(),
        year: date.getFullYear(),
        hours: date.getHours(),
        minutes: date.getMinutes()
      }
      messages[i].dateData = dateData;
    }
    return messages;
  }


  return (
    <div className="chatMenu">
      <div className="chatMenu__content">

        {myUser && <ChatBase
          myProfil={myUser}
          chatMode={chatMode}
          onUpdateChatMode={setChatMode}
        />
        }

        {allUsers && !chatMode && (<ChatList users={allUsers} onUpdateUserId={setRoomTargetUserId} />)}

      </div>

      {roomTargetUserId !== "" && <ChatRoom
        userId={roomTargetUserId}
        onUpdateUserId={setRoomTargetUserId}
        historyChat={historyChat}
        // users={users}
        onUpdateMessage={setMessage}
        userToChat={receiverUser}
      />}

    </div>
  );
}
