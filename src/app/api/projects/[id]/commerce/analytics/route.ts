
import { NextRequest, NextResponse } from 'next/server';
import { getWooCommerceClient } from '@/lib/woocommerce';
import { requireAuth } from '@/lib/auth/middleware';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const auth = await requireAuth(request);
        if (auth.response) return auth.response;

        const woo = await getWooCommerceClient(params.id);
        const { searchParams } = new URL(request.url);
        const period = searchParams.get('period') || 'month'; // 'week', 'month', 'year'

        // WooCommerce Reports API is a bit limited, often better to fetch orders and aggregate or use specific reports endpoints
        // Endpoints: /reports/sales

        const date = new Date();
        let date_min = '';

        if (period === 'week') {
            date.setDate(date.getDate() - 7);
        } else if (period === 'month') {
            date.setMonth(date.getMonth() - 1);
        } else if (period === 'year') {
            date.setFullYear(date.getFullYear() - 1);
        }
        date_min = date.toISOString().split('T')[0];

        // Fetch Sales Report
        const { data: salesReport } = await woo.get('reports/sales', {
            date_min,
            period: period === 'year' ? 'month' : 'week'
        });

        // Fetch recent orders for the transactions list
        const { data: orders } = await woo.get('orders', {
            per_page: 10,
            page: 1
        });

        // Calculate totals from reports
        const totalSales = salesReport.reduce((acc: number, item: any) => acc + parseFloat(item.total_sales), 0);
        const totalOrders = salesReport.reduce((acc: number, item: any) => acc + parseInt(item.total_orders), 0);
        const averageOrderValue = totalOrders > 0 ? (totalSales / totalOrders) : 0;

        return NextResponse.json({
            summary: {
                total_sales: totalSales,
                total_orders: totalOrders,
                average_order_value: averageOrderValue,
                currency: orders[0]?.currency_symbol || '$' // Fallback or get from settings
            },
            chart_data: salesReport,
            recent_orders: orders.map((o: any) => ({
                id: o.id,
                status: o.status,
                total: o.total,
                currency: o.currency_symbol,
                date_created: o.date_created,
                customer: `${o.billing.first_name} ${o.billing.last_name}`
            }))
        });

    } catch (error: any) {
        console.error('WooCommerce Analytics Error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch analytics' },
            { status: 500 }
        );
    }
}
