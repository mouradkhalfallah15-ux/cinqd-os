import type { APIRoute } from 'astro';
import { createHash } from 'crypto';

// ─── Database Client ──────────────────────────────────────────────────────────
// When your database is ready, uncomment one of these and remove the mock below.
//
// Option A — Prisma:
//   import { PrismaClient } from '@prisma/client';
//   const db = new PrismaClient();
//
// Option B — Firebase/Firestore (already in your stack):
//   import { db } from '@/firebase';
// ─────────────────────────────────────────────────────────────────────────────

type Product = {
  id: string;
  stock: number;
  price: number;
  name: string;
};

type Order = {
  id: string;
};

// TODO: Replace this mock with real DB client before production
const db = {
  product: {
    findUnique: async ({ where: { id } }: { where: { id: string } }): Promise<Product | null> => {
      if (id === 'product-1') {
        return { id: 'product-1', name: 'Sample Product', stock: 10, price: 19.99 };
      }
      return null;
    },
    update: async ({ where: { id }, data }: { where: { id: string }; data: { stock: { decrement: number } } }): Promise<Product> => {
      console.log(`Decremented stock for product ${id} by ${data.stock.decrement}`);
      return { id, name: 'Sample Product', stock: 10 - data.stock.decrement, price: 19.99 };
    }
  },
  order: {
    create: async (data: any): Promise<Order> => {
      const orderId = `order-${Date.now()}`;
      console.log('Created order:', { orderId, ...data.data });
      return { id: orderId };
    }
  },
  $transaction: async (operations: Promise<any>[]): Promise<any[]> => {
    const results = await Promise.all(operations);
    return results;
  }
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sha256(value: string): string {
  return createHash('sha256').update(value.trim().toLowerCase()).digest('hex');
}

type ValidationResult =
  | { valid: true; data: { name: string; phone: string; address: string; productId: string; quantity: number } }
  | { valid: false; message: string };

function validateOrderInput(body: unknown): ValidationResult {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { valid: false, message: 'Invalid request body.' };
  }

  const { name, phone, address, productId, quantity } = body as Record<string, unknown>;

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    return { valid: false, message: 'Name is required and must be at least 2 characters.' };
  }
  if (!phone || typeof phone !== 'string' || !/^\+?[0-9]{7,15}$/.test(phone.trim())) {
    return { valid: false, message: 'A valid phone number is required.' };
  }
  if (!address || typeof address !== 'string' || address.trim().length < 5) {
    return { valid: false, message: 'Address is required and must be at least 5 characters.' };
  }
  if (!productId || typeof productId !== 'string' || productId.trim().length === 0) {
    return { valid: false, message: 'Product ID is required.' };
  }
  if (
    quantity === undefined ||
    typeof quantity !== 'number' ||
    !Number.isInteger(quantity) ||
    quantity < 1 ||
    quantity > 1000
  ) {
    return { valid: false, message: 'Quantity must be a whole number between 1 and 1000.' };
  }

  return {
    valid: true,
    data: {
      name: name.trim(),
      phone: phone.trim(),
      address: address.trim(),
      productId: productId.trim(),
      quantity
    }
  };
}

// ─── Route ───────────────────────────────────────────────────────────────────

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const validation = validateOrderInput(body);

    if (!validation.valid) {
      return new Response(
        JSON.stringify({ success: false, message: validation.message }),
        { status: 422, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { name, phone, address, productId, quantity } = validation.data;

    // 1. Check stock
    const product = await db.product.findUnique({ where: { id: productId } });

    if (!product || product.stock < quantity) {
      return new Response(
        JSON.stringify({ success: false, message: 'عذراً، المخزون غير كافٍ حالياً!' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 2. Create order and decrement stock in a transaction
    const [order] = await db.$transaction([
      db.order.create({
        data: {
          clientName: name,
          clientPhone: phone,
          clientAddress: address,
          productId,
          quantity,
          totalPrice: product.price * quantity,
          status: 'PENDING'
        }
      }),
      db.product.update({
        where: { id: productId },
        data: { stock: { decrement: quantity } }
      })
    ]);

    // 3. Send 'Purchase' event to Meta Conversions API (CAPI)
    const META_PIXEL_ID = process.env.META_PIXEL_ID;
    const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;

    if (META_PIXEL_ID && META_ACCESS_TOKEN) {
      await fetch(`https://graph.facebook.com/v19.0/${META_PIXEL_ID}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: [{
            event_name: 'Purchase',
            event_time: Math.floor(Date.now() / 1000),
            user_data: {
              ph: [sha256(phone)],
              fn: [sha256(name)]
            },
            custom_data: {
              currency: 'TND',
              value: product.price * quantity
            }
          }],
          access_token: META_ACCESS_TOKEN
        })
      });
    }

    // 4. Trigger n8n webhook
    const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;

    if (N8N_WEBHOOK_URL) {
      fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id, name, phone, address, product: product.name, quantity })
      }).catch(err => console.error('n8n Trigger Error:', err));
    }

    return new Response(
      JSON.stringify({ success: true, message: 'تم تسجيل طلبيتك بنجاح!', orderId: order.id }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Order Error:', error);
    return new Response(
      JSON.stringify({ success: false, message: 'حدث خطأ في السيستام' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
