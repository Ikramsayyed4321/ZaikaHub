export async function logActivity(db, request, action, entityType, entityId, metadata) {
    await db.query('INSERT INTO activity_logs (restaurant_id, user_id, action, entity_type, entity_id, metadata, ip_address) VALUES (?, ?, ?, ?, ?, ?, ?)', [
        request.user?.restaurantId || null,
        request.user?.id || null,
        action,
        entityType || null,
        entityId || null,
        metadata ? JSON.stringify(metadata) : null,
        request.ip,
    ]);
}
