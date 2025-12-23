"use client";

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface ChartProps {
  type: string;
  data: any;
  title?: string;
}

const COLORS = [
  "#4fc3ae",
  "#00D4AA",
  "#00B894",
  "#00A085",
  "#008876",
  "#007067",
  "#005858",
  "#004049",
  "#00283A",
  "#00102B",
];

export default function ChatChart({ type, data, title }: ChartProps) {
  if (!data || !data.labels || !data.values) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        No chart data available
      </div>
    );
  }

  // Prepare data for recharts
  const chartData = data.labels.map((label: string, index: number) => ({
    name: label.length > 20 ? label.substring(0, 20) + "..." : label,
    value: data.values[index],
    fullName: label,
  }));

  // Render based on chart type
  if (type === "bar") {
    return (
      <div className="w-full h-64 mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#4fc3ae/20" />
            <XAxis
              dataKey="name"
              angle={-45}
              textAnchor="end"
              height={80}
              fontSize={10}
              tick={{ fill: "#A0A0A0" }}
            />
            <YAxis fontSize={10} tick={{ fill: "#A0A0A0" }} />
            <Tooltip
              formatter={(value: any) => [value.toLocaleString(), "Works"]}
              labelFormatter={(label: string) => {
                const item = chartData.find((d: any) => d.name === label);
                return item?.fullName || label;
              }}
              contentStyle={{
                backgroundColor: "#1A1A2E",
                border: "1px solid #4fc3ae",
                borderRadius: "6px",
                color: "#4fc3ae",
              }}
            />
            <Bar dataKey="value" fill="#4fc3ae" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (type === "line") {
    return (
      <div className="w-full h-64 mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#4fc3ae/20" />
            <XAxis
              dataKey="name"
              angle={-45}
              textAnchor="end"
              height={80}
              fontSize={10}
              tick={{ fill: "#A0A0A0" }}
            />
            <YAxis fontSize={10} tick={{ fill: "#A0A0A0" }} />
            <Tooltip
              formatter={(value: any) => [value.toLocaleString(), "Works"]}
              contentStyle={{
                backgroundColor: "#1A1A2E",
                border: "1px solid #4fc3ae",
                borderRadius: "6px",
                color: "#4fc3ae",
              }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#4fc3ae"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (type === "pie") {
    return (
      <div className="w-full h-64 mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) =>
                `${name}: ${(percent * 100).toFixed(0)}%`
              }
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry: any, index: number) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: any) => [value.toLocaleString(), "Works"]}
              contentStyle={{
                backgroundColor: "#1A1A2E",
                border: "1px solid #4fc3ae",
                borderRadius: "6px",
                color: "#4fc3ae",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // Default to bar chart
  return (
    <div className="w-full h-64 mt-2">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#4fc3ae/20" />
          <XAxis
            dataKey="name"
            angle={-45}
            textAnchor="end"
            height={80}
            fontSize={10}
            tick={{ fill: "#A0A0A0" }}
          />
          <YAxis fontSize={10} tick={{ fill: "#A0A0A0" }} />
          <Tooltip
            formatter={(value: any) => [value.toLocaleString(), "Works"]}
            contentStyle={{
              backgroundColor: "#1A1A2E",
              border: "1px solid #4fc3ae",
              borderRadius: "6px",
              color: "#4fc3ae",
            }}
          />
          <Bar dataKey="value" fill="#4fc3ae" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
