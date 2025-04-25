import { HOST } from "../../../host";

export function ChatRoom({ onUpdateUserId, historyChat, onUpdateMessage, userToChat }) {

  function leaveRoom(e) {
    e.preventDefault();
    onUpdateUserId("");
  }

  function handleSubmit(e) {
    e.preventDefault();
    const msg = e.target.message.value;
    if (msg.trim() === "") return;
    // sendMessage(myId, userId, msg);
    onUpdateMessage(msg);
    e.target.reset();
  }

  return (
    <div className="chatRoom">
      <div className="chatRoom__content">
        <div className="chatRoom__content__header">
          <div className="chatRoom__content__header--profil">
            {userToChat && <img src={`${HOST}/api/images/avatars/${userToChat.img_url}`} />}
            {userToChat && <p>{userToChat.name}</p>}
          </div>
          <i className="fa-solid fa-xmark leaveRoom" onClick={leaveRoom}></i>
        </div>
        <div className="chatRoom__content__chat">
          {historyChat && historyChat.length > 0 && historyChat.map((cell, index) => (
            <div key={index}>
              <div>
                <img src={`${HOST}/api/images/avatars/${cell.sender_img_url}`} /><p>{cell.sender_name} <span className="msgDate">. {cell.dateData.hours}:{cell.dateData.minutes}</span></p>
              </div>
              <p>{cell.content}</p>
            </div>
          ))}
        </div>
        <div className="chatRoom__content__footer">
          <form onSubmit={handleSubmit}>
            <div className="chatRoom__content__footer__input">
              <input type="text" name="message" placeholder="Rédigez un message..." />
            </div>
            <div className="chatRoom__content__footer__send">
              <button type="submit">Envoyer</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
