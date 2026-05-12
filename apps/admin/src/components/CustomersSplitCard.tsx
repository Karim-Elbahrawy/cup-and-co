'use client';

import { UserPlus, UserCheck, Repeat } from 'lucide-react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { formatEgp } from '@/lib/format';
import type { AdminCustomersReport } from '@/lib/api';

const COLORS = ['#0F766E', '#C2410C'];

export function CustomersSplitCard({ data }: { data: AdminCustomersReport }) {
  const pie = [
    { name: 'New', value: data.newCustomers },
    { name: 'Returning', value: data.returningCustomers },
  ];

  return (
    <section className="rounded-card border border-cup-stroke bg-cup-surface p-5 shadow-card">
      <header className="mb-4 flex items-center gap-2">
        <Repeat className="h-4 w-4 text-cup-orange-600" aria-hidden />
        <h2 className="font-heading text-base font-semibold text-cup-brown-900">
          New vs returning customers
        </h2>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="h-56 w-full">
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={pie}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={75}
                paddingAngle={3}
              >
                {pie.map((_, i) => (
                  <Cell key={i} fill={COLORS[i]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ borderRadius: 12, border: '1px solid #E7E5E4' }}
                formatter={(v) => [String(v), 'Customers']}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="flex flex-col justify-center gap-4">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-chip bg-cup-teal-100 text-cup-teal-700">
              <UserPlus className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-semibold text-cup-brown-900">
                {data.newCustomers} new
              </p>
              <p className="text-xs text-cup-muted">{formatEgp(data.newRevenue)} revenue</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-chip bg-cup-orange-100 text-cup-orange-700">
              <UserCheck className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-semibold text-cup-brown-900">
                {data.returningCustomers} returning
              </p>
              <p className="text-xs text-cup-muted">{formatEgp(data.returningRevenue)} revenue</p>
            </div>
          </div>
          <div className="mt-2 rounded-chip border border-cup-stroke bg-cup-cream-50 px-3 py-2">
            <p className="text-xs text-cup-muted">Repeat-buyer rate</p>
            <p className="font-heading text-xl font-bold text-cup-brown-900">{data.repeatRate}%</p>
          </div>
        </div>
      </div>
    </section>
  );
}
