
import type { APIRoute } from 'astro';

// We need to setup your database client, e.g., Prisma or a direct MySQL driver.
// For now, this is a placeholder.
// import { db } from '@/lib/db'; 

// Placeholder for database product type
type Product = {
  id: string;
  stock: number;
  price: number;
  name: string;
};

// Placeholder for database order type
type Order = {
  id: string;
};

// A mock database for demonstration purposes.
const db = {
  product: {
    findUnique: async ({ where: { id } }: { where: { id: string } }): Promise<Product | null> => {
      // In a real app, you'd fetch this from your database.
      if (id === 'product-1') {
        return { id: 'product-1', name: 'Sample Product', stock: 10, price: 19.99 };
      }
      return null;
    },
    update: async ({ where: { id }, data }: { where: { id: string }, data: { stock: { decrement: number } } }): Promise<Product> => {
        // In a real app, you'd update this in your database.
        console.log(`Decremented stock for product ${id} by ${data.stock.decrement}`);
        return { id, name: 'Sample Product', stock: 10 - data.stock.decrement, price: 19.99 };
    }
  },
  order: {
      create: async (data: any): Promise<Order> => {
        const orderId = `order-${Date.now()}`;
        console.log('Created order:', { orderId, ...data.data});
        return { id: orderId };
      }
  },
  $transaction: async (operations: Promise<any>[]): Promise<any[]> => {
    // This is a mock transaction. In a real scenario, you'd use your database's transaction capabilities.
    console.log('Running transaction...');
    const results = await Promise.all(operations);
    console.log('Transaction complete.');
    return results;
  }
};


export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { name, phone, address, productId, quantity } = body;

    // 1. Check stock
    const product = await db.product.findUnique({
      where: { id: productId }
    });

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
          productId: productId,
          quantity: quantity,
          totalPrice: product.price * quantity,
          status: 'PENDING'
        }
      }),
      db.product.update({
        where: { id: productId },
        data: { stock: { decrement: quantity } }
      })
    ]);

    const META_PIXEL_ID = process.env.META_PIXEL_ID;
    const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;

    // 3. Send 'Purchase' event to Meta Conversions API (CAPI)
    await fetch(`https://graph.facebook.com/v19.0/${META_PIXEL_ID}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: [{
          event_name: 'Purchase',
          event_time: Math.floor(Date.now() / 1000),
          user_data: {
            ph: [phone],
            fn: [name]
          },
          custom_data: {
            currency: 'TND',
            value: product.price * quantity
          }
        }],
        access_token: META_ACCESS_TOKEN
      })
    });

    const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;

    // 4. Trigger n8n webhook
    if (N8N_WEBHOOK_URL) {
      fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id, name, phone, address, product: product.name, quantity })
      }).catch(err => console.log("n8n Trigger Error:", err));
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
