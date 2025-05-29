import { useEffect, useRef, useState } from "react";
import styles from "./selectLocation.module.scss";
import useLocationInfoStore from "@store/useLocationInfoStore";
import HasTwoIconHeader from "@components/headers/HasTwoIconHeader";
import { useNavigate } from "react-router-dom";
import SearchInput from "../components/SearchInput";
import SearchResultList from "../components/SearchResultList";
import { calculateDistance } from "../../../utils/calculateDistance";
import { initializeMap, createCustomPin, createMarker } from "../../../utils/drawMap";
import { ReverseGeocoding } from "@utils/geocoding";

const SelectLocationPage = () => {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const [inputValue, setInputValue] = useState<string>("");
  const { setLocationInfo } = useLocationInfoStore();
  const [searchResults, setSearchResults] = useState<SearchLocationResultType[]>([]);
  const [selectedLocationInfo, setSelectedLocationInfo] = useState<SearchLocationResultType | null>(
    null,
  );
  const navigate = useNavigate();
  const [userLatLng, setUserLatLng] = useState<UserLatLngType>();
  const [marker, setMarker] = useState<google.maps.marker.AdvancedMarkerElement | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);

  // 사용자 현재 위치 가져오기
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLatLng({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        console.error("Error getting user's location: ", error);
      },
    );
  }, []);

  // 지도 초기화 (한 번만 실행됨)
  useEffect(() => {
    const initMap = async () => {
      if (!userLatLng || !mapRef.current) return;
      if (map) return;

      if (userLatLng) {
        ReverseGeocoding(userLatLng)
          .then((result) =>
            setSelectedLocationInfo({
              lat: userLatLng.latitude,
              lng: userLatLng.longitude,
              formatted_address: result,
              name: result,
            }),
          )
          .catch((error) => console.error("Error getting address :", error));
      }

      try {
        const newMap = await initializeMap(
          mapRef.current,
          { lat: userLatLng.latitude, lng: userLatLng.longitude },
          import.meta.env.VITE_GOOGLE_MAP_ID,
        );
        const pin = await createCustomPin();
        const initialMarker = await createMarker(
          newMap,
          { lat: userLatLng.latitude, lng: userLatLng.longitude },
          pin.element,
          "select",
        );

        setMap(newMap);
        setMarker(initialMarker);
      } catch (error) {
        console.error("Error initializing map: ", error);
      }
    };

    initMap();
  }, [userLatLng, mapRef.current]);

  useEffect(() => {
    if (!marker || !map) return;

    const handleDragEnd = async () => {
      const position = marker.position as google.maps.LatLngLiteral;
      const lat = position.lat;
      const lng = position.lng;

      try {
        const formatted_address = await ReverseGeocoding({ latitude: lat, longitude: lng });

        const updatedLocation = {
          lat,
          lng,
          formatted_address,
          name: formatted_address,
        };

        setSelectedLocationInfo(updatedLocation);
        setInputValue(formatted_address);
      } catch (error) {
        console.error("Reverse geocoding failed: ", error);
      }
    };

    const listener = google.maps.event.addListener(marker, "dragend", handleDragEnd);

    return () => {
      google.maps.event.removeListener(listener);
    };
  }, [marker]);

  // inputValue 변경 시 자동 처리
  useEffect(() => {
    if (inputValue === "") {
      setSearchResults([]); // 검색 결과 초기화

      if (userLatLng && map) {
        map.setCenter({ lat: userLatLng.latitude, lng: userLatLng.longitude }); // 지도 중심을 현재 위치로 이동

        if (marker) {
          marker.map = null; // 기존 마커 삭제
        }

        createCustomPin().then((pin) => {
          createMarker(
            map,
            { lat: userLatLng.latitude, lng: userLatLng.longitude },
            pin.element,
            "select",
          ).then((userMarker) => {
            setMarker(userMarker); // 새로운 마커 설정
          });
        });
      }
    }
  }, [inputValue]);

  // 검색 기능
  const handleSearchIconClick = async () => {
    if (!inputValue || !userLatLng || !map) return;

    const { PlacesService } = (await google.maps.importLibrary(
      "places",
    )) as google.maps.PlacesLibrary;
    const service = new PlacesService(map);

    const request: google.maps.places.TextSearchRequest = {
      query: inputValue,
      location: { lat: userLatLng.latitude, lng: userLatLng.longitude },
      radius: 10000,
    };

    service.textSearch(request, (results, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && results) {
        const formattedResults = results.map((place) => ({
          name: String(place.name),
          formatted_address: String(place.formatted_address),
          lat: Number(place.geometry?.location?.lat()),
          lng: Number(place.geometry?.location?.lng()),
        }));
        const sortedResults = formattedResults.sort((a, b) => {
          const distanceA = calculateDistance(
            userLatLng.latitude,
            userLatLng.longitude,
            a.lat,
            a.lng,
          );
          const distanceB = calculateDistance(
            userLatLng.latitude,
            userLatLng.longitude,
            b.lat,
            b.lng,
          );
          return distanceA - distanceB;
        });

        setSearchResults(sortedResults);
      } else {
        console.error("Failed to fetch places: ", status);
      }
    });
  };

  // 검색결과 클릭 시 기존 map을 활용하여 이동
  const handleResultClick = async (location: SearchLocationResultType) => {
    if (!map || !marker) return;

    map.setCenter({ lat: location.lat, lng: location.lng });

    // 기존 마커 삭제
    marker.map = null;

    // 새 마커 추가
    const pin = await createCustomPin();
    const selectedMarker = await createMarker(
      map,
      { lat: location.lat, lng: location.lng },
      pin.element,
      "select",
    );

    setSelectedLocationInfo(location);
    setMarker(selectedMarker);
  };

  // 선택된 장소 저장
  const handleSave = () => {
    if (selectedLocationInfo) {
      setLocationInfo(
        selectedLocationInfo.formatted_address,
        selectedLocationInfo.lat,
        selectedLocationInfo.lng,
        selectedLocationInfo.name,
      );
    }
    navigate(-1);
  };

  return (
    <div className={styles.mainContainer}>
      <HasTwoIconHeader
        title="검색"
        rightType="checkIcon"
        handleLeftClick={() => navigate(-1)}
        handleRightClick={handleSave}
        backgroundColor="white"
      />
      <div className={styles.contentContainer}>
        <div className={styles.searchInputContainer}>
          <SearchInput
            inputValue={inputValue}
            setInputValue={setInputValue}
            handleSearchIconClick={handleSearchIconClick}
          />
        </div>
        <div
          className={`${styles.mapContainer} ${searchResults.length === 0 ? styles.fullHeight : ""}`}
          ref={mapRef}
        />
        <div
          className={`${styles.searchResultsContainer} ${searchResults.length === 0 ? styles.hidden : ""}`}
        >
          {userLatLng && (
            <SearchResultList
              handleResultClick={handleResultClick}
              calculateDistance={calculateDistance}
              selectedLocationInfo={selectedLocationInfo}
              searchResults={searchResults}
              userLatLng={userLatLng}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default SelectLocationPage;
