import { useEffect, useRef, useState } from "react";
import styles from "./locationSharing.module.scss";
import BackArrow_Icon from "@assets/Icons/headers/backArrow2.svg?react";
import { createCustomPin, createMarker, initializeMap } from "@utils/drawMap";
import GroupMemberItem from "../components/GroupMemberItem";
import useAuthStore from "@store/useAuthStore";
import { useGetUserInfo } from "@api/user/getUserInfo";
import ArrivalPin from "@assets/images/locationSharingPage/arrivalPin.png";
import { useNavigate, useParams } from "react-router-dom";
import { useWebSocket } from "@store/webSocketProvider";
import { LocationSharingRedirect } from "../LocationSharingRedirect";
import useUserLocation from "@store/useUserLocation";
import { useGetGroupMembersLocationInfo } from "@api/location/getGroupMembersLocationInfo";
import { useGetArrivalLocationInfo } from "@api/group/getArrivalLocationInfo";
import type { IMessage } from "@stomp/stompjs";
import { calculateDistance } from "@utils/calculateDistance";

const LocationSharingPage = () => {
  const { groupId, scheduleId } = useParams<{ groupId: string; scheduleId: string }>();
  const mapRef = useRef<HTMLDivElement | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const { accessToken } = useAuthStore.getState();
  const { data: userInfo } = useGetUserInfo(accessToken);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const navigate = useNavigate();
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState<boolean>(false);
  const bottomSheetRef = useRef<HTMLDivElement | null>(null);
  const startY = useRef<number>(0);
  const { stompClient, connectWebSocket, isConnected } = useWebSocket();
  const [groupMemberList, setGroupMemberList] = useState<IMemberLocationType[]>([]);
  const userCurrentLatLng = useUserLocation();
  const [selectedUserName, setSelectedUserName] = useState<string>("");

  const prevLocationRef = useRef<{ latitude: number; longitude: number } | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: arrivalLocationInfo } = useGetArrivalLocationInfo(
    accessToken,
    groupId!,
    scheduleId!,
  );

  const { data: initialGroupMemberList } = useGetGroupMembersLocationInfo(
    accessToken,
    groupId!,
    scheduleId!,
  );

  useEffect(() => {
    if (initialGroupMemberList && groupMemberList.length === 0) {
      setGroupMemberList(initialGroupMemberList.groupMemberLocations);
    }
  }, [initialGroupMemberList, groupMemberList]);

  // 그룹 멤버들의 위치와 도착장소를 핀으로 보여줌
  // 처음 맵의 중심은 자신의 현재 위치로 지정
  useEffect(() => {
    const initMap = async () => {
      if (!userInfo || !mapRef.current || !arrivalLocationInfo) {
        return;
      }

      const userLocation = groupMemberList.find((member) => member.username === userInfo.username);

      if (!userLocation) {
        console.error("User not found in group member list");
        return;
      }

      try {
        const newMap = await initializeMap(
          mapRef.current,
          { lat: userLocation.latitude, lng: userLocation.longitude },
          import.meta.env.VITE_GOOGLE_MAP_ID,
          15,
        );

        const pin = await createCustomPin({
          scale: 2,
          glyph: userInfo.profileImage,
          type: "sharing",
        });

        const myPin = await createMarker(
          newMap,
          { lat: userLocation.latitude, lng: userLocation.longitude },
          pin.element,
        );
        myPin.zIndex = 10;

        setMap(newMap);

        groupMemberList.forEach(async (member) => {
          const memberPin = await createCustomPin({
            scale: 2.0,
            glyph: member.profileImage,
            type: "sharing",
          });
          const memberMarker = await createMarker(
            newMap,
            { lat: member.latitude, lng: member.longitude },
            memberPin.element,
          );
          markersRef.current.push(memberMarker);
          memberMarker.zIndex = 1;
        });

        const arrivalPin = await createCustomPin({
          scale: 2.5,
          glyph: ArrivalPin,
          type: "arrivalPin",
        });

        const arrivalMarker = await createMarker(
          newMap,
          {
            lat: arrivalLocationInfo.groupScheduleLocation.latitude,
            lng: arrivalLocationInfo.groupScheduleLocation.longitude,
          },
          arrivalPin.element,
        );
        arrivalMarker.zIndex = 20;
      } catch (error) {
        console.error("Error initializing map: ", error);
      }
    };
    if (groupMemberList.length > 0) {
      initMap();
    }
  }, [userInfo, groupMemberList, arrivalLocationInfo]);

  // 웹소켓 연결
  useEffect(() => {
    if (!arrivalLocationInfo?.groupScheduleLocation.startDateTime) {
      return;
    }

    connectWebSocket(
      arrivalLocationInfo.groupScheduleLocation.startDateTime,
      arrivalLocationInfo.groupScheduleLocation.endDateTime,
      accessToken,
    );
  }, [accessToken, arrivalLocationInfo]);

  // 실시간 위치 정보 구독
  useEffect(() => {
    if (!groupId || !scheduleId) {
      console.warn("❌ groupId 또는 scheduleId가 없음, 구독 중단");
      return;
    }
    if (isConnected) {
      stompClient?.subscribe(
        `/sub/location/groups/${groupId}/${scheduleId}`,
        (message: IMessage) => {
          if (!message?.body) {
            console.warn("⚠️ 빈 메시지가 수신됨");
            return;
          }

          try {
            const response: IGetGroupMemberLocationResponseType = JSON.parse(message.body);

            setGroupMemberList((prev) => {
              const updatedLocation: IMemberLocationType[] = response.groupMemberLocations;

              const updatedMembers = prev.map((member) => {
                const newLocation = updatedLocation.find((loc) => loc.username === member.username);
                return newLocation ?? member;
              });

              const newMembers = updatedLocation.filter(
                (loc) => !prev.some((member) => member.username === loc.username),
              );

              const nextMembers = [...updatedMembers, ...newMembers];

              const isSame =
                prev.length === nextMembers.length &&
                prev.every(
                  (member, i) =>
                    member.username === nextMembers[i].username &&
                    member.latitude === nextMembers[i].latitude &&
                    member.longitude === nextMembers[i].longitude,
                );

              return isSame ? prev : nextMembers;
            });
          } catch (error) {
            console.error("❌ JSON 파싱 에러:", error);
          }
        },
        {
          Authorization: `Bearer ${accessToken}`,
        },
      );
    }
  }, [accessToken, groupId, scheduleId, isConnected]);

 useEffect(() => {
   if (
     !userCurrentLatLng ||
     !groupId ||
     !scheduleId ||
     !accessToken ||
     !isConnected ||
     !stompClient?.connected
   ) {
     return;
   }

    if (intervalRef.current) {
      return;
    }

   const DISTANCE_THRESHOLD = 5; // 5미터 이상 이동 시

   intervalRef.current = setInterval(() => {
     const prevLoc = prevLocationRef.current;
     const currLoc = userCurrentLatLng;

     const movedDistance = prevLoc
       ? calculateDistance(
           prevLoc.latitude,
           prevLoc.longitude,
           currLoc.latitude,
           currLoc.longitude,
         ) * 1000
       : Infinity;

     if (movedDistance >= DISTANCE_THRESHOLD) {
       stompClient.publish({
         destination: `/pub/location/groups/${groupId}/${scheduleId}`,
         headers: {
           Authorization: `Bearer ${accessToken}`,
         },
         body: JSON.stringify(currLoc),
       });

       prevLocationRef.current = currLoc;
     }
     // 5초마다 다시 확인
   }, 5000);

   return () => {
     if (intervalRef.current) {
       clearInterval(intervalRef.current);
       intervalRef.current = null;
     }
   };
 }, [isConnected, userCurrentLatLng, stompClient, groupId, scheduleId, accessToken]);


  // PC/데스크탑 버전 바텀시트
  const handleMouseMove = (e: MouseEvent) => {
    const deltaY = e.clientY - startY.current;

    if (deltaY > 50) {
      setIsBottomSheetOpen(false);
    } else if (deltaY < -50) {
      setIsBottomSheetOpen(true);
    }
  };

  const handleMouseUp = () => {
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    startY.current = e.clientY;
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  // 모바일 버전 바텀시트
  const handleTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const deltaY = e.touches[0].clientY - startY.current;
    if (deltaY > 50) {
      setIsBottomSheetOpen(false);
    } else if (deltaY < -50) {
      setIsBottomSheetOpen(true);
    }
  };

  const handleGroupMemberClick = (clickedMember: IMemberLocationType) => {
    if (map) {
      map.panTo(new google.maps.LatLng(clickedMember.latitude, clickedMember.longitude));

      markersRef.current.forEach(async (marker) => {
        const isClickedMarker =
          marker.position?.lat === clickedMember.latitude &&
          marker.position.lng === clickedMember.longitude;

        // 클릭된 마커만 스타일 변경
        if (isClickedMarker) {
          marker.content = (
            await createCustomPin({
              scale: 2.0,
              glyph: clickedMember.profileImage,
              type: "sharing",
              isClicked: true,
            })
          ).element;
          marker.position = marker.position;
          marker.zIndex = 10;
          setSelectedUserName(clickedMember.username);
        } else {
          const imgElement =
            marker.content instanceof HTMLElement ? marker.content.querySelector("img") : null;

          if (imgElement) {
            const originalPin = await createCustomPin({
              scale: 2.0,
              glyph: imgElement.getAttribute("src") || "",
              type: "sharing",
              isClicked: false,
            });
            marker.content = originalPin.element;
            marker.zIndex = 1;
          }
        }
      });
    }
  };

  return (
    <>
      <LocationSharingRedirect />
      <div className={styles.mainContainer}>
        <BackArrow_Icon
          width={30}
          height={40}
          className={styles.arrowIcon}
          onClick={() => navigate(-1)}
        />
        <div className={styles.mapContainer} ref={mapRef} />
      </div>
      <div
        className={`${styles.bottomSheetContainer} ${isBottomSheetOpen ? styles.open : ""}`}
        ref={bottomSheetRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onMouseDown={handleMouseDown}
      >
        <div className={styles.line} />
        <div className={styles.text}>친구</div>
        <div className={styles.groupMemberListContainer}>
          {groupMemberList.length !== 0 && arrivalLocationInfo ? (
            groupMemberList.map((groupMemberInfo, index) => (
              <GroupMemberItem
                key={index + groupMemberInfo.username}
                groupMemberItem={groupMemberInfo}
                handleGroupMemberClick={() => {
                  handleGroupMemberClick(groupMemberInfo);
                }}
                arrivalLocationInfo={arrivalLocationInfo.groupScheduleLocation}
                selectedUserName={selectedUserName}
              />
            ))
          ) : (
            <div className={styles.error}>Server Error</div>
          )}
        </div>
      </div>
    </>
  );
};

export default LocationSharingPage;
