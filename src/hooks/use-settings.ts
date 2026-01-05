import { appConfigDir } from '@tauri-apps/api/path'
import { Store } from '@tauri-apps/plugin-store'
import { Dispatch, SetStateAction, useCallback, useState } from 'react'
import { useEventCallback, useEventListener } from 'usehooks-ts'

export const store = await Store.load((await appConfigDir()) + '/settings.json', { autoSave: true, defaults: {} })
const settings = (await store.entries()).reduce<Record<string, unknown>>((acc, [key, value]) => {
  acc[key] = value
  return acc
}, {})

export function useSettings<T>(key: string, defaultValue: T): [T, Dispatch<SetStateAction<T>>, () => void] {
  const readValue = useCallback((): T => {
    try {
      if (key in settings) {
        return settings[key] as T
      }
      return defaultValue
    } catch {
      console.error(`Error reading setting for key: ${key}`)
      return defaultValue
    }
  }, [key, defaultValue])

  const [storedValue, setStoredValue] = useState<T>(readValue())

  const setValue: Dispatch<SetStateAction<T>> = useEventCallback(value => {
    setStoredValue(value)
    settings[key] = value instanceof Function ? value(storedValue) : value
    ;(async () => {
      try {
        console.debug(`Setting setting for key: ${key} to value:`, settings[key])
        await store.set(key, value)

        window.dispatchEvent(new StorageEvent('settings', { key }))
      } catch (error) {
        console.error(`Error setting setting for key: ${key}`, error)
      }
    })()
  })

  const removeValue = useEventCallback(() => {
    const performDelete = async () => {
      await store.delete(key)
      setStoredValue(defaultValue)

      window.dispatchEvent(new StorageEvent('settings', { key }))
    }
    performDelete()
  })

  const handleStorageChange = useCallback(
    (event: Event) => {
      const storageEvent = event as StorageEvent
      if (storageEvent.key && storageEvent.key !== key) {
        return
      }

      setStoredValue(readValue())
    },
    [key, readValue],
  )

  useEventListener('settings' as keyof WindowEventMap, handleStorageChange)

  return [storedValue, setValue, removeValue]
}
