import ArrowIcon from "@assets/Icons/arrow/RightArrow.svg?react";
import PinnedIcon from "@assets/Icons/chatt/pinned.svg?react";
import React, { useEffect, useState } from "react";
import styles from "./chatItem.module.scss";
import { useNavigate } from "react-router-dom";
import { isSameDay } from "date-fns";

interface ChatItemProps {
  chatRoom: IChatRoomResponseType;
}

const ChatItem: React.FC<ChatItemProps> = ({ chatRoom }) => {
  const navigate = useNavigate();
  const [isToday, setIsToday] = useState<boolean>(true);

  useEffect(() => {
    if (!chatRoom?.lastChatDate) return;

    const chatDate = new Date(chatRoom.lastChatDate);
    const today = new Date();

    const isToday = isSameDay(chatDate, today);
    setIsToday(isToday);
  }, [chatRoom.lastChatDate]);

  const handleChatRoomClick = () => {
    navigate(`/group/${chatRoom.groupId}/chatting`);
  };

  return (
    <div className={styles.chatItem} onClick={handleChatRoomClick}>
      <img
        src={chatRoom.groupImageUrl}
        alt={`${chatRoom.groupName} 프로필`}
        className={styles.profileImage}
      />
      <div className={styles.chatContentWrapper}>
        <div className={styles.chatContent}>
          <div className={styles.groupName}>
            {chatRoom.groupName}
            {chatRoom.isPin && <PinnedIcon className={styles.pinnedIcon} />}
          </div>
          <div className={styles.lastMessage}>
            {chatRoom.lastChat.includes(
              "https://planu-storage-main.s3.ap-northeast-2.amazonaws.com",
            )
              ? "사진을 보냈습니다."
              : chatRoom.lastChat}
          </div>
        </div>
        <div className={styles.timeInfo}>
          <div className={styles.topBox}>
            <span className={styles.time}>
              {isToday ? chatRoom.lastChatTime : chatRoom.lastChatDate}
            </span>
            <ArrowIcon className={styles.arrowIcon} />
          </div>
          {chatRoom.unreadChats > 0 ? (
            <div className={styles.unreadChats}>{chatRoom.unreadChats}</div>
          ) : (
            <div></div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatItem;
