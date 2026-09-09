import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';

class LocationTrackingService {
  private watchId: string | null = null;

  async startTracking(token: string) {
    try {
      if (Capacitor.isNativePlatform()) {
        const status = await Geolocation.checkPermissions();
        if (status.location !== 'granted') {
          const request = await Geolocation.requestPermissions();
          if (request.location !== 'granted') {
            console.warn('Location permission denied on device.');
            return;
          }
        }

        // Native Capacitor location watching
        this.watchId = await Geolocation.watchPosition(
          { enableHighAccuracy: true, timeout: 10000 },
          (position, err) => {
            if (err) {
              console.error('Error watching location:', err);
              return;
            }
            if (position) {
              this.sendLocationToBackend(token, position.coords.latitude, position.coords.longitude);
            }
          }
        );
      } else {
        // Web Browser Fallback (navigator.geolocation)
        if (!navigator.geolocation) {
          console.warn('Geolocation not supported by browser.');
          return;
        }

        const id = navigator.geolocation.watchPosition(
          (position) => {
            this.sendLocationToBackend(token, position.coords.latitude, position.coords.longitude);
          },
          (error) => console.error('Web Location Error:', error.message),
          { enableHighAccuracy: true, timeout: 10000 }
        );
        this.watchId = id.toString();
      }
    } catch (error) {
      console.error('Error starting location tracking:', error);
    }
  }

  async stopTracking() {
    if (this.watchId !== null) {
      if (Capacitor.isNativePlatform()) {
        await Geolocation.clearWatch({ id: this.watchId });
      } else {
        navigator.geolocation.clearWatch(parseInt(this.watchId, 10));
      }
      this.watchId = null;
      console.log('Stopped location tracking.');
    }
  }

  private async sendLocationToBackend(token: string, latitude: number, longitude: number) {
    console.log(`Sending GPS to backend: Lat ${latitude}, Lng ${longitude}`);
    // Optional: Send coords via fetch() or axios to your Laravel API endpoint
  }
}

// Export the instantiated singleton object matching your App.tsx import
export const locationService = new LocationTrackingService();