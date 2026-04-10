// supabase.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.0/+esm'
import { SUPABASE_URL, SUPABASE_KEY } from './config.js'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// Auth
export async function signUp(email, password, username) {
    const { data, error } = await supabase.auth.signUp({
        email, password,
        options: { data: { username } }
    })
    if (error) throw error
    return data
}

export async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
}

export async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
}

export async function getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser()
    return user
}

// Users
export async function getProfile(userId) {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
    if (error) throw error
    return data
}

export async function updateProfile(updates) {
    const user = await getCurrentUser()
    const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single()
    if (error) throw error
    return data
}

export async function searchUsers(query) {
    const { data, error } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url')
        .ilike('username', `%${query}%`)
        .limit(20)
    if (error) throw error
    return data
}

// Chats
export async function getUserChats() {
    const user = await getCurrentUser()
    
    const { data, error } = await supabase
        .from('chat_members')
        .select(`
            chat_id,
            role,
            chat:chats (
                id, chat_type, name, description, avatar_url, created_by, created_at
            )
        `)
        .eq('user_id', user.id)
    
    if (error) throw error
    
    const chats = []
    for (const member of data) {
        const chat = member.chat
        const { data: lastMsg } = await supabase
            .from('messages')
            .select('encrypted_content, created_at, sender_id')
            .eq('chat_id', chat.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()
        
        let chatName = chat.name
        if (chat.chat_type === 'private') {
            const otherMember = await getPrivateChatPartner(chat.id, user.id)
            if (otherMember) chatName = otherMember.username
        }
        
        chats.push({
            ...chat,
            name: chatName,
            role: member.role,
            last_message: lastMsg,
            unread: 0
        })
    }
    
    return chats
}

async function getPrivateChatPartner(chatId, userId) {
    const { data } = await supabase
        .from('chat_members')
        .select('user_id')
        .eq('chat_id', chatId)
        .neq('user_id', userId)
        .single()
    
    if (data) {
        const profile = await getProfile(data.user_id)
        return profile
    }
    return null
}

export async function createPrivateChat(userId) {
    const user = await getCurrentUser()
    
    const { data: chat, error } = await supabase
        .from('chats')
        .insert({ chat_type: 'private', created_by: user.id })
        .select()
        .single()
    
    if (error) throw error
    
    await supabase.from('chat_members').insert([
        { chat_id: chat.id, user_id: user.id, role: 'member' },
        { chat_id: chat.id, user_id: userId, role: 'member' }
    ])
    
    return chat
}

export async function createGroup(name, userIds, description = '') {
    const user = await getCurrentUser()
    
    const { data: chat, error } = await supabase
        .from('chats')
        .insert({ chat_type: 'group', name, description, created_by: user.id })
        .select()
        .single()
    
    if (error) throw error
    
    const members = [{ chat_id: chat.id, user_id: user.id, role: 'creator' }]
    for (const uid of userIds) {
        members.push({ chat_id: chat.id, user_id: uid, role: 'member' })
    }
    
    await supabase.from('chat_members').insert(members)
    return chat
}

export async function createChannel(name, description = '') {
    const user = await getCurrentUser()
    
    const { data: chat, error } = await supabase
        .from('chats')
        .insert({ chat_type: 'channel', name, description, created_by: user.id })
        .select()
        .single()
    
    if (error) throw error
    
    await supabase.from('chat_members').insert([
        { chat_id: chat.id, user_id: user.id, role: 'creator' }
    ])
    
    return chat
}

export async function getMessages(chatId, limit = 50) {
    const { data, error } = await supabase
        .from('messages')
        .select(`
            *,
            sender:sender_id (id, username, full_name, avatar_url)
        `)
        .eq('chat_id', chatId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true })
        .limit(limit)
    
    if (error) throw error
    return data
}

export async function sendMessage(chatId, encryptedContent, file = null) {
    const user = await getCurrentUser()
    
    let mediaUrl = null, mediaType = null, fileName = null
    
    if (file) {
        const fileExt = file.name.split('.').pop()
        const path = `chats/${chatId}/${Date.now()}_${Math.random().toString(36)}.${fileExt}`
        
        const { data, error } = await supabase.storage
            .from('rugram-media')
            .upload(path, file)
        
        if (!error) {
            const { data: { publicUrl } } = supabase.storage
                .from('rugram-media')
                .getPublicUrl(path)
            mediaUrl = publicUrl
            mediaType = file.type.startsWith('image') ? 'image' : 
                       file.type.startsWith('video') ? 'video' : 'document'
            fileName = file.name
        }
    }
    
    const { data, error } = await supabase
        .from('messages')
        .insert({
            chat_id: chatId,
            sender_id: user.id,
            encrypted_content: encryptedContent,
            media_url: mediaUrl,
            media_type: mediaType,
            file_name: fileName
        })
        .select()
        .single()
    
    if (error) throw error
    return data
}

export function subscribeToMessages(chatId, callback) {
    return supabase
        .channel(`chat-${chatId}`)
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `chat_id=eq.${chatId}`
        }, async (payload) => {
            const { data: sender } = await supabase
                .from('profiles')
                .select('id, username, full_name, avatar_url')
                .eq('id', payload.new.sender_id)
                .single()
            callback({ ...payload.new, sender })
        })
        .subscribe()
}

// Gifts
export async function getGifts() {
    const { data, error } = await supabase
        .from('gifts')
        .select('*')
        .eq('is_active', true)
        .order('price_stars')
    
    if (error) throw error
    return data
}

export async function sendGift(giftId, toUserId, message = '') {
    const user = await getCurrentUser()
    
    const { data: gift } = await supabase
        .from('gifts')
        .select('*')
        .eq('id', giftId)
        .single()
    
    const { data: profile } = await supabase
        .from('profiles')
        .select('stars_balance')
        .eq('id', user.id)
        .single()
    
    if (profile.stars_balance < gift.price_stars) {
        throw new Error('Недостаточно звезд')
    }
    
    await supabase
        .from('profiles')
        .update({ stars_balance: profile.stars_balance - gift.price_stars })
        .eq('id', user.id)
    
    const { data, error } = await supabase
        .from('gift_transactions')
        .insert({
            gift_id: giftId,
            from_user_id: user.id,
            to_user_id: toUserId,
            message,
            stars_spent: gift.price_stars
        })
        .select()
        .single()
    
    if (error) throw error
    return data
}

export async function getMyGifts() {
    const user = await getCurrentUser()
    
    const { data, error } = await supabase
        .from('gift_transactions')
        .select(`
            *,
            gift:gift_id (*),
            from_user:from_user_id (id, username, full_name, avatar_url)
        `)
        .eq('to_user_id', user.id)
        .order('created_at', { ascending: false })
    
    if (error) throw error
    return data
}

// Stories
export async function uploadStory(file, caption = '') {
    const user = await getCurrentUser()
    
    const fileExt = file.name.split('.').pop()
    const path = `stories/${user.id}/${Date.now()}.${fileExt}`
    
    const { error: uploadError } = await supabase.storage
        .from('rugram-media')
        .upload(path, file)
    
    if (uploadError) throw uploadError
    
    const { data: { publicUrl } } = supabase.storage
        .from('rugram-media')
        .getPublicUrl(path)
    
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 24)
    
    const { data, error } = await supabase
        .from('stories')
        .insert({
            user_id: user.id,
            media_url: publicUrl,
            media_type: file.type.startsWith('image') ? 'image' : 'video',
            caption,
            expires_at: expiresAt.toISOString()
        })
        .select()
        .single()
    
    if (error) throw error
    return data
}

export async function getActiveStories() {
    const user = await getCurrentUser()
    
    const { data: chats } = await supabase
        .from('chat_members')
        .select('chat_id')
        .eq('user_id', user.id)
    
    const chatIds = chats.map(c => c.chat_id)
    
    const { data: members } = await supabase
        .from('chat_members')
        .select('user_id')
        .in('chat_id', chatIds)
        .neq('user_id', user.id)
    
    const userIds = [...new Set(members.map(m => m.user_id))]
    
    const { data, error } = await supabase
        .from('stories')
        .select(`
            *,
            user:user_id (id, username, full_name, avatar_url)
        `)
        .in('user_id', userIds)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
    
    if (error) throw error
    return data
}

// Admin
export async function isAdmin() {
    const user = await getCurrentUser()
    if (!user) return false
    
    const { data } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single()
    
    return data?.is_admin || false
}

export async function getAllUsers() {
    if (!await isAdmin()) throw new Error('Доступ запрещен')
    
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
    
    if (error) throw error
    return data
}

export async function modifyUserStars(userId, amount, reason) {
    if (!await isAdmin()) throw new Error('Доступ запрещен')
    const admin = await getCurrentUser()
    
    const { data: profile } = await supabase
        .from('profiles')
        .select('stars_balance')
        .eq('id', userId)
        .single()
    
    const newBalance = profile.stars_balance + amount
    
    await supabase
        .from('profiles')
        .update({ stars_balance: newBalance })
        .eq('id', userId)
    
    await supabase.from('star_transactions').insert({
        user_id: userId,
        amount,
        transaction_type: amount > 0 ? 'admin_add' : 'admin_remove',
        description: reason
    })
    
    await supabase.from('admin_logs').insert({
        admin_id: admin.id,
        action: 'modify_stars',
        target_id: userId,
        details: { amount, reason }
    })
    
    return newBalance
}

export async function createGift(giftData) {
    if (!await isAdmin()) throw new Error('Доступ запрещен')
    const admin = await getCurrentUser()
    
    const { data, error } = await supabase
        .from('gifts')
        .insert({ ...giftData, created_by: admin.id })
        .select()
        .single()
    
    if (error) throw error
    return data
}

export async function updateGift(giftId, giftData) {
    if (!await isAdmin()) throw new Error('Доступ запрещен')
    
    const { data, error } = await supabase
        .from('gifts')
        .update(giftData)
        .eq('id', giftId)
        .select()
        .single()
    
    if (error) throw error
    return data
}

export async function deleteGift(giftId) {
    if (!await isAdmin()) throw new Error('Доступ запрещен')
    
    const { error } = await supabase
        .from('gifts')
        .delete()
        .eq('id', giftId)
    
    if (error) throw error
    return true
}

// Balance
export async function getStarBalance() {
    const user = await getCurrentUser()
    const { data, error } = await supabase
        .from('profiles')
        .select('stars_balance')
        .eq('id', user.id)
        .single()
    
    if (error) throw error
    return data.stars_balance
}