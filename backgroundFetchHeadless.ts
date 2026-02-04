import BackgroundFetch from 'react-native-background-fetch';
import { checkAndNotifyTurnos } from './src/services/TurnoService';
import { checkAndApplyHotfix } from './src/services/otaHotfix';

// Headless task invoked when the app is terminated.
const BackgroundFetchHeadlessTask = async (event: any) => {
  console.log('[BackgroundFetch HeadlessTask] start', event?.taskId);
  try {
    await checkAndNotifyTurnos();
    await checkAndApplyHotfix({ notify: false });
  } finally {
    BackgroundFetch.finish(event.taskId);
  }
};

// Register the task at the JS runtime level.
BackgroundFetch.registerHeadlessTask(BackgroundFetchHeadlessTask);
