// main.js
import { init, login, register, logout, loadChats, startPrivateChat, startGroup, startChannel, loadMessages, sendTextMessage, sendFileMessage, subscribeChat, loadGifts, purchaseGift, loadReceivedGifts, publishStory, loadStories, getBalance, checkAdmin, adminGetUsers, adminModifyStars, adminCreateGift, adminUpdateGift, adminDeleteGift, findUsers, saveProfile, getCurrentUser, setCurrentChat } from './app.js'

window.RuGram = {
    init,
    login,
    register,
    logout,
    loadChats,
    startPrivateChat,
    startGroup,
    startChannel,
    loadMessages,
    sendTextMessage,
    sendFileMessage,
    subscribeChat,
    loadGifts,
    purchaseGift,
    loadReceivedGifts,
    publishStory,
    loadStories,
    getBalance,
    checkAdmin,
    adminGetUsers,
    adminModifyStars,
    adminCreateGift,
    adminUpdateGift,
    adminDeleteGift,
    findUsers,
    saveProfile,
    getCurrentUser,
    setCurrentChat
}

// Автозагрузка при старте
window.addEventListener('DOMContentLoaded', async () => {
    const user = await init()
    if (user && !window.location.pathname.includes('login.html')) {
        console.log('Пользователь:', user.email)
    }
})