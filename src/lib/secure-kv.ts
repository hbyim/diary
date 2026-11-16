import * as SecureStore from 'expo-secure-store';

/** Small secrets (the passcode hash) in the iOS Keychain / Android Keystore. */
const opts: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

export const secureGet = (key: string) => SecureStore.getItemAsync(key, opts);
export const secureSet = (key: string, value: string) => SecureStore.setItemAsync(key, value, opts);
export const secureDelete = (key: string) => SecureStore.deleteItemAsync(key, opts);
