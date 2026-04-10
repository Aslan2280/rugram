// encryption.js
const encoder = new TextEncoder()
const decoder = new TextDecoder()

async function getKey() {
    let key = localStorage.getItem('encryption_key')
    if (!key) {
        const newKey = await crypto.subtle.generateKey(
            { name: 'AES-GCM', length: 256 },
            true,
            ['encrypt', 'decrypt']
        )
        const exported = await crypto.subtle.exportKey('jwk', newKey)
        localStorage.setItem('encryption_key', JSON.stringify(exported))
        key = exported
    } else {
        key = JSON.parse(key)
    }
    return await crypto.subtle.importKey('jwk', key, { name: 'AES-GCM' }, true, ['encrypt', 'decrypt'])
}

export async function encrypt(text) {
    const key = await getKey()
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const encoded = encoder.encode(text)
    
    const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        encoded
    )
    
    const combined = new Uint8Array(iv.length + encrypted.byteLength)
    combined.set(iv)
    combined.set(new Uint8Array(encrypted), iv.length)
    
    return btoa(String.fromCharCode(...combined))
}

export async function decrypt(encryptedBase64) {
    const key = await getKey()
    const combined = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0))
    
    const iv = combined.slice(0, 12)
    const encrypted = combined.slice(12)
    
    const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        encrypted
    )
    
    return decoder.decode(decrypted)
}