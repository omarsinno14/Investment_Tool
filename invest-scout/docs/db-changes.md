# DB changes + why

## Index additions
- `Opportunity(createdByUserId, fetchedAt)` to speed per-user/community feed ordering and reduce sort costs.
- `ForumPost(createdAt)` + `ForumPost(userId, createdAt)` to speed feed and profile timelines.
- `ForumComment(postId, createdAt)` to speed comment pagination for large threads.
- `Message(conversationId, createdAt)` to speed chat history pagination.

## Migration
- `prisma/migrations/20250212000100_add_scaling_indexes/migration.sql`
- `prisma/migrations/20250212020000_add_conversations_and_news_tags/migration.sql`

These indexes target the most frequently ordered/filtered access paths and reduce full scans during high-concurrency feed and profile requests.
