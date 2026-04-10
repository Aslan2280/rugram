// app.js
import { 
    supabase,
    getCurrentUser,
    signIn, 
    signUp, 
    signOut,
    getProfile,
    updateProfile,
    getUserChats,
    createPrivateChat,
    createGroup,
    createChannel,
    getMessages,
    sendMessage,
    subscribeToMessages,
    getGifts,
    sendGift,
    getMyGifts,
    uploadStory,
    getActiveStories,
    isAdmin,
    getAllUsers,
    modifyUserStars,
    createGift,
    updateGift,
    deleteGift,
    getStarBalance,
    searchUsers
} from './supabase.js'
import { encrypt, decrypt } from './encryption.js'

let currentUser = null
let currentChat = null
let messageSubscription = null

export async function init() {
    currentUser = await getCurrentUser()
    if (currentUser) {
        const profile = await getProfile(currentUser.id)
        currentUser = { ...currentUser, ...profile }
    }
    return currentUser
}

export async function login(email, password) {
    const data = await signIn(email, password)
    await init()
    return data
}

export async function register(email, password, username) {
    const data = await signUp(email, password, username)
    return data
}

export async function logout() {
    if (messageSubscription) {
        messageSubscription.unsubscribe()
    }
    await signOut()
    currentUser = null
    currentChat = null
}

export function getCurrentUserData() {
    return currentUser
}

export async function loadChats() {
    if (!currentUser) return []
    return await getUserChats()
}

export async function startPrivateChat(userId) {
    return await createPrivateChat(userId)
}

export async function startGroup(name, userIds, description) {
    return await createGroup(name, userIds, description)
}

export async function startChannel(name, description) {
    return await createChannel(name, description)
}

export async function loadMessages(chatId) {
    const messages = await getMessages(chatId)
    
    for (const msg of messages) {
        if (msg.encrypted_content) {
            try {
                msg.decrypted_content = await decrypt(msg.encrypted_content)
            } catch {
                msg.decrypted_content = '[Зашифровано]'
            }
        }
    }
    return messages
}

export async function sendTextMessage(chatId, text) {
    const encrypted = await encrypt(text)
    return await sendMessage(chatId, encrypted, null)
}

export async function sendFileMessage(chatId, file) {
    const fileName = file.name
    return await sendMessage(chatId, `📎 ${fileName}`, file)
}

export function subscribeChat(chatId, onNewMessage) {
    if (messageSubscription) {
        messageSubscription.unsubscribe()
    }
    
    messageSubscription = subscribeToMessages(chatId, async (msg) => {
        if (msg.encrypted_content) {
            try {
                msg.decrypted_content = await decrypt(msg.encrypted_content)
            } catch {
                msg.decrypted_content = '[Зашифровано]'
            }
        }
        onNewMessage(msg)
    })
    return messageSubscription
}

export async function loadGifts() {
    return await getGifts()
}

export async function purchaseGift(giftId, userId, message) {
    return await sendGift(giftId, userId, message)
}

export async function loadReceivedGifts() {
    return await getMyGifts()
}

export async function publishStory(file, caption) {
    return await uploadStory(file, caption)
}

export async function loadStories() {
    return await getActiveStories()
}

export async function getBalance() {
    return await getStarBalance()
}

export async function checkAdmin() {
    return await isAdmin()
}

export async function adminGetUsers() {
    return await getAllUsers()
}

export async function adminModifyStars(userId, amount, reason) {
    return await modifyUserStars(userId, amount, reason)
}

export async function adminCreateGift(data) {
    return await createGift(data)
}

export async function adminUpdateGift(id, data) {
    return await updateGift(id, data)
}

export async function adminDeleteGift(id) {
    return await deleteGift(id)
}

export async function findUsers(query) {
    return await searchUsers(query)
}

export async function saveProfile(updates) {
    return await updateProfile(updates)
}

export function getCurrentChat() {
    return currentChat
}

export function setCurrentChat(chat) {
    currentChat = chat
}
