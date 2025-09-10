import { useState, useEffect, useCallback } from 'react';
import { database } from '../firebase/firebase';
import { ref, onValue, set, off, get, child } from 'firebase/database';

type SetValue<T> = React.Dispatch<React.SetStateAction<T>>;

export function useFirebase<T>(key: string, initialValue: T | (() => T)): [T, SetValue<T>] {
  const [value, setValueState] = useState<T>(() => initialValue instanceof Function ? initialValue() : initialValue);

  useEffect(() => {
    const dbRef = ref(database, key);
    
    const listener = onValue(dbRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        if (Array.isArray(initialValue) && data && typeof data === 'object' && !Array.isArray(data)) {
            setValueState(Object.values(data) as T);
        } else {
            setValueState(data);
        }
      } else {
        // Path doesn't exist, initialize it.
        const dataToSet = initialValue instanceof Function ? initialValue() : initialValue;
        set(dbRef, dataToSet);
        setValueState(dataToSet); // Set local state immediately
      }
    }, (error) => {
        console.error(`Firebase onValue error for key "${key}":`, error);
    });

    return () => {
      off(dbRef, 'value', listener);
    };
  }, [key]);

  const setValue: SetValue<T> = useCallback((newValue) => {
    const dbRef = ref(database, key);
    
    if (newValue instanceof Function) {
      // For functional updates, get the current value from Firebase first
      get(child(ref(database), key)).then((snapshot) => {
        const currentValue = snapshot.exists() ? snapshot.val() : (initialValue instanceof Function ? initialValue() : initialValue);
        const resolvedValue = newValue(currentValue);
        set(dbRef, resolvedValue)
          .catch(error => console.error(`Firebase set failed for key "${key}":`, error));
      }).catch(error => {
        console.error(`Firebase get failed for key "${key}" during functional update:`, error);
      });
    } else {
      set(dbRef, newValue)
        .catch(error => console.error(`Firebase set failed for key "${key}":`, error));
    }
  }, [key, initialValue]);

  return [value, setValue];
}
