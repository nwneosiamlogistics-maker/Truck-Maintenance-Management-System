import { useState, useEffect, useCallback, useRef } from 'react';
import React from 'react';
import { database } from '../firebase/firebase';
import { ref, onValue, set } from 'firebase/database';

type SetValue<T> = React.Dispatch<React.SetStateAction<T>>;

export function useFirebase<T>(key: string, initialValue: T | (() => T)): [T, SetValue<T>] {
  const [value, setValueState] = useState<T>(() => initialValue instanceof Function ? initialValue() : initialValue);
  const initialValueRef = useRef(initialValue);
  const isWriting = useRef(false);
  const writeTimeout = useRef<number | null>(null);

  useEffect(() => {
    const dbRef = ref(database, key);
    const resolvedInitial = initialValueRef.current instanceof Function ? initialValueRef.current() : initialValueRef.current;
    
    const unsubscribe = onValue(dbRef, (snapshot) => {
      // Ignore updates that are likely echoes of our own writes.
      if (isWriting.current) {
        return;
      }

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
        set(dbRef, dataToSet);
        setValueState(dataToSet); // Set local state immediately
      }
    }, (error) => {
        console.error(`Firebase onValue error for key "${key}":`, error);
    });

    // Cleanup function for when the component unmounts.
    return () => {
      unsubscribe();
      if (writeTimeout.current) {
        clearTimeout(writeTimeout.current);
      }
    };
  }, [key]);

  const setValue: SetValue<T> = useCallback((newValueOrFn) => {
    isWriting.current = true;
    if (writeTimeout.current) {
        clearTimeout(writeTimeout.current);
    }
    // Reset the write flag after a short delay. This allows the write to propagate
    // through Firebase and prevents legitimate external updates from being ignored.
    writeTimeout.current = window.setTimeout(() => {
        isWriting.current = false;
    }, 1000);

    const dbRef = ref(database, key);

    // Perform an optimistic update locally first for instant UI feedback.
    setValueState(prevState => {
        const resolvedValue = newValueOrFn instanceof Function
            ? newValueOrFn(prevState)
            : newValueOrFn;
        
        // After determining the new state, push it to Firebase.
        set(dbRef, resolvedValue).catch(error => {
            console.error(`Firebase set failed for key "${key}":`, error);
            // In a production app, you might want to roll back the optimistic update here.
            isWriting.current = false; // Reset flag immediately on error
            if(writeTimeout.current) clearTimeout(writeTimeout.current);
        });
        
        return resolvedValue;
    });
  }, [key]);

  return [value, setValue];
}
