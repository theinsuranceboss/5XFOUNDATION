import { NextResponse } from 'next/server';
import { convexClient } from '@/lib/convex';
import { api } from '@convex/_generated/api';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const orders = await convexClient.query(api.orders.list) as any[];

    const completedOrders = orders.filter((o: any) => o.status === 'completed');

    let totalRevenue = 0;
    let totalItemsSold = 0;
    const totalOrders = completedOrders.length;

    completedOrders.forEach((o: any) => {
      totalRevenue += o.total || 0;
    });

    totalRevenue = Math.round(totalRevenue * 100) / 100;
    const averageOrderValue = totalOrders > 0 ? Math.round((totalRevenue / totalOrders) * 100) / 100 : 0;

    const summary = { totalRevenue, totalOrders, averageOrderValue, totalItemsSold };

    const monthlyMap = new Map<string, { month: string; revenue: number; orders: number }>();
    completedOrders.forEach((o: any) => {
      const date = new Date(o._creationTime);
      const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyMap.has(monthStr)) {
        monthlyMap.set(monthStr, { month: monthStr, revenue: 0, orders: 0 });
      }
      const data = monthlyMap.get(monthStr)!;
      data.revenue += o.total || 0;
      data.orders += 1;
    });
    const monthlySales = Array.from(monthlyMap.values()).sort((a, b) => a.month.localeCompare(b.month));
    monthlySales.forEach(m => { m.revenue = Math.round(m.revenue * 100) / 100; });

    const formattedOrders = orders.slice(0, 30).map((o: any) => ({
      id: o._id,
      name: o.name || 'Anonymous Customer',
      email: o.email || 'N/A',
      total: o.total,
      status: o.status,
      createdAt: new Date(o._creationTime).toISOString(),
      itemsCount: 0,
      itemsList: [],
    }));

    return NextResponse.json({
      summary,
      monthlySales,
      dailySales: {},
      bestSellers: [],
      recentOrders: formattedOrders,
    });
  } catch (error: any) {
    console.error('Failed to query sales:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
