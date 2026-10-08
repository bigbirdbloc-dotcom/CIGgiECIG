# CIGgiECIG API Reference

## Cart Endpoints

### GET /api/cart
Retrieve current cart contents.

**Response:**
```json
{
  "items": [
    {
      "id": "sku-01",
      "name": "AURORA 7000",
      "price": 1680,
      "qty": 2
    }
  ],
  "total": 3360
}
```

### POST /api/cart/add
Add item to cart.

**Body:**
```json
{
  "productId": "sku-01",
  "qty": 1
}
```

### POST /api/cart/remove
Remove item from cart.

**Body:**
```json
{
  "productId": "sku-01"
}
```

## Order Endpoints

### GET /api/orders/:id
Fetch order details.

**Response:**
```json
{
  "id": "ord-1728425614000",
  "customer": {
    "name": "John Doe",
    "email": "john@example.com",
    "dob": "1995-05-15"
  },
  "total": 5040,
  "status": "awaiting_payment",
  "created_at": "2026-10-08T18:53:34Z"
}
```

### POST /api/orders/:id/tracking
Update order tracking info.

**Body:**
```json
{
  "trackingNumber": "TRK123456789",
  "carrier": "Regional Carrier Inc"
}
```

## Inventory Endpoints

### GET /api/inventory
Fetch all product inventory.

**Response:**
```json
[
  {
    "id": "sku-01",
    "name": "AURORA 7000",
    "stock": 25,
    "price": "$16.80",
    "status": "active"
  }
]
```

### POST /api/inventory/:id/restock
Add stock to a product.

**Body:**
```json
{
  "quantity": 50
}
```

## Reporting Endpoints

### GET /api/reports/sales
Get sales summary.

**Response:**
```json
{
  "totalRevenue": "$12,345.67",
  "orderCount": 42,
  "avgOrderValue": "$294.00"
}
```

### GET /api/reports/inventory
Get inventory status.

**Response:**
```json
{
  "total": 9,
  "lowStock": 2,
  "outOfStock": 0
}
```

## Audit Endpoints

### GET /api/audit/age-checks
Retrieve last 50 age verification checks.

**Response:**
```json
[
  {
    "timestamp": "2026-10-08T18:53:34Z",
    "type": "age_check",
    "payload": { "age": 24, "verified": true },
    "ip": "192.168.1.1"
  }
]
```

### POST /api/audit/log
Log an event to the audit trail.

**Body:**
```json
{
  "type": "payment_processed",
  "payload": { "orderId": "ord-123", "amount": 5040 }
}
```

## Adapter Endpoints

### GET /api/adapters/status
Check status of all payment and ID verification adapters.

**Response:**
```json
{
  "cyberSource": {
    "status": "verified",
    "note": "Round-trip signature verification passed"
  },
  "persona": {
    "status": "verified",
    "note": "Webhook verification matches docs"
  }
}
```

### POST /api/webhook/test
Test webhook signature generation.

**Body:**
```json
{
  "provider": "cybersource",
  "payload": { "test": true }
}
```

**Response:**
```json
{
  "ok": true,
  "signature": "abcdef1234567890...",
  "payload": "{\"test\":true}"
}
```
