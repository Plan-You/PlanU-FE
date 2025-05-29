import { useGetGroupMemberList } from "@api/group/getGroupMemberList";
import styles from "./participants.module.scss";
import Icon_uncheckbox from "@assets/Icons/checkbox/Icon_blankBox.svg?react";
import Icon_checkbox from "@assets/Icons/checkbox/Icon_checkBox_purple.svg?react";
import useScheduleStore from "@store/useScheduleStore";
import useAuthStore from "@store/useAuthStore";
import { useGetFriendList } from "@api/friend/getFriendList";
import { useEffect, useState } from "react";

interface props {
  creator?: string;
  groupId: string;
}

const ParticipantsPicker: React.FC<props> = ({ creator, groupId }) => {
  const { accessToken } = useAuthStore();
  const { data: groupMemberList } = useGetGroupMemberList(accessToken, groupId);
  const { data: friendList } = useGetFriendList(accessToken, groupId === "my" ? "친구목록" : "");
  const [members, setMembers] = useState<IScheduleMemberType[]>([]);
  const { participants, setParticipants } = useScheduleStore();

  useEffect(() => {
    if (groupId === "my" && friendList) {
      const filteredMembersInfo = friendList.friends.map((friend) => ({
        name: friend.name,
        username: friend.username,
        profileImage: friend.profileImageUrl,
      }));
      setMembers(filteredMembersInfo);
    } else if (groupId !== "my" && groupMemberList) {

      const filteredMembersInfo = groupMemberList.members.map((member) => ({
        name: member.name,
        username: member.username,
        profileImage: member.profileImage,
      }));
      setMembers(filteredMembersInfo);
    }
  }, [groupId]);

  const handleAddParticipants = (member: IScheduleMemberType) => {
    if (member.username === creator) return;
    else if (participants.some((p) => p.username === member.username)) {
      setParticipants(participants.filter((p) => p.username !== member.username));
    } else {
      setParticipants([...participants, member]);
    }
  };

  return (
    <div className={styles.Container}>
      {members.map((member, index) => {
        const isSelected = participants.some((m) => m.username === member.username);
        return (
          <div key={index} className={styles.ItemBox}>
            <div className={styles.Checkbox} onClick={() => handleAddParticipants(member)}>
              {isSelected ? <Icon_checkbox /> : <Icon_uncheckbox />}
            </div>
            <img className={styles.ProfileImg} src={member.profileImage} />
            <p>{member.name}</p>
          </div>
        );
      })}
    </div>
  );
};

export default ParticipantsPicker;
