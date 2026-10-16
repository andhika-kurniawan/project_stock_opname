# Stock Opname API Documentation

Base URL: `https://xxxxx.supabase.co/rest/v1`

Authentication: Bearer token (JWT) in `Authorization` header

---

## Authentication

### Login
```http
POST /auth/v1/token?grant_type=password
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

Response:
```json
{
  "access_token": "eyJhbGci...",
  "token_type": "bearer",
  "expires_in": 3600,
  "refresh_token": "...",
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  }
}
```

### Logout
```http
POST /auth/v1/logout
Authorization: Bearer {token}
```

---

## Users

### Get Current User
```http
GET /users?id=eq.{user_id}
Authorization: Bearer {token}
```

### Get All Users (Admin only)
```http
GET /users
Authorization: Bearer {token}
```

### Update User
```http
PATCH /users?id=eq.{user_id}
Content-Type: application/json
Authorization: Bearer {token}

{
  "full_name": "Updated Name",
  "last_login": "2026-10-16T10:00:00Z"
}
```

---

## Categories

### List Categories
```http
GET /categories?order=name.asc
Authorization: Bearer {token}
```

### Create Category (Admin only)
```http
POST /categories
Content-Type: application/json
Authorization: Bearer {token}

{
  "name": "Category Name",
  "description": "Optional description"
}
```

### Update Category (Admin only)
```http
PATCH /categories?id=eq.{category_id}
Content-Type: application/json
Authorization: Bearer {token}

{
  "name": "Updated Name"
}
```

---

## Products

### List Products
```http
GET /products?select=*,categories(name)&order=name.asc
Authorization: Bearer {token}
```

### Search Product by Barcode
```http
GET /products?barcode=eq.{barcode}&select=*,categories(name)
Authorization: Bearer {token}
```

Response:
```json
[
  {
    "id": "uuid",
    "barcode": "8991002001015",
    "name": "Pocari Sweat 500ml",
    "category_id": "uuid",
    "system_stock": 50,
    "categories": {
      "name": "Beverages"
    }
  }
]
```

### Create Product (Admin only)
```http
POST /products
Content-Type: application/json
Authorization: Bearer {token}

{
  "barcode": "1234567890123",
  "name": "Product Name",
  "category_id": "uuid",
  "system_stock": 100
}
```

### Bulk Import Products (Admin only)
```http
POST /products
Content-Type: application/json
Authorization: Bearer {token}

[
  {
    "barcode": "123",
    "name": "Product 1",
    "category_id": "uuid",
    "system_stock": 50
  },
  {
    "barcode": "456",
    "name": "Product 2",
    "category_id": "uuid",
    "system_stock": 30
  }
]
```

---

## SO Sessions

### List Sessions
```http
GET /so_sessions?select=*,users(full_name),categories(name)&order=created_at.desc
Authorization: Bearer {token}
```

### Get Session by ID
```http
GET /so_sessions?id=eq.{session_id}&select=*,users(full_name),categories(name)
Authorization: Bearer {token}
```

### Create Session
```http
POST /so_sessions
Content-Type: application/json
Authorization: Bearer {token}

{
  "session_code": "SO-20261016-0001",
  "category_id": "uuid",
  "user_id": "uuid",
  "status": "active"
}
```

### Update Session Status
```http
PATCH /so_sessions?id=eq.{session_id}
Content-Type: application/json
Authorization: Bearer {token}

{
  "status": "completed",
  "end_time": "2026-10-16T15:00:00Z"
}
```

### Get Session Progress
```http
POST /rpc/get_session_progress
Content-Type: application/json
Authorization: Bearer {token}

{
  "session_id": "uuid"
}
```

Response:
```json
{
  "total_items": 100,
  "counted_items": 45,
  "progress_percentage": 45.00
}
```

---

## SO Items

### List Items by Session
```http
GET /so_items?session_id=eq.{session_id}&select=*,products(barcode,name)
Authorization: Bearer {token}
```

### Create SO Item
```http
POST /so_items
Content-Type: application/json
Authorization: Bearer {token}

{
  "session_id": "uuid",
  "product_id": "uuid",
  "system_stock": 50,
  "physical_stock": null,
  "is_counted": false
}
```

### Update Physical Stock
```http
PATCH /so_items?id=eq.{item_id}
Content-Type: application/json
Authorization: Bearer {token}

{
  "physical_stock": 48,
  "is_counted": true,
  "counted_at": "2026-10-16T14:30:00Z",
  "counted_by": "uuid"
}
```

### Get Items with Variance
```http
GET /so_items?session_id=eq.{session_id}&is_counted=eq.true&select=*,products(barcode,name)
Authorization: Bearer {token}
```

Filter items where `variance != 0` on client side.

---

## Audit Logs

### List Audit Logs (Admin only)
```http
GET /audit_logs?select=*,users(full_name)&order=timestamp.desc&limit=100
Authorization: Bearer {token}
```

### Filter by Entity Type
```http
GET /audit_logs?entity_type=eq.so_items&order=timestamp.desc
Authorization: Bearer {token}
```

---

## Realtime Subscriptions

### Subscribe to SO Sessions
```javascript
const subscription = supabase
  .channel('sessions')
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'so_sessions' },
    (payload) => console.log(payload)
  )
  .subscribe()
```

### Subscribe to SO Items for Specific Session
```javascript
const subscription = supabase
  .channel(`session_${sessionId}`)
  .on(
    'postgres_changes',
    { 
      event: '*', 
      schema: 'public', 
      table: 'so_items',
      filter: `session_id=eq.${sessionId}`
    },
    (payload) => console.log(payload)
  )
  .subscribe()
```

---

## Error Responses

### 400 Bad Request
```json
{
  "code": "22P02",
  "message": "invalid input syntax",
  "details": "..."
}
```

### 401 Unauthorized
```json
{
  "message": "JWT expired"
}
```

### 403 Forbidden (RLS)
```json
{
  "code": "42501",
  "message": "new row violates row-level security policy"
}
```

### 404 Not Found
```json
{
  "message": "No rows found"
}
```

---

## Common Query Patterns

### Pagination
```http
GET /products?limit=20&offset=40
```

### Ordering
```http
GET /products?order=name.asc,created_at.desc
```

### Filtering
```http
GET /products?category_id=eq.{uuid}&system_stock=gte.10
```

### Full-text Search
```http
GET /products?name=ilike.*search*
```

### Select Specific Columns
```http
GET /products?select=id,barcode,name,system_stock
```

---

## Rate Limits

- Free Tier: No explicit rate limit
- Recommended: Max 100 requests per second
- Realtime: Max 100 concurrent connections

---

## Best Practices

1. Always use JWT authentication
2. Use RPC functions for complex queries
3. Subscribe to realtime only for active sessions
4. Batch inserts for bulk operations
5. Use `select` to limit returned columns
6. Handle RLS errors gracefully
