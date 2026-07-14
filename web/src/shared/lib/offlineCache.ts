import type { Property } from '../../modules/properties/types'

const DB_NAME = 'cubitat_offline_db'
const DB_VERSION = 1
const STORE_NAME = 'properties_store'

function withoutContactInfo(property: Property): Property {
  const { contact_info: _contactInfo, ...safeProperty } = property
  return safeProperty
}

function getDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }
  })
}

export async function saveCachedProperties(properties: Property[]): Promise<void> {
  try {
    const db = await getDB()
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)

    // Clear old properties
    store.clear()

    // Save new properties
    for (const property of properties) {
      store.put(withoutContactInfo(property))
    }

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })
  } catch (error) {
    console.warn('Fallo al guardar caché offline en IndexedDB:', error)
  }
}

export async function getCachedProperties(): Promise<Property[]> {
  try {
    const db = await getDB()
    const transaction = db.transaction(STORE_NAME, 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.getAll()

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    console.warn('Fallo al leer caché offline de IndexedDB:', error)
    return []
  }
}

export async function saveSingleCachedProperty(property: Property): Promise<void> {
  try {
    const db = await getDB()
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    store.put(withoutContactInfo(property))

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })
  } catch (error) {
    console.warn('Fallo al guardar propiedad individual en IndexedDB:', error)
  }
}

export async function getCachedProperty(id: string): Promise<Property | null> {
  try {
    const db = await getDB()
    const transaction = db.transaction(STORE_NAME, 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.get(id)

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    console.warn('Fallo al leer propiedad individual de IndexedDB:', error)
    return null
  }
}

export async function clearCachedProperties(): Promise<void> {
  try {
    const db = await getDB()
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    transaction.objectStore(STORE_NAME).clear()

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })
  } catch (error) {
    console.warn('Fallo al limpiar la caché offline de IndexedDB:', error)
  }
}
