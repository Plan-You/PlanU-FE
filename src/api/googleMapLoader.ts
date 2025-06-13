let googleMapsAPILoaded = false;

export const loadGoogleMapsAPI = (apiKey: string): Promise<void> => {
  if (
    googleMapsAPILoaded ||
    (typeof window !== "undefined" && window.google && window.google.maps)
  ) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const existingScript = document.querySelector(
      `script[src^="https://maps.googleapis.com/maps/api/js?key="]`,
    );

    if (existingScript) {
      existingScript.addEventListener("load", () => {
        googleMapsAPILoaded = true;
        resolve();
      });
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&v=weekly&libraries=places,marker`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      googleMapsAPILoaded = true;
      resolve();
    };
    script.onerror = () => reject(new Error("Failed to load Google Maps API"));
    document.head.appendChild(script);
  });
};
