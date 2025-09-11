import { useState, useEffect, useCallback, useRef } from 'react';
import { database } from '../firebase/firebase';

type SetValue<T> = React.Dispatch<React.SetStateAction<T>>;

export function useFirebase<T>(key: string, initialValue: T | (() => T)): [T, SetValue<T>] {
  const [value, setValueState] = useState<T>(() => initialValue instanceof Function ? initialValue() : initialValue);
  const initialValueRef = useRef(initialValue);

  useEffect(() => {
    const dbRef = database.ref(key);
    const resolvedInitial = initialValueRef.current instanceof Function ? initialValueRef.current() : initialValueRef.current;
    
    const listener = dbRef.on('value', (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        // Firebase returns objects for arrays, so we need to convert them back.
        if (Array.isArray(resolvedInitial) && data && typeof data === 'object' && !Array.isArray(data)) {
            setValueState(Object.values(data) as T);
        } else {
            setValueState(data ?? resolvedInitial);
        }
      } else {
        // Path doesn't exist, initialize it.
        const dataToSet = resolvedInitial;
        dbRef.set(dataToSet);
        setValueState(dataToSet); // Set local state immediately
      }
    }, (error) => {
        console.error(`Firebase onValue error for key "${key}":`, error);
    });

    // Return the unsubscribe function to be called on cleanup
    return () => {
      dbRef.off('value', listener);
    };
  }, [key]);

  const setValue: SetValue<T> = useCallback((newValue) => {
    const dbRef = database.ref(key);
    
    if (newValue instanceof Function) {
      // For functional updates, get the current value from Firebase first
      dbRef.get().then((snapshot) => {
        let currentValue: T;
        const resolvedInitial = initialValueRef.current instanceof Function ? initialValueRef.current() : initialValueRef.current;
        
        if (snapshot.exists()) {
          const data = snapshot.val();
          // Ensure data from Firebase is converted to an array if necessary before applying functional update.
          if (Array.isArray(resolvedInitial) && data && typeof data === 'object' && !Array.isArray(data)) {
            currentValue = Object.values(data) as T;
          } else {
            currentValue = data;
          }
        } else {
          currentValue = resolvedInitial;
        }
        
        const valueForUpdater = currentValue ?? resolvedInitial;
        const resolvedValue = newValue(valueForUpdater);
        dbRef.set(resolvedValue)
          .catch(error => console.error(`Firebase set failed for key "${key}":`, error));
      }).catch(error => {
        console.error(`Firebase get failed for key "${key}" during functional update:`, error);
      });
    } else {
      dbRef.set(newValue)
        .catch(error => console.error(`Firebase set failed for key "${key}":`, error));
    }
  }, [key]);

  return [value, setValue];
}