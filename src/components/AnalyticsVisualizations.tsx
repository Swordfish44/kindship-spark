import React from 'react'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts'

interface ChartProps {
  data: any[]
  height?: number
}

export const DonationTrendChart = ({ data, height = 300 }: ChartProps) => (
  <ResponsiveContainer width="100%" height={height}>
    <LineChart data={data}>
      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
      <XAxis 
        dataKey="date" 
        stroke="hsl(var(--muted-foreground))"
        fontSize={12}
      />
      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
      <Tooltip 
        contentStyle={{ 
          backgroundColor: 'hsl(var(--popover))',
          border: '1px solid hsl(var(--border))',
          borderRadius: '8px',
          fontSize: '12px'
        }}
      />
      <Line 
        type="monotone" 
        dataKey="donations" 
        stroke="hsl(var(--primary))" 
        strokeWidth={2}
        dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2 }}
        activeDot={{ r: 6, fill: 'hsl(var(--primary))' }}
        name="Donations"
      />
    </LineChart>
  </ResponsiveContainer>
)

export const RevenueAreaChart = ({ data, height = 300 }: ChartProps) => (
  <ResponsiveContainer width="100%" height={height}>
    <AreaChart data={data}>
      <defs>
        <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.8}/>
          <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0.1}/>
        </linearGradient>
      </defs>
      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
      <XAxis 
        dataKey="date" 
        stroke="hsl(var(--muted-foreground))"
        fontSize={12}
      />
      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
      <Tooltip 
        contentStyle={{ 
          backgroundColor: 'hsl(var(--popover))',
          border: '1px solid hsl(var(--border))',
          borderRadius: '8px',
          fontSize: '12px'
        }}
        formatter={(value) => [`$${typeof value === 'number' ? value.toFixed(2) : '0.00'}`, 'Revenue']}
      />
      <Area 
        type="monotone" 
        dataKey="amount" 
        stroke="hsl(var(--success))" 
        fillOpacity={1}
        fill="url(#revenueGradient)"
        strokeWidth={2}
      />
    </AreaChart>
  </ResponsiveContainer>
)

export const ConversionChart = ({ data, height = 300 }: ChartProps) => (
  <ResponsiveContainer width="100%" height={height}>
    <BarChart data={data}>
      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
      <XAxis 
        dataKey="date" 
        stroke="hsl(var(--muted-foreground))"
        fontSize={12}
      />
      <YAxis 
        yAxisId="left" 
        stroke="hsl(var(--muted-foreground))" 
        fontSize={12}
      />
      <YAxis 
        yAxisId="right" 
        orientation="right" 
        stroke="hsl(var(--muted-foreground))" 
        fontSize={12}
      />
      <Tooltip 
        contentStyle={{ 
          backgroundColor: 'hsl(var(--popover))',
          border: '1px solid hsl(var(--border))',
          borderRadius: '8px',
          fontSize: '12px'
        }}
      />
      <Bar 
        yAxisId="left" 
        dataKey="page_views" 
        fill="hsl(var(--primary) / 0.8)" 
        name="Page Views" 
        radius={[2, 2, 0, 0]}
      />
      <Line 
        yAxisId="right" 
        type="monotone" 
        dataKey="conversion_rate" 
        stroke="hsl(var(--warning))" 
        strokeWidth={3}
        name="Conversion Rate %" 
      />
    </BarChart>
  </ResponsiveContainer>
)

export const BackerEngagementPie = ({ data, height = 300 }: ChartProps) => {
  const RADIAN = Math.PI / 180
  const COLORS = [
    'hsl(var(--success))',
    'hsl(var(--primary))', 
    'hsl(var(--warning))',
    'hsl(var(--muted-foreground))'
  ]

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize={12}
        fontWeight={600}
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={renderCustomizedLabel}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip 
          contentStyle={{ 
            backgroundColor: 'hsl(var(--popover))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
            fontSize: '12px'
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}

export const CampaignPerformanceRadar = ({ data, height = 300 }: ChartProps) => (
  <ResponsiveContainer width="100%" height={height}>
    <RadarChart data={data}>
      <PolarGrid stroke="hsl(var(--border))" />
      <PolarAngleAxis 
        dataKey="metric" 
        tick={{ fontSize: 12, fill: 'hsl(var(--foreground))' }}
      />
      <PolarRadiusAxis 
        angle={90} 
        domain={[0, 100]} 
        tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
      />
      <Radar 
        name="Performance" 
        dataKey="score" 
        stroke="hsl(var(--primary))" 
        fill="hsl(var(--primary) / 0.3)" 
        strokeWidth={2}
      />
      <Tooltip 
        contentStyle={{ 
          backgroundColor: 'hsl(var(--popover))',
          border: '1px solid hsl(var(--border))',
          borderRadius: '8px',
          fontSize: '12px'
        }}
      />
    </RadarChart>
  </ResponsiveContainer>
)