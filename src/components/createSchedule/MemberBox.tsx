import React, { useEffect, useState } from "react";
import styles from "./Inputs.module.scss";
import ParticipantsPicker from "./ParticipantsPicker";
import useScheduleStore from "@store/useScheduleStore";
import { useGetGroupMemberList } from "@api/group/getGroupMemberList";
import useAuthStore from "@store/useAuthStore";
import { useGetUserInfo } from "@api/user/getUserInfo";

interface props {
  groupId?: string;
}

const MemberBox: React.FC<props> = ({ groupId = "" }) => {
  const [isSelecting, setIsSelecting] = useState<boolean>(false);
  const { participants, setParticipants } = useScheduleStore();
  const { accessToken } = useAuthStore();
  const { data: groupMemberList } = useGetGroupMemberList(accessToken, groupId);
  const { data: userInfoData } = useGetUserInfo(accessToken);

  useEffect(() => {
    if (!userInfoData || !groupMemberList) return;

    const creator = groupMemberList.members.find(
      (member) => member.username === userInfoData.username,
    );

    const alreadyExists = participants.some((p) => p.username === creator?.username);

    if (creator && !alreadyExists) {
      setParticipants([
        ...participants,
        {
          name: creator.name,
          username: creator.username,
          profileImage: creator.profileImage,
        },
      ]);
    }
  }, [userInfoData, groupMemberList]);

  return (
    <div>
      <input
        className={styles.Input}
        onClick={() => {
          setIsSelecting(true);
        }}
        placeholder={participants.length === 0 ? "참석자" : ""}
        value={participants.length === 0 ? "" : participants.map((p) => p.name).join(", ")}
        readOnly
      ></input>
      {isSelecting && (
        <div className={styles.isSelecting}>
          <ParticipantsPicker
            groupId={groupId}
            creator={groupId === "my" ? "" : participants[0].username}
          />
          <div className={styles.Done} onClick={() => setIsSelecting(false)}>
            확인
          </div>
        </div>
      )}
    </div>
  );
};

export default MemberBox;
