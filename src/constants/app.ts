import Constants from 'expo-constants';

/** Display name, sourced from app.json so it only lives in one place. */
export const APP_NAME = Constants.expoConfig?.name ?? 'App';
