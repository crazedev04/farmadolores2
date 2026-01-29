import BackgroundFetch from 'react-native-background-fetch';
import { checkAndNotifyTurnos } from './src/services/TurnoService';

// Headless task invoked when the app is terminated.
const BackgroundFetchHeadlessTask = async (event: any) => {
  if (__DEV__) {
    console.log('[BackgroundFetch HeadlessTask] start');
  }
  try {
    await checkAndNotifyTurnos();
  } finally {
    BackgroundFetch.finish(event.taskId);
  }
};

// Register the task at the JS runtime level.
BackgroundFetch.registerHeadlessTask(BackgroundFetchHeadlessTask);
