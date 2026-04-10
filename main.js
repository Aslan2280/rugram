// main.js
import { 
    init, login, register, logout, 
    loadChats, startPrivateChat, startGroup, startChannel,
    loadMessages, sendTextMessage, sendFileMessage, subscribeChat,
    loadGifts, purchaseGift, loadReceivedGifts,
    publishStory, loadStories, getBalance,
    checkAdmin, adminGetUsers, adminModifyStars,
    adminCreateGift, adminUpdateGift, adminDeleteGift,
    findUsers, saveProfile, getCurrentUserData, setCurrentChat
} from './app.js'

// Экспортируем в window для использования в HTML
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
    getCurrentUserData,
    setCurrentChat
}

// Автозагрузка
window.addEventListener('DOMContentLoaded', async () => {
    const user = await init()
    const isLoginPage = window.location.pathname.includes('index.html') || window.location.pathname === '/'
    const isRegisterPage = window.location.pathname.includes('register.html')
    
    if (user && (isLoginPage || isRegisterPage)) {
        window.location.href = 'chats.html'
    } else if (!user && !isLoginPage && !isRegisterPage) {
        window.location.href = 'index.html'
    }
    
    // Настройка темы
    const savedTheme = localStorage.getItem('theme') || 'light'
    document.body.setAttribute('data-theme', savedTheme)
})

// Глобальная функция для смены темы
window.setTheme = function(theme) {
    document.body.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
}
