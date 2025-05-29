import HasOnlyRightIconHeader from "@components/headers/HasOnlyRightIconHeader";
import styles from "./editSchedule.module.scss";
import ColorBox from "@components/createSchedule/ColorBox";
import TimeBox from "@components/createSchedule/TimeBox";
import MemberBox from "@components/createSchedule/MemberBox";
import NoteBox from "@components/createSchedule/NoteBox";
import TitleBox from "@components/createSchedule/TitleBox";
import LocationBox from "@components/createSchedule/LocationBox";
import useScheduleStore from "@store/useScheduleStore";
import useLocationInfoStore from "@store/useLocationInfoStore";
import useAuthStore from "@store/useAuthStore";
import { useNavigate, useParams } from "react-router-dom";
import { usePutEditGroupSchedule } from "@api/schedule/putEditGroupSchedule";
import { format } from "date-fns";
import { usePostEditMySchedule } from "@api/schedule/putEditMySchedule";
import { useState } from "react";
import ChangeColorBox from "@components/createSchedule/ChangeColorBox";
import MiniButton from "@components/buttons/MiniButton";

const EditSchedulePage: React.FC = () => {
  const navigation = useNavigate();
  const { groupId } = useParams<{ groupId: string }>();
  const { scheduleId } = useParams<{ scheduleId: string }>();
  const { accessToken } = useAuthStore();
  const [isOpenChangeColorModal, setIsOpenChangeColorModal] = useState<boolean>(false);
  const {
    title,
    color,
    setColor,
    startDate,
    endDate,
    memo,
    participants,
    isAllDay,
    unregisteredParticipants,
  } = useScheduleStore();
  const { lng, lat, name: locationName, location: locationAddress } = useLocationInfoStore();
  const { mutate: editGroupSchedule } = usePutEditGroupSchedule(
    accessToken,
    groupId ?? "",
    scheduleId ?? "",
  );
  const { mutate: editMySchedule } = usePostEditMySchedule(accessToken, scheduleId ?? "");

  const handleEditConfirmClick = () => {
    const filteredMemberId: string[] = participants.map(
      (member: IScheduleMemberType) => member.username,
    );

    const data = {
      title: title,
      color: color,
      startDateTime: isAllDay
        ? format(startDate, "yyyy-MM-dd'T'00:00")
        : format(startDate, "yyyy-MM-dd'T'HH:mm"),
      endDateTime: isAllDay
        ? format(startDate, "yyyy-MM-dd'T'23:59")
        : format(endDate, "yyyy-MM-dd'T'HH:mm"),
      location: locationName ?? locationAddress,
      latitude: lat,
      longitude: lng,
      participants: filteredMemberId,
      memo: memo,
    };

    if (groupId === "my") {
      editMySchedule({ ...data, unregisteredParticipants: unregisteredParticipants });
    } else {
      editGroupSchedule(data);
    }
  };

  return (
    <div className={styles.Container}>
      <div className={styles.CancelButton}>
        <MiniButton color="gray" buttonText="취소" onClick={() => navigation(-1)} />
      </div>
      <HasOnlyRightIconHeader
        title="일정 수정"
        rightType="button"
        handleClick={handleEditConfirmClick}
      />
      <div className={styles.ContentContainer}>
        <TitleBox />
        <ColorBox setIsOpenChangeColorModal={setIsOpenChangeColorModal} color={color} />
        <TimeBox />
        <LocationBox lat={lat} lng={lng} name={locationName} location={locationAddress} />
        <MemberBox groupId={groupId} />
        <NoteBox />
      </div>
      {isOpenChangeColorModal && (
        <ChangeColorBox setColor={setColor} setIsOpenChangeColorModal={setIsOpenChangeColorModal} />
      )}
    </div>
  );
};

export default EditSchedulePage;
