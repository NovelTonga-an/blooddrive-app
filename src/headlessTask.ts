import BackgroundGeolocation, {
  HeadlessEvent
} from '@transistorsoft/capacitor-background-geolocation';

// Define the headless background task function
const HeadlessTask = async (event: HeadlessEvent) => {
  const name = event.name;
  const params = event.params;

  console.log(`[Headless Task] Event received: ${name}`, params);

  if (name === 'location') {
    console.log('[Headless Task] Location update received in closed app state:', params);
  }
};

// Safely register headless task on native platform without breaking web/Vite bundling
if (typeof window !== 'undefined' && 'BackgroundGeolocation' in window) {
  (window as any).BackgroundGeolocation?.registerHeadlessTask?.(HeadlessTask);
} else if (typeof BackgroundGeolocation !== 'undefined' && 'registerHeadlessTask' in BackgroundGeolocation) {
  (BackgroundGeolocation as any).registerHeadlessTask(HeadlessTask);
}