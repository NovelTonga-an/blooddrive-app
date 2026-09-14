import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';

class LocationTrackingService {
  private watchId: string | null = null;
  private apiBaseUrl = 'https://darkgoldenrod-spoonbill-897628.hostingersite.com/api'; 

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
    try {
      const response = await fetch(`${this.apiBaseUrl}/profile/location`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ latitude, longitude })
      });

      if (!response.ok) {
        console.error('Failed to sync location to backend, status:', response.status);
      }
    } catch (error) {
      console.error('Error sending location to backend:', error);
    }
  }
}

export const locationService = new LocationTrackingService();