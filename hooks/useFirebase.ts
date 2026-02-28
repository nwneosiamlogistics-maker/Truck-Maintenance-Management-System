import { useState, useEffect, useCallback, useRef } from 'react';
import React from 'react';
import { database } from '../firebase/firebase';
import { ref, onValue, set } from 'firebase/database';

/** Remove undefined values recursively so Firebase never receives them. */
function stripUndefined<T>(value: T): T {
    if (value === null || value === undefined) return null as unknown as T;
    if (Array.isArray(value)) return value.map(stripUndefined) as unknown as T;
    if (typeof value === 'object') {
        const result: Record<string, unknown> = {};
        for (const k of Object.keys(value as object)) {
            const v = (value as Record<string, unknown>)[k];
            if (v !== undefined) result[k] = stripUndefined(v);
        }
        return result as T;
    }
    return value;
}

/**
 * Firebase returns arrays as objects with numeric string keys: {"0":{...},"1":{...}}
 * This function recursively converts them back to proper arrays at every nesting level.
 * It detects "array-like objects" by checking if all keys are numeric strings.
 */
function deepNormalizeFirebase(data: unknown): unknown {
    if (data === null || data === undefined) return data;
    if (Array.isArray(data)) return data.map(deepNormalizeFirebase);
    if (typeof data === 'object') {
        const keys = Object.keys(data as object);
        // Firebase-encoded arrays ALWAYS start from key "0" and are sequential integers.
        // objects like months: {1: 'planned', 6: 'done'} won't have key "0" so are NOT arrays.
        const isFirebaseArray =
            keys.length > 0 &&
            keys.every(k => /^\d+$/.test(k)) &&
            keys.includes('0') &&
            // sequential check: max key === keys.length - 1
            Math.max(...keys.map(Number)) === keys.length - 1;
        if (isFirebaseArray) {
            return keys
                .sort((a, b) => Number(a) - Number(b))
                .map(k => deepNormalizeFirebase((data as Record<string, unknown>)[k]));
        }
        // Regular object — recurse into values only
        const result: Record<string, unknown> = {};
        for (const k of keys) {
            result[k] = deepNormalizeFirebase((data as Record<string, unknown>)[k]);
        }
        return result;
    }
    return data;
}

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
        // Firebase returns arrays as objects with numeric keys — normalize recursively at every level
        setValueState(deepNormalizeFirebase(data) as T ?? resolvedInitial);
      } else {
        // Path doesn't exist, initialize it.
        const dataToSet = resolvedInitial;
        set(dbRef, stripUndefined(dataToSet));
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
        set(dbRef, stripUndefined(resolvedValue)).catch(error => {
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
