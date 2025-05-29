import { loadGoogleMapsAPI } from "@api/googleMapLoader";
import styles from "./map.module.scss";
import React, { useEffect, useRef, useState } from "react";

interface Props {
  latLng: UserLatLngType;
}

const Map: React.FC<Props> = ({ latLng }) => {
  const [userLatLng, setUserLatLng] = useState<{lat: number, lng: number}>();
  const mapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setUserLatLng({
      lat: latLng.latitude,
      lng: latLng.longitude,
    });
  }, [latLng]);

  useEffect(() => {
    async function initMap() {
      try {
        await loadGoogleMapsAPI(import.meta.env.VITE_GOOGLE_MAP_API_KEY);
        const { AdvancedMarkerElement } = (await google.maps.importLibrary(
          "marker",
        )) as google.maps.MarkerLibrary;
        if (userLatLng?.lat === 0 && userLatLng?.lng === 0) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              setUserLatLng({
                lat: position.coords.latitude,
                lng: position.coords.longitude,
              });
            },

            (error) => {
              console.error("Error getting user's location: ", error);
            },
          );
        }

        const map = new google.maps.Map(mapRef.current as HTMLElement, {
          center: userLatLng,
          zoom: 16,
          mapId: import.meta.env.VITE_GOOGLE_MAP_ID,
          mapTypeControl: false,
          zoomControl: false,
          streetViewControl: false,
        });

        new AdvancedMarkerElement({
          map,
          position: userLatLng,
        });
      } catch (error) {
        console.error("Error initializing map: ", error);
      }
    }
    if (mapRef.current && userLatLng) {
      initMap();
    }
  }, [userLatLng]);

  return <div className={styles.mapContainer} ref={mapRef} />;
};

export default Map;
